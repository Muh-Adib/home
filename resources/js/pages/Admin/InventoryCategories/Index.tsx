import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import type { InventoryCategory, PaginatedData } from '@/types';
import { 
    Package, 
    Plus, 
    MoreHorizontal, 
    Edit, 
    Eye, 
    Trash, 
    Filter,
    X,
    Search,
    Tag,
    Layers,
    ChevronRight,
    ChevronDown
} from 'lucide-react';

interface Props {
    categories: PaginatedData<InventoryCategory>;
    parentCategories: InventoryCategory[];
    stats: {
        total_categories: number;
        active_categories: number;
        root_categories: number;
        total_items: number;
    };
    filters: {
        category_type?: string;
        parent_id?: string;
        status?: string;
        search?: string;
    };
    categoryTypes: Record<string, string>;
}

export default function InventoryCategoriesIndex({ 
    categories, 
    parentCategories, 
    stats, 
    filters, 
    categoryTypes 
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.category_type || '');
    const [selectedParent, setSelectedParent] = useState(filters.parent_id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

    const handleFilter = () => {
        const params = new URLSearchParams();
        
        if (search) params.append('search', search);
        if (selectedType) params.append('category_type', selectedType);
        if (selectedParent) params.append('parent_id', selectedParent);
        if (selectedStatus) params.append('status', selectedStatus);
        
        router.get(route('admin.inventory-categories.index'), Object.fromEntries(params));
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedType('');
        setSelectedParent('');
        setSelectedStatus('');
        router.get(route('admin.inventory-categories.index'));
    };

    const getStatusBadge = (category: InventoryCategory) => {
        return (
            <Badge variant={category.is_active ? "default" : "secondary"}>
                {category.is_active ? "Active" : "Inactive"}
            </Badge>
        );
    };

    const getTypeBadge = (categoryType: string) => {
        const colors: Record<string, string> = {
            cleaning_supplies: 'bg-blue-100 text-blue-800',
            guest_amenities: 'bg-green-100 text-green-800',
            kitchen_supplies: 'bg-yellow-100 text-yellow-800',
            bathroom_supplies: 'bg-purple-100 text-purple-800',
            maintenance_tools: 'bg-orange-100 text-orange-800',
            linens_towels: 'bg-pink-100 text-pink-800',
            electronics: 'bg-indigo-100 text-indigo-800',
            furniture: 'bg-gray-100 text-gray-800',
        };

        return (
            <Badge variant="outline" className={colors[categoryType]}>
                {categoryTypes[categoryType] || categoryType}
            </Badge>
        );
    };

    const toggleExpanded = (categoryId: number) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const renderCategoryRow = (category: InventoryCategory, level: number = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        
        return (
            <React.Fragment key={category.id}>
                <TableRow>
                    <TableCell>
                        <div className="flex items-center space-x-2" style={{ paddingLeft: `${level * 20}px` }}>
                            {hasChildren && (
                                <button
                                    onClick={() => toggleExpanded(category.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <Icon 
                                        iconNode={isExpanded ? ChevronDown : ChevronRight} 
                                        className="h-4 w-4" 
                                    />
                                </button>
                            )}
                            <div 
                                className="w-4 h-4 rounded-full border-2" 
                                style={{ backgroundColor: category.color }}
                            />
                            <div>
                                <div className="font-medium flex items-center space-x-2">
                                    <span>{category.name}</span>
                                    {level > 0 && <Badge variant="outline" size="sm">Sub</Badge>}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {category.description}
                                </div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {getTypeBadge(category.category_type)}
                    </TableCell>
                    <TableCell>
                        {category.parent?.name || '-'}
                    </TableCell>
                    <TableCell>
                        <div className="text-center">
                            {category.total_items_count || 0}
                        </div>
                    </TableCell>
                    <TableCell>
                        {getStatusBadge(category)}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center space-x-1">
                            {category.track_expiry && <Badge variant="outline" size="sm">Expiry</Badge>}
                            {category.track_serial && <Badge variant="outline" size="sm">Serial</Badge>}
                            {category.auto_reorder && <Badge variant="outline" size="sm">Auto</Badge>}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <Icon iconNode={MoreHorizontal} className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={route('admin.inventory-categories.show', category.id)}>
                                        <Icon iconNode={Eye} className="mr-2 h-4 w-4" />
                                        View Details
                                    </Link>
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem asChild>
                                    <Link href={route('admin.inventory-categories.edit', category.id)}>
                                        <Icon iconNode={Edit} className="mr-2 h-4 w-4" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                
                                {category.can_be_deleted && (
                                    <DropdownMenuItem 
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this category?')) {
                                                router.delete(route('admin.inventory-categories.destroy', category.id));
                                            }
                                        }}
                                        className="text-red-600"
                                    >
                                        <Icon iconNode={Trash} className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                
                {/* Render children if expanded */}
                {hasChildren && isExpanded && category.children?.map((child) => 
                    renderCategoryRow(child, level + 1)
                )}
            </React.Fragment>
        );
    };

    return (
        <AppLayout>
            <Head title="Inventory Categories" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Inventory Categories</h1>
                        <p className="text-muted-foreground">
                            Organize inventory items into hierarchical categories
                        </p>
                    </div>
                    <Link href={route('admin.inventory-categories.create')}>
                        <Button>
                            <Icon iconNode={Plus} className="mr-2 h-4 w-4" />
                            New Category
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                            <Icon iconNode={Tag} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_categories}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                            <Icon iconNode={Layers} className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.active_categories}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Root Categories</CardTitle>
                            <Icon iconNode={Package} className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.root_categories}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                            <Icon iconNode={Package} className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{stats.total_items}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Filter categories by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <Input
                                    placeholder="Search categories..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category Type</label>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Types</SelectItem>
                                        {Object.entries(categoryTypes).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Parent Category</label>
                                <Select value={selectedParent} onValueChange={setSelectedParent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Categories</SelectItem>
                                        <SelectItem value="root">Root Categories Only</SelectItem>
                                        {parentCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4">
                            <Button onClick={handleFilter}>
                                <Icon iconNode={Filter} className="mr-2 h-4 w-4" />
                                Apply
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>
                                <Icon iconNode={X} className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Categories Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                            Showing {categories.from} to {categories.to} of {categories.total} categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Parent</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Features</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.data.map((category) => renderCategoryRow(category))}
                            </TableBody>
                        </Table>

                        {categories.data.length === 0 && (
                            <div className="text-center py-8">
                                <Icon iconNode={Search} className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No categories found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Try adjusting your search criteria or create a new category.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 
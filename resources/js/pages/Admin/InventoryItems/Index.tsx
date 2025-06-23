import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { InventoryItem, InventoryCategory, Property } from '@/types';
import { Plus, Search, Edit, Eye, AlertTriangle, Package } from 'lucide-react';

interface Props {
    items: {
        data: InventoryItem[];
        links: any[];
        total: number;
        per_page: number;
        current_page: number;
    };
    categories: InventoryCategory[];
    properties: Property[];
    filters: {
        search?: string;
        category_id?: string;
        property_id?: string;
        status?: string;
    };
}

export default function InventoryItemsIndex({ items, categories, properties, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = () => {
        router.get(route('admin.inventory-items.index'), {
            ...filters,
            search: searchTerm,
        });
    };

    const handleFilter = (key: string, value: string) => {
        router.get(route('admin.inventory-items.index'), {
            ...filters,
            [key]: value,
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            active: 'default',
            inactive: 'secondary',
            out_of_stock: 'destructive',
            low_stock: 'outline',
        };

        const colors: Record<string, string> = {
            active: 'text-green-700 bg-green-50 border-green-200',
            inactive: 'text-gray-700 bg-gray-50 border-gray-200',
            out_of_stock: 'text-red-700 bg-red-50 border-red-200',
            low_stock: 'text-yellow-700 bg-yellow-50 border-yellow-200',
        };

        return (
            <Badge variant={variants[status] || 'outline'} className={colors[status]}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    const getConditionBadge = (condition: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            new: 'default',
            good: 'secondary',
            fair: 'outline',
            poor: 'destructive',
        };

        return <Badge variant={variants[condition] || 'outline'}>{condition.toUpperCase()}</Badge>;
    };

    return (
        <AppLayout>
            <Head title="Inventory Items" />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
                        <p className="text-muted-foreground">
                            Manage property inventory items and stock levels
                        </p>
                    </div>
                    <Link href={route('admin.inventory-items.create')}>
                        <Button>
                            <Icon iconNode={Plus} className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Icon iconNode={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <Select value={filters.category_id || ''} onValueChange={(value) => handleFilter('category_id', value)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.property_id || ''} onValueChange={(value) => handleFilter('property_id', value)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Properties" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Properties</SelectItem>
                            {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id.toString()}>
                                    {property.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status || ''} onValueChange={(value) => handleFilter('status', value)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                            <SelectItem value="low_stock">Low Stock</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSearch}>Search</Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Items ({items.total})</CardTitle>
                        <CardDescription>
                            Manage all inventory items across properties
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.data.length > 0 ? (
                                    items.data.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <Icon iconNode={Package} className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            SKU: {item.sku || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{item.category?.name || 'Uncategorized'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{item.property?.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium">{item.current_stock}</span>
                                                    <span className="text-muted-foreground">/ {item.unit}</span>
                                                    {item.current_stock <= (item.reorder_point || 0) && (
                                                        <Icon iconNode={AlertTriangle} className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getConditionBadge(item.condition)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">
                                                    Rp {item.unit_price?.toLocaleString('id-ID') || '0'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Link href={route('admin.inventory-items.show', item.id)}>
                                                        <Button variant="outline" size="sm">
                                                            <Icon iconNode={Eye} className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={route('admin.inventory-items.edit', item.id)}>
                                                        <Button variant="outline" size="sm">
                                                            <Icon iconNode={Edit} className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex flex-col items-center space-y-2">
                                                <Icon iconNode={Package} className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">No inventory items found</p>
                                                <Link href={route('admin.inventory-items.create')}>
                                                    <Button variant="outline" size="sm">
                                                        <Icon iconNode={Plus} className="mr-2 h-4 w-4" />
                                                        Add First Item
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 
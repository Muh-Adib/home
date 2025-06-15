import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type Property, type BreadcrumbItem, type User, type PaginatedData, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { 
    Building2, 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal,
    Edit,
    Eye,
    Trash2,
    MapPin,
    Bed,
    Bath,
    Users,
    DollarSign,
    Star,
    Settings
} from 'lucide-react';
import { useState } from 'react';

interface PropertiesIndexProps {
    properties: PaginatedData<Property>;
    filters: {
        search?: string;
        status?: string;
        sort?: string;
    };
}

export default function PropertiesIndex({ properties, filters }: PropertiesIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties' },
    ];

    const handleSearch = () => {
        router.get('/admin/properties', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = (property: Property) => {
        if (confirm(`Are you sure you want to delete "${property.name}"?`)) {
            router.delete(`/admin/properties/${property.slug}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: Property['status']) => {
        const statusConfig = {
            active: { variant: 'default' as const, label: 'Active' },
            inactive: { variant: 'secondary' as const, label: 'Inactive' },
            maintenance: { variant: 'destructive' as const, label: 'Maintenance' },
        };
        
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Check permissions for actions
    const canCreate = ['super_admin', 'property_owner', 'property_manager'].includes(auth.user.role);
    const canEdit = (property: Property) => {
        if (auth.user.role === 'super_admin') return true;
        if (auth.user.role === 'property_owner' && property.owner_id === auth.user.id) return true;
        if (auth.user.role === 'property_manager') return true;
        return false;
    };
    const canDelete = (property: Property) => {
        if (auth.user.role === 'super_admin') return true;
        if (auth.user.role === 'property_owner' && property.owner_id === auth.user.id) return true;
        return false;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {auth.user.role === 'property_owner' ? 'My Properties' : 'Properties'}
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your property listings and details
                        </p>
                    </div>
                    
                    {canCreate && (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/admin/properties/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Property
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search properties..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="w-full sm:w-48">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSearch} className="w-full sm:w-auto">
                                <Filter className="h-4 w-4 mr-2" />
                                Apply
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Properties Grid - Mobile */}
                <div className="block md:hidden space-y-4">
                    {properties.data.map((property) => (
                        <Card key={property.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold truncate">{property.name}</h3>
                                            {property.is_featured && (
                                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                            )}
                                        </div>
                                        {getStatusBadge(property.status)}
                                    </div>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/properties/${property.slug}`}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Link>
                                            </DropdownMenuItem>
                                            {canEdit(property) && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/properties/${property.slug}/edit`}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            {canDelete(property) && (
                                                <DropdownMenuItem 
                                                    onClick={() => handleDelete(property)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{property.address}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                <Bed className="h-3 w-3" />
                                                <span>{property.bedroom_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Bath className="h-3 w-3" />
                                                <span>{property.bathroom_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{property.capacity}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 font-semibold text-foreground">
                                            <DollarSign className="h-3 w-3" />
                                            <span>{formatCurrency(property.base_rate)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Properties Table - Desktop */}
                <div className="hidden md:block">
                    <Card>
                        <CardHeader>
                            <CardTitle>Properties List</CardTitle>
                            <CardDescription>
                                {properties.total} total properties
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {properties.data.map((property) => (
                                        <TableRow key={property.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{property.name}</span>
                                                        {property.is_featured && (
                                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {property.slug}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="truncate max-w-48">{property.address}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Bed className="h-3 w-3" />
                                                        <span>{property.bedroom_count}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Bath className="h-3 w-3" />
                                                        <span>{property.bathroom_count}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        <span>{property.capacity}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {formatCurrency(property.base_rate)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">per night</div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(property.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/properties/${property.slug}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {canEdit(property) && (
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/properties/${property.slug}/edit`}>
                                                                    <Edit className="h-4 w-4 mr-2" />
                                                                    Edit
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        {canDelete(property) && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDelete(property)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Pagination */}
                {properties.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {properties.from} to {properties.to} of {properties.total} properties
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {properties.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {properties.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                {filters.search || filters.status !== 'all' 
                                    ? 'Try adjusting your search criteria or filters'
                                    : 'Get started by creating your first property'
                                }
                            </p>
                            {canCreate && !filters.search && !filters.status && (
                                <Button asChild>
                                    <Link href="/admin/properties/create">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Property
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
} 
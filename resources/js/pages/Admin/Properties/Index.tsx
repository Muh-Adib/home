import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type Property, type BreadcrumbItem, type User, type PaginatedData, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
    Star,
    Settings,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface PropertiesIndexProps {
    properties: PaginatedData<Property>;
    filters: {
        search?: string;
        status?: string;
        sort?: string;
    };
}

type SortField = 'name' | 'address' | 'base_rate' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function PropertiesIndex({ properties, filters }: PropertiesIndexProps) {
    const { t } = useTranslation();
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    
    // Parse sort from filters
    const parseSort = (sortString?: string) => {
        if (!sortString) return { field: 'name' as SortField, direction: 'asc' as SortDirection };
        const parts = sortString.split('_');
        if (parts.length === 2) {
            return { 
                field: parts[0] as SortField, 
                direction: parts[1] as SortDirection 
            };
        }
        return { field: 'name' as SortField, direction: 'asc' as SortDirection };
    };
    
    const { field: sortField, direction: sortDirection } = parseSort(filters.sort);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.properties') },
    ];
    console.log(properties);
    const handleSearch = () => {
        router.get('/admin/properties', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            sort: `${sortField}_${sortDirection}`,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (field: SortField) => {
        const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        const newSort = `${field}_${newDirection}`;
        
        router.get('/admin/properties', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            sort: newSort,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
        return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    const handleDelete = (property: Property) => {
        if (confirm(t('admin.properties.delete_confirm', { name: property.name }))) {
            router.delete(`/admin/properties/${property.slug}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: Property['status']) => {
        const statusConfig = {
            active: { variant: 'default' as const, label: t('admin.properties.status.active') },
            inactive: { variant: 'secondary' as const, label: t('admin.properties.status.inactive') },
            maintenance: { variant: 'destructive' as const, label: t('admin.properties.status.maintenance') },
        };
        
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <AdminLayout breadcrumbs={breadcrumbs} title="Properties">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t('admin.properties.properties_list')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('admin.properties.manage_description')}
                        </p>
                    </div>
                    
                    {canCreate && (
                            <Link href="/admin/properties/create">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4 mr-2" />
                                {t('admin.properties.add_property')}
                            </Button>
                            </Link>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            {t('admin.properties.filters')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    {t('admin.properties.search')}
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t('admin.properties.search_placeholder')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button onClick={handleSearch} variant="outline">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    {t('admin.properties.statuss')}
                                </label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('admin.properties.all_status')}</SelectItem>
                                        <SelectItem value="active">{t('admin.properties.status.active')}</SelectItem>
                                        <SelectItem value="inactive">{t('admin.properties.status.inactive')}</SelectItem>
                                        <SelectItem value="maintenance">{t('admin.properties.status.maintenance')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-end">
                                <Button onClick={handleSearch} className="w-full">
                                    {t('admin.properties.apply_filters')}
                            </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Properties Table */}
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-lg">
                            {t('admin.properties.list_title')} ({properties.total})
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        {properties.data.length > 0 ? (
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-2">
                                                {t('admin.properties.name')}
                                                {getSortIcon('name')}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => handleSort('address')}
                                        >
                                            <div className="flex items-center gap-2">
                                                {t('admin.properties.location')}
                                                {getSortIcon('address')}
                                            </div>
                                        </TableHead>
                                        <TableHead>{t('admin.properties.capacity')}</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => handleSort('base_rate')}
                                        >
                                            <div className="flex items-center gap-2">
                                                {t('admin.properties.rate')}
                                                {getSortIcon('base_rate')}
                                            </div>
                                        </TableHead>
                                        <TableHead>{t('admin.properties.statuss')}</TableHead>
                                        <TableHead className="text-right">{t('admin.properties.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {properties.data.map((property, index) => (
                                        <TooltipProvider key={property.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <TableRow 
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => router.visit(`/admin/properties/${property.slug}`)}
                                                    >
                                            <TableCell className="text-center text-gray-500">
                                                {properties.from + index}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                            {property.media && property.media.length > 0 && property.media[0]?.url ? (
                                                                <img
                                                                    src={property.media[0].url}
                                                                    alt={property.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Building2 className="h-5 w-5 text-gray-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {property.name}
                                                            </div>
                                                            
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <MapPin className="h-4 w-4 mr-1" />
                                                        <span className="truncate max-w-48">
                                                            {property.address}
                                                        </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Bed className="h-4 w-4 mr-1" />
                                                            {property.bedroom_count}
                                                    </div>
                                                        <div className="flex items-center">
                                                            <Bath className="h-4 w-4 mr-1" />
                                                            {property.bathroom_count}
                                                    </div>
                                                        <div className="flex items-center">
                                                            <Users className="h-4 w-4 mr-1" />
                                                            {property.capacity}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                    <div className="font-medium text-gray-900">
                                                        {formatCurrency(property.base_rate)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">per night</div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(property.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>{t('admin.properties.actions')}</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/properties/${property.slug}`}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    {t('admin.properties.view')}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            {canEdit(property) && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/properties/${property.slug}/edit`}>
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        {t('admin.properties.edit')}
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDelete(property) && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleDelete(property)}
                                                                        className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                        {t('admin.properties.delete')}
                                                                </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                            </TableCell>
                                                    </TableRow>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('admin.properties.click_to_preview')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {t('admin.properties.no_properties')}
                            </h3>
                                <p className="text-gray-500 mb-6">
                                    {t('admin.properties.no_properties_description')}
                                </p>
                                {canCreate && (
                                    <Link href="/admin/properties/create">
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('admin.properties.add_first')}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {properties.data.length > 0 && properties.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            {t('admin.properties.showing')} {properties.from} - {properties.to} {t('admin.properties.of')} {properties.total}
                        </div>
                        <div className="flex space-x-2">
                            {properties.prev_page_url && (
                                <Link href={properties.prev_page_url}>
                                    <Button variant="outline" size="sm">
                                        {t('admin.properties.previous')}
                                </Button>
                                </Link>
                            )}
                            {properties.next_page_url && (
                                <Link href={properties.next_page_url}>
                                    <Button variant="outline" size="sm">
                                        {t('admin.properties.next')}
                                </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
} 
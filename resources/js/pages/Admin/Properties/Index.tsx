import AppLayout from '@/layouts/app-layout';
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
    const { t } = useTranslation();
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.properties') },
    ];
    console.log(properties);
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {auth.user.role === 'property_owner' ? t('admin.properties.my_properties') : t('nav.properties')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('admin.properties.manage_description')}
                        </p>
                    </div>
                    
                    {canCreate && (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/admin/properties/create">
                                <Plus className="h-4 w-4 mr-2" />
                                {t('admin.properties.add_property')}
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{t('common.filter')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('admin.properties.search_placeholder')}
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
                                        <SelectValue placeholder={t('admin.properties.status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('admin.properties.all_status')}</SelectItem>
                                        <SelectItem value="active">{t('admin.properties.status.active')}</SelectItem>
                                        <SelectItem value="inactive">{t('admin.properties.status.inactive')}</SelectItem>
                                        <SelectItem value="maintenance">{t('admin.properties.status.maintenance')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSearch} className="w-full sm:w-auto">
                                <Filter className="h-4 w-4 mr-2" />
                                {t('common.apply')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Properties Grid - Mobile */}
                <div className="block md:hidden space-y-4">
                    {properties.data.map((property) => (
                        <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                            <CardContent className="p-0">
                                {/* Property Image */}
                                <div className="relative">
                                    <div className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-blue-200">
                                        {property.media && property.media.length > 0 ? (
                                            <img 
                                                src={property.media[0].thumbnail_url} 
                                                alt={property.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Building2 className="h-12 w-12 text-blue-400" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Status Badge Overlay */}
                                    <div className="absolute top-3 left-3">
                                        {getStatusBadge(property.status)}
                                    </div>
                                    
                                    {/* Featured Badge */}
                                    {property.is_featured && (
                                        <div className="absolute top-3 right-3">
                                            <Badge className="bg-yellow-500 text-white border-0">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                {t('admin.properties.featured')}
                                            </Badge>
                                        </div>
                                    )}
                                    
                                    {/* Actions Menu */}
                                    <div className="absolute top-3 right-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/properties/${property.slug}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        {t('common.view')} {t('common.details')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                {canEdit(property) && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/properties/${property.slug}/edit`}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            {t('common.edit')} {t('nav.properties')}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/properties/${property.slug}`} target="_blank">
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        {t('admin.properties.preview_public')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {canDelete(property) && (
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(property)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        {t('common.delete')} {t('nav.properties')}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Property Info */}
                                <div className="p-4 space-y-3">
                                    {/* Title and Basic Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                                                {property.name}
                                            </h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{property.address}</span>
                                        </div>
                                    </div>

                                    {/* Property Stats */}
                                    <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-100">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                                                <Bed className="h-3 w-3" />
                                                <span className="text-xs">{t('admin.properties.bedrooms')}</span>
                                            </div>
                                            <div className="font-semibold text-gray-900">{property.bedroom_count}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                                                <Bath className="h-3 w-3" />
                                                <span className="text-xs">{t('admin.properties.bathrooms')}</span>
                                            </div>
                                            <div className="font-semibold text-gray-900">{property.bathroom_count}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                                                <Users className="h-3 w-3" />
                                                <span className="text-xs">{t('admin.properties.guests')}</span>
                                            </div>
                                            <div className="font-semibold text-gray-900">{property.capacity}</div>
                                        </div>
                                    </div>

                                    {/* Price and Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-lg text-green-600">
                                                    {formatCurrency(property.base_rate)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{t('common.per_night')}</div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/properties/${property.slug}`}>
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {t('common.view')}
                                                </Link>
                                            </Button>
                                            {canEdit(property) && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/admin/properties/${property.slug}/edit`}>
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        {t('common.edit')}
                                                    </Link>
                                                </Button>
                                            )}
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
                            <CardTitle>{t('admin.properties.properties_list')}</CardTitle>
                            <CardDescription>
                                {properties.total} {t('admin.properties.total_properties')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('nav.properties')}</TableHead>
                                        <TableHead>{t('admin.properties.location')}</TableHead>
                                        <TableHead>{t('common.details')}</TableHead>
                                        <TableHead>{t('admin.properties.rate')}</TableHead>
                                        <TableHead>{t('admin.properties.status')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {properties.data.map((property) => (
                                        <TableRow key={property.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    {/* Property Image */}
                                                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0">
                                                        {property.media && property.media.length > 0 ? (
                                                            <img 
                                                                src={property.media[0].thumbnail_url} 
                                                                alt={property.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Building2 className="h-6 w-6 text-blue-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900 truncate">{property.name}</span>
                                                            {property.is_featured && (
                                                                <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500 truncate">
                                                            {property.slug}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 max-w-48">
                                                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate text-sm text-gray-600">{property.address}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Bed className="h-3 w-3" />
                                                        <span className="font-medium">{property.bedroom_count}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Bath className="h-3 w-3" />
                                                        <span className="font-medium">{property.bathroom_count}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Users className="h-3 w-3" />
                                                        <span className="font-medium">{property.capacity}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-green-600">
                                                        {formatCurrency(property.base_rate)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{t('common.per_night')}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(property.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/admin/properties/${property.slug}`}>
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            {t('common.view')}
                                                        </Link>
                                                    </Button>
                                                    {canEdit(property) && (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href={`/admin/properties/${property.slug}/edit`}>
                                                                <Edit className="h-3 w-3 mr-1" />
                                                                Edit
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/properties/${property.slug}`} target="_blank">
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    Preview Public
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {canDelete(property) && (
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleDelete(property)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete Property
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                    <Building2 className="h-10 w-10 text-blue-500" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-yellow-600" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {filters.search || filters.status !== 'all' 
                                    ? 'No properties found'
                                    : 'No properties yet'
                                }
                            </h3>
                            <p className="text-gray-600 text-center mb-6 max-w-md">
                                {filters.search || filters.status !== 'all' 
                                    ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                                    : 'Get started by creating your first property listing. It only takes a few minutes!'
                                }
                            </p>
                            {canCreate && !filters.search && !filters.status && (
                                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                    <Link href="/admin/properties/create">
                                        <Plus className="h-5 w-5 mr-2" />
                                        Create Your First Property
                                    </Link>
                                </Button>
                            )}
                            {(filters.search || filters.status !== 'all') && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('all');
                                        router.get('/admin/properties', {}, {
                                            preserveState: false,
                                        });
                                    }}
                                >
                                    <Filter className="h-4 w-4 mr-2" />
                                    Clear Filters
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
} 
import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type Property, type BreadcrumbItem, type PaginatedData, type PageProps } from '@/types';
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
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    DollarSign
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
    const [showFilters, setShowFilters] = useState(false);
    
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
        if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
        return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
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
            active: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50', label: t('admin.properties.status.active') },
            inactive: { className: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100', label: t('admin.properties.status.inactive') },
            maintenance: { className: 'bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-50', label: t('admin.properties.status.maintenance') },
        };
        
        const config = statusConfig[status] || statusConfig.inactive;
        return <Badge variant="outline" className={`font-semibold text-xs py-0.5 px-2 rounded-full border ${config.className}`}>{config.label}</Badge>;
    };

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
            <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {t('admin.properties.properties_list')}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('admin.properties.manage_description')}
                        </p>
                    </div>
                    
                    {canCreate && (
                        <Link href="/admin/properties/create">
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-100 py-5 px-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5">
                                <Plus className="h-5 w-5 mr-2" />
                                {t('admin.properties.add_property')}
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Collapsible Filter Panel */}
                <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm sm:text-base">
                            <Filter className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                            <span>{t('admin.properties.filters')}</span>
                            {(searchTerm || statusFilter !== 'all') && (
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 ml-1.5 font-bold text-[10px] sm:text-xs">Active</Badge>
                            )}
                        </div>
                        {showFilters ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </button>
                    
                    <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[500px] border-t border-slate-100' : 'max-h-0'}`}>
                        <CardContent className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        {t('admin.properties.search')}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder={t('admin.properties.search_placeholder')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        {t('admin.properties.statuss')}
                                    </label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="bg-white">
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
                                    <Button onClick={handleSearch} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg py-5">
                                        {t('admin.properties.apply_filters')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </Card>

                {properties.data.length > 0 ? (
                    <>
                        {/* 🖥️ Desktop / Tablet Layout: Premium Table */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-lg">
                                    {t('admin.properties.list_title')} ({properties.total})
                                </h3>
                            </div>
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">#</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-slate-100/50 select-none text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {t('admin.properties.name')}
                                                {getSortIcon('name')}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-slate-100/50 select-none text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            onClick={() => handleSort('address')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {t('admin.properties.location')}
                                                {getSortIcon('address')}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.properties.capacity')}</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-slate-100/50 select-none text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            onClick={() => handleSort('base_rate')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {t('admin.properties.rate')}
                                                {getSortIcon('base_rate')}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.properties.statuss')}</TableHead>
                                        <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-6">{t('admin.properties.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {properties.data.map((property, index) => (
                                        <TooltipProvider key={property.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <TableRow 
                                                        className="cursor-pointer hover:bg-slate-50/50 border-b border-slate-100 transition-colors"
                                                        onClick={() => router.visit(`/admin/properties/${property.slug}`)}
                                                    >
                                                        <TableCell className="text-center font-medium text-slate-400 text-sm">
                                                            {properties.from + index}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                                                                    {property.media && property.media.length > 0 && property.media[0]?.url ? (
                                                                        <img
                                                                            src={property.media[0].url}
                                                                            alt={property.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Building2 className="h-5 w-5 text-slate-400" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                                                        {property.name}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                            {property.type}
                                                                        </span>
                                                                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                            {property.location === 'selatan' ? '🏡 Selatan' : '⛰️ Utara'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center text-sm text-slate-500">
                                                                <MapPin className="h-4 w-4 mr-1 text-slate-400 shrink-0" />
                                                                <span className="truncate max-w-xs">
                                                                    {property.address}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600">
                                                                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                                                    <Bed className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{property.bedroom_count}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                                                    <Bath className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{property.bathroom_count}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{property.capacity}</span>
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-extrabold text-slate-900 text-sm">
                                                                {formatCurrency(property.base_rate)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-semibold uppercase">per malam</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(property.status)}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm"
                                                                        className="hover:bg-slate-100 h-8 w-8 p-0"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-44">
                                                                    <DropdownMenuLabel>{t('admin.properties.actions')}</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/properties/${property.slug}`}>
                                                                            <Eye className="h-4 w-4 mr-2 text-slate-400" />
                                                                            Live Preview
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    {canEdit(property) && (
                                                                        <DropdownMenuItem asChild>
                                                                            <Link href={`/admin/properties/${property.slug}/edit`}>
                                                                                <Edit className="h-4 w-4 mr-2 text-slate-400" />
                                                                                {t('admin.properties.edit')}
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/admin/properties/${property.slug}/seasonal-rates`}>
                                                                            <DollarSign className="h-4 w-4 mr-2 text-slate-400" />
                                                                            Seasonal Rates
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    {canDelete(property) && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleDelete(property)}
                                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

                        {/* 📱 Mobile Layout: Beautiful Property Grid Cards */}
                        <div className="grid grid-cols-1 gap-5 md:hidden">
                            {properties.data.map((property) => (
                                <Card 
                                    key={property.id} 
                                    className="overflow-hidden border border-slate-100 shadow-sm active:scale-[0.99] transition-transform duration-100 bg-white"
                                    onClick={() => router.visit(`/admin/properties/${property.slug}`)}
                                >
                                    <div className="relative aspect-[16/10] bg-slate-50 w-full overflow-hidden">
                                        {property.media && property.media.length > 0 && property.media[0]?.url ? (
                                            <img
                                                src={property.media[0].url}
                                                alt={property.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Building2 className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3">
                                            {getStatusBadge(property.status)}
                                        </div>
                                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-xl shadow-md border border-slate-100 font-extrabold text-blue-600 text-sm">
                                            {formatCurrency(property.base_rate)}
                                            <span className="text-[10px] text-slate-500 font-normal"> / malam</span>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {property.type}
                                                </span>
                                                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                    {property.location === 'selatan' ? '🏡 Selatan' : '⛰️ Utara'}
                                                </span>
                                            </div>
                                            <h3 className="font-extrabold text-slate-800 text-base mt-2 line-clamp-1">
                                                {property.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 flex items-center mt-1">
                                                <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                                                <span className="line-clamp-1">{property.address}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 font-bold">
                                            <span className="flex items-center gap-1.5">
                                                <Bed className="h-4 w-4 text-slate-400" /> {property.bedroom_count} Kamar
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Bath className="h-4 w-4 text-slate-400" /> {property.bathroom_count} Toilet
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users className="h-4 w-4 text-slate-400" /> {property.capacity_max} Tamu
                                            </span>
                                        </div>

                                        <div className="pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="outline" size="sm" className="flex-1 font-bold text-xs h-9 rounded-lg" asChild>
                                                <Link href={`/admin/properties/${property.slug}`}>
                                                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Detail
                                                </Link>
                                            </Button>
                                            {canEdit(property) && (
                                                <Button variant="outline" size="sm" className="flex-1 font-bold text-xs h-9 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                                                    <Link href={`/admin/properties/${property.slug}/edit`}>
                                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                                    </Link>
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="px-2.5 h-9 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/properties/${property.slug}`} target="_blank">
                                                            <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-400" /> Live Preview
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/properties/${property.slug}/seasonal-rates`}>
                                                            <DollarSign className="h-3.5 w-3.5 mr-2 text-slate-400" /> Seasonal Rates
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {canDelete(property) && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(property)} className="text-red-600 hover:bg-red-50">
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus Properti
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <Card className="border-slate-100 shadow-sm bg-white py-12">
                        <CardContent className="text-center">
                            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">
                                {t('admin.properties.no_properties')}
                            </h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                                {t('admin.properties.no_properties_description')}
                            </p>
                            {canCreate && (
                                <Link href="/admin/properties/create">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-6 rounded-xl shadow-sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('admin.properties.add_first')}
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {properties.data.length > 0 && properties.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-xs sm:text-sm font-semibold text-slate-500">
                            {t('admin.properties.showing')} {properties.from} - {properties.to} {t('admin.properties.of')} {properties.total}
                        </div>
                        <div className="flex space-x-2 w-full sm:w-auto">
                            {properties.prev_page_url ? (
                                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial font-bold" asChild>
                                    <Link href={properties.prev_page_url}>
                                        {t('admin.properties.previous')}
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial font-bold" disabled>
                                    {t('admin.properties.previous')}
                                </Button>
                            )}
                            {properties.next_page_url ? (
                                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial font-bold" asChild>
                                    <Link href={properties.next_page_url}>
                                        {t('admin.properties.next')}
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial font-bold" disabled>
                                    {t('admin.properties.next')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
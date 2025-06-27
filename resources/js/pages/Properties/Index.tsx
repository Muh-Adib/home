import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Building2,
    Search,
    SlidersHorizontal,
    X,
    Calendar,
    ArrowUpDown,
    Grid3X3,
    List
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { getDefaultDateRange, formatDateRange } from '@/components/ui/date-range';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { useTranslation } from 'react-i18next';
import PropertyCard, { type Property, type Amenity } from '@/components/PropertyCard';

interface PropertiesIndexProps {
    properties: {
        data: Property[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    amenities: Amenity[];
    filters: {
        search?: string;
        amenities?: string;
        guests?: number;
        sort?: string;
        check_in?: string;
        check_out?: string;
    };
}

export default function PropertiesIndex({ properties, amenities, filters }: PropertiesIndexProps) {
    const page = usePage<PageProps>();
    const { t } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Get default date range
    const defaultDates = getDefaultDateRange(1);

    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        selectedAmenities: filters.amenities ? filters.amenities.split(',') : [],
        guests: filters.guests || 2,
        sort: filters.sort || 'featured',
        checkIn: filters.check_in || defaultDates.startDate,
        checkOut: filters.check_out || defaultDates.endDate,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('nav.browse_properties'), href: route('properties.index') }
    ];

    // Build property detail URL with current filters
    const buildPropertyUrl = (property: Property) => {
        const baseUrl = `/properties/${property.slug}`;
        const params = new URLSearchParams();
        
        if (localFilters.checkIn) params.append('check_in', localFilters.checkIn);
        if (localFilters.checkOut) params.append('check_out', localFilters.checkOut);
        if (localFilters.guests) params.append('guests', localFilters.guests.toString());
        
        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    };

    const handleSearch = () => {
        const params: any = {};

        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.selectedAmenities.length > 0) {
            params.amenities = localFilters.selectedAmenities.join(',');
        }
        if (localFilters.guests > 1) params.guests = localFilters.guests;
        if (localFilters.sort !== 'featured') params.sort = localFilters.sort;
        if (localFilters.checkIn) params.check_in = localFilters.checkIn;
        if (localFilters.checkOut) params.check_out = localFilters.checkOut;

        router.get('/properties', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        const freshDates = getDefaultDateRange(1);
        setLocalFilters({
            search: '',
            selectedAmenities: [],
            guests: 2,
            sort: 'featured',
            checkIn: freshDates.startDate,
            checkOut: freshDates.endDate,
        });
        router.get('/properties');
    };

    const toggleAmenity = (amenityId: string) => {
        setLocalFilters(prev => ({
            ...prev,
            selectedAmenities: prev.selectedAmenities.includes(amenityId)
                ? prev.selectedAmenities.filter(id => id !== amenityId)
                : [...prev.selectedAmenities, amenityId]
        }));
    };

    const sortOptions = [
        { value: 'featured', label: t('properties.sort.featured') },
        { value: 'price_low', label: t('properties.sort.price_low') },
        { value: 'price_high', label: t('properties.sort.price_high') },
        { value: 'name', label: t('properties.sort.name') },
    ];

    const amenityCategories = amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    // Auto-search on component mount if no existing filters
    useEffect(() => {
        if (!filters.check_in && !filters.check_out) {
            // Trigger search with default dates
            setTimeout(handleSearch, 100);
        }
    }, []); // Empty dependency array means this runs once on mount

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('properties.browse_title')} - Property Management System`} />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {t('properties.browse_title')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('properties.browse_subtitle', { count: properties.total })}
                            {(filters.check_in && filters.check_out) && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                                    {formatDateRange(localFilters.checkIn, localFilters.checkOut)}
                                </span>
                            )}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {t('common.filter')}
                            {(localFilters.selectedAmenities.length > 0 || localFilters.guests > 2 || (filters.check_in && filters.check_out)) && (
                                <Badge variant="secondary" className="ml-1">
                                    {localFilters.selectedAmenities.length + (localFilters.guests > 2 ? 1 : 0) + ((filters.check_in && filters.check_out) ? 1 : 0)}
                                </Badge>
                            )}
                        </Button>
                        
                        <div className="flex border rounded-lg">
                            <Button
                                variant={viewMode === 'grid' ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="rounded-r-none"
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="rounded-l-none"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-600" />
                            {t('properties.search_properties')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={t('properties.search_placeholder')}
                                    value={localFilters.search}
                                    onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>

                            {/* Simple Date Inputs */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        type="date"
                                        value={localFilters.checkIn}
                                        onChange={(e) => setLocalFilters(prev => ({ ...prev, checkIn: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder={t('booking.check_in')}
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="date"
                                        value={localFilters.checkOut}
                                        onChange={(e) => setLocalFilters(prev => ({ ...prev, checkOut: e.target.value }))}
                                        min={localFilters.checkIn || new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder={t('booking.check_out')}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Select value={localFilters.sort} onValueChange={(value) => {
                                    setLocalFilters(prev => ({ ...prev, sort: value }));
                                    setTimeout(handleSearch, 100);
                                }}>
                                    <SelectTrigger className="w-[200px]">
                                        <ArrowUpDown className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleSearch} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    {t('common.search')}
                                </Button>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {showFilters && (
                            <>
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">{t('properties.advanced_filters')}</h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowFilters(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Guest Count */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 block">
                                                {t('booking.guests')}: {localFilters.guests}
                                            </Label>
                                            <Slider
                                                value={[localFilters.guests]}
                                                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, guests: value[0] }))}
                                                max={20}
                                                min={1}
                                                step={1}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>1</span>
                                                <span>20+</span>
                                            </div>
                                        </div>

                                        {/* Amenities by Category */}
                                        {Object.entries(amenityCategories).slice(0, 2).map(([category, categoryAmenities]) => (
                                            <div key={category}>
                                                <Label className="text-sm font-medium mb-3 block capitalize">
                                                    {category.replace('_', ' ')}
                                                </Label>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {categoryAmenities.map(amenity => (
                                                        <div key={amenity.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`amenity-${amenity.id}`}
                                                                checked={localFilters.selectedAmenities.includes(amenity.id.toString())}
                                                                onCheckedChange={() => toggleAmenity(amenity.id.toString())}
                                                            />
                                                            <Label htmlFor={`amenity-${amenity.id}`} className="text-sm">
                                                                {amenity.icon} {amenity.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 pt-4 mt-4 border-t">
                                        <Button onClick={handleSearch} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                            {t('properties.apply_filters')}
                                        </Button>
                                        <Button variant="outline" onClick={clearFilters}>
                                            {t('common.reset')}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Properties Grid/List */}
                {properties.data.length > 0 ? (
                    <div className={viewMode === 'grid' 
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                        : "space-y-6"
                    }>
                        {properties.data.map((property) => (
                            <PropertyCard 
                                key={property.id} 
                                property={property} 
                                viewMode={viewMode}
                                buildPropertyUrl={buildPropertyUrl}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-16">
                        <CardContent>
                            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('properties.no_properties')}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {t('properties.no_properties_description')}
                            </p>
                            <Button onClick={clearFilters} variant="outline">
                                {t('properties.clear_filters')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {properties.last_page > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                        {properties.prev_page_url && (
                            <Link href={properties.prev_page_url}>
                                <Button variant="outline" size="sm">
                                    {t('pagination.previous')}
                                </Button>
                            </Link>
                        )}
                        
                        <span className="px-4 py-2 text-sm text-gray-600">
                            {t('pagination.page_of', { current: properties.current_page, total: properties.last_page })}
                        </span>
                        
                        {properties.next_page_url && (
                            <Link href={properties.next_page_url}>
                                <Button variant="outline" size="sm">
                                    {t('pagination.next')}
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
} 
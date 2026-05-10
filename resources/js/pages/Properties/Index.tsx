import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
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
    ArrowUpDown
} from 'lucide-react';
import { getDefaultDateRange, formatDateRange } from '@/utils/date';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { useTranslation } from 'react-i18next';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import { type Property } from '@/types/property';
import { type Amenity } from '@/types';
import AmenityItem from '@/components/AmenityItem';
import { DateRange } from '@/components/ui/date-range';

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

    const handleSearch = (filters = localFilters) => {
        const params: any = {};

        if (filters.search) params.search = filters.search;
        if (filters.selectedAmenities.length > 0) {
            params.amenities = filters.selectedAmenities.join(',');
        }
        if (filters.guests > 1) params.guests = filters.guests;
        if (filters.sort !== 'featured') params.sort = filters.sort;
        if (filters.checkIn) params.check_in = filters.checkIn;
        if (filters.checkOut) params.check_out = filters.checkOut;

        router.get('/properties', params, {
            preserveState: false,   // 🔥 untuk update URL dan data
            preserveScroll: true,
            replace: true           // 🔥 membuat URL langsung berubah (SPA style)
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

    const amenityCategories = (Array.isArray(amenities) ? amenities : []).reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    // Auto-search on component mount if no existing filters
    useEffect(() => {
        if (!filters.check_in && !filters.check_out) {
            setTimeout(() => handleSearch(), 100);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle perubahan range tanggal
    const handleDateRangeChange = (startDate: string, endDate: string) => {
        const updatedFilters = {
            ...localFilters,
            checkIn: startDate,
            checkOut: endDate,
        };

        setLocalFilters(updatedFilters);

        // Jalankan search jika dua tanggal terisi
        if (startDate && endDate) {
            handleSearch(updatedFilters);
        }
    };

    return (
        <GuestLayout variant='minimal'>
            <SeoHead
                title="Daftar Homestay & Villa di Yogyakarta"
                description="Temukan dan bandingkan homestay, villa, dan penginapan terbaik di Yogyakarta. Harga terjangkau, lokasi strategis, booking mudah di Homsjogja."
            />
            <SchemaOrg />

            <div className="min-h-screen bg-brand-background">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 px-4 py-4 md:px-6 md:py-6">
                    {/* Header - SEO Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                            {/* SEO H1: Target "daftar homestay di Yogyakarta" / "sewa homestay" */}
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                                Daftar Lengkap Homestay di Yogyakarta
                            </h1>

                            <p className="text-muted-foreground">
                                {properties.total} pilihan penginapan untuk semua budget. Bandingkan & sewa sekarang!
                            </p>

                            {(filters.check_in && filters.check_out) && (
                                <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-brand-accent-20 text-brand-accent">
                                    {formatDateRange(localFilters.checkIn, localFilters.checkOut)}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant={showFilters ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white border-brand-primary"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                {t('common.filter')}
                                {(localFilters.selectedAmenities.length > 0 || localFilters.guests > 2 || (filters.check_in && filters.check_out)) && (
                                    <Badge variant="secondary" className="ml-1 bg-brand-accent text-brand-primary">
                                        {localFilters.selectedAmenities.length + (localFilters.guests > 2 ? 1 : 0) + ((filters.check_in && filters.check_out) ? 1 : 0)}
                                    </Badge>
                                )}
                            </Button>


                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <Card className="shadow-sm bg-card border-border">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <Search className="h-5 w-5 text-brand-primary" />
                                {t('properties.search_properties')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('properties.search_placeholder')}
                                        value={localFilters.search}
                                        onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                                        className="pl-10"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>

                                {/* Date Range Selector With Auto Minimum Stay */}
                                <div className="flex-1">
                                    <DateRange
                                        startDate={localFilters.checkIn}
                                        endDate={localFilters.checkOut}
                                        onDateChange={handleDateRangeChange}
                                        autoTrigger={true}
                                        triggerDelay={300}
                                        showFooter={false}
                                        className="w-full"
                                        size="lg"
                                        showNights={true}
                                        startLabel={t('booking.check_in')}
                                        endLabel={t('booking.check_out')}
                                        placeholder={{
                                            start: t('booking.check_in'),
                                            end: t('booking.check_out')
                                        }}
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Select value={localFilters.sort} onValueChange={(value) => {
                                        setLocalFilters(prev => ({ ...prev, sort: value }));
                                        setTimeout(handleSearch, 100);
                                    }}>
                                        <SelectTrigger className="w-full sm:w-[200px]">
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

                                    <Button onClick={() => handleSearch()} className="bg-brand-primary hover:bg-brand-primary-dark text-white w-full sm:w-auto">
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
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
                                                        {categoryAmenities.map((amenity, index) => (
                                                            <div key={amenity.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`amenity-${amenity.id}`}
                                                                    checked={localFilters.selectedAmenities.includes(amenity.id.toString())}
                                                                    onCheckedChange={() => toggleAmenity(amenity.id.toString())}
                                                                />
                                                                <AmenityItem
                                                                    key={`amenity-${amenity.id || amenity.name}-${index}`}
                                                                    amenity={amenity}
                                                                    variant="badge"
                                                                    showName={true}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t">
                                            <Button onClick={() => handleSearch()} className="bg-brand-primary hover:bg-brand-primary-dark text-white w-full sm:w-auto">
                                                {t('properties.apply_filters')}
                                            </Button>
                                            <Button variant="outline" onClick={clearFilters} className="border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-white w-full sm:w-auto">
                                                {t('common.reset')}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Properties Grid */}
                    {properties.data.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {properties.data.map((property, index) => (
                                <PropertyCardEnhanced
                                    key={property.id}
                                    property={property}
                                    priority={index < 2}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-16">
                            <CardContent>
                                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {t('properties.no_properties')}
                                </h3>
                                <p className="text-muted-foreground mb-6">
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

                            <span className="px-4 py-2 text-sm text-muted-foreground">
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
            </div>
        </GuestLayout>
    );
} 
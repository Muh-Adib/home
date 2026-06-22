import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatTime } from '@/utils/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Property, type BreadcrumbItem, type PageProps } from '@/types';
import { KpiTile } from '@/components/property/KpiTile';
import { ChartPerformance } from '@/components/property/ChartPerformance';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonBookingList } from '@/components/ui/skeleton-loader';
import { usePropertyStats } from '@/hooks/usePropertyStats';
import {
    Building2,
    Edit,
    ArrowLeft,
    MapPin,
    Users,
    Bed,
    Bath,
    DollarSign,
    Calendar,
    Clock,
    Star,
    Eye,
    Settings,
    BarChart3,
    TrendingUp,
    ImageIcon,
    List,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    Filter,
    Download
} from 'lucide-react';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import TextFormatMarkdown from '@/components/text-mark-down';
import MediaUpload from '@/components/MediaUpload';

interface SeasonalRate {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    rate_type: 'percentage' | 'fixed' | 'multiplier';
    rate_value: number;
    priority: number;
    is_active: boolean;
}

interface PropertyShowProps extends PageProps {
    property: Property & {
        owner: any;
        amenities: any[];
        media: any[];
        bookings: any[];
        seasonalRates?: SeasonalRate[];
    };
    stats: {
        total_bookings: number;
        confirmed_bookings: number;
        total_revenue: number;
        average_rating: number;
        occupancy_rate: number;
    };
}

export default function PropertyShow({ property, stats }: PropertyShowProps) {
    // Ensure property data exists with safe defaults
    const safeProperty = {
        id: property?.id || 0,
        name: property?.name || 'Unnamed Property',
        slug: property?.slug || '',
        description: property?.description || '',
        address: property?.address || '',
        capacity: property?.capacity || 1,
        capacity_max: property?.capacity_max || property?.capacity || 1,
        bedroom_count: property?.bedroom_count || 1,
        bathroom_count: property?.bathroom_count || 1,
        base_rate: property?.base_rate || 0,
        weekend_premium_percent: property?.weekend_premium_percent || 0,
        weekend_premium_type: property?.weekend_premium_type || 'percentage',
        weekend_premium_fixed: property?.weekend_premium_fixed || 0,
        cleaning_fee: property?.cleaning_fee || 0,
        extra_bed_rate: property?.extra_bed_rate || 0,
        check_in_time: property?.check_in_time || '15:00',
        check_out_time: property?.check_out_time || '11:00',
        min_stay_weekday: property?.min_stay_weekday || 1,
        min_stay_weekend: property?.min_stay_weekend || 1,
        min_stay_peak: property?.min_stay_peak || 1,
        house_rules: property?.house_rules || '',
        status: property?.status || 'inactive',
        is_featured: property?.is_featured || false,
        seo_title: property?.seo_title || '',
        seo_description: property?.seo_description || '',
        owner: property?.owner || null,
        amenities: property?.amenities || [],
        media: property?.media || [],
        bookings: property?.bookings || [],
        seasonalRates: property?.seasonalRates || [],
    };

    // Ensure stats data exists with safe defaults
    const safeStats = {
        total_bookings: stats?.total_bookings || 0,
        confirmed_bookings: stats?.confirmed_bookings || 0,
        total_revenue: stats?.total_revenue || 0,
        average_rating: stats?.average_rating || 0,
        occupancy_rate: stats?.occupancy_rate || 0,
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: safeProperty.name, href: '' },
    ];

    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const [selectedPreset, setSelectedPreset] = useState('this-month');

    // Use the stats hook for enhanced data
    const {
        data: enhancedStats,
        isLoading: statsLoading,
        dateRangePresets,
        formatCurrency: formatCurrencyHook,
        formatPercentage
    } = usePropertyStats({
        propertyId: property.id.toString(),
        from: dateRange.from,
        to: dateRange.to,
        enabled: true
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-4 w-4" />;
            case 'inactive': return <XCircle className="h-4 w-4" />;
            case 'maintenance': return <AlertCircle className="h-4 w-4" />;
            default: return <XCircle className="h-4 w-4" />;
        }
    };

    // Safe data access helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const handlePresetChange = (preset: string) => {
        setSelectedPreset(preset);
        const presetData = dateRangePresets.find(p => p.value === preset);
        if (presetData) {
            const dates = presetData.getDates();
            setDateRange(dates);
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`${property.name} - Admin Dashboard`} />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header - Mobile Optimized */}
                <div className="flex flex-col space-y-4">
                    {/* Back Button - Mobile First */}
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild className="mobile-only">
                            <Link href="/admin/properties">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Link>
                        </Button>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">{safeProperty.name}</h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`${getStatusColor(safeProperty.status)} text-xs sm:text-sm`}>
                                        {getStatusIcon(safeProperty.status)}
                                        <span className="ml-1 capitalize">{safeProperty.status}</span>
                                    </Badge>
                                    {safeProperty.is_featured && (
                                        <Badge variant="secondary" className="text-xs sm:text-sm">
                                            <Star className="h-3 w-3 mr-1" />
                                            Featured
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center text-muted-foreground text-sm sm:text-base">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="line-clamp-2">{safeProperty.address}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                                <Link href={`/properties/${property.slug}`} target="_blank">
                                    <Eye className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Preview</span>
                                    <span className="sm:hidden">View</span>
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                                <Link href={`/admin/properties/${property.slug}/seasonal-rates`}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Seasonal Rates</span>
                                    <span className="sm:hidden">Rates</span>
                                </Link>
                            </Button>
                        </div>
                        <Button asChild className="flex-1 sm:flex-none">
                            <Link href={`/admin/properties/${property.slug}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Property
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI Tiles - Modern Gradient Design */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <KpiTile
                        title="Total Pendapatan"
                        value={formatCurrency(enhancedStats?.kpis?.revenue_total || safeStats.total_revenue)}
                        trend={enhancedStats?.kpis ? {
                            value: Math.round(((enhancedStats.kpis.revenue_total - safeStats.total_revenue) / Math.max(safeStats.total_revenue, 1)) * 100),
                            period: 'vs periode lalu'
                        } : undefined}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={statsLoading}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    />
                    <KpiTile
                        title="Okupansi"
                        value={`${enhancedStats?.kpis?.occupancy_rate || safeStats.occupancy_rate}%`}
                        trend={enhancedStats?.kpis ? {
                            value: Math.round(enhancedStats.kpis.occupancy_rate - safeStats.occupancy_rate),
                            period: 'vs periode lalu'
                        } : undefined}
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={statsLoading}
                        gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    />
                    <KpiTile
                        title="Total Booking"
                        value={enhancedStats?.kpis?.total_bookings || safeStats.total_bookings}
                        trend={enhancedStats?.kpis ? {
                            value: Math.round(((enhancedStats.kpis.total_bookings - safeStats.total_bookings) / Math.max(safeStats.total_bookings, 1)) * 100),
                            period: 'vs periode lalu'
                        } : undefined}
                        icon={<Calendar className="h-5 w-5" />}
                        loading={statsLoading}
                        gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    />
                    <KpiTile
                        title="Rating Rata-rata"
                        value={safeStats.average_rating ? safeStats.average_rating.toFixed(1) : 'N/A'}
                        trend={enhancedStats?.kpis?.average_rating ? {
                            value: Math.round((enhancedStats.kpis.average_rating - safeStats.average_rating) * 10),
                            period: 'vs periode lalu'
                        } : undefined}
                        icon={<Star className="h-5 w-5" />}
                        loading={statsLoading}
                        gradient="bg-gradient-to-br from-purple-500 to-pink-600"
                    />
                </div>

                {/* Performance Chart Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Chart Area */}
                    <div className="xl:col-span-2">
                        {statsLoading ? (
                            <SkeletonChart />
                        ) : (
                            <ChartPerformance
                                data={enhancedStats?.trend || []}
                                loading={statsLoading}
                            />
                        )}
                    </div>

                    {/* Date Range Controls */}
                    <div className="space-y-4">
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Filter className="h-4 w-4" />
                                    Date Range
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="from-date" className="text-xs">From</Label>
                                    <Input
                                        id="from-date"
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="to-date" className="text-xs">To</Label>
                                    <Input
                                        id="to-date"
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="text-sm"
                                    />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="text-xs">Quick Presets</Label>
                                    <div className="space-y-1">
                                        {dateRangePresets.map((preset) => (
                                            <Button
                                                key={preset.value}
                                                variant={selectedPreset === preset.value ? "default" : "outline"}
                                                size="sm"
                                                className="w-full justify-start text-xs"
                                                onClick={() => handlePresetChange(preset.value)}
                                            >
                                                {preset.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Breakdown Stats */}
                        {enhancedStats?.breakdown && (
                            <Card className="card-modern">
                                <CardHeader>
                                    <CardTitle className="text-sm">Booking Sources</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(enhancedStats.breakdown.source).map(([source, count]) => (
                                            <div key={source} className="flex items-center justify-between text-sm">
                                                <span className="capitalize">{source}</span>
                                                <Badge variant="secondary">{count as number}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Main Content Tabs - Modern Design */}
                <Tabs defaultValue="details" className="space-y-6">
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border shadow-sm">
                            <TabsTrigger
                                value="details"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-primary/20 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <Building2 className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Detail Properti</span>
                                <span className="sm:hidden">Detail</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="price"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-primary/20 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <DollarSign className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Harga & Tarif</span>
                                <span className="sm:hidden">Harga</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="media"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-primary/20 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Kelola Media</span>
                                <span className="sm:hidden">Media</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="booking"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-primary/20 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <List className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Riwayat Booking</span>
                                <span className="sm:hidden">Booking</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Details Tab - Enhanced with Better Styling */}
                    <TabsContent value="details" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Basic Information */}
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-lg">
                                    <CardTitle className="flex items-center gap-2 text-blue-700">
                                        <Building2 className="h-5 w-5" />
                                        Informasi Properti
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                                        <div className="mt-2 prose prose-sm max-w-none">
                                            <TextFormatMarkdown text={safeProperty.description || 'Tidak ada deskripsi'} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <label className="text-xs font-medium text-muted-foreground">Kapasitas Tamu</label>
                                            <div className="flex items-center mt-1">
                                                <Users className="h-4 w-4 mr-2 text-blue-500" />
                                                <span className="text-base font-semibold">{safeProperty.capacity} - {safeProperty.capacity_max} orang</span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <label className="text-xs font-medium text-muted-foreground">Kamar</label>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center">
                                                    <Bed className="h-4 w-4 mr-1 text-indigo-500" />
                                                    <span className="font-semibold">{safeProperty.bedroom_count}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Bath className="h-4 w-4 mr-1 text-cyan-500" />
                                                    <span className="font-semibold">{safeProperty.bathroom_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <label className="text-sm font-medium text-muted-foreground">Pemilik</label>
                                        <p className="mt-1 text-sm font-medium">{safeProperty.owner?.name || 'Belum ada pemilik'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Check-in/out & Rules */}
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-lg">
                                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                                        <Clock className="h-5 w-5" />
                                        Jadwal & Peraturan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-50 rounded-xl text-center">
                                            <label className="text-xs font-medium text-emerald-600">Check-in</label>
                                            <p className="mt-1 text-2xl font-bold text-emerald-700">
                                                {safeProperty.check_in_time ? formatTime(safeProperty.check_in_time) : '-'} WIB
                                            </p>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-xl text-center">
                                            <label className="text-xs font-medium text-orange-600">Check-out</label>
                                            <p className="mt-1 text-2xl font-bold text-orange-700">
                                                {safeProperty.check_out_time ? formatTime(safeProperty.check_out_time) : '-'} WIB
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <label className="text-xs font-medium text-muted-foreground">Min. Weekday</label>
                                            <p className="mt-1 text-lg font-bold">{safeProperty.min_stay_weekday}</p>
                                            <span className="text-xs text-muted-foreground">malam</span>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <label className="text-xs font-medium text-muted-foreground">Min. Weekend</label>
                                            <p className="mt-1 text-lg font-bold">{safeProperty.min_stay_weekend}</p>
                                            <span className="text-xs text-muted-foreground">malam</span>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <label className="text-xs font-medium text-muted-foreground">Min. Peak</label>
                                            <p className="mt-1 text-lg font-bold">{safeProperty.min_stay_peak}</p>
                                            <span className="text-xs text-muted-foreground">malam</span>
                                        </div>
                                    </div>

                                    {safeProperty.house_rules && (
                                        <div className="pt-4 border-t">
                                            <label className="text-sm font-medium text-muted-foreground">Peraturan Rumah</label>
                                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="text-sm text-amber-800">
                                                    <TextFormatMarkdown text={safeProperty.house_rules} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Amenities Section */}
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="h-5 w-5" />
                                    Amenities ({safeProperty.amenities?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {safeProperty.amenities && safeProperty.amenities.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {safeProperty.amenities.map((amenity: any, index: number) => (
                                            <div key={amenity.id || index} className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                <span className="text-sm">{amenity.name || 'Unnamed amenity'}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No amenities have been added to this property yet.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Media Section */}
                        <Card className="card-modern">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5" />
                                    Media ({safeProperty.media?.length || 0})
                                </CardTitle>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/properties/${safeProperty.slug}/media`}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {safeProperty.media && safeProperty.media.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {safeProperty.media.slice(0, 8).map((media: any, index: number) => (
                                            <div key={media.id || index} className="relative aspect-[2/3] rounded-lg overflow-hidden border">
                                                <img
                                                    src={media.url || '/placeholder-image.jpg'}
                                                    alt={media.alt_text || safeProperty.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ))}
                                        {safeProperty.media.length > 8 && (
                                            <div className="aspect-[2/3] rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                                <div className="text-center">
                                                    <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                                                    <p className="text-xs text-muted-foreground">+{safeProperty.media.length - 8} more</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No media has been uploaded for this property yet.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* SEO Information */}
                        {(safeProperty.seo_title || safeProperty.seo_description) && (
                            <Card className="card-modern">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-5 w-5" />
                                        SEO Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {safeProperty.seo_title && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">SEO Title</label>
                                            <p className="mt-1 text-sm">{safeProperty.seo_title}</p>
                                        </div>
                                    )}
                                    {safeProperty.seo_description && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">SEO Description</label>
                                            <p className="mt-1 text-sm">{safeProperty.seo_description}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Price Tab - Enhanced with Seasonal Rates */}
                    <TabsContent value="price" className="space-y-6">
                        {/* Basic Pricing Information */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <DollarSign className="h-5 w-5" />
                                    Tarif Dasar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
                                        <label className="text-xs font-medium text-white/80">Harga Dasar</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(safeProperty.base_rate)}</p>
                                        <p className="text-xs text-white/70">per malam</p>
                                    </div>

                                    <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                                        <label className="text-xs font-medium text-white/80">Premium Weekend</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">
                                            {safeProperty.weekend_premium_type === 'fixed' 
                                                ? `+${formatCurrency(safeProperty.weekend_premium_fixed)}` 
                                                : `+${safeProperty.weekend_premium_percent}%`}
                                        </p>
                                        <p className="text-xs text-white/70">
                                            {formatCurrency(
                                                safeProperty.weekend_premium_type === 'fixed'
                                                    ? Number(safeProperty.base_rate) + Number(safeProperty.weekend_premium_fixed)
                                                    : safeProperty.base_rate * (1 + safeProperty.weekend_premium_percent / 100)
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                                        <label className="text-xs font-medium text-white/80">Extra Bed</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(safeProperty.extra_bed_rate)}</p>
                                        <p className="text-xs text-white/70">per malam</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Seasonal Rates Section */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-lg">
                                <CardTitle className="flex items-center gap-2 text-purple-700">
                                    <Calendar className="h-5 w-5" />
                                    Tarif Musiman ({safeProperty.seasonalRates?.length || 0})
                                </CardTitle>
                                <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
                                    <Link href={`/admin/properties/${safeProperty.slug}/seasonal-rates`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Kelola
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {safeProperty.seasonalRates && safeProperty.seasonalRates.length > 0 ? (
                                    <div className="space-y-3">
                                        {safeProperty.seasonalRates.slice(0, 6).map((rate: any, index: number) => {
                                            const isActive = rate.is_active && new Date(rate.start_date) <= new Date() && new Date(rate.end_date) >= new Date();
                                            return (
                                                <div key={rate.id || index} className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                                    {isActive && (
                                                        <div className="absolute -top-2 -left-2">
                                                            <Badge className="bg-green-500 text-white text-xs">Aktif</Badge>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-base">{rate.name || 'Tarif Tanpa Nama'}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            📅 {new Date(rate.start_date || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(rate.end_date || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant="outline" className="text-xs">Prioritas: {rate.priority || 0}</Badge>
                                                            {!rate.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        <Badge className={`text-base px-3 py-1 ${rate.rate_type === 'percentage' ? 'bg-blue-500 text-white' :
                                                            rate.rate_type === 'fixed' ? 'bg-green-500 text-white' :
                                                                'bg-purple-500 text-white'
                                                            }`}>
                                                            {rate.rate_type === 'percentage' ? `${(rate.rate_value || 0) > 0 ? '+' : ''}${rate.rate_value || 0}%` :
                                                                rate.rate_type === 'fixed' ? formatCurrency(rate.rate_value || 0) :
                                                                    `${rate.rate_value || 0}x`}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground mt-2 capitalize">{rate.rate_type}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {safeProperty.seasonalRates.length > 6 && (
                                            <Link href={`/admin/properties/${safeProperty.slug}/seasonal-rates`} className="block text-center p-3 border-2 border-dashed border-purple-300 rounded-xl hover:bg-purple-50 transition-colors">
                                                <p className="text-sm text-purple-600 font-medium">
                                                    Lihat {safeProperty.seasonalRates.length - 6} tarif lainnya →
                                                </p>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <Alert className="bg-purple-50 border-purple-200">
                                        <Info className="h-4 w-4 text-purple-600" />
                                        <AlertDescription className="text-purple-800">
                                            Belum ada tarif musiman. Klik "Kelola" untuk mengatur harga dinamis berdasarkan musim, hari libur, dan permintaan.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Booking Tab - Enhanced with Today Indicators */}
                    <TabsContent value="booking" className="space-y-6">
                        {/* Recent Bookings */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-t-lg">
                                <CardTitle className="flex items-center gap-2 text-orange-700">
                                    <List className="h-5 w-5" />
                                    Riwayat Booking ({safeProperty.bookings?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {statsLoading ? (
                                    <SkeletonBookingList />
                                ) : safeProperty.bookings && safeProperty.bookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {safeProperty.bookings.map((booking: any, index: number) => {
                                            const today = new Date().toDateString();
                                            const checkInDate = new Date(booking.check_in || Date.now());
                                            const checkOutDate = new Date(booking.check_out || Date.now());
                                            const isCheckInToday = checkInDate.toDateString() === today;
                                            const isCheckOutToday = checkOutDate.toDateString() === today;
                                            const isStaying = checkInDate <= new Date() && checkOutDate >= new Date();

                                            return (
                                                <div key={booking.id || index} className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isCheckInToday ? 'border-green-500 bg-green-50' :
                                                    isCheckOutToday ? 'border-orange-500 bg-orange-50' :
                                                        isStaying ? 'border-blue-500 bg-blue-50' :
                                                            'border-gray-100 bg-gray-50'
                                                    }`}>
                                                    {/* Today Indicators */}
                                                    {isCheckInToday && (
                                                        <div className="absolute -top-2 -left-2">
                                                            <Badge className="bg-green-500 text-white text-xs animate-pulse">🔑 Check-in Hari Ini</Badge>
                                                        </div>
                                                    )}
                                                    {isCheckOutToday && (
                                                        <div className="absolute -top-2 -left-2">
                                                            <Badge className="bg-orange-500 text-white text-xs animate-pulse">🚪 Check-out Hari Ini</Badge>
                                                        </div>
                                                    )}
                                                    {!isCheckInToday && !isCheckOutToday && isStaying && (
                                                        <div className="absolute -top-2 -left-2">
                                                            <Badge className="bg-blue-500 text-white text-xs">🏠 Sedang Menginap</Badge>
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-base">{booking.booking_number || 'No. Booking'}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            👤 {booking.guest_name || 'Nama Tamu'} • {booking.guest_count || 0} orang
                                                        </p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                            <span className="text-green-600">📥 {checkInDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                            <span>→</span>
                                                            <span className="text-orange-600">📤 {checkOutDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        <BookingStatusBadge status={booking.booking_status} />
                                                        <p className="text-lg font-bold mt-2 text-emerald-600">
                                                            {formatCurrency(booking.total_amount || 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Alert className="bg-orange-50 border-orange-200">
                                        <Info className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-orange-800">
                                            Belum ada booking untuk properti ini.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-6">
                        <MediaUpload
                            propertySlug={safeProperty.slug}
                            initialMedia={safeProperty.media}
                            maxFiles={50}
                            maxFileSize={100 * 1024 * 1024}
                            acceptedFileTypes={[
                                'image/jpeg',
                                'image/png',
                                'image/jpg',
                                'image/gif',
                                'image/webp',
                                'video/mp4',
                                'video/mov',
                                'video/avi',
                                'video/webm'
                            ]}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
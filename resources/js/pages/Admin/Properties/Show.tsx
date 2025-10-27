import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
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

                {/* KPI Tiles - Modern Compact Design */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <KpiTile
                        title="Total Revenue"
                        value={formatCurrency(safeStats.total_revenue)}
                        trend={enhancedStats?.kpis ? {
                            value: 12.5,
                            period: 'vs last month'
                        } : undefined}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={statsLoading}
                    />
                    <KpiTile
                        title="Occupancy Rate"
                        value={`${safeStats.occupancy_rate}%`}
                        trend={enhancedStats?.kpis ? {
                            value: 8.2,
                            period: 'vs last month'
                        } : undefined}
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={statsLoading}
                    />
                    <KpiTile
                        title="Total Bookings"
                        value={safeStats.total_bookings}
                        trend={enhancedStats?.kpis ? {
                            value: 15.3,
                            period: 'vs last month'
                        } : undefined}
                        icon={<Calendar className="h-5 w-5" />}
                        loading={statsLoading}
                    />
                    <KpiTile
                        title="Average Rating"
                        value={safeStats.average_rating ? safeStats.average_rating.toFixed(1) : 'N/A'}
                        trend={enhancedStats?.kpis ? {
                            value: 2.1,
                            period: 'vs last month'
                        } : undefined}
                        icon={<Star className="h-5 w-5" />}
                        loading={statsLoading}
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

                {/* Main Content Tabs - Restructured to 3 Main Tabs */}
                <Tabs defaultValue="details" className="space-y-6">
                    <div className="overflow-x-auto">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg">
                            <TabsTrigger value="details" className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md">
                                <Building2 className="h-4 w-4 mr-2" />
                                Details
                            </TabsTrigger>
                            <TabsTrigger value="price" className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md">
                                <DollarSign className="h-4 w-4 mr-2" />
                                Price
                            </TabsTrigger>
                            <TabsTrigger value="booking" className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md">
                                <List className="h-4 w-4 mr-2" />
                                Booking
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Details Tab - Enhanced with Amenities and Media */}
                    <TabsContent value="details" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Basic Information */}
                            <Card className="card-modern">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                                        <p className="mt-1 text-sm leading-relaxed">{safeProperty.description}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                                            <div className="flex items-center mt-1">
                                                <Users className="h-4 w-4 mr-2" />
                                                <span className="text-sm">{safeProperty.capacity} - {safeProperty.capacity_max} guests</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Rooms</label>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center">
                                                    <Bed className="h-4 w-4 mr-1" />
                                                    <span className="text-sm">{safeProperty.bedroom_count}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Bath className="h-4 w-4 mr-1" />
                                                    <span className="text-sm">{safeProperty.bathroom_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Owner</label>
                                        <p className="mt-1 text-sm">{safeProperty.owner?.name || 'No owner assigned'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Check-in/out & Rules */}
                            <Card className="card-modern">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5" />
                                        Check-in/out & Rules
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Check-in</label>
                                            <p className="mt-1 text-sm">{safeProperty.check_in_time}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Check-out</label>
                                            <p className="mt-1 text-sm">{safeProperty.check_out_time}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div>
                                            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Min Stay Weekday</label>
                                            <p className="mt-1 text-sm">{safeProperty.min_stay_weekday} nights</p>
                                        </div>
                                        <div>
                                            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Min Stay Weekend</label>
                                            <p className="mt-1 text-sm">{safeProperty.min_stay_weekend} nights</p>
                                        </div>
                                        <div>
                                            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Min Stay Peak</label>
                                            <p className="mt-1 text-sm">{safeProperty.min_stay_peak} nights</p>
                                        </div>
                                    </div>

                                    {safeProperty.house_rules && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">House Rules</label>
                                            <p className="mt-1 text-sm whitespace-pre-wrap">{safeProperty.house_rules}</p>
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
                                            <div key={media.id || index} className="relative aspect-video rounded-lg overflow-hidden border">
                                                <img 
                                                    src={media.url || '/placeholder-image.jpg'} 
                                                    alt={media.alt_text || safeProperty.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ))}
                                        {safeProperty.media.length > 8 && (
                                            <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
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
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Basic Pricing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="text-center p-4 border rounded-lg bg-muted/30">
                                        <label className="text-sm font-medium text-muted-foreground">Base Rate</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(safeProperty.base_rate)}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">per night</p>
                                    </div>
                                    
                                    <div className="text-center p-4 border rounded-lg bg-muted/30">
                                        <label className="text-sm font-medium text-muted-foreground">Weekend Premium</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeProperty.weekend_premium_percent}%</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            {formatCurrency(safeProperty.base_rate * (1 + safeProperty.weekend_premium_percent / 100))}
                                        </p>
                                    </div>
                                    
                                    <div className="text-center p-4 border rounded-lg bg-muted/30">
                                        <label className="text-sm font-medium text-muted-foreground">Cleaning Fee</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(safeProperty.cleaning_fee)}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">one-time</p>
                                    </div>
                                    
                                    <div className="text-center p-4 border rounded-lg bg-muted/30">
                                        <label className="text-sm font-medium text-muted-foreground">Extra Bed Rate</label>
                                        <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(safeProperty.extra_bed_rate)}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">per night</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Seasonal Rates Section */}
                        <Card className="card-modern">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Seasonal Rates ({safeProperty.seasonalRates?.length || 0})
                                </CardTitle>
                                <Button asChild size="sm">
                                    <Link href={`/admin/properties/${safeProperty.slug}/seasonal-rates`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Manage
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {safeProperty.seasonalRates && safeProperty.seasonalRates.length > 0 ? (
                                    <div className="space-y-3">
                                        {safeProperty.seasonalRates.slice(0, 6).map((rate: any, index: number) => (
                                            <div key={rate.id || index} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg bg-muted/20">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-medium text-sm sm:text-base truncate">{rate.name || 'Unnamed rate'}</h4>
                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                        {new Date(rate.start_date || Date.now()).toLocaleDateString('id-ID')} - {new Date(rate.end_date || Date.now()).toLocaleDateString('id-ID')}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <Badge className={
                                                        rate.rate_type === 'percentage' ? 'bg-blue-100 text-blue-800' :
                                                        rate.rate_type === 'fixed' ? 'bg-green-100 text-green-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }>
                                                        {rate.rate_type === 'percentage' ? `${(rate.rate_value || 0) > 0 ? '+' : ''}${rate.rate_value || 0}%` :
                                                         rate.rate_type === 'fixed' ? formatCurrency(rate.rate_value || 0) :
                                                         `${rate.rate_value || 0}x`}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Priority {rate.priority || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {safeProperty.seasonalRates.length > 6 && (
                                            <div className="text-center p-3 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                                                <p className="text-sm text-muted-foreground">
                                                    And {safeProperty.seasonalRates.length - 6} more rates...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No seasonal rates configured yet. Click "Manage" to set up dynamic pricing based on seasons, holidays, and demand.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Booking Tab - Enhanced */}
                    <TabsContent value="booking" className="space-y-6">
                        {/* Recent Bookings */}
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <List className="h-5 w-5" />
                                    Recent Bookings ({safeProperty.bookings?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <SkeletonBookingList />
                                ) : safeProperty.bookings && safeProperty.bookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {safeProperty.bookings.map((booking: any, index: number) => (
                                            <div key={booking.id || index} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg bg-muted/20">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm sm:text-base truncate">{booking.booking_number || 'No booking number'}</p>
                                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                        {booking.guest_name || 'No guest name'} • {booking.guest_count || 0} guests
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                        {new Date(booking.check_in || Date.now()).toLocaleDateString('id-ID')} - {new Date(booking.check_out || Date.now()).toLocaleDateString('id-ID')}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <Badge className={
                                                        booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                        booking.booking_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                                                        booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }>
                                                        {(booking.booking_status || 'unknown').replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                    <p className="text-xs sm:text-sm font-medium mt-1">
                                                        {formatCurrency(booking.total_amount || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No bookings found for this property yet.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
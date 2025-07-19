import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type Property, type BreadcrumbItem, type PageProps } from '@/types';
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
    Plus
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
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: property.name, href: '' },
    ];



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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${property.name} - Admin Dashboard`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/properties">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Link>
                        </Button>
                        
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{property.name}</h1>
                                <Badge className={getStatusColor(property.status)}>
                                    {getStatusIcon(property.status)}
                                    <span className="ml-1 capitalize">{property.status}</span>
                                </Badge>
                                {property.is_featured && (
                                    <Badge variant="secondary">
                                        <Star className="h-3 w-3 mr-1" />
                                        Featured
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                                <MapPin className="h-4 w-4 mr-1" />
                                {property.address}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/properties/${property.slug}`} target="_blank">
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/admin/properties/${property.slug}/seasonal-rates`}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Seasonal Rates
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/admin/properties/${property.slug}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                                    <p className="text-2xl font-bold">{stats.total_bookings}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                                    <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                                    <p className="text-2xl font-bold">{stats.occupancy_rate}%</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Rating</p>
                                    <p className="text-2xl font-bold">{stats.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}</p>
                                </div>
                                <Star className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                                    <p className="text-2xl font-bold">{stats.confirmed_bookings}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="details" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing</TabsTrigger>
                        <TabsTrigger value="seasonal-rates">Seasonal Rates</TabsTrigger>
                        <TabsTrigger value="amenities">Amenities</TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                        <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
                    </TabsList>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                                        <p className="mt-1">{property.description}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                                            <div className="flex items-center mt-1">
                                                <Users className="h-4 w-4 mr-2" />
                                                {property.capacity} - {property.capacity_max} guests
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Rooms</label>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center">
                                                    <Bed className="h-4 w-4 mr-1" />
                                                    {property.bedroom_count}
                                                </div>
                                                <div className="flex items-center">
                                                    <Bath className="h-4 w-4 mr-1" />
                                                    {property.bathroom_count}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Owner</label>
                                        <p className="mt-1">{property.owner?.name}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Check-in/out & Rules */}
                            <Card>
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
                                            <p className="mt-1">{property.check_in_time}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Check-out</label>
                                            <p className="mt-1">{property.check_out_time}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Min Stay Weekday</label>
                                            <p className="mt-1">{property.min_stay_weekday} nights</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Min Stay Weekend</label>
                                            <p className="mt-1">{property.min_stay_weekend} nights</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Min Stay Peak</label>
                                            <p className="mt-1">{property.min_stay_peak} nights</p>
                                        </div>
                                    </div>

                                    {property.house_rules && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">House Rules</label>
                                            <p className="mt-1 whitespace-pre-wrap">{property.house_rules}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* SEO Information */}
                        {(property.seo_title || property.seo_description) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-5 w-5" />
                                        SEO Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {property.seo_title && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">SEO Title</label>
                                            <p className="mt-1">{property.seo_title}</p>
                                        </div>
                                    )}
                                    {property.seo_description && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">SEO Description</label>
                                            <p className="mt-1">{property.seo_description}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Pricing Tab */}
                    <TabsContent value="pricing">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Pricing Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Base Rate</label>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(property.base_rate)}</p>
                                        <p className="text-sm text-muted-foreground">per night</p>
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Weekend Premium</label>
                                        <p className="text-2xl font-bold mt-1">{property.weekend_premium_percent ?? 0}%</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatCurrency(property.base_rate * (1 + (property.weekend_premium_percent ?? 0) / 100))}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Cleaning Fee</label>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(property.cleaning_fee ?? 0)}</p>
                                        <p className="text-sm text-muted-foreground">one-time</p>
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Extra Bed Rate</label>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(property.extra_bed_rate ?? 0)}</p>
                                        <p className="text-sm text-muted-foreground">per night</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Seasonal Rates Tab */}
                    <TabsContent value="seasonal-rates">
                        <Card>
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Seasonal Rates
                                </CardTitle>
                                <Button asChild>
                                    <Link href={`/admin/properties/${property.slug}/seasonal-rates`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Manage Seasonal Rates
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {property.seasonalRates && property.seasonalRates.length > 0 ? (
                                    <div className="space-y-4">
                                        {property.seasonalRates.slice(0, 5).map((rate) => (
                                            <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <h4 className="font-medium">{rate.name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(rate.start_date).toLocaleDateString('id-ID')} - {new Date(rate.end_date).toLocaleDateString('id-ID')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className={
                                                        rate.rate_type === 'percentage' ? 'bg-blue-100 text-blue-800' :
                                                        rate.rate_type === 'fixed' ? 'bg-green-100 text-green-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }>
                                                        {rate.rate_type === 'percentage' ? `${rate.rate_value > 0 ? '+' : ''}${rate.rate_value}%` :
                                                         rate.rate_type === 'fixed' ? formatCurrency(rate.rate_value) :
                                                         `${rate.rate_value}x`}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Priority {rate.priority}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {property.seasonalRates.length > 5 && (
                                            <p className="text-sm text-muted-foreground text-center">
                                                And {property.seasonalRates.length - 5} more rates...
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No seasonal rates configured yet. Click "Manage Seasonal Rates" to set up dynamic pricing based on seasons, holidays, and demand.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Amenities Tab */}
                    <TabsContent value="amenities">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="h-5 w-5" />
                                    Amenities ({property.amenities?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {property.amenities && property.amenities.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {property.amenities.map((amenity: any) => (
                                            <div key={amenity.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span>{amenity.name}</span>
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
                    </TabsContent>

                    {/* Media Tab */}
                    <TabsContent value="media">
                        <Card>
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5" />
                                    Media ({property.media?.length || 0})
                                </CardTitle>
                                <Button variant="outline" asChild>
                                    <Link href={`/admin/properties/${property.slug}/media`}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage Media
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {property.media && property.media.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {property.media.map((media: any) => (
                                            <div key={media.id} className="relative aspect-video rounded-lg overflow-hidden border">
                                                <img 
                                                    src={media.url} 
                                                    alt={media.alt_text || property.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
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
                    </TabsContent>

                    {/* Recent Bookings Tab */}
                    <TabsContent value="bookings">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <List className="h-5 w-5" />
                                    Recent Bookings ({property.bookings?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {property.bookings && property.bookings.length > 0 ? (
                                    <div className="space-y-4">
                                        {property.bookings.map((booking: any) => (
                                            <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{booking.booking_number}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {booking.guest_name} • {booking.guest_count} guests
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {(booking.check_in)} - {(booking.check_out)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className={
                                                        booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                        booking.booking_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                                                        booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }>
                                                        {booking.booking_status.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                    <p className="text-sm font-medium mt-1">
                                                        {formatCurrency(booking.total_amount)}
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
        </AppLayout>
    );
} 

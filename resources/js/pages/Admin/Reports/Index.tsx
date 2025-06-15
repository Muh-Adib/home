import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { 
    BarChart3, 
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Users,
    Building2,
    CreditCard,
    Download,
    Filter,
    ArrowUp,
    ArrowDown,
    Minus,
    PieChart,
    Clock,
    CheckCircle,
    AlertCircle,
    MapPin
} from 'lucide-react';
import { DateRange, getDefaultDateRange } from '@/components/ui/date-range';

interface ReportsOverview {
    totalRevenue: number;
    totalBookings: number;
    averageBookingValue: number;
    occupancyRate: number;
    revenueGrowth: number;
    bookingsGrowth: number;
    occupancyGrowth: number;
}

interface RevenueByMonth {
    month: string;
    revenue: number;
    bookings: number;
}

interface TopProperty {
    id: number;
    name: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
}

interface BookingByStatus {
    status: string;
    count: number;
    percentage: number;
}

interface PaymentMethod {
    method: string;
    count: number;
    amount: number;
    percentage: number;
}

interface GuestCountry {
    country: string;
    count: number;
    percentage: number;
}

interface ReportsData {
    overview: ReportsOverview;
    revenueByMonth: RevenueByMonth[];
    topProperties: TopProperty[];
    bookingsByStatus: BookingByStatus[];
    paymentMethods: PaymentMethod[];
    guestCountries: GuestCountry[];
}

interface Property {
    id: number;
    name: string;
}

interface ReportsIndexProps extends PageProps {
    data: ReportsData;
    properties: Property[];
    filters: {
        date_from?: string;
        date_to?: string;
        property_id?: string;
        report_type?: string;
        period?: string;
    };
}

export default function ReportsIndex({ data, properties, filters }: ReportsIndexProps) {
    const { data: filterData, setData: setFilterData, get: getFilter } = useForm({
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        property_id: filters.property_id || 'all',
        report_type: filters.report_type || 'revenue',
    });

    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period || 'month');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports & Analytics' },
    ];

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        getFilter('/admin/reports', { preserveState: true });
    };

    const handlePeriodChange = (newPeriod: string) => {
        setSelectedPeriod(newPeriod);
        router.get('/admin/reports', { period: newPeriod }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const getGrowthIndicator = (growth: number) => {
        if (growth > 0) return { icon: ArrowUp, color: 'text-green-600' };
        if (growth < 0) return { icon: ArrowDown, color: 'text-red-600' };
        return { icon: Minus, color: 'text-gray-600' };
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: any; label: string }> = {
            'pending_verification': { variant: 'secondary', label: 'Pending' },
            'confirmed': { variant: 'default', label: 'Confirmed' },
            'checked_in': { variant: 'default', label: 'Checked In' },
            'checked_out': { variant: 'outline', label: 'Checked Out' },
            'cancelled': { variant: 'destructive', label: 'Cancelled' },
            'no_show': { variant: 'destructive', label: 'No Show' },
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, any> = {
            'pending_verification': Clock,
            'confirmed': CheckCircle,
            'checked_in': Users,
            'checked_out': CheckCircle,
            'cancelled': AlertCircle,
            'no_show': AlertCircle,
        };
        return icons[status] || Clock;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports & Analytics - Admin Dashboard" />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                        <p className="text-muted-foreground">
                            Comprehensive insights into your property management performance
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="w-full sm:w-auto">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Download className="h-4 w-4 mr-2" />
                            Export Reports
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <Label>Date Range</Label>
                                <DateRange
                                    startDate={filterData.date_from}
                                    endDate={filterData.date_to}
                                    onDateChange={(startDate, endDate) => {
                                        setFilterData('date_from', startDate);
                                        setFilterData('date_to', endDate);
                                    }}
                                    size="md"
                                    showNights={false}
                                    startLabel="From Date"
                                    endLabel="To Date"
                                />
                            </div>

                            <div>
                                <Label htmlFor="property_id">Property</Label>
                                <Select value={filterData.property_id} onValueChange={(value) => setFilterData('property_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Properties" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Properties</SelectItem>
                                        {properties?.map((property) => (
                                            <SelectItem key={property.id} value={property.id.toString()}>
                                                {property.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="report_type">Report Type</Label>
                                <Select value={filterData.report_type} onValueChange={(value) => setFilterData('report_type', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="revenue">Revenue Report</SelectItem>
                                        <SelectItem value="occupancy">Occupancy Report</SelectItem>
                                        <SelectItem value="guests">Guest Report</SelectItem>
                                        <SelectItem value="properties">Property Performance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button type="submit" className="w-full">
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Generate Report
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {(() => {
                                    const { icon: Icon, color } = getGrowthIndicator(data.overview.revenueGrowth);
                                    return (
                                        <div className={`flex items-center gap-1 ${color}`}>
                                            <Icon className="h-3 w-3" />
                                            <span>{Math.abs(data.overview.revenueGrowth)}% from last period</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.overview.totalBookings}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {(() => {
                                    const { icon: Icon, color } = getGrowthIndicator(data.overview.bookingsGrowth);
                                    return (
                                        <div className={`flex items-center gap-1 ${color}`}>
                                            <Icon className="h-3 w-3" />
                                            <span>{Math.abs(data.overview.bookingsGrowth)}% from last period</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data.overview.averageBookingValue)}</div>
                            <p className="text-xs text-muted-foreground">
                                Per booking
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.overview.occupancyRate}%</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {(() => {
                                    const { icon: Icon, color } = getGrowthIndicator(data.overview.occupancyGrowth);
                                    return (
                                        <div className={`flex items-center gap-1 ${color}`}>
                                            <Icon className="h-3 w-3" />
                                            <span>{Math.abs(data.overview.occupancyGrowth)}% from last period</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Analytics Tabs */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="financial">Financial</TabsTrigger>
                        <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
                        <TabsTrigger value="properties">Properties</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Booking Status Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PieChart className="h-5 w-5" />
                                        Booking Status Breakdown
                                    </CardTitle>
                                    <CardDescription>Distribution of booking statuses</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {data.bookingsByStatus.map(({ status, count, percentage }) => {
                                            const Icon = getStatusIcon(status);
                                            return (
                                                <div key={status} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                        {getStatusBadge(status)}
                                                        <span className="text-sm font-medium">{count} bookings</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-muted-foreground w-10">{percentage}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Properties */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Top Performing Properties
                                    </CardTitle>
                                    <CardDescription>Properties with highest revenue</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {data.topProperties.slice(0, 5).map((property, index) => (
                                            <div key={property.id} className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{property.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {property.bookings} bookings • {formatCurrency(property.revenue)}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <Badge variant="outline">{property.occupancyRate}%</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Payment Methods */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Methods
                                    </CardTitle>
                                    <CardDescription>Distribution by payment methods</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {data.paymentMethods.map((method) => (
                                            <div key={method.method} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium">{method.method}</span>
                                                    <span className="text-xs text-muted-foreground">({method.count} payments)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{formatCurrency(method.amount)}</span>
                                                    <span className="text-xs text-muted-foreground">({method.percentage}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Guest Countries */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Guest Countries
                                    </CardTitle>
                                    <CardDescription>Breakdown by guest nationality</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {data.guestCountries.map((country) => (
                                            <div key={country.country} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium">{country.country}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-green-600 h-2 rounded-full transition-all"
                                                            style={{ width: `${country.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-16">{country.count} ({country.percentage}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Revenue Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Total Revenue</span>
                                            <span className="font-medium">{formatCurrency(data.overview.totalRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Average per Booking</span>
                                            <span className="font-medium">{formatCurrency(data.overview.averageBookingValue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Total Bookings</span>
                                            <span className="font-medium">{data.overview.totalBookings}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>Revenue Trends</CardTitle>
                                    <CardDescription>Monthly revenue over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {data.revenueByMonth.slice(-6).map((month) => (
                                            <div key={month.month} className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{month.month}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm">{month.bookings} bookings</span>
                                                    <span className="font-medium">{formatCurrency(month.revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="occupancy" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Occupancy Analytics</CardTitle>
                                <CardDescription>Property utilization and performance metrics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">Occupancy Analytics</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Detailed occupancy analysis with booking patterns and seasonal trends
                                    </p>
                                    <Button asChild>
                                        <Link href="/admin/reports/occupancy">
                                            View Detailed Occupancy Report
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="properties" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Property Performance</CardTitle>
                                <CardDescription>Individual property analytics and comparison</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.topProperties.map((property, index) => (
                                        <div key={property.id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{property.name}</h4>
                                                <Badge variant="outline">Rank #{index + 1}</Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Revenue</p>
                                                    <p className="font-medium">{formatCurrency(property.revenue)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Bookings</p>
                                                    <p className="font-medium">{property.bookings}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Occupancy</p>
                                                    <p className="font-medium">{property.occupancyRate}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 

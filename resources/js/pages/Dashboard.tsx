import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    MapPin,
    Eye,
    Building2,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Users,
    Percent,
    BarChart3,
    ArrowUpRight,
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { BreadcrumbItem, PageProps, User } from '@/types';
import { ChartRevenue } from '@/components/charts/ChartRevenue';
import { ChartBookingTrends } from '@/components/charts/ChartBookingTrends';
import { PropertiesMap } from '@/components/ui/properties-map';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { RevenueBreakdownCard } from '@/components/dashboard/RevenueBreakdownCard';
import { DashboardData, PropertyPerformance } from '@/types/dashboard';

interface DashboardProps extends DashboardData { }

// KPI Card Component
function KPICard({ 
    title, 
    value, 
    change, 
    trend, 
    icon: Icon, 
    prefix = '',
    suffix = '',
    color = 'emerald'
}: { 
    title: string; 
    value: number | string; 
    change?: number; 
    trend?: 'up' | 'down';
    icon: any;
    prefix?: string;
    suffix?: string;
    color?: string;
}) {
    const formatValue = (val: number | string) => {
        if (typeof val === 'number') {
            if (prefix === 'Rp') {
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(val);
            }
            return val.toLocaleString('id-ID');
        }
        return val;
    };

    const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600', icon: 'bg-emerald-100 dark:bg-emerald-900' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600', icon: 'bg-blue-100 dark:bg-blue-900' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600', icon: 'bg-purple-100 dark:bg-purple-900' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600', icon: 'bg-orange-100 dark:bg-orange-900' },
    };

    const colors = colorClasses[color] || colorClasses.emerald;

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                            {formatValue(value)}{suffix}
                        </p>
                        {change !== undefined && (
                            <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                {trend === 'up' ? (
                                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                                <span>{Math.abs(change)}%</span>
                                <span className="text-muted-foreground font-normal">vs last month</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl ${colors.icon}`}>
                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.text}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Property Performance Card Component
function PropertyPerformanceCard({ data }: { data: PropertyPerformance[] }) {
    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) {
            return `Rp ${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `Rp ${(amount / 1000).toFixed(0)}K`;
        }
        return `Rp ${amount}`;
    };

    const maxRevenue = Math.max(...data.map(p => p.total_revenue || 0), 1);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Property Performance
                        </CardTitle>
                        <CardDescription>This month's top performers</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/reports">
                            View All
                            <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {data && data.length > 0 ? (
                    data.map((property, index) => (
                        <div key={property.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-sm truncate">{property.name}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <p className="font-semibold text-sm">{formatCurrency(property.total_revenue || 0)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {property.total_bookings} bookings
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Progress 
                                    value={((property.total_revenue || 0) / maxRevenue) * 100} 
                                    className="h-2 flex-1" 
                                />
                                <Badge variant="outline" className="text-xs">
                                    {property.occupancy_rate}%
                                </Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No property data available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    kpis,
    recentActivity,
    todaysAgenda,
    quickStats,
    revenueChart,
    revenueBreakdown,
    bookingTrends,
    propertyPerformance,
    upcomingBookings
}: DashboardProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/dashboard' },
        { title: 'Dashboard' },
    ];

    const getRoleDisplayName = (role: User['role']) => {
        const roleNames: Record<User['role'], string> = {
            super_admin: 'Super Administrator',
            property_owner: 'Property Owner',
            property_manager: 'Property Manager',
            front_desk: 'Front Desk',
            finance: 'Finance',
            housekeeping: 'Housekeeping',
            guest: 'Guest',
        };
        return roleNames[role];
    };

    const isAdminRole = ['super_admin', 'property_manager', 'property_owner', 'finance'].includes(auth.user.role);

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Dashboard">
            <Head title="Dashboard - Homsjogja" />

            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Welcome back, {auth.user.name}!
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {getRoleDisplayName(auth.user.role)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards - Always visible for admin roles */}
                {isAdminRole && kpis && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <KPICard
                            title="Monthly Revenue"
                            value={kpis.revenue?.value || 0}
                            change={kpis.revenue?.change}
                            trend={kpis.revenue?.trend}
                            icon={DollarSign}
                            prefix="Rp"
                            color="emerald"
                        />
                        <KPICard
                            title="Total Bookings"
                            value={kpis.bookings?.value || 0}
                            change={kpis.bookings?.change}
                            trend={kpis.bookings?.trend}
                            icon={Calendar}
                            color="blue"
                        />
                        <KPICard
                            title="Occupancy Rate"
                            value={kpis.occupancy?.value || 0}
                            change={kpis.occupancy?.change}
                            trend={kpis.occupancy?.trend}
                            icon={Percent}
                            suffix="%"
                            color="purple"
                        />
                        <KPICard
                            title="Pending Actions"
                            value={kpis.pending_actions?.value || 0}
                            icon={Users}
                            color="orange"
                        />
                    </div>
                )}

                {/* Quick Stats for non-admin */}
                {!isAdminRole && quickStats && (
                    <div className="grid grid-cols-2 gap-3">
                        <KPICard
                            title="Active Properties"
                            value={quickStats.active_properties || 0}
                            icon={Building2}
                            color="blue"
                        />
                        <KPICard
                            title="Upcoming Arrivals"
                            value={quickStats.upcoming_arrivals || 0}
                            icon={Calendar}
                            color="emerald"
                        />
                    </div>
                )}

                {/* Main Content Grid - Admin View */}
                {isAdminRole && (
                    <>
                        {/* Charts Row - Revenue & Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="lg:col-span-2">
                                <Card className="h-[350px] sm:h-[400px]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg">Revenue Trend</CardTitle>
                                        <CardDescription>Last 12 months</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[280px] sm:h-[320px]">
                                        <ChartRevenue data={revenueChart || []} />
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-1">
                                <RevenueBreakdownCard data={revenueBreakdown} />
                            </div>
                        </div>

                        {/* Second Row - Bookings & Property Performance */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <Card className="h-[350px] sm:h-[400px]">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base sm:text-lg">Booking Trends</CardTitle>
                                    <CardDescription>Last 30 days</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[280px] sm:h-[320px]">
                                    <ChartBookingTrends data={bookingTrends || []} />
                                </CardContent>
                            </Card>
                            <PropertyPerformanceCard data={propertyPerformance || []} />
                        </div>

                        {/* Third Row - Quick Actions, Activity, Agenda */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            <QuickActions user={auth.user} />
                            {auth.user.role !== 'housekeeping' && (
                                <RecentActivity activities={recentActivity || []} />
                            )}
                            <TodayAgenda agenda={todaysAgenda || []} />
                        </div>
                    </>
                )}

                {/* Non-admin content */}
                {!isAdminRole && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <QuickActions user={auth.user} />
                        {auth.user.role === 'front_desk' && (
                            <TodayAgenda agenda={todaysAgenda || []} />
                        )}
                    </div>
                )}

                {/* Properties Map - Admin only */}
                {['super_admin', 'property_manager', 'property_owner'].includes(auth.user.role) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Properties Location
                            </CardTitle>
                            <CardDescription>
                                View all property locations on an interactive map
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PropertiesMap height="400px" />
                        </CardContent>
                    </Card>
                )}

                {/* Guest-specific content */}
                {auth.user.role === 'guest' && upcomingBookings && upcomingBookings.length > 0 && (
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-blue-900">Upcoming Bookings</CardTitle>
                            <CardDescription>Your next stays with check-in instructions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-shadow bg-white">
                                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                                <Building2 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{booking.property.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <span>{new Date(booking.check_in).toLocaleDateString("id-ID")}</span>
                                                    <span>-</span>
                                                    <span>{new Date(booking.check_out).toLocaleDateString("id-ID")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="shrink-0">
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {auth.user.role === 'guest' && (!upcomingBookings || upcomingBookings.length === 0) && (
                    <Card className="bg-gray-50/50 border-dashed">
                        <CardContent className="text-center py-12">
                            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2 text-gray-900">No Upcoming Bookings</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                You don't have any upcoming bookings with check-in instructions available.
                            </p>
                            <Button asChild className="rounded-full px-8">
                                <Link href="/properties">
                                    Browse Properties
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}

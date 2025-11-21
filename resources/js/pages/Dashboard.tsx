import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Building2,
    Calendar,
    CreditCard,
    AlertCircle,
    CheckCircle,
    Clock,
    Eye,
    Plus,
    BarChart3,
    Filter,
    Download,
    RefreshCw,
    Home,
    Key,
    MapPin,
    Info,
    Phone
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { type User, type BreadcrumbItem, type PageProps } from '@/types';
import { ChartRevenue } from '@/components/charts/ChartRevenue';
import { ChartBookingTrends } from '@/components/charts/ChartBookingTrends';
import { ChartPropertyPerformance } from '@/components/charts/ChartPropertyPerformance';
import { PropertiesMap } from '@/components/ui/properties-map';

interface KPIData {
    value: number;
    change: number;
    trend: 'up' | 'down';
    label: string;
    prefix?: string;
    suffix?: string;
    verifications?: number;
    payments?: number;
}

interface QuickStats {
    total_properties: number;
    active_properties: number;
    current_guests: number;
    upcoming_arrivals: number;
}

interface RecentActivity {
    id: number;
    type: 'booking' | 'payment';
    title: string;
    description: string;
    time: string;
    status: string;
    icon: string;
    href: string;
}

interface TodayAgenda {
    type: 'check_in' | 'check_out' | 'verification';
    title: string;
    description: string;
    time: string | null;
    booking_id: number;
    status: string;
}

interface RevenueChart {
    month: string;
    revenue: number;
    month_short: string;
}

interface BookingTrend {
    date: string;
    day: string;
    bookings: number;
}

interface PropertyPerformance {
    id: number;
    name: string;
    total_bookings: number;
    total_revenue: number;
    occupancy_rate: number;
}

interface GuestBooking {
    id: number;
    booking_number: string;
    property: {
        name: string;
        address: string;
    };
    check_in: string;
    check_out: string;
    guest_count: number;
    total_amount: number;
    can_show_instructions: boolean;
    checkin_instructions: {
        welcome?: string;
        keybox_location?: string;
        keybox_code?: string;
        checkin_time?: string;
        emergency_contact?: string;
        additional_info?: string[];
    } | null;
    status: string;
    payment_status: string;
}

interface DashboardData {
    kpis: {
        revenue: KPIData;
        bookings: KPIData;
        occupancy: KPIData;
        pending_actions: KPIData;
    };
    recentActivity: RecentActivity[];
    todaysAgenda: TodayAgenda[];
    quickStats: QuickStats;
    revenueChart: RevenueChart[];
    bookingTrends: BookingTrend[];
    propertyPerformance: PropertyPerformance[];
    upcomingBookings?: GuestBooking[]; // For guest users
}

interface DashboardProps extends DashboardData {}

// Interface untuk stat item yang akan ditampilkan
interface StatItem {
    title: string;
    value: number | string;
    icon: React.ForwardRefExoticComponent<any>;
    color: string;
    bg: string;
    change?: number;
    trend?: 'up' | 'down';
    format?: 'currency' | 'percentage';
}

// Component untuk stats berdasarkan role
function DashboardStats({ user, kpis, quickStats }: { user: User; kpis: DashboardData['kpis']; quickStats: QuickStats }) {
    const getStatsForRole = (role: User['role']): StatItem[] => {
        const baseStats: StatItem[] = [
            {
                title: 'Total Properties',
                value: quickStats.total_properties,
                icon: Building2,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
            },
            {
                title: 'Active Properties',
                value: quickStats.active_properties,
                icon: Home,
                color: 'text-green-600',
                bg: 'bg-green-50',
            },
        ];

        const roleStats: Record<User['role'], StatItem[]> = {
            super_admin: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Total Bookings',
                    value: kpis.bookings.value,
                    icon: Calendar,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    change: kpis.bookings.change,
                    trend: kpis.bookings.trend,
                },
                {
                    title: 'Occupancy Rate',
                    value: kpis.occupancy.value,
                    icon: TrendingUp,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    format: 'percentage',
                    change: kpis.occupancy.change,
                    trend: kpis.occupancy.trend,
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                {
                    title: 'Pending Actions',
                    value: kpis.pending_actions.value,
                    icon: AlertCircle,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
                ...baseStats,
            ],
            property_owner: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Occupancy Rate',
                    value: kpis.occupancy.value,
                    icon: TrendingUp,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    format: 'percentage',
                    change: kpis.occupancy.change,
                    trend: kpis.occupancy.trend,
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                ...baseStats,
            ],
            property_manager: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Pending Actions',
                    value: kpis.pending_actions.value,
                    icon: CreditCard,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                ...baseStats,
            ],
            front_desk: [
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                {
                    title: 'Upcoming Arrivals',
                    value: quickStats.upcoming_arrivals,
                    icon: CheckCircle,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                },
                ...baseStats,
            ],
            finance: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Pending Payments',
                    value: kpis.pending_actions.payments || 0,
                    icon: CreditCard,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
            ],
            housekeeping: [
                {
                    title: 'Active Properties',
                    value: quickStats.active_properties,
                    icon: Home,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
            ],
            guest: [
                {
                    title: 'Upcoming Trips',
                    value: quickStats.upcoming_arrivals,
                    icon: Calendar,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                },
                {
                    title: 'Available Properties',
                    value: quickStats.active_properties,
                    icon: Building2,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                },
            ],
        };

        return roleStats[role] || baseStats;
    };

    const userStats = getStatsForRole(user.role);

    const formatValue = (value: number | string, format?: string) => {
        if (typeof value === 'string') return value;
        
        switch (format) {
            case 'currency':
                const numericValue = Number(value); // pastikan jadi number
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(numericValue);
            case 'percentage':
                return `${value}%`;
            default:
                return value.toLocaleString('id-ID');
        }
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {userStats.map((stat, index) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
                const trendColor = stat.trend === 'up' ? 'text-green-600' : 'text-red-600';
                
                return (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </p>
                                    <p className="text-xl md:text-2xl font-bold">
                                        {formatValue(stat.value, stat.format)}
                                    </p>
                                    {stat.change !== undefined && (
                                        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                                            <TrendIcon className="h-3 w-3" />
                                            <span>{Math.abs(stat.change)}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className={`p-2 md:p-3 rounded-full ${stat.bg}`}>
                                    <Icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// Component untuk quick actions berdasarkan role
function RoleBasedActions({ user }: { user: User }) {
    const getActionsForRole = (role: User['role']) => {
        const roleActions: Record<User['role'], Array<{ title: string; href: string; icon: any; variant?: 'default' | 'secondary' }>> = {
            super_admin: [
                { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
                { title: 'View Reports', href: '/admin/reports', icon: TrendingUp, variant: 'secondary' },
                { title: 'Manage Users', href: '/admin/users', icon: Users, variant: 'secondary' },
            ],
            property_owner: [
                { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
                { title: 'View Reports', href: '/admin/reports', icon: TrendingUp, variant: 'secondary' },
            ],
            property_manager: [
                { title: 'New Booking', href: '/admin/bookings/create', icon: Calendar },
                { title: 'Check Payments', href: '/admin/payments', icon: CreditCard, variant: 'secondary' },
            ],
            front_desk: [
                { title: 'Check In Guest', href: '/admin/checkin', icon: CheckCircle },
                { title: 'View Bookings', href: '/admin/bookings', icon: Calendar, variant: 'secondary' },
            ],
            finance: [
                { title: 'Verify Payments', href: '/admin/payments', icon: CreditCard },
                { title: 'Financial Report', href: '/admin/reports/financial', icon: DollarSign, variant: 'secondary' },
            ],
            housekeeping: [
                { title: 'Room Status', href: '/admin/rooms', icon: Home },
                { title: 'Maintenance Log', href: '/admin/maintenance', icon: AlertCircle, variant: 'secondary' },
            ],
            guest: [
                { title: 'Browse Properties', href: '/properties', icon: Building2 },
                { title: 'My Bookings', href: '/my-bookings', icon: Calendar, variant: 'secondary' },
            ],
        };

        return roleActions[role] || [];
    };

    const actions = getActionsForRole(user.role);

    if (actions.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Frequently used actions for your role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={index}
                                variant={action.variant || 'default'}
                                className="justify-start h-auto p-3"
                                asChild
                            >
                                <a href={action.href}>
                                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="text-sm">{action.title}</span>
                                </a>
                            </Button>
                        );
                    })}
                </div>
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

    const getIconComponent = (iconName: string) => {
        const icons: Record<string, any> = {
            Calendar,
            DollarSign,
            CreditCard,
            Users,
            Building2,
            CheckCircle,
            Clock,
            AlertCircle,
        };
        return icons[iconName] || Calendar;
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Dashboard">
            <Head title="Dashboard - Homsjogja" />
            
            <div className="space-y-6">
                {/* Header Section */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                                Welcome back, {auth.user.name}!
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
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
                </div>

                {/* Stats Section */}
                <DashboardStats user={auth.user} kpis={kpis} quickStats={quickStats} />

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="lg:col-span-1">
                        <RoleBasedActions user={auth.user} />
                    </div>

                    {/* Recent Activity */}
                    {(auth.user.role !== 'guest' && auth.user.role !== 'housekeeping') && (
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                                    <CardDescription>Latest system activities</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {recentActivity.slice(0, 5).map((activity, index) => (
                                        <div key={index} className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            {React.createElement(getIconComponent(activity.icon), {
                                              className: "h-4 w-4 text-blue-600"
                                            })}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900">
                                            {activity.title}
                                          </p>
                                      
                                          {/* Kalau activity.description ada link */}
                                          <p className="text-sm text-gray-500">
                                            <a
                                              href={activity.href}
                                              className="text-blue-600 hover:underline"
                                              target="_blank" // kalau mau buka tab baru
                                              rel="noopener noreferrer"
                                            >
                                              {activity.description}
                                            </a>
                                          </p>
                                      
                                          <p className="text-xs text-gray-400 mt-1">
                                            {activity.time}
                                          </p>
                                        </div>
                                      </div>
                                      
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Today's Agenda */}
                    {auth.user.role !== 'guest' && (
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Today's Agenda</CardTitle>
                                    <CardDescription>Upcoming tasks and events</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {todaysAgenda.slice(0, 5).map((agenda, index) => (
                                        <div key={index} className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                    <Clock className="h-4 w-4 text-green-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {agenda.title}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {agenda.description}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {agenda.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Charts Section */}
                {auth.user.role !== 'guest' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Overview</CardTitle>
                                <CardDescription>Monthly revenue trends</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                
                                </div>
                            </CardContent>
                        </Card>
                        
                        <ChartRevenue data={revenueChart} />
                        <ChartBookingTrends data={bookingTrends} />
                        <ChartPropertyPerformance data={propertyPerformance} />

                        {/* Booking Trends */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Trends</CardTitle>
                                <CardDescription>Booking patterns over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    Chart component will be implemented here
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Properties Map Section - Visible for admin roles */}
                {(auth.user.role === 'super_admin' || auth.user.role === 'property_manager' || auth.user.role === 'property_owner') && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Properties Location Map
                                    </CardTitle>
                                    <CardDescription>
                                        View all property locations on an interactive map
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <PropertiesMap height="500px" />
                        </CardContent>
                    </Card>
                )}

                {/* Guest-specific content */}
                {auth.user.role === 'guest' && upcomingBookings && upcomingBookings.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Bookings</CardTitle>
                            <CardDescription>Your next stays with check-in instructions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Building2 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{booking.property.name}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline">
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
                    <Card>
                        <CardContent className="text-center py-12">
                            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Upcoming Bookings</h3>
                            <p className="text-muted-foreground mb-4">
                                You don't have any upcoming bookings with check-in instructions available.
                            </p>
                            <Button asChild>
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

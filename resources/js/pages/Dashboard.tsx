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
    Home
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type User, type BreadcrumbItem, type PageProps } from '@/types';

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
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                }).format(value);
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
    propertyPerformance 
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header Section */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
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
                                    {recentActivity.slice(0, 5).map((activity) => {
                                        const Icon = getIconComponent(activity.icon);
                                        return (
                                            <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="p-2 bg-background rounded-full">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate">
                                                            {activity.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {activity.description}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(activity.time).toLocaleString('id-ID')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={activity.status === 'confirmed' || activity.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                                                    {activity.status}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                    {recentActivity.length === 0 && (
                                        <div className="text-center text-muted-foreground py-6">
                                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No recent activity</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Today's Agenda */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Today's Agenda</CardTitle>
                                <CardDescription>
                                    {auth.user.role === 'front_desk' ? 'Check-ins and check-outs' : 'Tasks and schedule'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {todaysAgenda.slice(0, 5).map((item, index) => {
                                    const getBadgeVariant = (type: string, status: string) => {
                                        if (type === 'check_in') return 'default';
                                        if (type === 'check_out') return 'secondary';
                                        if (status === 'pending') return 'destructive';
                                        return 'default';
                                    };

                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{item.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                                {item.time && (
                                                    <p className="text-xs text-muted-foreground">{item.time}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={getBadgeVariant(item.type, item.status)} className="text-xs">
                                                    {item.type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                                {todaysAgenda.length === 0 && (
                                    <div className="text-center text-muted-foreground py-6">
                                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No agenda for today</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Property Performance - Only for admin/owner roles */}
                {(auth.user.role === 'super_admin' || auth.user.role === 'property_owner') && propertyPerformance.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Property Performance</CardTitle>
                            <CardDescription>Top performing properties</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {propertyPerformance.map((property) => (
                                    <div key={property.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                        <div className="space-y-1">
                                            <p className="font-medium">{property.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {property.total_bookings} bookings • {property.occupancy_rate}% occupancy
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0,
                                                }).format(property.total_revenue)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Revenue</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

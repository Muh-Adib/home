import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MapPin,
    Eye,
    Building2,
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { BreadcrumbItem, PageProps, User } from '@/types';
import { ChartRevenue } from '@/components/charts/ChartRevenue';
import { ChartBookingTrends } from '@/components/charts/ChartBookingTrends';
import { ChartPropertyPerformance } from '@/components/charts/ChartPropertyPerformance';
import { PropertiesMap } from '@/components/ui/properties-map';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { DashboardData } from '@/types/dashboard';

interface DashboardProps extends DashboardData { }

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

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Dashboard">
            <Head title="Dashboard - Homsjogja" />

            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                                Welcome back, {auth.user.name}!
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {getRoleDisplayName(auth.user.role)}
                                </Badge>
                                <span className="text-sm text-gray-500">
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
                    <div className="lg:col-span-1 h-full">
                        <QuickActions user={auth.user} />
                    </div>

                    {/* Recent Activity */}
                    {(auth.user.role !== 'guest' && auth.user.role !== 'housekeeping') && (
                        <div className="lg:col-span-1 h-full">
                            <RecentActivity activities={recentActivity} />
                        </div>
                    )}

                    {/* Today's Agenda */}
                    {auth.user.role !== 'guest' && (
                        <div className="lg:col-span-1 h-full">
                            <TodayAgenda agenda={todaysAgenda} />
                        </div>
                    )}
                </div>

                {/* Charts Section */}
                {auth.user.role !== 'guest' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartRevenue data={revenueChart} />
                        <ChartBookingTrends data={bookingTrends} />
                        <div className="lg:col-span-2">
                            <ChartPropertyPerformance data={propertyPerformance} />
                        </div>
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
                    <Card className="border-l-4 border-l-blue-500 border-none shadow-md">
                        <CardHeader className="bg-blue-50/50">
                            <CardTitle className="text-blue-900">Upcoming Bookings</CardTitle>
                            <CardDescription>Your next stays with check-in instructions</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
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

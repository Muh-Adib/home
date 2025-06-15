import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Plus,
    Users,
    Building2,
    TrendingUp,
    Clock,
    DollarSign
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    base_rate: number;
    formatted_base_rate: string;
}

interface RecentBooking {
    id: number;
    booking_number: string;
    guest_name: string;
    property_name: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
    total_amount: number;
    created_at: string;
}

interface BookingStats {
    total_bookings: number;
    confirmed_bookings: number;
    pending_bookings: number;
    total_revenue: number;
    occupancy_rate: number;
    average_booking_value: number;
}

interface IndexProps {
    properties: Property[];
    recentBookings: RecentBooking[];
    stats: BookingStats;
}

export default function Index({ properties, recentBookings, stats }: IndexProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'checked_in': return 'bg-blue-100 text-blue-800';
            case 'checked_out': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Booking Management', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Booking Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
                        <p className="text-gray-600 mt-1">
                            Manage property bookings, availability, and calendar timeline
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.bookings.index')}>
                            <Button variant="outline">
                                <Users className="h-4 w-4 mr-2" />
                                All Bookings
                            </Button>
                        </Link>
                        <Link href={route('admin.booking-management.calendar')}>
                            <Button variant="outline">
                                <Calendar className="h-4 w-4 mr-2" />
                                Calendar View
                            </Button>
                        </Link>
                        <Link href={route('admin.booking-management.create')}>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Booking
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total_bookings}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.confirmed_bookings}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_revenue)}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <DollarSign className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                                    <p className="text-2xl font-bold text-orange-600">{stats.occupancy_rate}%</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-full">
                                    <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link href={route('admin.booking-management.create')}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-6 text-center">
                                        <Plus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                        <h3 className="font-semibold text-gray-900">Create New Booking</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Manually create a booking for guests
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href={route('admin.booking-management.calendar')}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-6 text-center">
                                        <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                        <h3 className="font-semibold text-gray-900">Calendar Timeline</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            View bookings in calendar format by property
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href={route('admin.bookings.index')}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-6 text-center">
                                        <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                                        <h3 className="font-semibold text-gray-900">All Bookings</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Manage existing bookings and statuses
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Properties Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Properties Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {properties.slice(0, 6).map(property => (
                                <Card key={property.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900 line-clamp-1">
                                                {property.name}
                                            </h4>
                                            <Badge variant="outline" className="text-xs">
                                                {property.formatted_base_rate}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                            {property.address}
                                        </p>
                                        <div className="flex gap-2">
                                            <Link href={route('admin.booking-management.calendar', { property: property.slug })}>
                                                <Button size="sm" variant="outline" className="text-xs">
                                                    View Calendar
                                                </Button>
                                            </Link>
                                            <Link href={route('admin.booking-management.create', { property: property.slug })}>
                                                <Button size="sm" className="text-xs">
                                                    Create Booking
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Bookings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Recent Bookings</span>
                            <Link href={route('admin.bookings.index')}>
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentBookings.length > 0 ? (
                            <div className="space-y-4">
                                {recentBookings.map(booking => (
                                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-gray-900">
                                                    {booking.guest_name}
                                                </h4>
                                                <Badge className={getStatusColor(booking.booking_status)}>
                                                    {booking.booking_status}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    #{booking.booking_number}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span>{booking.property_name}</span>
                                                <span>•</span>
                                                <span>{formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}</span>
                                                <span>•</span>
                                                <span className="font-medium text-blue-600">
                                                    {formatCurrency(booking.total_amount)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('admin.bookings.show', booking.id)}>
                                                <Button size="sm" variant="outline">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    No recent bookings
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Start by creating your first booking
                                </p>
                                <Link href={route('admin.booking-management.create')}>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Booking
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
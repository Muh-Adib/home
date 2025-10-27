import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { BookingTimeline } from '@/components/booking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    Calendar, 
    Building2, 
    Users, 
    DollarSign,
    Filter,
    BarChart3
} from 'lucide-react';
import { type Property, type Booking, type BreadcrumbItem, type PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

interface TimelinePageProps extends PageProps {
    properties: Property[];
    bookings: Booking[];
    filters: {
        property_id?: string;
        status?: string;
        days?: string;
    };
    stats: {
        total_bookings: number;
        pending_verification: number;
        confirmed: number;
        checked_in: number;
        total_revenue: number;
    };
}

export default function TimelinePage({ properties, bookings, filters, stats }: TimelinePageProps) {
    const { auth } = usePage<PageProps>().props;
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedDays, setSelectedDays] = useState(filters.days || '14');
    const [loading, setLoading] = useState(false);

    // Check permissions
    const canVerify = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCancel = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCheckIn = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);

    // Filter properties based on user role
    const filteredProperties = properties.filter(property => {
        if (selectedProperty === 'all') return true;
        return property.id.toString() === selectedProperty;
    });

    // Filter bookings based on selected filters
    const filteredBookings = bookings.filter(booking => {
        if (selectedProperty !== 'all' && booking.property_id.toString() !== selectedProperty) {
            return false;
        }
        if (selectedStatus !== 'all' && booking.booking_status !== selectedStatus) {
            return false;
        }
        return true;
    });

    const handleFilterChange = (type: string, value: string) => {
        const newFilters = { ...filters };
        
        switch (type) {
            case 'property':
                newFilters.property_id = value === 'all' ? undefined : value;
                setSelectedProperty(value);
                break;
            case 'status':
                newFilters.status = value === 'all' ? undefined : value;
                setSelectedStatus(value);
                break;
            case 'days':
                newFilters.days = value;
                setSelectedDays(value);
                break;
        }

        router.get('/admin/bookings/timeline', newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleRefresh = () => {
        setLoading(true);
        router.reload({
            only: ['bookings', 'properties'],
            onFinish: () => setLoading(false),
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Booking Management', href: '/admin/bookings' },
        { title: 'Timeline', href: '#' },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Booking Timeline" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Timeline</h1>
                        <p className="text-gray-600 mt-1">
                            Visual timeline view of all property bookings
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Bookings</p>
                                    <p className="text-2xl font-bold">{stats.total_bookings}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Users className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pending_verification}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Building2 className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Confirmed</p>
                                    <p className="text-2xl font-bold">{stats.confirmed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Checked In</p>
                                    <p className="text-2xl font-bold">{stats.checked_in}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Revenue</p>
                                    <p className="text-2xl font-bold">
                                        Rp {stats.total_revenue.toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Property
                                </label>
                                <Select value={selectedProperty} onValueChange={(value) => handleFilterChange('property', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select property" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Properties</SelectItem>
                                        {properties.map((property) => (
                                            <SelectItem key={property.id} value={property.id.toString()}>
                                                {property.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Status
                                </label>
                                <Select value={selectedStatus} onValueChange={(value) => handleFilterChange('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="checked_in">Checked In</SelectItem>
                                        <SelectItem value="checked_out">Checked Out</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Timeline Days
                                </label>
                                <Select value={selectedDays} onValueChange={(value) => handleFilterChange('days', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select days" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="14">14 Days</SelectItem>
                                        <SelectItem value="30">30 Days</SelectItem>
                                        <SelectItem value="60">60 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                                 {/* Timeline Component */}
                 <div className="space-y-4">
                     <BookingTimeline
                         properties={filteredProperties}
                         bookings={filteredBookings}
                         days={parseInt(selectedDays)}
                         canVerify={canVerify}
                         canCancel={canCancel}
                         canCheckIn={canCheckIn}
                         onRefresh={handleRefresh}
                     />
                 </div>
            </div>
        </AdminLayout>
    );
} 
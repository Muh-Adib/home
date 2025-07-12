import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Building2,
    Users,
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

interface Booking {
    id: number;
    booking_number: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    total_amount: number;
    booking_status: string;
}

interface TimelineData {
    date: string;
    is_weekend: boolean;
    current_rate: number;
    bookings: Booking[];
    availability_status: 'available' | 'booked' | 'partial';
}

interface CalendarProps {
    properties: Property[];
    currentProperty?: Property;
    currentMonth: string;
    timelineData: Record<string, TimelineData>;
}

export default function Calendar({ properties, currentProperty, currentMonth, timelineData }: CalendarProps) {
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(currentProperty || null);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth || new Date().toISOString().slice(0, 7));
    const [timeline, setTimeline] = useState<Record<string, TimelineData>>(timelineData || {});
    const [loading, setLoading] = useState(false);

    const generateCalendarDates = (monthStr: string) => {
        const [year, month] = monthStr.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const dates = [];
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }
        
        return dates;
    };

    const calendarDates = generateCalendarDates(selectedMonth);

    const loadTimelineData = async () => {
        if (!selectedProperty) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/admin/booking-management/timeline?property_id=${selectedProperty.id}&month=${selectedMonth}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                }
            });
            
            const result = await response.json();
            if (result.success) {
                setTimeline(result.timeline);
            }
        } catch (error) {
            console.error('Error loading timeline data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProperty) {
            loadTimelineData();
        }
    }, [selectedProperty, selectedMonth]);

    const handlePropertyChange = (propertyId: string) => {
        const property = properties.find(p => p.id.toString() === propertyId);
        setSelectedProperty(property || null);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1, 1);
        
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        
        const newMonth = newDate.toISOString().slice(0, 7);
        setSelectedMonth(newMonth);
    };

    const getDateKey = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getDayData = (date: Date): TimelineData | null => {
        const dateKey = getDateKey(date);
        return timeline[dateKey] || null;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-100 border-green-200';
            case 'booked': return 'bg-red-100 border-red-200';
            case 'partial': return 'bg-yellow-100 border-yellow-200';
            default: return 'bg-gray-100 border-gray-200';
        }
    };

    const formatMonthYear = (monthStr: string) => {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month - 1).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long'
        });
    };

    const isCurrentMonth = (date: Date) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        return date.getFullYear() === year && date.getMonth() === (month - 1);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Booking Management', href: '/admin/booking-management' },
        { title: 'Calendar Timeline', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Booking Calendar Timeline" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Calendar Timeline</h1>
                        <p className="text-gray-600 mt-1">
                            View property availability and bookings in calendar format
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.booking-management.create')}>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Booking
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex-1">
                                <Select value={selectedProperty?.id.toString() || ''} onValueChange={handlePropertyChange}>
                                    <SelectTrigger className="w-full">
                                        <Building2 className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Select a property..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map(property => (
                                            <SelectItem key={property.id} value={property.id.toString()}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{property.name}</span>
                                                    <span className="text-xs text-gray-500">{property.address}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMonthChange('prev')}
                                    disabled={loading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                
                                <div className="text-lg font-semibold min-w-[200px] text-center">
                                    {formatMonthYear(selectedMonth)}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMonthChange('next')}
                                    disabled={loading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {selectedProperty ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                {selectedProperty.name} - Calendar Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Loading calendar data...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-7 gap-1 mb-4">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {calendarDates.map((date, index) => {
                                            const dayData = getDayData(date);
                                            const isCurrentMonthDay = isCurrentMonth(date);
                                            const isTodayDate = isToday(date);
                                            
                                            return (
                                                <div
                                                    key={index}
                                                    className={`
                                                        min-h-[120px] p-2 border rounded-lg
                                                        ${!isCurrentMonthDay ? 'bg-gray-50 opacity-50' : 'bg-white'}
                                                        ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                                                        ${dayData ? getStatusColor(dayData.availability_status) : 'border-gray-200'}
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-sm font-medium ${isTodayDate ? 'text-blue-600' : ''}`}>
                                                            {date.getDate()}
                                                        </span>
                                                        {dayData?.is_weekend && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Weekend
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {dayData && (
                                                        <div className="space-y-1">
                                                            <div className="text-xs text-gray-600">
                                                                Rate: Rp {dayData.current_rate.toLocaleString('id-ID')}
                                                            </div>
                                                            
                                                            {dayData.bookings.map(booking => (
                                                                <div
                                                                    key={booking.id}
                                                                    className="text-xs p-1 rounded bg-blue-100 border border-blue-200"
                                                                >
                                                                    <div className="font-medium truncate">
                                                                        {booking.guest_name}
                                                                    </div>
                                                                    <div className="text-gray-600 flex items-center gap-1">
                                                                        <Users className="h-3 w-3" />
                                                                        {booking.guest_count}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                Select a Property
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Choose a property from the dropdown above to view its calendar timeline
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
} 

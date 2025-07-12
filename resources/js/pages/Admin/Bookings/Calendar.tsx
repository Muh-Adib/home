import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { type Booking, type Property, type BreadcrumbItem, type PageProps } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { 
    Calendar as CalendarIcon,
    Plus,
    Filter,
    Users,
    Building2,
    CheckCircle,
    Clock,
    XCircle,
    Eye,
    Edit,
    MoreHorizontal,
    Phone,
    Mail,
    MapPin
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface BookingCalendarProps {
    bookings: Booking[];
    properties: Property[];
    filters: {
        property_id?: string;
        status?: string;
        view?: string;
    };
}

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: Booking;
    allDay?: boolean;
}

export default function BookingCalendar({ bookings, properties, filters }: BookingCalendarProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [currentView, setCurrentView] = useState<View>((filters.view as View) || Views.MONTH);
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showEventDialog, setShowEventDialog] = useState(false);
    const [showQuickBookingDialog, setShowQuickBookingDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

    const { data: quickBookingData, setData: setQuickBookingData, post: postQuickBooking, processing, reset } = useForm({
        property_id: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_count: 2,
        check_in: '',
        check_out: '',
        special_requests: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: 'Calendar View' },
    ];

    // Filter bookings based on selected filters
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (selectedProperty !== 'all' && booking.property_id.toString() !== selectedProperty) {
                return false;
            }
            if (selectedStatus !== 'all' && booking.booking_status !== selectedStatus) {
                return false;
            }
            return true;
        });
    }, [bookings, selectedProperty, selectedStatus]);

    // Convert bookings to calendar events
    const events: CalendarEvent[] = useMemo(() => {
        return filteredBookings.map(booking => ({
            id: booking.id,
            title: `${booking.guest_name} - ${booking.property?.name || 'Unknown Property'}`,
            start: new Date(booking.check_in),
            end: new Date(booking.check_out),
            resource: booking,
            allDay: true,
        }));
    }, [filteredBookings]);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setShowEventDialog(true);
    }, []);

    const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
        if (currentView === Views.MONTH) {
            // For month view, show quick booking dialog
            setSelectedSlot({ start, end });
            setQuickBookingData({
                ...quickBookingData,
                check_in: format(start, 'yyyy-MM-dd'),
                check_out: format(end, 'yyyy-MM-dd'),
            });
            setShowQuickBookingDialog(true);
        }
    }, [currentView, quickBookingData, setQuickBookingData]);

    const handleViewChange = useCallback((view: View) => {
        setCurrentView(view);
        updateFilters({ view });
    }, []);

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        router.get('/admin/bookings/calendar', {
            ...filters,
            ...newFilters,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePropertyFilter = (propertyId: string) => {
        setSelectedProperty(propertyId);
        updateFilters({ property_id: propertyId === 'all' ? undefined : propertyId });
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        updateFilters({ status: status === 'all' ? undefined : status });
    };

    const handleQuickBooking = () => {
        postQuickBooking('/admin/bookings', {
            onSuccess: () => {
                setShowQuickBookingDialog(false);
                reset();
                setSelectedSlot(null);
            },
        });
    };

    // Custom event style function
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const booking = event.resource;
        let backgroundColor = '#3174ad';
        
        switch (booking.booking_status) {
            case 'pending_verification':
                backgroundColor = '#f59e0b'; // Orange
                break;
            case 'confirmed':
                backgroundColor = '#10b981'; // Green
                break;
            case 'checked_in':
                backgroundColor = '#3b82f6'; // Blue
                break;
            case 'checked_out':
                backgroundColor = '#6b7280'; // Gray
                break;
            case 'cancelled':
                backgroundColor = '#ef4444'; // Red
                break;
            case 'no_show':
                backgroundColor = '#dc2626'; // Dark Red
                break;
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '12px',
            }
        };
    }, []);

    // Custom slot style function
    const slotStyleGetter = useCallback((date: Date) => {
        const today = new Date();
        const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        const isPast = date < today;

        return {
            style: {
                backgroundColor: isToday ? '#fef3c7' : isPast ? '#f9fafb' : 'white',
            }
        };
    }, []);

    const getBookingStatusBadge = (status: Booking['booking_status']) => {
        const statusConfig = {
            pending_verification: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
            confirmed: { variant: 'default' as const, label: 'Confirmed', icon: CheckCircle },
            checked_in: { variant: 'default' as const, label: 'Checked In', icon: Users },
            checked_out: { variant: 'outline' as const, label: 'Checked Out', icon: CheckCircle },
            cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
            no_show: { variant: 'destructive' as const, label: 'No Show', icon: XCircle },
        };
        
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Check permissions
    const canCreateBooking = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Booking Calendar</h1>
                        <p className="text-muted-foreground">
                            Visual overview of all bookings and availability
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href="/admin/bookings">
                                <Eye className="h-4 w-4 mr-2" />
                                List View
                            </Link>
                        </Button>
                        {canCreateBooking && (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href="/admin/bookings/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Booking
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="property-filter">Property</Label>
                                <Select value={selectedProperty} onValueChange={handlePropertyFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Properties" />
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

                            <div>
                                <Label htmlFor="status-filter">Status</Label>
                                <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending_verification">Pending</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="checked_in">Checked In</SelectItem>
                                        <SelectItem value="checked_out">Checked Out</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setSelectedProperty('all');
                                        setSelectedStatus('all');
                                        updateFilters({ property_id: undefined, status: undefined });
                                    }}
                                    className="w-full"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Status Legend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                <span className="text-sm">Pending Verification</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded"></div>
                                <span className="text-sm">Confirmed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                <span className="text-sm">Checked In</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                <span className="text-sm">Checked Out</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                <span className="text-sm">Cancelled/No Show</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Calendar */}
                <Card>
                    <CardContent className="p-6">
                        <div className="calendar-container" style={{ height: '600px' }}>
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                view={currentView}
                                onView={handleViewChange}
                                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                                onSelectEvent={handleSelectEvent}
                                onSelectSlot={handleSelectSlot}
                                selectable={canCreateBooking}
                                eventPropGetter={eventStyleGetter}
                                slotPropGetter={slotStyleGetter}
                                popup
                                tooltipAccessor={(event: CalendarEvent) => 
                                    `${event.resource.guest_name} - ${event.resource.property?.name || 'Unknown Property'} (${event.resource.booking_status})`
                                }
                                components={{
                                    toolbar: (props) => (
                                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => props.onNavigate('PREV')}
                                                >
                                                    Previous
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => props.onNavigate('TODAY')}
                                                >
                                                    Today
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => props.onNavigate('NEXT')}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                            
                                            <div className="text-lg font-semibold">
                                                {props.label}
                                            </div>
                                            
                                            <div className="flex gap-1">
                                                {Object.values(Views).map((view) => (
                                                    <Button
                                                        key={view}
                                                        variant={currentView === view ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => props.onView(view)}
                                                    >
                                                        {view}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Event Details Dialog */}
                <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Booking Details
                            </DialogTitle>
                        </DialogHeader>
                        
                        {selectedEvent && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Booking Number</Label>
                                            <p className="font-medium">{selectedEvent.resource.booking_number}</p>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Guest</Label>
                                            <p className="font-medium">{selectedEvent.resource.guest_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <Mail className="h-4 w-4" />
                                                {selectedEvent.resource.guest_email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <Phone className="h-4 w-4" />
                                                {selectedEvent.resource.guest_phone}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                                            <p className="font-medium">{selectedEvent.resource.property?.name}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <MapPin className="h-4 w-4" />
                                                {selectedEvent.resource.property?.address}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-in</Label>
                                            <p className="font-medium">{formatDate(selectedEvent.resource.check_in)}</p>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-out</Label>
                                            <p className="font-medium">{formatDate(selectedEvent.resource.check_out)}</p>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Guests</Label>
                                            <p className="font-medium">
                                                {selectedEvent.resource.guest_count} guests
                                                <span className="text-sm text-muted-foreground ml-2">
                                                    ({selectedEvent.resource.guest_male}M, {selectedEvent.resource.guest_female}F, {selectedEvent.resource.guest_children}C)
                                                </span>
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                                            <p className="font-medium text-lg">{formatCurrency(selectedEvent.resource.total_amount)}</p>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                            <div className="mt-1">
                                                {getBookingStatusBadge(selectedEvent.resource.booking_status)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {selectedEvent.resource.special_requests && (
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Special Requests</Label>
                                        <p className="mt-1 text-sm">{selectedEvent.resource.special_requests}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                                Close
                            </Button>
                            <Button asChild>
                                <Link href={`/admin/bookings/${selectedEvent?.resource.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Details
                                </Link>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Quick Booking Dialog */}
                <Dialog open={showQuickBookingDialog} onOpenChange={setShowQuickBookingDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Quick Booking</DialogTitle>
                            <DialogDescription>
                                Create a new booking for the selected dates
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="property">Property *</Label>
                                <Select value={quickBookingData.property_id} onValueChange={(value) => setQuickBookingData('property_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Property" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map((property) => (
                                            <SelectItem key={property.id} value={property.id.toString()}>
                                                {property.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label>Check-in & Check-out Dates</Label>
                                <DateRange
                                    startDate={quickBookingData.check_in}
                                    endDate={quickBookingData.check_out}
                                    onDateChange={(startDate, endDate) => {
                                        setQuickBookingData('check_in', startDate);
                                        setQuickBookingData('check_out', endDate);
                                    }}
                                    minDate={new Date().toISOString().split('T')[0]}
                                    size="md"
                                    showNights={true}
                                    startLabel="Check-in"
                                    endLabel="Check-out"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="guest_name">Guest Name *</Label>
                                <Input
                                    id="guest_name"
                                    value={quickBookingData.guest_name}
                                    onChange={(e) => setQuickBookingData('guest_name', e.target.value)}
                                    placeholder="Enter guest name"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="guest_email">Email *</Label>
                                    <Input
                                        id="guest_email"
                                        type="email"
                                        value={quickBookingData.guest_email}
                                        onChange={(e) => setQuickBookingData('guest_email', e.target.value)}
                                        placeholder="guest@email.com"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="guest_phone">Phone *</Label>
                                    <Input
                                        id="guest_phone"
                                        value={quickBookingData.guest_phone}
                                        onChange={(e) => setQuickBookingData('guest_phone', e.target.value)}
                                        placeholder="+62 xxx xxxx xxxx"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowQuickBookingDialog(false)} disabled={processing}>
                                Cancel
                            </Button>
                            <Button onClick={handleQuickBooking} disabled={processing}>
                                {processing ? 'Creating...' : 'Create Booking'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 
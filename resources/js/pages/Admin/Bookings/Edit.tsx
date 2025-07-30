import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type Booking, type BreadcrumbItem, type PageProps, type Property } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { 
    ArrowLeft, 
    Save, 
    Calendar, 
    User, 
    Phone, 
    Mail, 
    Users, 
    DollarSign,
    Building2,
    Clock,
    FileText
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface BookingEditProps {
    booking: Booking;
    properties: Property[];
}

export default function BookingEdit({ booking, properties }: BookingEditProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        check_in: booking.check_in ? new Date(booking.check_in).toISOString().split('T')[0] : '',
        check_out: booking.check_out ? new Date(booking.check_out).toISOString().split('T')[0] : '',
        guest_count: booking.guest_count || 1,
        total_amount: booking.total_amount || 0,
        booking_status: booking.booking_status || 'pending',
        notes: booking.notes || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: booking.booking_number, href: `/admin/bookings/${booking.booking_number}` },
        { title: 'Edit' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        router.put(`/admin/bookings/${booking.booking_number}`, formData, {
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Edit Booking</h1>
                        <p className="text-muted-foreground">
                            Edit booking details for {booking.booking_number}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.get(`/admin/bookings/${booking.booking_number}`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Information</CardTitle>
                                <CardDescription>
                                    Update booking details and guest information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Guest Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            Guest Information
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="guest_name">Guest Name</Label>
                                                <Input
                                                    id="guest_name"
                                                    value={formData.guest_name}
                                                    onChange={(e) => handleInputChange('guest_name', e.target.value)}
                                                    placeholder="Enter guest name"
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="guest_email">Email</Label>
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={formData.guest_email}
                                                    onChange={(e) => handleInputChange('guest_email', e.target.value)}
                                                    placeholder="Enter email address"
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="guest_phone">Phone</Label>
                                                <Input
                                                    id="guest_phone"
                                                    value={formData.guest_phone}
                                                    onChange={(e) => handleInputChange('guest_phone', e.target.value)}
                                                    placeholder="Enter phone number"
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="guest_count">Guest Count</Label>
                                                <Input
                                                    id="guest_count"
                                                    type="number"
                                                    min="1"
                                                    value={formData.guest_count}
                                                    onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value))}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Booking Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Booking Details
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="check_in">Check-in Date</Label>
                                                <Input
                                                    id="check_in"
                                                    type="date"
                                                    value={formData.check_in}
                                                    onChange={(e) => handleInputChange('check_in', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="check_out">Check-out Date</Label>
                                                <Input
                                                    id="check_out"
                                                    type="date"
                                                    value={formData.check_out}
                                                    onChange={(e) => handleInputChange('check_out', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="total_amount">Total Amount</Label>
                                                <Input
                                                    id="total_amount"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.total_amount}
                                                    onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value))}
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="booking_status">Booking Status</Label>
                                                <Select
                                                    value={formData.booking_status}
                                                    onValueChange={(value) => handleInputChange('booking_status', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Notes */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Notes
                                        </h3>
                                        
                                        <div>
                                            <Label htmlFor="notes">Additional Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={formData.notes}
                                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                                placeholder="Enter any additional notes..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.get(`/admin/bookings/${booking.booking_number}`)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Booking Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Booking Number</span>
                                    <span className="text-sm">{booking.booking_number}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Status</span>
                                    <Badge className={getStatusColor(booking.booking_status)}>
                                        {booking.booking_status}
                                    </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Property</span>
                                    <span className="text-sm">{booking.property?.name}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Total Amount</span>
                                    <span className="text-sm font-semibold">
                                        {formatCurrency(booking.total_amount)}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Created</span>
                                    <span className="text-sm">
                                        {new Date(booking.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => router.get(`/admin/bookings/${booking.booking_number}`)}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Details
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => router.get(`/admin/bookings/timeline/${booking.booking_number}`)}
                                >
                                    <Clock className="h-4 w-4 mr-2" />
                                    View Timeline
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
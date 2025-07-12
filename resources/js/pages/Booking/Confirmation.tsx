import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin, 
    Building2,
    Clock,
    CreditCard,
    Phone,
    Mail,
    ArrowRight,
    Download,
    Info,
    Lock,
    MessageCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Booking {
    id: string;
    booking_number: string;
    check_in: string;
    check_in_time: string;
    check_out: string;
    nights: number;
    guest_count: number;
    guest_name: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_email: string;
    guest_phone?: string;
    guest_country?: string;
    guest_id_number?: string;
    guest_gender?: string;
    relationship_type?: string;
    special_requests?: string;
    booking_status: string;
    payment_status: string;
    payment_link: string;
    total_amount: number;
    dp_dateline: string;
    dp_amount: number;
    remaining_amount: number;
    dp_percentage: number;
    created_at: string;
    workflow: {
        step: string;
        status: string;
        processed_by: string;
        processed_at: string;
    };
    property: {
        id: number;
        name: string;
        slug: string;
        address: string;
        cover_image?: string;
        owner: {
            name?: string;
            phone?: string;
        };
    };
}

interface BookingConfirmationProps {
    booking: Booking;
    password: string|null;
}

export default function BookingConfirmation({ booking, password }: BookingConfirmationProps) {
    const { t } = useTranslation();
    
    const statusColors = {
        pending_verification: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
        pending_verification: t('booking.status.pending_verification'),
        confirmed: t('booking.status.confirmed'),
        cancelled: t('booking.status.cancelled'),
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatWhatsAppMessage = () => {
        const message = `Halo Admin, saya ingin bertanya tentang booking saya:

📋 Booking Number: ${booking.booking_number}
🏠 Property: ${booking.property.name}
👤 Guest: ${booking.guest_name}
📅 Check-in: ${formatDate(booking.check_in)}
📅 Check-out: ${formatDate(booking.check_out)}
👥 Guests: ${booking.guest_count} orang
💰 Total: Rp ${(booking.total_amount || 0).toLocaleString()}

Mohon bantuannya untuk informasi lebih lanjut. Terima kasih!`;

        return encodeURIComponent(message);
    };

    const getWhatsAppLink = () => {
        const phoneNumber = booking.property.owner?.phone || '6281234567890'; // Default number
        const message = formatWhatsAppMessage();
        return `https://wa.me/${phoneNumber}?text=${message}`;
    };

    const nights = Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <>
            <Head title={`Booking Confirmation - ${booking.booking_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-3xl font-bold text-gray-900">{t('booking.confirmation.title')}</h1>
                            <p className="text-gray-600 mt-2">
                                {t('booking.confirmation.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Status Alert */}
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{t('booking.confirmation.whats_next.title')}</strong> {t('booking.confirmation.whats_next.description')}
                            </AlertDescription>
                        </Alert>

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Booking Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Booking Info */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>{t('booking.confirmation.booking_details')}</CardTitle>
                                            <Badge className={statusColors[booking.booking_status as keyof typeof statusColors]}>
                                                {statusLabels[booking.booking_status as keyof typeof statusLabels]}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.booking_code')}</Label>
                                                <p className="text-lg font-mono font-semibold">{booking.booking_number}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.booking_date')}</Label>
                                                <p>{formatDate(booking.created_at)}</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium">{t('booking.confirmation.check_in')}</p>
                                                    <p className="text-sm text-gray-600">{formatDate(booking.check_in)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium">{t('booking.confirmation.check_out')}</p>
                                                    <p className="text-sm text-gray-600">{formatDate(booking.check_out)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium">{t('booking.confirmation.duration')}</p>
                                                <p className="text-sm text-gray-600">{nights} {t('booking.confirmation.nights')}</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="flex items-center gap-3">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium">{t('booking.confirmation.guests')}</p>
                                                <p className="text-sm text-gray-600">
                                                    {booking.guest_count} {t('booking.confirmation.guests_total')}: 
                                                    {booking.guest_male} {t('booking.confirmation.male')}, 
                                                    {booking.guest_female} {t('booking.confirmation.female')}
                                                    {booking.guest_children > 0 && `, ${booking.guest_children} ${t('booking.confirmation.children')}`}
                                                </p>
                                            </div>
                                        </div>

                                        {booking.special_requests && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <p className="text-sm font-medium mb-2">{t('booking.confirmation.special_requests')}</p>
                                                    <p className="text-sm text-gray-600 bg-slate-50 p-3 rounded-lg">
                                                        {booking.special_requests}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Guest Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('booking.confirmation.primary_guest_info')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.full_name')}</Label>
                                                <p>{booking.guest_name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-600" />
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.phone')}</Label>
                                                    <p>{booking.guest_phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.email')}</Label>
                                                <p>{booking.guest_email}</p>
                                            </div>
                                        </div>
                                        {password && (
                                        <div className="flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">{t('booking.confirmation.password')}</Label>
                                                <p>{password}</p>
                                                <p className="text-xs text-gray-500">
                                                    <span className="font-bold">{t('booking.confirmation.note')}:</span> {t('booking.confirmation.password_note')}
                                                </p>
                                            </div>
                                        </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Property & Payment Summary */}
                            <div className="space-y-6">
                                {/* Property */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{t('booking.confirmation.property')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                                                {booking.property.cover_image ? (
                                                    <img 
                                                        src={booking.property.cover_image} 
                                                        alt={booking.property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-semibold">{booking.property.name}</h3>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {booking.property.address}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            {t('booking.confirmation.payment_summary')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between font-semibold">
                                                <span>{t('booking.confirmation.total_amount')}</span>
                                                <span>Rp {(booking.total_amount || 0).toLocaleString()}</span>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="flex justify-between text-blue-600 font-semibold">
                                                <span>{t('booking.confirmation.down_payment')} ({booking.dp_percentage}%)</span>
                                                <span>Rp {(booking.dp_amount || 0).toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="flex justify-between text-gray-600">
                                                <span>{t('booking.confirmation.remaining_balance')}</span>
                                                <span>Rp {(booking.remaining_amount || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="bg-yellow-50 p-3 rounded-lg mt-4">
                                                <p className="text-sm text-yellow-800">
                                                    <strong>{t('booking.confirmation.payment_instructions')}:</strong> {t('booking.confirmation.payment_instructions_desc')}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* WhatsApp CTA */}
                                <Card className="border-green-200 bg-green-50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                                            <MessageCircle className="h-5 w-5" />
                                            {t('booking.confirmation.need_help')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-green-700 mb-4">
                                            {t('booking.confirmation.contact_admin_description')}
                                        </p>
                                        <a 
                                            href={getWhatsAppLink()} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                <MessageCircle className="h-4 w-4 mr-2" />
                                                {t('booking.confirmation.contact_admin')}
                                            </Button>
                                        </a>
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <div className="space-y-3">
                                    {booking.payment_status === 'dp_pending' && booking.booking_status === 'confirmed' && (
                                        <Link href={booking.payment_link} className="block">
                                            <Button className="w-full" size="lg">
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                {t('booking.confirmation.make_payment')}
                                                <span className="text-xs ml-2">(Rp {(booking.dp_amount).toLocaleString()})</span>
                                            </Button>
                                        </Link>
                                    )}
                                    
                                    {booking.booking_status === 'pending_verification' && (
                                        <Alert>
                                            <Clock className="h-4 w-4" />
                                            <AlertDescription>
                                                {t('booking.confirmation.verification_pending')}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {booking.payment_status === 'paid' && (
                                        <Button className="w-full" variant="outline" disabled>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {t('booking.confirmation.payment_completed')}
                                        </Button>
                                    )}
                                    
                                    <Button className="w-full" variant="outline" disabled>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('booking.confirmation.download_voucher')}
                                        <span className="text-xs ml-2">({t('booking.confirmation.available_after_payment')})</span>
                                    </Button>
                                    
                                    <Link href="/properties" className="block">
                                        <Button variant="outline" className="w-full">
                                            {t('booking.confirmation.browse_more_properties')}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                    
                                    <Link href="/" className="block">
                                        <Button variant="ghost" className="w-full">
                                            {t('booking.confirmation.back_to_home')}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <label className={className}>{children}</label>;
} 
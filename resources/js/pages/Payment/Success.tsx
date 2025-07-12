import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle, 
    Clock,
    CreditCard,
    FileText,
    Building2,
    MapPin,
    Calendar,
    Users,
    ArrowRight,
    Home,
    MessageCircle
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { useTranslation } from 'react-i18next';

interface Payment {
    id: number;
    payment_method_name: string;
    amount: number;
    status: string;
    payment_proof?: string;
    notes?: string;
    created_at: string;
}

interface Booking {
    id: number;
    booking_number: string;
    property: {
        id: number;
        name: string;
        slug: string;
        address: string;
        cover_image?: string;
    };
    check_in_date: string;
    check_out_date: string;
    guest_count_male: number;
    guest_count_female: number;
    guest_count_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    total_amount: number;
    dp_amount: number;
    remaining_amount: number;
    dp_percentage: number;
    status: string;
}

interface PaymentSuccessProps {
    payment: Payment;
    booking: Booking;
}

export default function PaymentSuccess({ payment, booking }: PaymentSuccessProps) {
    const { t } = useTranslation();
    const totalGuests = booking.guest_count_male + booking.guest_count_female + booking.guest_count_children;

    // Breadcrumbs setup
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('nav.browse_properties'), href: route('properties.index') || '/properties' },
        { title: t('payment.success_title'), href: '' }
    ];

    const nextSteps = [
        {
            icon: Clock,
            title: t('payment.verification_process'),
            description: t('payment.verification_description'),
            timeframe: t('payment.verification_timeframe')
        },
        {
            icon: MessageCircle,
            title: t('payment.email_confirmation'),
            description: t('payment.email_confirmation_description'),
            timeframe: t('payment.email_confirmation_timeframe')
        },
        {
            icon: FileText,
            title: t('payment.booking_confirmation'),
            description: t('payment.booking_confirmation_description'),
            timeframe: t('payment.booking_confirmation_timeframe')
        },
        {
            icon: Calendar,
            title: t('payment.checkin_preparation'),
            description: t('payment.checkin_preparation_description'),
            timeframe: t('payment.checkin_preparation_timeframe')
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('payment.status.pending_verification')}</Badge>;
            case 'verified':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('payment.status.verified')}</Badge>;
            case 'rejected':
                return <Badge variant="destructive">{t('payment.status.rejected')}</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('payment.success_title')} - ${booking.booking_number}`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('payment.success_title')}</h1>
                    <p className="text-gray-600">{t('payment.success_description')}</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Payment Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Payment Summary */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    {t('payment.payment_summary')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{t('payment.payment_method')}:</span>
                                        <span>{payment.payment_method_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{t('payment.amount_paid')}:</span>
                                        <span className="text-xl font-bold text-green-600">
                                            Rp {payment.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{t('payment.status')}:</span>
                                        {getStatusBadge(payment.status)}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{t('payment.submitted')}:</span>
                                        <span>{new Date(payment.created_at).toLocaleString()}</span>
                                    </div>
                                    {payment.notes && (
                                        <div>
                                            <span className="font-medium">{t('common.notes')}:</span>
                                            <p className="text-gray-600 mt-1">{payment.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Next Steps */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowRight className="h-5 w-5 text-blue-600" />
                                    {t('payment.what_happens_next')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {nextSteps.map((step, index) => (
                                        <div key={index} className="flex gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
                                            <div className="flex-shrink-0">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <step.icon className="h-5 w-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{step.title}</h4>
                                                <p className="text-gray-600 text-sm">{step.description}</p>
                                                <span className="text-xs text-blue-600 font-medium">{step.timeframe}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Important Information */}
                        <Alert className="border-blue-200 bg-blue-50">
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{t('common.important')}:</strong> {t('payment.keep_confirmation_text')} 
                                <strong>{booking.booking_number}</strong>
                            </AlertDescription>
                        </Alert>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/" className="flex-1">
                                <Button variant="outline" className="w-full hover:bg-gray-50">
                                    <Home className="h-4 w-4 mr-2" />
                                    {t('nav.back_to_home')}
                                </Button>
                            </Link>
                            <Link href={`/properties/${booking.property.slug}`} className="flex-1">
                                <Button variant="outline" className="w-full hover:bg-blue-50">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    {t('properties.view_property')}
                                </Button>
                            </Link>
                            <Link href={`/booking/${booking.id}/confirmation`} className="flex-1">
                                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('booking.view_booking_details')}
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Booking Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-6">
                            {/* Booking Info */}
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50">
                                <CardHeader>
                                    <CardTitle className="text-lg">{t('booking.booking_summary')}</CardTitle>
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

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span>{booking.check_in_date} - {booking.check_out_date}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-gray-500" />
                                                <span>{totalGuests} {t('booking.guests')} ({booking.guest_count_male}M, {booking.guest_count_female}F, {booking.guest_count_children}C)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-500" />
                                                <span>{t('booking.booking')}: {booking.booking_number}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>{t('payment.total_amount')}:</span>
                                                <span>Rp {booking.total_amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-green-600 font-semibold">
                                                <span>{t('payment.paid')} ({booking.dp_percentage}%):</span>
                                                <span>Rp {booking.dp_amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-600">
                                                <span>{t('payment.remaining_balance')}:</span>
                                                <span>Rp {booking.remaining_amount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <div className="text-sm font-medium text-green-800">
                                                {t('payment.payment_status')}: {getStatusBadge(payment.status)}
                                            </div>
                                            <div className="text-xs text-green-600 mt-1">
                                                {t('payment.submitted_on')} {new Date(payment.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contact Info */}
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50">
                                <CardHeader>
                                    <CardTitle className="text-lg">{t('common.need_help')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <span className="font-medium">{t('common.customer_service')}</span>
                                            <p className="text-gray-600">{t('common.available_24_7')}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium">{t('common.whatsapp')}:</span>
                                            <p className="text-blue-600">+62 812-3456-7890</p>
                                        </div>
                                        <div>
                                            <span className="font-medium">{t('common.email')}:</span>
                                            <p className="text-blue-600">support@homsjogja.com</p>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {t('common.mention_booking_number')}: {booking.booking_number}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 
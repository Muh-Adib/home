import React from 'react';
import GuestLayout from '@/layouts/guest-layout';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Booking, type PageProps } from '@/types';
import { Link, usePage, Head } from '@inertiajs/react';
import {
    MapPin,
    Calendar,
    ArrowRight,
    Clock,
    Search,
    MessageCircle,
    ChevronRight,
    CreditCard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GuestDashboardProps {
    upcoming_bookings: Booking[];
}

export default function GuestDashboard({ upcoming_bookings = [] }: GuestDashboardProps) {
    const page = usePage<PageProps>();
    const { t } = useTranslation();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric' // Added year for clarity
        });
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "rounded-full px-3 py-0.5 text-xs font-medium border";
        switch (status) {
            case 'confirmed':
                return <span className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}>Confirmed</span>;
            case 'pending_verification':
                return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}>Menunggu Konfirmasi</span>;
            case 'completed':
                return <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>Selesai</span>;
            case 'cancelled':
                return <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>Dibatalkan</span>;
            default:
                return <span className={`${baseClasses} bg-gray-100 text-gray-700 border-gray-200`}>{status}</span>;
        }
    };

    const getWhatsAppLink = (booking: Booking) => {
        const phone = "6281234567890"; // Admin phone number
        const message = encodeURIComponent(
            `Halo Admin Homsjogja, saya ingin konfirmasi booking saya:\n\n` +
            `Kode Booking: *${booking.booking_number}*\n` +
            `Properti: ${booking.property?.name}\n` +
            `Tanggal: ${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}\n\n` +
            `Mohon bantuannya untuk verifikasi. Terima kasih.`
        );
        return `https://wa.me/${phone}?text=${message}`;
    };

    const canMakePayment = (booking: Booking) => {
        return booking.booking_status === 'confirmed' &&
            ['dp_pending', 'dp_received'].includes(booking.payment_status);
    };

    return (
        <GuestLayout>
            <Head title="My Trips" />

            <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Perjalanan Saya</h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Kelola semua rencana perjalanan dan riwayat booking Anda.
                        </p>
                    </div>
                </div>

                {/* Booking List */}
                <div className="space-y-6">
                    {upcoming_bookings.length > 0 ? (
                        <div className="grid gap-6">
                            {upcoming_bookings.map((booking) => (
                                <Card key={booking.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-2xl ring-1 ring-gray-100">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Image Section */}
                                        <div className="w-full md:w-64 h-48 md:h-auto bg-gray-100 shrink-0 relative overflow-hidden">
                                            {/* In a real app, use next/image or a real img tag here */}
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50">
                                                <MapPin className="h-10 w-10 opacity-20" />
                                            </div>

                                            {/* Mobile Status Badge Overlay */}
                                            <div className="absolute top-4 left-4 md:hidden">
                                                {getStatusBadge(booking.booking_status)}
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 p-6 md:p-8 flex flex-col">
                                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                                <div className="space-y-2">
                                                    <div className="hidden md:block mb-3">
                                                        {getStatusBadge(booking.booking_status)}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        {booking.booking_number}
                                                    </div>

                                                    <Link href={`/booking/${booking.booking_number}`} className="block group-hover:text-primary transition-colors">
                                                        <h3 className="text-2xl font-bold text-gray-900">
                                                            {booking.property?.name}
                                                        </h3>
                                                    </Link>

                                                    <div className="flex items-center gap-2 text-gray-600 pt-1">
                                                        <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                                        <span className="text-sm truncate max-w-md">{booking.property?.address}</span>
                                                    </div>
                                                </div>

                                                <div className="text-left md:text-right mt-2 md:mt-0 p-4 md:p-0 bg-gray-50 md:bg-transparent rounded-xl w-full md:w-auto">
                                                    <div className="text-sm text-gray-500 mb-1">Total Biaya</div>
                                                    <div className="text-xl font-bold text-gray-900">
                                                        {formatCurrency(booking.total_amount)}
                                                    </div>
                                                    <div className={`text-xs font-medium mt-1 ${booking.payment_status === 'fully_paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {booking.payment_status === 'fully_paid' ? 'Sudah Lunas' : 'Belum Lunas'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-8 border-t border-dashed border-gray-100 pt-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500">Check-in</span>
                                                        <span className="font-semibold text-gray-900">{formatDate(booking.check_in)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-gray-200"></div>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500">Check-out</span>
                                                        <span className="font-semibold text-gray-900">{formatDate(booking.check_out)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                                                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" asChild>
                                                    <Link href={`/booking/${booking.booking_number}`}>
                                                        Lihat Detail
                                                    </Link>
                                                </Button>

                                                <div className="flex-1"></div>

                                                {booking.booking_status === 'pending_verification' && (
                                                    <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" asChild>
                                                        <a href={getWhatsAppLink(booking)} target="_blank" rel="noopener noreferrer">
                                                            <MessageCircle className="h-4 w-4 mr-2" />
                                                            Konfirmasi ke Admin
                                                        </a>
                                                    </Button>
                                                )}

                                                {canMakePayment(booking) && (
                                                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm" onClick={() => {
                                                        // Redirect to payment tab of the new booking show page
                                                        // Since tabs are client-side state, we can't deep link to tab easily without URL param support in Show.tsx
                                                        // For now, just go to the page. Show.tsx handles the pulse on payment tab if unpaid.
                                                        window.location.href = `/booking/${booking.booking_number}`;
                                                    }}>
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        Bayar Sekarang
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="bg-blue-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="h-10 w-10 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Belum ada rencana perjalanan</h2>
                            <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
                                Temukan penginapan impian Anda dengan penawaran terbaik hanya di Homsjogja.
                            </p>
                            <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all" asChild>
                                <Link href={route('properties.index')}>
                                    Mulai Jelajahi
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
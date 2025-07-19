import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    CreditCard,
    Eye,
    Building2,
    CheckCircle,
    AlertCircle,
    Star,
    Key,
    ExternalLink,
    Sparkles,
    Timer,
    Wallet
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    media?: Array<{
        id: number;
        url: string;
        thumbnail_url?: string;
        media_type: string;
        is_cover: boolean;
        is_featured: boolean;
        alt_text?: string;
    }>;
}

interface Booking {
    id: number;
    booking_number: string;
    property: Property;
    check_in: string;
    check_out: string;
    guest_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country?: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    total_amount: number;
    booking_status: string;
    payment_status: string;
    special_requests?: string;
    created_at: string;
    payment_link?: string;
    payments?: Payment[];
    nights: number;
    can_cancel: boolean;
    can_review: boolean;
    can_show_checkin?: boolean;
    checkin_time_formatted?: string;
    checkin_instruction?: string;
    keybox_code?: string;
    maps_link?: string;
    is_cleaned?: boolean;
    review?: {
        id: number;
        rating: number;
        comment: string;
    } | null;
}

interface Payment {
    id: number;
    payment_number: string;
    amount: number;
    payment_type: string;
    payment_status: string;
    payment_date: string;
    due_date?: string;
    paymentMethod?: {
        name: string;
        type: string;
    };
}

interface BookingCardProps {
    booking: Booking;
    onViewDetails: (booking: Booking) => void;
}

export default function BookingCard({ booking, onViewDetails }: BookingCardProps) {
    const { t } = useTranslation();
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [countdown, setCountdown] = useState('');

    // Get property cover image
    const coverImage = booking.property.media?.find(m => m.media_type === 'image' && m.is_cover)?.url || 
                      booking.property.media?.find(m => m.media_type === 'image')?.url;

    // Countdown timer for check-in
    useEffect(() => {
        if (booking.can_show_checkin && booking.checkin_time_formatted) {
            const updateCountdown = () => {
                const now = new Date();
                if (!booking.checkin_time_formatted) return;
                const checkInDate = new Date(booking.checkin_time_formatted);
                console.log(booking.checkin_time_formatted);
                const diff = checkInDate.getTime() - now.getTime();
                
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (days > 0) {
                        setCountdown(`${days} hari ${hours} jam ${minutes} menit`);
                    } else if (hours > 0) {
                        setCountdown(`${hours} jam ${minutes} menit`);
                    } else {
                        setCountdown(`${minutes} menit`);
                    }
                } else {
                    setCountdown('Check-in sekarang!');
                }
            };

            updateCountdown();
            const interval = setInterval(updateCountdown, 60000); // Update every minute

            return () => clearInterval(interval);
        }
    }, [booking.can_show_checkin, booking.check_in, booking.checkin_time_formatted]);



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'checked_in': return 'bg-blue-100 text-blue-800';
            case 'checked_out': return 'bg-purple-100 text-purple-800';
            case 'completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'fully_paid': return 'bg-green-100 text-green-800';
            case 'dp_received': return 'bg-blue-100 text-blue-800';
            case 'dp_pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending_verification': return 'Menunggu Verifikasi';
            case 'confirmed': return 'Dikonfirmasi';
            case 'cancelled': return 'Dibatalkan';
            case 'checked_in': return 'Check-in';
            case 'checked_out': return 'Check-out';
            case 'completed': return 'Selesai';
            default: return status;
        }
    };

    const getPaymentStatusText = (status: string) => {
        switch (status) {
            case 'dp_pending': return 'Menunggu DP';
            case 'dp_received': return 'DP Diterima';
            case 'fully_paid': return 'Lunas';
            case 'overdue': return 'Terlambat';
            case 'refunded': return 'Dikembalikan';
            default: return status;
        }
    };

    const canMakePayment = (booking: Booking) => {
        return booking.booking_status === 'confirmed' && 
               ['dp_pending', 'dp_received'].includes(booking.payment_status) &&
               booking.payment_link;
    };

    const getPaidAmount = (booking: Booking) => {
        if (!booking.payments) return 0;
        return booking.payments
            .filter(p => p.payment_status === 'verified')
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const getRemainingAmount = (booking: Booking) => {
        return booking.total_amount - getPaidAmount(booking);
    };

    const handleSubmitReview = async () => {
        if (!reviewComment.trim()) {
            alert('Silakan isi komentar review');
            return;
        }

        setIsSubmittingReview(true);
        try {
            await router.post('/reviews', {
                booking_id: booking.id,
                property_id: booking.property.id,
                rating: reviewRating,
                comment: reviewComment
            });
            setShowReviewDialog(false);
            setReviewRating(5);
            setReviewComment('');
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                    {/* Property Image */}
                    {coverImage && (
                        <div className="relative h-48 bg-gray-200">
                            <img 
                                src={coverImage} 
                                alt={booking.property.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-black/60 text-white">
                                    {booking.booking_number}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={getStatusColor(booking.booking_status)}>
                                        {getStatusText(booking.booking_status)}
                                    </Badge>
                                    <Badge className={getPaymentStatusColor(booking.payment_status)}>
                                        {getPaymentStatusText(booking.payment_status)}
                                    </Badge>
                                    {booking.can_show_checkin && (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Check-in Mandiri
                                        </Badge>
                                    )}
                                </div>
                                <Link href={`/properties/${booking.property.slug}`} className="text-blue-600 hover:underline">
                                    <h4 className="font-medium text-lg text-blue-600">{booking.property.name}</h4>
                                </Link>
                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{booking.property.address}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(booking.total_amount)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {booking.nights} malam
                                </p>
                            </div>
                        </div>

                        {/* Check-in Instructions */}
                        {booking.can_show_checkin && (
                            <Alert className="mb-4 bg-blue-50 border-blue-200">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Timer className="h-4 w-4" />
                                            <span className="font-medium">Check-in: {countdown}</span>
                                        </div>
                                        {booking.checkin_instruction && (
                                            <div className="text-sm">
                                                <strong>Instruksi Check-in:</strong><br />
                                                {booking.checkin_instruction}
                                            </div>
                                        )}
                                        {booking.keybox_code && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Key className="h-4 w-4" />
                                                <span><strong>Kode Keybox:</strong> {booking.keybox_code}</span>
                                            </div>
                                        )}
                                        {booking.maps_link && (
                                            <Button variant="outline" size="sm" asChild className="mt-2">
                                                <a href={booking.maps_link} target="_blank" rel="noopener noreferrer">
                                                    <MapPin className="h-4 w-4 mr-2" />
                                                    Lihat di Google Maps
                                                    <ExternalLink className="h-4 w-4 ml-2" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Booking Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Check-in</p>
                                    <p className="text-sm text-gray-600">{formatDate(booking.check_in)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Check-out</p>
                                    <p className="text-sm text-gray-600">{formatDate(booking.check_out)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Tamu</p>
                                    <p className="text-sm text-gray-600">
                                        {booking.guest_count} orang 
                                        <span className="text-xs text-gray-500 ml-1">
                                            ({booking.guest_male}M, {booking.guest_female}F, {booking.guest_children}C)
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Payment</p>
                                    <p className="text-sm text-gray-600">
                                        {formatCurrency(getPaidAmount(booking))} / {formatCurrency(booking.total_amount)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Information Alert */}
                        {booking.payment_status !== 'fully_paid' && getRemainingAmount(booking) > 0 && (
                            <Alert className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Pembayaran yang belum dilakukan: {formatCurrency(getRemainingAmount(booking))}
                                    {booking.payment_status === 'dp_pending' && booking.booking_status === 'pending_verification' && ' (Mohon tunggu admin untuk melakukan verifikasi)'}
                                    {booking.payment_status === 'dp_pending' && booking.booking_status === 'confirmed' && ' (DP wajib dilakukan)'}
                                    {booking.payment_status === 'dp_received' && booking.booking_status === 'confirmed' && ' (Pembayaran yang belum dilakukan)'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onViewDetails(booking)}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Detail
                                </Button>
                                <Link href={`/properties/${booking.property.slug}`}>
                                    <Button variant="outline" size="sm">
                                        <Building2 className="h-4 w-4 mr-2" />
                                        Lihat Properti
                                    </Button>
                                </Link>
                                {booking.can_review && !booking.review && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setShowReviewDialog(true)}
                                    >
                                        <Star className="h-4 w-4 mr-2" />
                                        Beri Ulasan
                                    </Button>
                                )}
                                {booking.review && (
                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                        <Star className="h-3 w-3 mr-1" />
                                        Sudah Diulas
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                {canMakePayment(booking) && (
                                    <Link href={booking.payment_link!}>
                                        <Button size="sm">
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            Lakukan pembayaran
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Review Dialog */}
            <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Beri Ulasan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Rating</Label>
                            <div className="flex gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setReviewRating(star)}
                                        className={`text-2xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                        ⭐
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {reviewRating} bintang
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="comment">Komentar</Label>
                            <Textarea
                                id="comment"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Bagikan pengalaman Anda..."
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview}
                                className="flex-1"
                            >
                                {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => setShowReviewDialog(false)}
                            >
                                Batal
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
} 
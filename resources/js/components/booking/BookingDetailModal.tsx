import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { PaymentStatusBadge } from '@/components/booking/PaymentStatusBadge';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from "@/utils/date";
import { getWhatsAppLink } from '@/utils/phone';
import { type Booking } from "@/types";
import {
    Users,
    Building2,
    Calendar,
    Phone,
    Mail,
    CreditCard,
    Clock,
    Sparkles,
    MessageSquare,
    Link as LinkIcon,
    X,
    XCircle,
    CheckCircle,
    UserCheck,
    UserX,
    Eye,
    AlertCircle,
    Plus,
    ChevronDown,
    FileDown
} from "lucide-react";
import { Link, router } from "@inertiajs/react";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { apiGet, apiPost, apiPostForm } from "@/lib/api";
import { useState, useEffect } from "react";

interface Option {
    value: string;
    label: string;
}

function CustomSelect({
    value,
    onChange,
    options,
    placeholder = "Pilih opsi"
}: {
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm sm:text-base text-slate-900 ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center shadow-sm"
            >
                <span className="truncate pr-2 font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-100">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left rounded-md px-2.5 py-2 text-sm sm:text-base transition-colors duration-150 hover:bg-slate-50 flex items-center justify-between ${value === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                            >
                                <span className="block text-left break-words pr-2 max-w-[90%] leading-snug">{opt.label}</span>
                                {value === opt.value && <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 ml-auto" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function BookingDetailModal({
    booking,
    isOpen,
    onClose,
    canVerify = false,
    canCancel = false,
    canCheckIn = false,
    onBookingUpdated,
}: {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
    canVerify?: boolean;
    canCancel?: boolean;
    canCheckIn?: boolean;
    onBookingUpdated?: (booking: Booking) => void;
}) {
    if (!booking) return null;

    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [paymentType, setPaymentType] = useState<string>('remaining');
    const [paymentStatus, setPaymentStatus] = useState<string>('verified');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [referenceNumber, setReferenceNumber] = useState<string>('');
    const [paymentNotes, setPaymentNotes] = useState<string>('');
    const [proofOfPayment, setProofOfPayment] = useState<File | null>(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now(),
                                    });
                                    resolve(compressedFile);
                                } else {
                                    resolve(file);
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                    } else {
                        resolve(file);
                    }
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    };

    // Fetch active payment methods
    useEffect(() => {
        if (isOpen && booking) {
            const propId = booking.property_id || booking.property?.id || '';
            apiGet<{ success: boolean; payment_methods: any[] }>(`/api/admin/booking-management/payment-methods?property_id=${propId}`)
                .then(res => {
                    if (res && res.success) {
                        setPaymentMethods(res.payment_methods);
                        if (res.payment_methods.length > 0) {
                            const preselectedId = booking.property?.payment_method_id || booking.payment_method_id;
                            const hasPreselected = preselectedId && res.payment_methods.some(m => m.id.toString() === preselectedId.toString());
                            setPaymentMethodId(hasPreselected ? preselectedId.toString() : res.payment_methods[0].id.toString());
                        }
                    }
                })
                .catch(err => console.error("Gagal memuat metode pembayaran:", err));
        }
    }, [isOpen, booking]);

    const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in)) || 1;

    // Calculate internals from actual payments relation dynamically
    const totalUniqueCode = booking.payments
        ? booking.payments.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + (p.unique_code || 0), 0)
        : 0;
    const verifiedPaymentsSum = booking.payments?.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const totalBilling = booking.total_amount + totalUniqueCode;
    const remainingAmount = Math.max(0, totalBilling - verifiedPaymentsSum);
    const isPaidOff = remainingAmount <= 0;

    const checkInDate = new Date(booking.check_in);
    checkInDate.setHours(0, 0, 0, 0);
    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);
    const yesterdayVal = new Date(todayVal);
    yesterdayVal.setDate(todayVal.getDate() - 1);
    const isCheckInTime = checkInDate >= yesterdayVal && checkInDate <= todayVal;

    // Reset default payment amount when booking changes
    useEffect(() => {
        if (booking) {
            setPaymentAmount(remainingAmount > 0 ? remainingAmount : 0);
            setPaymentType(verifiedPaymentsSum === 0 ? 'dp' : 'remaining');
        }
    }, [booking, verifiedPaymentsSum, remainingAmount]);

    const handleAction = (action: string) => {
        const routes: Record<string, string> = {
            verify: `/admin/bookings/${booking.booking_number}/verify`,
            reject: `/admin/bookings/${booking.booking_number}/reject`,
            cancel: `/admin/bookings/${booking.booking_number}/cancel`,
            checkin: `/admin/bookings/${booking.booking_number}/checkin`,
            checkout: `/admin/bookings/${booking.booking_number}/checkout`,
        };
        if (routes[action]) {
            router.patch(routes[action]);
            onClose();
        }
    };

    const copyPaymentLink = () => {
        const link = `${window.location.origin}/booking/${booking.booking_number}/payment`;
        navigator.clipboard.writeText(link);
        toast.success('Link pembayaran disalin ke clipboard!');
    };

    const copyWhatsAppMessage = () => {
        const link = `${window.location.origin}/booking/${booking.booking_number}/payment`;
        const message = `Halo ${booking.guest_name},\n\nTerima kasih telah memesan di homsjogja.com untuk unit *${booking.property?.name}*.\n\nSilakan selesaikan pembayaran Anda sebesar *${formatCurrency(remainingAmount)}* melalui link pembayaran berikut:\n${link}\n\nTerima kasih!`;
        navigator.clipboard.writeText(message);
        toast.success('Pesan WhatsApp disalin ke clipboard!');
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentMethodId) {
            toast.error("Silakan pilih metode pembayaran");
            return;
        }
        if (paymentAmount <= 0) {
            toast.error("Jumlah pembayaran harus lebih dari 0");
            return;
        }
        setIsSubmittingPayment(true);
        try {
            const formData = new FormData();
            formData.append('payment_method_id', paymentMethodId);
            formData.append('amount', paymentAmount.toString());
            formData.append('payment_type', paymentType);
            formData.append('payment_status', paymentStatus);
            formData.append('payment_date', paymentDate);
            if (referenceNumber) formData.append('reference_number', referenceNumber);
            if (paymentNotes) formData.append('notes', paymentNotes);
            if (proofOfPayment) formData.append('proof_of_payment', proofOfPayment);

            const res = await apiPostForm<{ success: boolean; message: string; booking: Booking; error?: string }>(
                `/api/admin/booking-management/bookings/${booking.booking_number}/payments`,
                formData
            );
            if (res && res.success) {
                toast.success(res.message || "Pembayaran berhasil disimpan!");
                if (onBookingUpdated) {
                    onBookingUpdated(res.booking);
                }
                router.reload();
                setReferenceNumber('');
                setPaymentNotes('');
                setProofOfPayment(null);
            } else {
                toast.error(res.error || "Gagal menyimpan pembayaran");
            }
        } catch (err: any) {
            toast.error(err.error || err.message || "Gagal menyimpan pembayaran");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleVerifyPayment = (paymentNumber: string, notes: string = '') => {
        router.patch(`/admin/payments/${paymentNumber}/verify`, {
            verification_notes: notes
        }, {
            preserveScroll: true,
            onSuccess: async () => {
                toast.success('Pembayaran berhasil disetujui');
                try {
                    const res = await apiGet<{ success: boolean; booking: Booking }>(
                        `/api/admin/booking-management/bookings/${booking.booking_number}`
                    );
                    if (res && res.success && res.booking && onBookingUpdated) {
                        onBookingUpdated(res.booking);
                    }
                } catch (err) {
                    console.error("Gagal memperbarui detail booking setelah disetujui:", err);
                }
            },
            onError: (errors) => {
                const errMsg = errors.error || Object.values(errors).join(', ') || 'Gagal menyetujui pembayaran';
                toast.error(errMsg);
            }
        });
    };

    const handleRejectPayment = (paymentNumber: string, reason: string) => {
        if (!reason) {
            toast.error('Alasan penolakan harus diisi');
            return;
        }
        router.patch(`/admin/payments/${paymentNumber}/reject`, {
            rejection_reason: reason
        }, {
            preserveScroll: true,
            onSuccess: async () => {
                toast.success('Pembayaran berhasil ditolak');
                try {
                    const res = await apiGet<{ success: boolean; booking: Booking }>(
                        `/api/admin/booking-management/bookings/${booking.booking_number}`
                    );
                    if (res && res.success && res.booking && onBookingUpdated) {
                        onBookingUpdated(res.booking);
                    }
                } catch (err) {
                    console.error("Gagal memperbarui detail booking setelah ditolak:", err);
                }
            },
            onError: (errors) => {
                const errMsg = errors.error || Object.values(errors).join(', ') || 'Gagal menolak pembayaran';
                toast.error(errMsg);
            }
        });
    };

    const detailLink = booking.external_reservation_url || `/admin/bookings/${booking.booking_number}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* z-[150] to ensure it's above fullscreen elements if possible */}
            <DialogContent className="max-w-4xl w-[95vw] md:w-full max-h-[90vh] md:max-h-[85vh] p-0 overflow-hidden gap-0 border-none shadow-2xl z-[150] flex flex-col rounded-xl">

                {/* 1. Header Section */}
                <div className="bg-slate-900 text-white p-4 md:p-6 relative">
                    {/* Background Pattern/Image - Only show on desktop to save space on mobile */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none hidden md:block">
                        {booking.property?.media?.[0]?.url && (
                            <img src={booking.property.media[0].url} className="w-full h-full object-cover blur-sm" alt="" />
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10" />

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-30 p-2 text-white/70 hover:text-white md:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="relative z-20 flex flex-col items-start gap-4">
                        <div className="flex items-start gap-3 w-full pr-8 md:pr-0">
                            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-blue-600 flex items-center justify-center text-lg md:text-xl font-bold shadow-lg ring-2 ring-white/20 shrink-0">
                                {booking.guest_name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl md:text-2xl font-bold truncate">{booking.guest_name}</h2>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-slate-300 text-xs md:text-sm mt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                            #{booking.booking_number}
                                        </span>
                                        <span className="hidden md:inline">•</span>
                                    </div>
                                    <span className="flex items-center gap-1 truncate text-slate-400 md:text-slate-300">
                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{booking.property?.name}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badges - Row on all screens */}
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                            <div className="flex flex-wrap gap-2">
                                <BookingStatusBadge status={booking.booking_status} booking={booking} />
                                <PaymentStatusBadge status={booking.payment_status} />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent border-slate-700 hover:bg-slate-800 text-white hover:text-white gap-1.5"
                                asChild
                            >
                                <a href={`/admin/bookings/${booking.booking_number}/invoice`} target="_blank" rel="noopener noreferrer">
                                    <FileDown className="w-4 h-4" />
                                    <span>Download Invoice</span>
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 2. Body Content - Vertical Flow */}
                <div className="bg-slate-50 space-y-4 md:space-y-6 flex-1 overflow-y-auto">

                    {/* Pembayaran Belum Lunas Alert Banner */}
                    {!isPaidOff && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex gap-2.5">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">Pembayaran Belum Lunas</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">Sisa tagihan: <strong className="text-amber-900 font-bold">{formatCurrency(remainingAmount)}</strong>. Mohon bagikan link pembayaran di bawah ke tamu.</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-semibold w-full sm:w-auto" onClick={copyPaymentLink}>
                                <LinkIcon className="h-4 w-4 mr-1.5" /> Bagikan Link
                            </Button>
                        </div>
                    )}

                    {/* 1. Trip Overview (Full Width) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="rounded-md px-2 py-1 bg-slate-50 text-[10px] md:text-xs font-normal text-slate-600">
                                <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> Trip Overview
                            </Badge>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-small font-semibold text-slate-800">{nights} Nights Stay</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch gap-3 md:gap-6">
                            {/* Check In */}
                            <div className="flex-1 flex sm:block items-center justify-between p-3 md:p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                                <div>
                                    <div className="text-[10px] md:text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Check In</div>
                                    <div className="text-base md:text-lg font-bold text-slate-900">{formatDate(booking.check_in)}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> 14:00+
                                    </div>
                                </div>
                                {/* Mobile: decorative element */}
                                <div className="w-1 h-8 bg-blue-200 rounded-full sm:hidden"></div>
                            </div>

                            {/* Arrow/Divider */}
                            <div className="hidden sm:flex flex-col items-center justify-center text-slate-300">
                                <div className="w-full h-px bg-slate-200 w-8 md:w-16 mb-1"></div>
                                <span className="text-[10px] bg-white px-1 text-slate-400">TO</span>
                                <div className="w-full h-px bg-slate-200 w-8 md:w-16 mt-1"></div>
                            </div>

                            {/* Check Out */}
                            <div className="flex-1 flex sm:block items-center justify-between p-3 md:p-4 rounded-lg bg-orange-50/50 border border-orange-100">
                                <div>
                                    <div className="text-[10px] md:text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Check Out</div>
                                    <div className="text-base md:text-lg font-bold text-slate-900">{formatDate(booking.check_out)}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> &lt; 12:00
                                    </div>
                                </div>
                                {/* Mobile: decorative element */}
                                <div className="w-1 h-8 bg-orange-200 rounded-full sm:hidden"></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Payment Summary (Full Width) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/30">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
                                <CreditCard className="w-4 h-4 text-blue-600" /> Payment Summary
                            </h3>
                            <div className="text-xs text-slate-500">Financial breakdown for this booking</div>
                        </div>

                        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {/* Breakdown Column */}
                            <div className="space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Base Rate ({nights}x)</span>
                                        <span>{formatCurrency(booking.base_amount || (booking.total_amount * 0.9))}</span>
                                    </div>
                                    {booking.extra_bed_amount > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Extra Bed</span>
                                            <span>{formatCurrency(booking.extra_bed_amount)}</span>
                                        </div>
                                    )}
                                    {booking.services && booking.services.length > 0 && (
                                        <div className="flex justify-between text-purple-600 font-medium">
                                            <span>Extra Services</span>
                                            <span>
                                                {formatCurrency(booking.services.reduce((sum, s) => sum + Number(s.total_price), 0))}
                                            </span>
                                        </div>
                                    )}
                                    {booking.discount_amount > 0 && (
                                        <div className="flex justify-between text-rose-600 font-semibold">
                                            <span>Diskon</span>
                                            <span>-{formatCurrency(booking.discount_amount)}</span>
                                        </div>
                                    )}
                                    {totalUniqueCode > 0 && (
                                        <div className="flex justify-between text-blue-600 font-semibold">
                                            <span>Kode Unik Transfer</span>
                                            <span>+{formatCurrency(totalUniqueCode)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-dashed my-2"></div>

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1">
                                    <span className="text-sm font-bold text-slate-700">Total Amount</span>
                                    <span className="text-xl sm:text-2xl font-bold text-slate-900">{formatCurrency(totalBilling)}</span>
                                </div>

                                {/* Progress Bar / Status */}
                                <div className="bg-slate-50 rounded-lg p-3 md:p-4 space-y-3 border border-slate-100 mt-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500 text-xs sm:text-sm">Payment Status</span>
                                        <span className={`font-bold text-xs sm:text-sm ${isPaidOff ? 'text-green-600' : 'text-blue-600'}`}>
                                            {isPaidOff ? 'Paid Off' : `${Math.round((verifiedPaymentsSum / totalBilling) * 100)}% Paid`}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(100, (verifiedPaymentsSum / totalBilling) * 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <div className="text-[10px] sm:text-xs text-slate-500">Paid</div>
                                            <div className="font-bold text-green-700 text-sm sm:text-base">{formatCurrency(verifiedPaymentsSum)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] sm:text-xs text-slate-500">Remaining</div>
                                            <div className={`font-bold text-sm sm:text-base ${isPaidOff ? 'text-slate-400' : 'text-red-600'}`}>
                                                {formatCurrency(remainingAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Column (Right Side on Desktop) */}
                            <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Transactions History</h4>
                                {booking.payments && booking.payments.length > 0 ? (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {booking.payments.map((payment: any) => {
                                            const isPending = payment.payment_status === 'pending';
                                            return (
                                                <div key={payment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm text-sm space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">{payment.payment_method?.name || 'Bank Transfer'}</span>
                                                            <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${payment.payment_status === 'verified' ? 'bg-green-100 text-green-700' : (payment.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}`}>
                                                            {payment.payment_status?.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400">
                                                        {formatDate(payment.created_at)}
                                                    </div>

                                                    {payment.attachment_path && (
                                                        <div className="pt-1.5 border-t border-dashed border-slate-200">
                                                            <div className="text-[10px] text-slate-400 mb-1 font-semibold">Bukti Transfer:</div>
                                                            <div
                                                                className="relative rounded-lg border overflow-hidden max-w-[120px] bg-white group cursor-pointer"
                                                                onClick={() => window.open(`/storage/${payment.attachment_path}`, '_blank')}
                                                            >
                                                                <img
                                                                    src={`/storage/${payment.attachment_path}`}
                                                                    alt="Receipt proof"
                                                                    className="w-full h-auto max-h-[80px] object-cover hover:scale-105 transition-transform duration-200"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 text-white text-[9px] font-medium">
                                                                    <Eye className="w-3.5 h-3.5 mr-0.5" /> View
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isPending && (
                                                        <PaymentVerificationActions
                                                            payment={payment}
                                                            onVerify={handleVerifyPayment}
                                                            onReject={handleRejectPayment}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 md:h-full text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                                        <CreditCard className="w-6 h-6 mb-2 opacity-20" />
                                        <span className="text-xs">No transactions recorded</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tambah Transaksi Form */}
                        {!isPaidOff && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-5">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Plus className="w-4 h-4 text-blue-600 animate-bounce" /> Input Transaksi Pembayaran Baru
                                </h4>
                                <form onSubmit={handleSubmitPayment} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">Jumlah Pembayaran (IDR) *</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)}
                                                className="h-10 bg-white text-base"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">Metode Pembayaran *</Label>
                                            <CustomSelect
                                                value={paymentMethodId}
                                                onChange={setPaymentMethodId}
                                                options={paymentMethods.map((m) => ({ value: m.id.toString(), label: `${m.name} (${m.type})` }))}
                                                placeholder="Pilih Metode"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">Tipe Pembayaran *</Label>
                                            <CustomSelect
                                                value={paymentType}
                                                onChange={setPaymentType}
                                                options={[
                                                    { value: 'dp', label: 'DP (Down Payment)' },
                                                    { value: 'remaining', label: 'Pelunasan (Remaining)' },
                                                    { value: 'full', label: 'Bayar Penuh (Full Payment)' },
                                                    { value: 'refund', label: 'Refund' },
                                                    { value: 'penalty', label: 'Denda (Penalty)' }
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">Status Pembayaran *</Label>
                                            <CustomSelect
                                                value={paymentStatus}
                                                onChange={setPaymentStatus}
                                                options={[
                                                    { value: 'verified', label: 'Verified (Lunas/Diterima)' },
                                                    { value: 'pending', label: 'Pending (Perlu Verifikasi)' }
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">Tanggal Pembayaran *</Label>
                                            <Input
                                                type="date"
                                                value={paymentDate}
                                                onChange={e => setPaymentDate(e.target.value)}
                                                className="h-10 bg-white text-base"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">No. Referensi (Opsional)</Label>
                                            <Input
                                                type="text"
                                                value={referenceNumber}
                                                onChange={e => setReferenceNumber(e.target.value)}
                                                placeholder="Ref transfer / cash"
                                                className="h-10 bg-white text-base"
                                            />
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-slate-600 font-semibold">Catatan Pembayaran</Label>
                                            <Input
                                                type="text"
                                                value={paymentNotes}
                                                onChange={e => setPaymentNotes(e.target.value)}
                                                placeholder="Keterangan tambahan transaksi"
                                                className="h-10 bg-white text-base"
                                            />
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-slate-600 font-semibold">Bukti Pembayaran (Opsional)</Label>
                                            <Input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={e => {
                                                    const file = e.target.files?.[0] || null;
                                                    if (file) {
                                                        compressImage(file).then(compressedFile => {
                                                            setProofOfPayment(compressedFile);
                                                        });
                                                    } else {
                                                        setProofOfPayment(null);
                                                    }
                                                }}
                                                className="h-10 bg-white cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                type="submit"
                                                disabled={isSubmittingPayment}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 font-semibold text-sm"
                                            >
                                                {isSubmittingPayment ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Rate Breakdown Card */}
                    {booking.rate_calculation && (
                        <RateBreakdownCard
                            rateCalculation={booking.rate_calculation}
                            checkIn={booking.check_in}
                            checkOut={booking.check_out}
                            discountAmount={booking.discount_amount}
                            services={booking.services}
                        />
                    )}

                    {/* 3. Guest Details & Notes (Vertical Stack) */}
                    <div className="space-y-4 md:space-y-6">
                        {/* Guest Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" /> Guest Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg gap-1 sm:gap-0">
                                    <div className="text-xs sm:text-sm text-slate-600">Total Guests</div>
                                    <div className="font-semibold text-slate-900 text-sm">{booking.guest_count} Persons</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 border rounded-lg">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_male}</div>
                                        <div className="text-[10px] uppercase text-slate-400 font-medium">Male</div>
                                    </div>
                                    <div className="p-2 border rounded-lg">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_female}</div>
                                        <div className="text-[10px] uppercase text-slate-400 font-medium">Female</div>
                                    </div>
                                    <div className="p-2 border rounded-lg">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_children}</div>
                                        <div className="text-[10px] uppercase text-slate-400 font-medium">Child</div>
                                    </div>
                                </div>

                                <div className="pt-2 space-y-3 border-t border-dashed mt-2">
                                    {booking.guest_phone ? (
                                        <div className="space-y-2">
                                            <a href={getWhatsAppLink(booking.guest_phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs md:text-sm font-medium text-slate-700 break-all">{booking.guest_phone}</span>
                                            </a>
                                            {booking.guest_phone_alternative && (
                                                <a href={getWhatsAppLink(booking.guest_phone_alternative)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                                                        <Phone className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 font-medium leading-none">Alt Phone</span>
                                                        <span className="text-xs md:text-sm font-medium text-slate-700 break-all mt-0.5">{booking.guest_phone_alternative}</span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs md:text-sm text-slate-400 italic">No phone</span>
                                        </div>
                                    )}
                                    {booking.guest_email ? (
                                        <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs md:text-sm font-medium text-slate-700 truncate min-w-0">{booking.guest_email}</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs md:text-sm text-slate-400 italic">No email</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes & Specs */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-slate-500" /> Notes & Requests
                            </h3>

                            {booking.special_requests ? (
                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm leading-relaxed border border-yellow-100 flex gap-3">
                                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>"{booking.special_requests}"</span>
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm italic flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg">
                                    <MessageSquare className="w-5 h-5 mb-1 opacity-20" />
                                    No special requests
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Additional Info</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 flex items-center gap-2">
                                            <LinkIcon className="w-3.5 h-3.5" /> Source
                                        </span>
                                        <span className="capitalize font-medium">{booking.source || 'Direct'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra Services */}
                        {booking.services && booking.services.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <h3 className="font-semibold text-slate-700 text-sm">Extra Services</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {booking.services.map((svc, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50/50">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">
                                                    {svc.service_name}
                                                    {svc.service_date && (
                                                        <span className="text-xs text-slate-500 font-normal ml-1.5">
                                                            ({new Date(svc.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-500 space-x-2">
                                                    <span>Qty: {svc.quantity}</span>
                                                    <span>•</span>
                                                    <span>Harga: {formatCurrency(svc.unit_price)}</span>
                                                    {svc.discount_amount && Number(svc.discount_amount) > 0 ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-rose-600">Diskon: -{formatCurrency(svc.discount_amount)}</span>
                                                        </>
                                                    ) : null}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{formatCurrency(svc.total_price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Footer Actions */}
                <div className="bg-white p-3 md:p-4 border-t flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
                    <div className="grid grid-cols-1 xs:grid-cols-3 sm:flex sm:flex-wrap gap-2">
                        <Button variant="outline" asChild size="sm" className="w-full sm:w-auto">
                            <a href={detailLink} target="_blank" rel="noopener noreferrer" className="justify-center">
                                <Eye className="w-4 h-4 mr-2" /> Full Details
                            </a>
                        </Button>

                        <div className="flex gap-0 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={copyPaymentLink} className="flex-1 justify-center rounded-r-none border-r-0">
                                <LinkIcon className="w-4 h-4 mr-2 text-blue-600" /> Copy Link
                            </Button>
                            <Button variant="outline" size="sm" asChild className="px-3 rounded-l-none border-l-slate-200 justify-center">
                                <a href={`${window.location.origin}/booking/${booking.booking_number}/payment`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="w-4 h-4 text-slate-600" />
                                </a>
                            </Button>
                        </div>

                        <Button variant="outline" size="sm" onClick={copyWhatsAppMessage} className="w-full sm:w-auto justify-center">
                            <MessageSquare className="w-4 h-4 mr-2 text-green-600" /> Copy WA Message
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:flex gap-2">
                        {canVerify && booking.booking_status === 'pending_verification' && (
                            <>
                                <Button variant="destructive" size="sm" onClick={() => handleAction('reject')} className="w-full sm:w-auto justify-center">
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto justify-center" size="sm" onClick={() => handleAction('verify')}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Verify
                                </Button>
                            </>
                        )}

                        {canCheckIn && booking.booking_status === 'confirmed' && isPaidOff && isCheckInTime && (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto justify-center col-span-2 sm:col-span-1" size="sm" onClick={() => handleAction('checkin')}>
                                <UserCheck className="w-4 h-4 mr-2" /> Check In
                            </Button>
                        )}

                        {canCheckIn && booking.booking_status === 'checked_in' && (
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto justify-center col-span-2 sm:col-span-1" size="sm" onClick={() => handleAction('checkout')}>
                                <UserX className="w-4 h-4 mr-2" /> Check Out
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PaymentVerificationActions({
    payment,
    onVerify,
    onReject
}: {
    payment: any;
    onVerify: (paymentNumber: string, notes: string) => void;
    onReject: (paymentNumber: string, reason: string) => void;
}) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');

    return (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {!showRejectForm ? (
                <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 font-semibold">Catatan Verifikasi (Opsional)</Label>
                    <Input
                        placeholder="Catatan verifikasi..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="h-8 text-xs bg-white"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                            onClick={() => onVerify(payment.payment_number, notes)}
                        >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Setujui
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 text-xs h-8"
                            onClick={() => setShowRejectForm(true)}
                        >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="text-[10px] text-red-500 font-semibold">Alasan Penolakan *</Label>
                    <Input
                        placeholder="Alasan ditolak..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="h-8 text-xs bg-white border-red-200 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 text-xs h-8"
                            onClick={() => onReject(payment.payment_number, reason)}
                            disabled={!reason.trim()}
                        >
                            Konfirmasi Tolak
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-8 bg-white"
                            onClick={() => setShowRejectForm(false)}
                        >
                            Batal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

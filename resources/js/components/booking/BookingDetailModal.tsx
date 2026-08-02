import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { PaymentStatusBadge } from '@/components/booking/PaymentStatusBadge';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost, apiPostForm } from '@/lib/api';
import { type Booking } from '@/types';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/formatCurrency';
import { getWhatsAppLink } from '@/utils/phone';
import { Link, router, usePage } from '@inertiajs/react';
import { differenceInDays } from 'date-fns';
import {
    AlertCircle,
    Building2,
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    Copy,
    CreditCard,
    Edit,
    Eye,
    FileDown,
    Link as LinkIcon,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    Send,
    Sparkles,
    Star,
    ThumbsUp,
    UserCheck,
    Users,
    UserX,
    X,
    XCircle,
    Upload,
    Loader2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Option = {
    value: string;
    label: string;
    subtitle?: string;
}



function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih opsi',
}: {
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o) => o.value === value);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex min-h-[52px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                <div className="min-w-0 flex-1 pr-2">
                    {selectedOption ? (
                        <div className="flex flex-col text-left">
                            <span className="truncate font-medium text-slate-900">
                                {selectedOption.label}
                            </span>

                            {selectedOption.subtitle && (
                                <span className="truncate text-xs text-slate-500">
                                    {selectedOption.subtitle}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400">
                            {placeholder}
                        </span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="animate-in fade-in-50 slide-in-from-top-1 absolute left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg duration-100">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-50 sm:text-base ${value === opt.value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}
                            >
                                <div className="max-w-[90%] flex-1 pr-2 text-left">
                                    <div className="font-medium text-slate-900">
                                        {opt.label}
                                    </div>

                                    {opt.subtitle && (
                                        <div className="text-xs text-slate-500">
                                            {opt.subtitle}
                                        </div>
                                    )}
                                </div>
                                {value === opt.value && <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-blue-600" />}
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

    const { auth } = usePage().props as any;
    const userRole = auth?.user?.role;

    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [bankAccountId, setBankAccountId] = useState<string>('');
    const [paymentBankName, setPaymentBankName] = useState<string>('');
    const [paymentAccountNumber, setPaymentAccountNumber] = useState<string>('');
    const [paymentAccountName, setPaymentAccountName] = useState<string>('');
    const [paymentType, setPaymentType] = useState<string>('remaining');
    const [paymentStatus, setPaymentStatus] = useState<string>('verified');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [referenceNumber, setReferenceNumber] = useState<string>('');
    const [paymentNotes, setPaymentNotes] = useState<string>('');
    const [proofOfPayment, setProofOfPayment] = useState<File | null>(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);


    const formatRupiah = (n: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(Number(n) || 0);


    const resetPaymentForm = () => {
        setPaymentAmount(0);
        setPaymentMethodId('');
        setBankAccountId('');
        setPaymentBankName('');
        setPaymentAccountNumber('');
        setPaymentAccountName('');
        setPaymentType('dp');
        setPaymentStatus('verified');
        setReferenceNumber('');
        setPaymentNotes('');
        setProofOfPayment(null);
    };

    // --- Review state (admin) ---
    const [showReviewEdit, setShowReviewEdit] = useState(false);
    const [reviewEditComment, setReviewEditComment] = useState('');
    const [reviewEditAdminResponse, setReviewEditAdminResponse] = useState('');
    const [isApprovingReview, setIsApprovingReview] = useState(false);
    const [isSavingReview, setIsSavingReview] = useState(false);

    const handleApproveReview = async (reviewId: number) => {
        setIsApprovingReview(true);
        try {
            await apiPost(`/admin/reviews/${reviewId}/approve`, {});
            toast.success('Status ulasan berhasil diperbarui.');
            onBookingUpdated?.({ ...booking, review: { ...booking.review, is_approved: !booking.review?.is_approved } } as any);
        } catch {
            toast.error('Gagal memperbarui ulasan.');
        } finally {
            setIsApprovingReview(false);
        }
    };

    const handleSaveReview = async (reviewId: number) => {
        setIsSavingReview(true);
        try {
            await apiPost(`/admin/reviews/${reviewId}`, {
                _method: 'PUT',
                comment: reviewEditComment,
                admin_response: reviewEditAdminResponse,
                is_approved: true,
            });
            toast.success('Ulasan berhasil diperbarui dan dipublikasikan.');
            setShowReviewEdit(false);
            onBookingUpdated?.({
                ...booking,
                review: { ...booking.review, comment: reviewEditComment, admin_response: reviewEditAdminResponse, is_approved: true },
            } as any);
        } catch {
            toast.error('Gagal menyimpan ulasan.');
        } finally {
            setIsSavingReview(false);
        }
    };

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
                            quality,
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
            apiGet<{ success: boolean; payment_methods: any[]; preferred_payment_method_id?: string | number }>(`/api/admin/booking-management/payment-methods?property_id=${propId}`)
                .then((res) => {
                    if (res && res.success) {
                        setPaymentMethods(res.payment_methods);
                        if (res.payment_methods.length > 0) {
                            const preferredId = res.preferred_payment_method_id;
                            const preselectedId = preferredId || booking.property?.payment_method_id || booking.payment_method_id;
                            const hasPreselected = preselectedId && res.payment_methods.some((m) => m.id.toString() === preselectedId.toString());
                            setPaymentMethodId(hasPreselected ? preselectedId.toString() : res.payment_methods[0].id.toString());
                        }
                    }
                })
                .catch((err) => console.error('Gagal memuat metode pembayaran:', err));
        }
    }, [isOpen, booking]);

    // Fetch bank accounts when payment method changes
    useEffect(() => {
        if (paymentMethodId) {
            const selectedMethod = paymentMethods.find((m) => m.id.toString() === paymentMethodId);
            if (selectedMethod?.type === 'bank_transfer') {
                apiGet<{ success: boolean; bank_accounts: any[] }>(`/api/admin/booking-management/bank-accounts?payment_method_id=${paymentMethodId}`)
                    .then((res) => {
                        if (res && res.success) {
                            setBankAccounts(res.bank_accounts);
                            if (res.bank_accounts.length > 0) {
                                // Try to pre-select the property's default bank account
                                const propertyBankAccountId = booking.property?.bank_account_id;
                                const defaultAccount = propertyBankAccountId
                                    ? res.bank_accounts.find((a) => a.id.toString() === propertyBankAccountId.toString())
                                    : null;
                                const selected = defaultAccount || res.bank_accounts[0];
                                setBankAccountId(selected.id.toString());
                                setPaymentBankName(selected.bank_name);
                                setPaymentAccountNumber(selected.account_number);
                                setPaymentAccountName(selected.account_holder);
                            } else {
                                setBankAccountId('');
                                setPaymentBankName('');
                                setPaymentAccountNumber('');
                                setPaymentAccountName('');
                            }
                        }
                    })
                    .catch((err) => console.error('Gagal memuat rekening:', err));
            } else {
                setBankAccounts([]);
                setBankAccountId('');
                setPaymentBankName('');
                setPaymentAccountNumber('');
                setPaymentAccountName('');
            }
        }
    }, [paymentMethodId, paymentMethods]);

    const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in)) || 1;

    // Calculate internals from actual payments relation dynamically
    const totalUniqueCode = booking.payments
        ? booking.payments.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + (p.unique_code || 0), 0)
        : 0;
    const verifiedPaymentsSum =
        booking.payments?.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const totalBilling = booking.total_amount + totalUniqueCode;
    const remainingAmount = Math.max(0, totalBilling - verifiedPaymentsSum);
    const isPaidOff = remainingAmount <= 0;

    const checkInDate = new Date(booking.check_in);
    checkInDate.setHours(0, 0, 0, 0);
    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);
    const yesterdayVal = new Date(todayVal);
    yesterdayVal.setDate(todayVal.getDate() - 180);
    //sementara allow check in untuk tanggal setelahnya hari ini
    const isCheckInTime = checkInDate >= yesterdayVal && checkInDate <= todayVal;

    // Reset default payment amount when booking changes
    useEffect(() => {
        if (booking) {
            setPaymentAmount(remainingAmount > 0 ? remainingAmount : 0);
            setPaymentType(verifiedPaymentsSum === 0 ? 'dp' : 'remaining');
        }
    }, [booking, verifiedPaymentsSum, remainingAmount]);

    const [selectedTemplate, setSelectedTemplate] = useState<string>('billing_dp');

    useEffect(() => {
        if (booking) {
            if (booking.booking_status === 'checked_out') {
                setSelectedTemplate('review');
            } else if (booking.booking_status === 'checked_in') {
                const todayStr = new Date().toISOString().split('T')[0];
                if (booking.check_out === todayStr) {
                    setSelectedTemplate('check_out');
                } else {
                    setSelectedTemplate('during_stay');
                }
            } else {
                const todayStr = new Date().toISOString().split('T')[0];
                if (booking.check_in === todayStr) {
                    setSelectedTemplate('check_in');
                } else if (verifiedPaymentsSum === 0) {
                    setSelectedTemplate('billing_dp');
                } else {
                    setSelectedTemplate('billing_remaining');
                }
            }
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
        const link = booking.payment_link || (booking.payment_token ? `${window.location.origin}/booking/${booking.booking_number}/payment/${booking.payment_token}` : `${window.location.origin}/booking/${booking.booking_number}/payment`);
        navigator.clipboard.writeText(link);
        toast.success('Link pembayaran disalin ke clipboard!');
    };

    const formatTimeHelper = (timeStr?: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
        return timeStr;
    };

    const formatDateHelper = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const getWhatsAppTemplateMessage = (templateKey: string): string => {
        const link = booking.payment_link || (booking.payment_token ? `${window.location.origin}/booking/${booking.booking_number}/payment/${booking.payment_token}` : `${window.location.origin}/booking/${booking.booking_number}/payment`);
        const reviewLink = `${window.location.origin}/booking/${booking.booking_number}/payment${booking.payment_token ? `/${booking.payment_token}` : ''}`;
        const guestsDetail = `${booking.guest_count} Orang${booking.guest_male || booking.guest_female || booking.guest_children
            ? ` (Pria: ${booking.guest_male || 0}, Wanita: ${booking.guest_female || 0}, Anak <10th: ${booking.guest_children || 0})`
            : ''
            }${booking.extra_bed_count ? ` + ${booking.extra_bed_count} Extra Bed` : ''}`;

        switch (templateKey) {
            case 'billing_dp':
                const dpAmt = booking.dp_amount || booking.total_amount * 0.5;
                return `Halo ${booking.guest_name},\n\nTerima kasih telah memesan di homsjogja.com untuk unit *${booking.property?.name}*.\n\n*Rincian Pemesanan:*\n- Tanggal Check-in: ${formatDateHelper(booking.check_in)}\n- Tanggal Check-out: ${formatDateHelper(booking.check_out)}\n- Durasi Menginap: ${nights} Malam\n- Jumlah Tamu: ${guestsDetail}\n\nSilakan selesaikan pembayaran DP Anda sebesar *${formatCurrency(dpAmt)}* melalui link pembayaran berikut:\n${link}\n\nTerima kasih!`;

            case 'billing_remaining':
                return `Halo ${booking.guest_name},\n\nBerikut tagihan pelunasan untuk pemesanan unit *${booking.property?.name}*.\n\n*Rincian Pemesanan:*\n- Tanggal Check-in: ${formatDateHelper(booking.check_in)}\n- Tanggal Check-out: ${formatDateHelper(booking.check_out)}\n- Durasi Menginap: ${nights} Malam\n- Jumlah Tamu: ${guestsDetail}\n\nNominal yang perlu dilunasi sebesar *${formatCurrency(remainingAmount)}* melalui link pembayaran berikut:\n${link}\n\nTerima kasih!`;

            case 'check_in':
                return `Halo ${booking.guest_name},\n\nKami menanti kedatangan Anda hari ini di *${booking.property?.name}*.\n\nBerikut petunjuk check-in Anda:\n- Waktu Check-in: Mulai pukul ${formatTimeHelper(booking.property?.check_in_time || '14:00')}\n- Lokasi Maps: ${booking.property?.maps_link || '-'}\n\nJika ada pertanyaan atau kendala selama check-in, silakan hubungi kami di nomor ini. Sampai jumpa!`;

            case 'during_stay':
                return `Halo ${booking.guest_name},\n\nBagaimana kenyamanan menginap Anda di *${booking.property?.name}* sejauh ini? Semoga semuanya menyenangkan.\n\nJika ada hal yang memerlukan bantuan kami (kebersihan, amenities, dll.), jangan ragu untuk mengabari kami ya. Selamat menikmati liburan Anda!`;

            case 'check_out':
                return `Halo ${booking.guest_name},\n\nMengingatkan kembali bahwa waktu check-out hari ini maksimal pukul ${formatTimeHelper(booking.property?.check_out_time || '12:00')}.\n\nSebelum check-out, mohon kesediaannya untuk mematikan AC & lampu, serta meletakkan kunci di tempat semula. Terima kasih banyak telah menginap bersama kami dan semoga perjalanan Anda menyenangkan!`;

            case 'review':
                return `Halo ${booking.guest_name},\n\nTerima kasih banyak telah menginap di *${booking.property?.name}*.\n\nBagaimana pengalaman menginap Anda bersama kami? Kami sangat menghargai jika Anda bersedia memberikan ulasan singkat melalui link berikut:\n${reviewLink}\n\nSemoga kita bisa berjumpa kembali di lain kesempatan!`;

            default:
                return '';
        }
    };

    const copyWhatsAppMessage = () => {
        const message = getWhatsAppTemplateMessage(selectedTemplate);
        navigator.clipboard.writeText(message);
        toast.success('Pesan WhatsApp disalin ke clipboard!');
    };

    const sendWhatsAppMessage = () => {
        const message = getWhatsAppTemplateMessage(selectedTemplate);
        navigator.clipboard.writeText(message);
        toast.success('Pesan disalin & membuka WhatsApp...');
        const waLink = getWhatsAppLink(booking.guest_phone, message);
        window.open(waLink, '_blank', 'noopener,noreferrer');
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentMethodId) {
            toast.error('Silakan pilih metode pembayaran');
            return;
        }
        if (paymentAmount <= 0) {
            toast.error('Jumlah pembayaran harus lebih dari 0');
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
            if (paymentBankName) formData.append('bank_name', paymentBankName);
            if (paymentAccountNumber) formData.append('account_number', paymentAccountNumber);
            if (paymentAccountName) formData.append('account_name', paymentAccountName);
            if (referenceNumber) formData.append('reference_number', referenceNumber);
            if (paymentNotes) formData.append('notes', paymentNotes);
            if (proofOfPayment) formData.append('proof_of_payment', proofOfPayment);

            const res = await apiPostForm<{ success: boolean; message: string; booking: Booking; error?: string }>(
                `/api/admin/booking-management/bookings/${booking.booking_number}/payments`,
                formData,
            );
            if (res && res.success) {
                toast.success(res.message || 'Pembayaran berhasil disimpan!');
                if (onBookingUpdated) {
                    onBookingUpdated(res.booking);
                }
                router.reload();
                setReferenceNumber('');
                setPaymentNotes('');
                setProofOfPayment(null);
            } else {
                toast.error(res.error || 'Gagal menyimpan pembayaran');
            }
        } catch (err: any) {
            toast.error(err.error || err.message || 'Gagal menyimpan pembayaran');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleVerifyPayment = (paymentNumber: string, notes: string = '') => {
        router.patch(
            `/admin/payments/${paymentNumber}/verify`,
            {
                verification_notes: notes,
            },
            {
                preserveScroll: true,
                onSuccess: async () => {
                    toast.success('Pembayaran berhasil disetujui');
                    try {
                        const res = await apiGet<{ success: boolean; booking: Booking }>(
                            `/api/admin/booking-management/bookings/${booking.booking_number}`,
                        );
                        if (res && res.success && res.booking && onBookingUpdated) {
                            onBookingUpdated(res.booking);
                        }
                    } catch (err) {
                        console.error('Gagal memperbarui detail booking setelah disetujui:', err);
                    }
                },
                onError: (errors) => {
                    const errMsg = errors.error || Object.values(errors).join(', ') || 'Gagal menyetujui pembayaran';
                    toast.error(errMsg);
                },
            },
        );
    };

    const handleRejectPayment = (paymentNumber: string, reason: string) => {
        if (!reason) {
            toast.error('Alasan penolakan harus diisi');
            return;
        }
        router.patch(
            `/admin/payments/${paymentNumber}/reject`,
            {
                rejection_reason: reason,
            },
            {
                preserveScroll: true,
                onSuccess: async () => {
                    toast.success('Pembayaran berhasil ditolak');
                    try {
                        const res = await apiGet<{ success: boolean; booking: Booking }>(
                            `/api/admin/booking-management/bookings/${booking.booking_number}`,
                        );
                        if (res && res.success && res.booking && onBookingUpdated) {
                            onBookingUpdated(res.booking);
                        }
                    } catch (err) {
                        console.error('Gagal memperbarui detail booking setelah ditolak:', err);
                    }
                },
                onError: (errors) => {
                    const errMsg = errors.error || Object.values(errors).join(', ') || 'Gagal menolak pembayaran';
                    toast.error(errMsg);
                },
            },
        );
    };

    const detailLink = booking.external_reservation_url || `/admin/bookings/${booking.booking_number}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* z-[150] to ensure it's above fullscreen elements if possible */}
            <DialogContent className="z-[150] flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-none p-0 shadow-2xl md:max-h-[85vh] md:w-full">
                <DialogTitle className="sr-only">Detail Booking {booking.booking_number}</DialogTitle>
                <DialogDescription className="sr-only">Informasi lengkap tentang detail booking tamu dan pembayaran</DialogDescription>

                {/* 1. Header Section */}
                <div className="relative bg-slate-900 p-3 text-white md:p-6">
                    {/* Background Pattern/Image - Only show on desktop to save space on mobile */}
                    <div className="pointer-events-none absolute inset-0 hidden opacity-20 md:block">
                        {booking.property?.media?.[0]?.url && (
                            <img src={booking.property.media[0].url} className="h-full w-full object-cover blur-sm" alt="" />
                        )}
                    </div>
                    <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />

                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="absolute top-2.5 right-2.5 z-30 p-1.5 text-white/70 hover:text-white md:hidden">
                        <X className="h-5 w-5" />
                    </button>

                    <div className="relative z-20 flex flex-col items-start gap-2.5 md:gap-4">
                        <div className="flex w-full items-start gap-2.5 pr-7 md:gap-3 md:pr-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold shadow-lg ring-2 ring-white/20 md:h-14 md:w-14 md:text-xl">
                                {booking.guest_name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate text-base leading-tight font-bold md:text-2xl">{booking.guest_name}</h2>

                                {/* Mobile: meta ringkas 2 baris */}
                                <div className="md:hidden mt-0.5 min-w-0 space-y-0.5">
                                    {/* Baris 1: no booking + properti */}
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 min-w-0">
                                        <span className="font-mono bg-slate-800 px-1 py-px rounded border border-slate-700 shrink-0">
                                            #{booking.booking_number}
                                        </span>
                                        <span className="flex items-center gap-1 truncate text-slate-400 min-w-0">
                                            <Building2 className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{booking.property?.name}</span>
                                        </span>
                                    </div>

                                    {/* Baris 2: Input & Follow Up */}
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 min-w-0">
                                        <span className="flex items-center gap-1 truncate min-w-0" title="Di-input oleh">
                                            <span className="shrink-0 font-semibold uppercase text-slate-500">Input:</span>
                                            <span className="truncate text-slate-300">
                                                {typeof booking.created_by === 'object' && booking.created_by
                                                    ? (booking.created_by as any).name
                                                    : booking.created_by_user?.name || '-'}
                                            </span>
                                        </span>
                                        <span className="text-slate-600">•</span>
                                        <span className="flex items-center gap-1 truncate min-w-0" title="Follow up oleh">
                                            <span className="shrink-0 font-semibold uppercase text-slate-500">FU:</span>
                                            <span className="truncate text-slate-300">
                                                {typeof booking.followed_up_by === 'object' && booking.followed_up_by
                                                    ? (booking.followed_up_by as any).name
                                                    : booking.followed_up_by_user?.name || '-'}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Desktop: meta lengkap termasuk Input & Follow Up */}
                                <div className="mt-1 hidden gap-3 text-sm text-slate-300 md:flex md:items-center">
                                    <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
                                        #{booking.booking_number}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 truncate">
                                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{booking.property?.name}</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 truncate" title="Di-input oleh">
                                        <span className="shrink-0 text-[10px] font-semibold text-slate-400 uppercase">Input:</span>
                                        <span className="truncate">
                                            {typeof booking.created_by === 'object' && booking.created_by
                                                ? (booking.created_by as any).name
                                                : booking.created_by_user?.name || '-'}
                                        </span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 truncate" title="Follow up oleh">
                                        <span className="shrink-0 text-[10px] font-semibold text-slate-400 uppercase">Follow Up:</span>
                                        <span className="truncate">
                                            {typeof booking.followed_up_by === 'object' && booking.followed_up_by
                                                ? (booking.followed_up_by as any).name
                                                : booking.followed_up_by_user?.name || '-'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badges + Invoice — 1 baris compact */}
                        <div className="flex w-full flex-wrap items-center justify-between gap-1.5 md:gap-2">
                            <div className="flex flex-wrap gap-1.5 md:gap-2 [&_*]:text-[10px] md:[&_*]:text-xs">
                                <BookingStatusBadge status={booking.booking_status} booking={booking} />
                                <PaymentStatusBadge status={booking.payment_status} />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 border-slate-700 bg-transparent px-2 text-white hover:bg-slate-800 hover:text-white md:h-8 md:px-3"
                                asChild
                            >
                                <a href={`/admin/bookings/${booking.booking_number}/invoice`} target="_blank" rel="noopener noreferrer">
                                    <FileDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    <span className="hidden text-xs sm:inline">Invoice</span>
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 2. Body Content - Vertical Flow */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 md:space-y-6">
                    {/* Pembayaran Belum Lunas Alert Banner */}
                    {!isPaidOff && (
                        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                            <div className="flex gap-2.5">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">Pembayaran Belum Lunas</h4>
                                    <p className="mt-0.5 text-xs text-amber-700">
                                        Sisa tagihan: <strong className="font-bold text-amber-900">{formatCurrency(remainingAmount)}</strong>. Mohon
                                        bagikan link pembayaran di bawah ke tamu.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-amber-300 bg-white font-semibold text-amber-900 hover:bg-amber-100 sm:w-auto"
                                onClick={copyPaymentLink}
                            >
                                <LinkIcon className="mr-1.5 h-4 w-4" /> Bagikan Link
                            </Button>
                        </div>
                    )}

                    {/* 1. Trip Overview (Full Width) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Badge variant="outline" className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-normal text-slate-600 md:text-xs">
                                <Calendar className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5" /> Trip Overview
                            </Badge>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-small font-semibold text-slate-800">{nights} Nights Stay</span>
                        </div>

                        <div className="flex flex-col items-stretch gap-3 sm:flex-row md:gap-6">
                            {/* Check In */}
                            <div className="flex flex-1 items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:block md:p-4">
                                <div>
                                    <div className="mb-1 text-[10px] font-semibold tracking-wider text-blue-600 uppercase md:text-xs">Check In</div>
                                    <div className="text-base font-bold text-slate-900 md:text-lg">{formatDate(booking.check_in)}</div>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="h-3 w-3" /> 14:00+
                                    </div>
                                </div>
                                {/* Mobile: decorative element */}
                                <div className="h-8 w-1 rounded-full bg-blue-200 sm:hidden"></div>
                            </div>

                            {/* Arrow/Divider */}
                            <div className="hidden flex-col items-center justify-center text-slate-300 sm:flex">
                                <div className="mb-1 h-px w-8 w-full bg-slate-200 md:w-16"></div>
                                <span className="bg-white px-1 text-[10px] text-slate-400">TO</span>
                                <div className="mt-1 h-px w-8 w-full bg-slate-200 md:w-16"></div>
                            </div>

                            {/* Check Out */}
                            <div className="flex flex-1 items-center justify-between rounded-lg border border-orange-100 bg-orange-50/50 p-3 sm:block md:p-4">
                                <div>
                                    <div className="mb-1 text-[10px] font-semibold tracking-wider text-orange-600 uppercase md:text-xs">
                                        Check Out
                                    </div>
                                    <div className="text-base font-bold text-slate-900 md:text-lg">{formatDate(booking.check_out)}</div>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="h-3 w-3" /> &lt; 12:00
                                    </div>
                                </div>
                                {/* Mobile: decorative element */}
                                <div className="h-8 w-1 rounded-full bg-orange-200 sm:hidden"></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Payment Summary (Full Width) */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-slate-50/30 p-4 md:p-5">
                            <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                                <CreditCard className="h-4 w-4 text-blue-600" /> Payment Summary
                            </h3>
                            <div className="text-xs text-slate-500">Financial breakdown for this booking</div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 md:gap-8 md:p-5">
                            {/* Breakdown Column */}
                            <div className="space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Base Rate ({nights}x)</span>
                                        <span>{formatCurrency(booking.base_amount || booking.total_amount * 0.9)}</span>
                                    </div>
                                    {booking.extra_bed_amount > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Extra Bed</span>
                                            <span>{formatCurrency(booking.extra_bed_amount)}</span>
                                        </div>
                                    )}
                                    {booking.services && booking.services.length > 0 && (
                                        <div className="flex justify-between font-medium text-purple-600">
                                            <span>Extra Services</span>
                                            <span>{formatCurrency(booking.services.reduce((sum, s) => sum + Number(s.total_price), 0))}</span>
                                        </div>
                                    )}
                                    {booking.discount_amount > 0 && (
                                        <div className="flex justify-between font-semibold text-rose-600">
                                            <span>Diskon</span>
                                            <span>-{formatCurrency(booking.discount_amount)}</span>
                                        </div>
                                    )}
                                    {totalUniqueCode > 0 && (
                                        <div className="flex justify-between font-semibold text-blue-600">
                                            <span>Kode Unik Transfer</span>
                                            <span>+{formatCurrency(totalUniqueCode)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="my-2 border-t border-dashed"></div>

                                <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-end">
                                    <span className="text-sm font-bold text-slate-700">Total Amount</span>
                                    <span className="text-xl font-bold text-slate-900 sm:text-2xl">{formatCurrency(totalBilling)}</span>
                                </div>

                                {/* Progress Bar / Status */}
                                <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:p-4">
                                    <div className="mb-1 flex justify-between text-sm">
                                        <span className="text-xs text-slate-500 sm:text-sm">Payment Status</span>
                                        <span className={`text-xs font-bold sm:text-sm ${isPaidOff ? 'text-green-600' : 'text-blue-600'}`}>
                                            {isPaidOff ? 'Paid Off' : `${Math.round((verifiedPaymentsSum / totalBilling) * 100)}% Paid`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(100, (verifiedPaymentsSum / totalBilling) * 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <div className="text-[10px] text-slate-500 sm:text-xs">Paid</div>
                                            <div className="text-sm font-bold text-green-700 sm:text-base">{formatCurrency(verifiedPaymentsSum)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 sm:text-xs">Remaining</div>
                                            <div className={`text-sm font-bold sm:text-base ${isPaidOff ? 'text-slate-400' : 'text-red-600'}`}>
                                                {formatCurrency(remainingAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Column (Right Side on Desktop) */}
                            <div className="border-t border-slate-100 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                                <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Transactions History</h4>
                                {booking.payments && booking.payments.length > 0 ? (
                                    <div className="md:max-h-[300px] space-y-3 md:overflow-y-auto pr-1">
                                        {booking.payments.map((payment: any) => {
                                            const isPending = payment.payment_status === 'pending';
                                            return (
                                                <div
                                                    key={payment.id}
                                                    className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">
                                                                {payment.payment_method?.name || 'Bank Transfer'}
                                                            </span>
                                                            <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                                                        </div>
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${payment.payment_status === 'verified' ? 'bg-green-100 text-green-700' : payment.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                                                        >
                                                            {payment.payment_status?.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400">{formatDate(payment.created_at)}</div>

                                                    {payment.attachment_path && (
                                                        <div className="border-t border-dashed border-slate-200 pt-1.5">
                                                            <div className="mb-1 text-[10px] font-semibold text-slate-400">Bukti Transfer:</div>
                                                            <div
                                                                className="group relative max-w-[120px] cursor-pointer overflow-hidden rounded-lg border bg-white"
                                                                onClick={() => window.open(`/storage/${payment.attachment_path}`, '_blank')}
                                                            >
                                                                <img
                                                                    src={`/storage/${payment.attachment_path}`}
                                                                    alt="Receipt proof"
                                                                    className="h-auto max-h-[80px] w-full object-cover transition-transform duration-200 hover:scale-105"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[9px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                                    <Eye className="mr-0.5 h-3.5 w-3.5" /> View
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
                                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-slate-50 text-slate-400 md:h-full">
                                        <CreditCard className="mb-2 h-6 w-6 opacity-20" />
                                        <span className="text-xs">No transactions recorded</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tambah Transaksi */}
                        {!isPaidOff && (
                            <div className="border-t border-slate-100 overflow-visible">
                                {/* ---------- Header / Toggle ---------- */}
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentForm((v) => !v)}
                                    aria-expanded={showPaymentForm}
                                    aria-controls="payment-form-panel"
                                    className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset md:px-5"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                            <Plus className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                                            Input Transaksi Pembayaran Baru
                                        </span>
                                    </span>

                                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
                                        <span className="hidden sm:inline">{showPaymentForm ? 'Sembunyikan' : 'Tampilkan'}</span>
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform duration-200 ${showPaymentForm ? 'rotate-180' : ''}`}
                                        />
                                    </span>
                                </button>

                                {/* ---------- Panel Form (animasi buka/tutup) ---------- */}
                                <div
                                    id="payment-form-panel"
                                    className={`grid transition-all duration-300 ease-in-out ${showPaymentForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                        }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="border-t border-slate-100 bg-slate-50/60 p-4 md:p-5">
                                            <form onSubmit={handleSubmitPayment} className="space-y-5">
                                                {/* ===== Bagian 1: Detail Pembayaran ===== */}
                                                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {/* Jumlah */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">
                                                            Jumlah Pembayaran <span className="text-red-500">*</span>
                                                        </Label>
                                                        <div className="relative">
                                                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-slate-400">
                                                                Rp
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                inputMode="numeric"
                                                                value={paymentAmount || ''}
                                                                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                                                                placeholder="0"
                                                                className="h-10 bg-white pl-9 text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                        <p className="h-4 text-[11px] font-medium text-blue-600">
                                                            {paymentAmount > 0 ? formatRupiah(paymentAmount) : ''}
                                                        </p>
                                                    </div>

                                                    {/* Metode */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">
                                                            Metode Pembayaran <span className="text-red-500">*</span>
                                                        </Label>
                                                        <CustomSelect
                                                            value={paymentMethodId}
                                                            onChange={(v) => {
                                                                setPaymentMethodId(v);
                                                                // reset rekening ketika metode berubah
                                                                setBankAccountId('');
                                                                setPaymentBankName('');
                                                                setPaymentAccountNumber('');
                                                                setPaymentAccountName('');
                                                            }}
                                                            options={paymentMethods.map((m) => ({ value: m.id.toString(), label: m.name }))}
                                                            placeholder="Pilih Metode"
                                                        />
                                                    </div>

                                                    {/* Rekening — muncul hanya jika bank_transfer, tetap sejajar grid */}
                                                    {paymentMethods.find((m) => m.id.toString() === paymentMethodId)?.type === 'bank_transfer' && (
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-slate-600">
                                                                Rekening Bank Tujuan <span className="text-red-500">*</span>
                                                            </Label>
                                                            <CustomSelect
                                                                value={bankAccountId}
                                                                onChange={(accId) => {
                                                                    const acc = bankAccounts.find((a) => a.id.toString() === accId);
                                                                    if (acc) {
                                                                        setBankAccountId(acc.id.toString());
                                                                        setPaymentBankName(acc.bank_name);
                                                                        setPaymentAccountNumber(acc.account_number);
                                                                        setPaymentAccountName(acc.account_holder);
                                                                    }
                                                                }}
                                                                options={bankAccounts.map((acc) => ({
                                                                    value: acc.id.toString(),
                                                                    label: acc.label,
                                                                    subtitle: `${acc.bank_name} • ${acc.account_number} • a.n. ${acc.account_holder}`,
                                                                }))}
                                                                placeholder="Pilih Rekening"
                                                            />

                                                        </div>
                                                    )}

                                                    {/* Tipe */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">
                                                            Tipe Pembayaran <span className="text-red-500">*</span>
                                                        </Label>
                                                        <CustomSelect
                                                            value={paymentType}
                                                            onChange={setPaymentType}
                                                            options={[
                                                                { value: 'dp', label: 'DP (Down Payment)' },
                                                                { value: 'remaining', label: 'Pelunasan (Remaining)' },
                                                                { value: 'full', label: 'Bayar Penuh (Full Payment)' },
                                                                { value: 'refund', label: 'Refund' },
                                                                { value: 'penalty', label: 'Denda (Penalty)' },
                                                            ]}
                                                        />
                                                    </div>

                                                    {/* Status */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">
                                                            Status Pembayaran <span className="text-red-500">*</span>
                                                        </Label>
                                                        <CustomSelect
                                                            value={paymentStatus}
                                                            onChange={setPaymentStatus}
                                                            options={[
                                                                { value: 'verified', label: 'Verified (Lunas/Diterima)' },
                                                                { value: 'pending', label: 'Pending (Perlu Verifikasi)' },
                                                            ]}
                                                        />
                                                    </div>

                                                    {/* Tanggal */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">
                                                            Tanggal Pembayaran <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={paymentDate}
                                                            onChange={(e) => setPaymentDate(e.target.value)}
                                                            className="h-10 bg-white text-base"
                                                        />
                                                    </div>

                                                    {/* Referensi */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600">No. Referensi</Label>
                                                        <Input
                                                            type="text"
                                                            value={referenceNumber}
                                                            onChange={(e) => setReferenceNumber(e.target.value)}
                                                            placeholder="Ref transfer / cash"
                                                            className="h-10 bg-white text-base"
                                                        />
                                                    </div>
                                                </div>

                                                {/* ===== Bagian 2: Lampiran & Catatan ===== */}
                                                <div className="border-t border-dashed border-slate-200 pt-4">
                                                    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                                        {/* Catatan */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-slate-600">Catatan Pembayaran</Label>
                                                            <Input
                                                                type="text"
                                                                value={paymentNotes}
                                                                onChange={(e) => setPaymentNotes(e.target.value)}
                                                                placeholder="Keterangan tambahan transaksi"
                                                                className="h-10 bg-white text-base"
                                                            />
                                                        </div>

                                                        {/* Bukti Pembayaran */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-slate-600">Bukti Pembayaran</Label>

                                                            {proofOfPayment ? (
                                                                <div className="flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3">
                                                                    <Upload className="h-4 w-4 shrink-0 text-blue-600" />
                                                                    <span className="flex-1 truncate text-sm text-slate-700">
                                                                        {proofOfPayment.name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setProofOfPayment(null)}
                                                                        className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-red-600"
                                                                        aria-label="Hapus file bukti pembayaran"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600">
                                                                    {isCompressing ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                                                            <span>Mengompres gambar…</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="h-4 w-4 shrink-0" />
                                                                            <span className="truncate">Pilih gambar atau PDF bukti transfer</span>
                                                                        </>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*,application/pdf"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0] || null;
                                                                            if (!file) {
                                                                                setProofOfPayment(null);
                                                                                return;
                                                                            }
                                                                            if (file.type === 'application/pdf') {
                                                                                setProofOfPayment(file);
                                                                                return;
                                                                            }
                                                                            setIsCompressing(true);
                                                                            compressImage(file)
                                                                                .then((compressedFile) => setProofOfPayment(compressedFile))
                                                                                .finally(() => setIsCompressing(false));
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                            <p className="text-[11px] text-slate-400">Opsional. Gambar otomatis dikompres.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ===== Footer Aksi ===== */}
                                                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <p className="text-xs text-slate-500">
                                                        Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
                                                    </p>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={resetPaymentForm}
                                                            disabled={isSubmittingPayment}
                                                            className="h-10 flex-1 text-sm font-semibold sm:flex-none"
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            disabled={isSubmittingPayment || !paymentAmount || !paymentMethodId}
                                                            className="h-10 flex-1 bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-none sm:px-6"
                                                        >
                                                            {isSubmittingPayment ? (
                                                                <span className="flex items-center gap-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
                                                                </span>
                                                            ) : (
                                                                'Simpan Pembayaran'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
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
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <Users className="h-4 w-4 text-slate-500" /> Guest Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col items-start justify-between gap-1 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:gap-0">
                                    <div className="text-xs text-slate-600 sm:text-sm">Total Guests</div>
                                    <div className="text-sm font-semibold text-slate-900">{booking.guest_count} Persons</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg border p-2">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_male}</div>
                                        <div className="text-[10px] font-medium text-slate-400 uppercase">Male</div>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_female}</div>
                                        <div className="text-[10px] font-medium text-slate-400 uppercase">Female</div>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                        <div className="text-lg font-bold text-slate-700">{booking.guest_children}</div>
                                        <div className="text-[10px] font-medium text-slate-400 uppercase">Child</div>
                                    </div>
                                </div>

                                <div className="mt-2 space-y-3 border-t border-dashed pt-2">
                                    {booking.guest_phone ? (
                                        <div className="space-y-2">
                                            <a
                                                href={getWhatsAppLink(booking.guest_phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-slate-50"
                                            >
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-medium break-all text-slate-700 md:text-sm">{booking.guest_phone}</span>
                                            </a>
                                            {booking.guest_phone_alternative && (
                                                <a
                                                    href={getWhatsAppLink(booking.guest_phone_alternative)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-slate-50"
                                                >
                                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                                                        <Phone className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] leading-none font-medium text-slate-400">Alt Phone</span>
                                                        <span className="mt-0.5 text-xs font-medium break-all text-slate-700 md:text-sm">
                                                            {booking.guest_phone_alternative}
                                                        </span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs text-slate-400 italic md:text-sm">No phone</span>
                                        </div>
                                    )}
                                    {booking.guest_email ? (
                                        <a
                                            href={`mailto:${booking.guest_email}`}
                                            className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="min-w-0 truncate text-xs font-medium text-slate-700 md:text-sm">
                                                {booking.guest_email}
                                            </span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs text-slate-400 italic md:text-sm">No email</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes & Specs */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <MessageSquare className="h-4 w-4 text-slate-500" /> Notes & Requests
                            </h3>

                            {booking.special_requests ? (
                                <div className="flex gap-3 rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-sm leading-relaxed text-yellow-800">
                                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>"{booking.special_requests}"</span>
                                </div>
                            ) : (
                                <div className="flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm text-slate-400 italic">
                                    <MessageSquare className="mb-1 h-5 w-5 opacity-20" />
                                    No special requests
                                </div>
                            )}

                            <div className="mt-4 border-t pt-4">
                                <div className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">Additional Info</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-600">
                                            <LinkIcon className="h-3.5 w-3.5" /> Source
                                        </span>
                                        <span className="font-medium capitalize">{booking.source || 'Direct'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra Services */}
                        {booking.services && booking.services.length > 0 && (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b bg-slate-50 px-5 py-3">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <h3 className="text-sm font-semibold text-slate-700">Extra Services</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {booking.services.map((svc, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">
                                                    {svc.service_name}
                                                    {svc.service_date && (
                                                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                                                            (
                                                            {new Date(svc.service_date).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                            )
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="space-x-2 text-xs text-slate-500">
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

                {/* === Guest Review Section (checked_out only) === */}
                {booking.booking_status === 'checked_out' && (
                    <div className="border-t border-slate-100 bg-amber-50/30 px-4 py-4 md:px-6">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                                <Star className="h-3.5 w-3.5 text-amber-400" /> Ulasan Tamu
                            </h4>
                            {(booking as any).review && !showReviewEdit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 border-amber-200 text-xs text-amber-700 hover:bg-amber-50"
                                    onClick={() => {
                                        setReviewEditComment((booking as any).review.comment || '');
                                        setReviewEditAdminResponse((booking as any).review.admin_response || '');
                                        setShowReviewEdit(true);
                                    }}
                                >
                                    Edit & Publish
                                </Button>
                            )}
                            {showReviewEdit && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowReviewEdit(false)}>
                                    Batal
                                </Button>
                            )}
                        </div>

                        {!(booking as any).review ? (
                            <p className="text-xs text-slate-400 italic">Tamu belum memberikan ulasan.</p>
                        ) : showReviewEdit ? (
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Komentar Tamu</Label>
                                    <Textarea
                                        value={reviewEditComment}
                                        onChange={(e) => setReviewEditComment(e.target.value)}
                                        rows={3}
                                        className="mt-1 resize-none text-xs"
                                        placeholder="Edit komentar tamu..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Respons Admin (opsional)</Label>
                                    <Textarea
                                        value={reviewEditAdminResponse}
                                        onChange={(e) => setReviewEditAdminResponse(e.target.value)}
                                        rows={2}
                                        className="mt-1 resize-none text-xs"
                                        placeholder="Tambahkan respons dari admin..."
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    className="h-8 w-full bg-amber-500 text-xs font-bold text-white hover:bg-amber-600"
                                    disabled={isSavingReview}
                                    onClick={() => handleSaveReview((booking as any).review.id)}
                                >
                                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                                    {isSavingReview ? 'Menyimpan...' : 'Simpan & Publikasikan'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Star rating display */}
                                <div className="flex items-center gap-1.5">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-4 w-4 ${s <= (booking as any).review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{(booking as any).review.rating}/5</span>
                                    <Badge
                                        className={`ml-2 border-none text-[10px] font-bold ${(booking as any).review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                                    >
                                        {(booking as any).review.is_approved ? 'Dipublikasikan' : 'Menunggu Approval'}
                                    </Badge>
                                </div>

                                {/* Photo preview */}
                                {(booking as any).review.photo_path && (
                                    <div className="h-24 w-24 overflow-hidden rounded-lg border border-slate-100">
                                        <img
                                            src={`/storage/${(booking as any).review.photo_path}`}
                                            alt="Review photo"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}

                                {/* Comment */}
                                {(booking as any).review.comment && (
                                    <p className="rounded-lg border border-slate-100 bg-white p-3 text-xs leading-relaxed text-slate-600 italic">
                                        &ldquo;{(booking as any).review.comment}&rdquo;
                                    </p>
                                )}

                                {/* Admin response */}
                                {(booking as any).review.admin_response && (
                                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                        <p className="mb-1 text-[10px] font-bold text-blue-600 uppercase">Respons Admin</p>
                                        <p className="text-xs leading-relaxed text-blue-800">{(booking as any).review.admin_response}</p>
                                    </div>
                                )}

                                {/* Approve/hide button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-7 w-full text-xs font-semibold ${(booking as any).review.is_approved ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                    disabled={isApprovingReview}
                                    onClick={() => handleApproveReview((booking as any).review.id)}
                                >
                                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                                    {isApprovingReview
                                        ? 'Memproses...'
                                        : (booking as any).review.is_approved
                                            ? 'Sembunyikan Ulasan'
                                            : 'Approve & Publikasikan'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2.5 WhatsApp Template Utility Panel */}
                <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 md:p-4">
                    <MessageSquare className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="hidden shrink-0 text-xs font-semibold tracking-wider text-slate-500 uppercase md:inline">Template WhatsApp</span>
                    <div className="min-w-0 flex-1 md:ml-auto md:max-w-64">
                        <CustomSelect
                            value={selectedTemplate}
                            onChange={(val) => setSelectedTemplate(val)}
                            options={[
                                { value: 'billing_dp', label: 'Penagihan DP' },
                                { value: 'billing_remaining', label: 'Penagihan Pelunasan' },
                                { value: 'check_in', label: 'Petunjuk Check-in' },
                                { value: 'during_stay', label: 'Menyapa Tamu (Stay)' },
                                { value: 'check_out', label: 'Petunjuk Check-out' },
                                { value: 'review', label: 'Permintaan Ulasan (Review)' },
                            ]}
                            placeholder="Pilih Template"
                        />
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                        <Button variant="outline" size="sm" onClick={copyWhatsAppMessage} className="h-9 px-2.5 md:px-3" title="Copy pesan">
                            <Copy className="h-4 w-4" />
                            <span className="ml-1.5 hidden md:inline">Copy</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={sendWhatsAppMessage}
                            className="h-9 border-0 bg-emerald-600 px-2.5 text-white shadow-sm hover:bg-emerald-700 md:px-3"
                            title="Kirim WhatsApp"
                        >
                            <Send className="h-4 w-4" />
                            <span className="ml-1.5 hidden md:inline">Kirim WA</span>
                        </Button>
                    </div>
                </div>

                {/* 3. Footer Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t bg-white px-3 py-2 md:px-4 md:py-3">

                    {/* Left Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" asChild className="h-9 px-3">
                            <a
                                href={detailLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="justify-center"
                            >
                                <Eye className="h-4 w-4" />
                                <span className="ml-1.5 hidden md:inline">Detail</span>
                            </a>
                        </Button>

                        {['super_admin', 'property_manager', 'front_desk'].includes(userRole) && (
                            <Button variant="outline" size="sm" asChild className="h-9 px-3">
                                <Link
                                    href={`/admin/bookings/${booking.booking_number}/edit`}
                                    className="justify-center text-blue-600 hover:text-blue-700"
                                >
                                    <Edit className="h-4 w-4" />
                                    <span className="ml-1.5 hidden md:inline">Edit</span>
                                </Link>
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyPaymentLink}
                            className="h-9 px-3"
                        >
                            <LinkIcon className="h-4 w-4 text-blue-600" />
                            <span className="ml-1.5">Link</span>
                        </Button>

                        {canVerify && booking.booking_status === "pending_verification" && (
                            <div className="flex overflow-hidden rounded-md border">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleAction("reject")}
                                    className="rounded-none border-0"
                                >
                                    <XCircle className="h-4 w-4" />
                                    <span className="ml-1.5 hidden md:inline">Reject</span>
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={() => handleAction("verify")}
                                    className="rounded-none bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="ml-1.5 hidden md:inline">Verify</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="ml-auto flex items-center">
                        {canCheckIn &&
                            booking.booking_status === "confirmed" &&
                            isPaidOff && isCheckInTime &&
                            (
                                <Button
                                    size="sm"
                                    onClick={() => handleAction("checkin")}
                                    className="h-9 bg-blue-600 px-4 text-white hover:bg-blue-700"
                                >
                                    <UserCheck className="h-4 w-4" />
                                    <span className="ml-1.5">Check In</span>
                                </Button>
                            )}

                        {canCheckIn &&
                            booking.booking_status === "checked_in" && (
                                <Button
                                    size="sm"
                                    onClick={() => handleAction("checkout")}
                                    className="h-9 bg-purple-600 px-4 text-white hover:bg-purple-700"
                                >
                                    <UserX className="h-4 w-4" />
                                    <span className="ml-1.5">Check Out</span>
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
    onReject,
}: {
    payment: any;
    onVerify: (paymentNumber: string, notes: string) => void;
    onReject: (paymentNumber: string, reason: string) => void;
}) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');

    return (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
            {!showRejectForm ? (
                <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-slate-500">Catatan Verifikasi (Opsional)</Label>
                    <Input
                        placeholder="Catatan verifikasi..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-8 bg-white text-xs"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="h-8 flex-1 bg-green-600 text-xs text-white hover:bg-green-700"
                            onClick={() => onVerify(payment.payment_number, notes)}
                        >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Setujui
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 flex-1 text-xs" onClick={() => setShowRejectForm(true)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Tolak
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-red-500">Alasan Penolakan *</Label>
                    <Input
                        placeholder="Alasan ditolak..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-8 border-red-200 bg-white text-xs focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 flex-1 text-xs"
                            onClick={() => onReject(payment.payment_number, reason)}
                            disabled={!reason.trim()}
                        >
                            Konfirmasi Tolak
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 flex-1 bg-white text-xs" onClick={() => setShowRejectForm(false)}>
                            Batal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

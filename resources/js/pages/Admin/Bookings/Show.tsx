import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';
import { getWhatsAppLink } from '@/utils/phone';
import { apiGet, apiPost, apiPostForm } from "@/lib/api";
import { toast } from "sonner";

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Booking, type Payment, type BreadcrumbItem, type PageProps, BookingGuest } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Calendar,
    ArrowLeft,
    Users,
    DollarSign,
    MapPin,
    Phone,
    Mail,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    CreditCard,
    FileText,
    User,
    AlertCircle,
    Download,
    Edit,
    Plus,
    Eye,
    MessageCircle,
    Trash2,
    Zap,
    Send,
    Link as LinkIcon,
    Loader2,
    MessageSquare,
    Sparkles,
    MoreVertical,
    MoreHorizontal,
    Menu,
    ChevronDown,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

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

interface WhatsAppData {
    phone: string;
    message: string;
    whatsapp_url: string;
    can_send: boolean;
}

interface BookingShowProps extends PageProps {
    booking: Booking & {
        property: {
            id: number;
            name: string;
            slug: string;
            address: string;
            cover_image?: string;
        };
        guests: BookingGuest[];
        payments: Payment[];
        workflow: Array<{
            id: number;
            status: string;
            notes: string;
            created_at: string;
            processor?: {
                id: number;
                name: string;
            };
        }>;
        verifiedBy?: {
            id: number;
            name: string;
        };
        cancelledBy?: {
            id: number;
            name: string;
        };
        rate_calculation?: any;
    };
    whatsappData?: WhatsAppData;
}

export default function ShowBooking({ booking, whatsappData, auth }: BookingShowProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
    const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
    const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState<string | null>(null);

    const page = usePage<any>();

    // Auto-buka WhatsApp di tab baru setelah payment link berhasil digenerate
    useEffect(() => {
        const flash = page.props.flash as any;
        if (flash?.whatsapp_url && flash.whatsapp_url !== pendingWhatsappUrl) {
            setPendingWhatsappUrl(flash.whatsapp_url);
            window.open(flash.whatsapp_url, '_blank', 'noopener,noreferrer');
        }
        if (flash?.payment_url) {
            setPaymentLinkUrl(flash.payment_url);
        }
    }, [page.props.flash]);

    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const { data: verifyData, setData: setVerifyData, patch: patchVerify, processing: verifyProcessing } = useForm({
        notes: '',
    });

    const { data: cancelData, setData: setCancelData, patch: patchCancel, processing: cancelProcessing } = useForm({
        cancellation_reason: '',
    });

    const { data: deleteData, setData: setDeleteData, delete: deleteBooking, processing: deleteProcessing } = useForm({
        deletion_reason: '',
        confirm_delete: false,
    });

    const { data: paymentLinkData, setData: setPaymentLinkData, post: postPaymentLink, processing: paymentLinkProcessing } = useForm({
        amount: '',
        type: 'dp',
        payment_method_id: '',
        expiry_hours: 24,
        channel: 'whatsapp' as 'whatsapp' | 'email' | 'both',
    });

    // States for recording payment inline (copied from BookingDetailModal)
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

    // Fetch active payment methods
    useEffect(() => {
        if (booking) {
            const propId = booking.property_id || booking.property?.id || '';
            apiGet<{ success: boolean; payment_methods: any[]; preferred_payment_method_id?: string | number }>(`/api/admin/booking-management/payment-methods?property_id=${propId}`)
                .then(res => {
                    if (res && res.success) {
                        setPaymentMethods(res.payment_methods);
                        if (res.payment_methods.length > 0) {
                            const preferredId = res.preferred_payment_method_id;
                            const preselectedId = preferredId || booking.property?.payment_method_id || booking.payment_method_id;
                            const hasPreselected = preselectedId && res.payment_methods.some(m => m.id.toString() === preselectedId.toString());
                            setPaymentMethodId(hasPreselected ? preselectedId.toString() : res.payment_methods[0].id.toString());
                        }
                    }
                })
                .catch(err => console.error("Gagal memuat metode pembayaran:", err));
        }
    }, [booking]);

    // Fetch bank accounts when payment method changes
    useEffect(() => {
        if (paymentMethodId) {
            const selectedMethod = paymentMethods.find(m => m.id.toString() === paymentMethodId);
            if (selectedMethod?.type === 'bank_transfer') {
                apiGet<{ success: boolean; bank_accounts: any[] }>(`/api/admin/booking-management/bank-accounts?payment_method_id=${paymentMethodId}`)
                    .then(res => {
                        if (res && res.success) {
                            setBankAccounts(res.bank_accounts);
                            if (res.bank_accounts.length > 0) {
                                const first = res.bank_accounts[0];
                                setBankAccountId(first.id.toString());
                                setPaymentBankName(first.bank_name);
                                setPaymentAccountNumber(first.account_number);
                                setPaymentAccountName(first.account_holder);
                            } else {
                                setBankAccountId('');
                                setPaymentBankName('');
                                setPaymentAccountNumber('');
                                setPaymentAccountName('');
                            }
                        }
                    })
                    .catch(err => console.error("Gagal memuat rekening:", err));
            } else {
                setBankAccounts([]);
                setBankAccountId('');
                setPaymentBankName('');
                setPaymentAccountNumber('');
                setPaymentAccountName('');
            }
        }
    }, [paymentMethodId, paymentMethods]);

    // Computations (from actual payments relation dynamically)
    const nightsVal = differenceInDays(new Date(booking.check_out), new Date(booking.check_in)) || 1;
    const totalUniqueCode = booking.payments
        ? booking.payments.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + (p.unique_code || 0), 0)
        : 0;
    const verifiedPaymentsSum = booking.payments?.filter((p: any) => p.payment_status === 'verified').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const totalBilling = booking.total_amount + totalUniqueCode;
    const remainingAmount = Math.max(0, totalBilling - verifiedPaymentsSum);
    const isPaidOff = remainingAmount <= 0;

    // Reset default payment amount when booking changes
    useEffect(() => {
        if (booking) {
            setPaymentAmount(remainingAmount > 0 ? remainingAmount : 0);
            setPaymentType(verifiedPaymentsSum === 0 ? 'dp' : 'remaining');
        }
    }, [booking, verifiedPaymentsSum, remainingAmount]);

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
        if (!proofOfPayment) {
            toast.error("Upload gambar bukti transfer wajib diisi!");
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
                formData
            );
            if (res && res.success) {
                toast.success(res.message || "Pembayaran berhasil disimpan!");
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
                router.reload();
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
                router.reload();
            },
            onError: (errors) => {
                const errMsg = errors.error || Object.values(errors).join(', ') || 'Gagal menolak pembayaran';
                toast.error(errMsg);
            }
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: booking.booking_number, href: `/admin/bookings/${booking.booking_number}` },
    ];

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        patchVerify(`/admin/bookings/${booking.booking_number}/verify`, {
            onSuccess: () => setShowVerifyDialog(false),
        });
    };

    const handleCancel = (e: React.FormEvent) => {
        e.preventDefault();
        patchCancel(`/admin/bookings/${booking.booking_number}/cancel`, {
            onSuccess: () => setShowCancelDialog(false),
        });
    };

    const handleCheckIn = () => {
        patchVerify(`/admin/bookings/${booking.booking_number}/checkin`);
    };

    const handleCheckOut = () => {
        patchVerify(`/admin/bookings/${booking.booking_number}/checkout`);
    };

    const handleEdit = () => {
        router.get(`/admin/bookings/${booking.booking_number}/edit`);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const getStatusBadge = (status: string) => {
        if (status === 'confirmed') {
            const checkInDate = new Date(booking.check_in);
            checkInDate.setHours(0, 0, 0, 0);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            if (checkInDate > todayDate) {
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="h-3 w-3 mr-1" />Menunggu Jadwal</Badge>;
            }
        }
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'checked_in':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><User className="h-3 w-3 mr-1" />Checked In</Badge>;
            case 'checked_out':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200"><CheckCircle className="h-3 w-3 mr-1" />Checked Out</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pending</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const calculateDays = () => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    };

    const checkInDate = new Date(booking.check_in);
    checkInDate.setHours(0, 0, 0, 0);
    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);
    const yesterdayVal = new Date(todayVal);
    yesterdayVal.setDate(todayVal.getDate() - 1);
    const isCheckInTime = checkInDate >= yesterdayVal && checkInDate <= todayVal;

    const canVerify = booking.booking_status === 'pending_verification';
    const canCancel = ['pending', 'confirmed'].includes(booking.booking_status);
    const canCheckIn = booking.payment_status === 'fully_paid' && booking.booking_status === 'confirmed' && isCheckInTime;
    const canCheckOut = booking.booking_status === 'checked_in';
    const canEdit = ['super_admin', 'property_manager', 'front_desk'].includes(auth?.user?.role);
    const canDelete = auth?.user?.role === 'super_admin';
    const requiresExtraConfirmation = ['checked_in', 'confirmed', 'fully_paid'].includes(booking.booking_status) || booking.payment_status === 'fully_paid';

    const handleDelete = (e: React.FormEvent) => {
        e.preventDefault();
        if (requiresExtraConfirmation && !confirmDelete) {
            return;
        }
        deleteBooking(`/admin/bookings/${booking.booking_number}`, {
            onSuccess: () => {
                router.visit('/admin/bookings');
            },
        });
    };

    // Helper for Actions Menu (Shared between desktop dropdown and mobile)
    const ActionMenuItems = () => (
        <>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
                <a href={`/admin/bookings/${booking.booking_number}/invoice`} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                    <FileText className="h-4 w-4 mr-2 text-blue-600" /> Invoice PDF
                </a>
            </DropdownMenuItem>
            {canEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Booking
                </DropdownMenuItem>
            )}
            {canDelete && (
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Booking
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canVerify && (
                <DropdownMenuItem onClick={() => setShowVerifyDialog(true)}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Verify
                </DropdownMenuItem>
            )}

            {canCheckIn && (
                <DropdownMenuItem onClick={handleCheckIn}>
                    <User className="h-4 w-4 mr-2 text-blue-600" /> Check In
                </DropdownMenuItem>
            )}
            {canCheckOut && (
                <DropdownMenuItem onClick={handleCheckOut}>
                    <CheckCircle className="h-4 w-4 mr-2 text-orange-600" /> Check Out
                </DropdownMenuItem>
            )}
            {canCancel && (
                 <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-red-600 focus:text-red-600">
                    <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                </DropdownMenuItem>
            )}
        </>
    );

    return (
        <AdminLayout title={`${booking.property.name}  ${new Date(booking.check_in).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })} - ${new Date(booking.check_out).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })}`} subtitle={`${booking.booking_number} - Booking Details`} breadcrumbs={breadcrumbs}>
            <Head title={`${booking.booking_number} - Booking Details`} />

            {/* Main Container */}
            <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-20"> {/* pb-24 for mobile footer space */}

                {/* 1. Header Redesign */}
                <div className="bg-white border-b border-slate-200 pt-6 pb-6 px-4 md:px-8 mb-6 md:mb-8 shadow-sm">
                    <div className="max-w-7xl mx-auto">

                        {/* Row 1: Booking # and 3-Dot Menu */}
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                {booking.booking_number}
                            </h1>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <ActionMenuItems />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Row 2: Property Info (Image + Name) */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 md:h-16 md:w-16 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                                {booking.property.cover_image ? (
                                    <img src={`/storage/${booking.property.cover_image}`} alt={booking.property.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold text-slate-800 leading-tight">
                                    {booking.property.name}
                                </h2>
                                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{booking.property.address}</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Status & Dates */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            {getStatusBadge(booking.booking_status)}
                            <span className="text-slate-300">|</span>
                            <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(booking.check_in).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })} - {new Date(booking.check_out).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0">
                                {calculateDays()} Nights
                            </Badge>
                        </div>

                        {/* Row 4: Desktop Actions (Hidden on Mobile) */}
                        <div className="hidden md:flex flex-wrap gap-2">
                            {whatsappData && whatsappData.can_send && (
                                <Button asChild variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                                    <a href={whatsappData.whatsapp_url} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp Format
                                    </a>
                                </Button>
                            )}
                            <Button asChild variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                                <a href={`/admin/bookings/${booking.booking_number}/invoice`} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Invoice PDF
                                </a>
                            </Button>
                            {/* Primary Workflow Actions shown directly */}
                            {canCheckIn && (
                                <Button size="sm" onClick={handleCheckIn} className="bg-blue-600 hover:bg-blue-700">
                                    <User className="h-3.5 w-3.5 mr-1.5" /> Check In
                                </Button>
                            )}
                            {canCheckOut && (
                                <Button size="sm" onClick={handleCheckOut} className="bg-orange-600 hover:bg-orange-700">
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Check Out
                                </Button>
                            )}
                            {canVerify && (
                                <Button size="sm" onClick={() => setShowVerifyDialog(true)} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dialogs */}
                <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                    <DialogContent className="bg-white p-6 sm:rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Verify Booking</DialogTitle>
                            <DialogDescription>Add optional notes for this verification.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="notes">Verification Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={verifyData.notes}
                                    onChange={(e) => setVerifyData('notes', e.target.value)}
                                    placeholder="Notes..."
                                    className="w-full"
                                />
                            </div>
                            <Button type="submit" disabled={verifyProcessing} className="w-full">
                                {verifyProcessing ? 'Verifying...' : 'Verify Booking'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogContent className="bg-white p-6 sm:rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Cancel Booking</DialogTitle>
                            <DialogDescription>Please provide a reason for cancellation.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCancel} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cancellation_reason">Reason *</Label>
                                <Textarea
                                    id="cancellation_reason"
                                    value={cancelData.cancellation_reason}
                                    onChange={(e) => setCancelData('cancellation_reason', e.target.value)}
                                    required
                                    className="w-full"
                                />
                            </div>
                            <Button type="submit" variant="destructive" disabled={cancelProcessing} className="w-full">
                                {cancelProcessing ? 'Cancelling...' : 'Confirm Cancel'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 2. Main Content Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    {/* Responsive Grid: Stacks on mobile, 3-col on desktop */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

                        {/* LEFT COLUMN (2/3) */}
                        <div className="xl:col-span-2 space-y-6 md:space-y-8">

                            {/* Guest Details First on Mobile for context? No, keep Trip Overview per user habit or strict vertical stack */}
                            {/* Trip Overview Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-600" /> Trip Overview
                                    </h3>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch gap-4 md:gap-8">
                                    {/* Check In */}
                                    <div className="flex-1 p-4 rounded-xl bg-blue-50/50 border border-blue-100 transition-all hover:bg-blue-50">
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Check In</div>
                                        <div className="text-xl md:text-2xl font-bold text-slate-900">{new Date(booking.check_in).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                        <div className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Check-in after 14:00
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="hidden sm:flex flex-col items-center justify-center text-slate-300 shrink-0">
                                        <div className="w-px h-12 bg-slate-200"></div>
                                        <div className="p-2 bg-slate-50 rounded-full border border-slate-200 my-2">
                                            <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
                                        </div>
                                        <div className="w-px h-12 bg-slate-200"></div>
                                    </div>

                                    {/* Check Out */}
                                    <div className="flex-1 p-4 rounded-xl bg-orange-50/50 border border-orange-100 transition-all hover:bg-orange-50">
                                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Check Out</div>
                                        <div className="text-xl md:text-2xl font-bold text-slate-900">{new Date(booking.check_out).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                        <div className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Check-out before 12:00
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guest Details & Notes (Grid within Left Col) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Guest Card */}
                                <div className="bg-white rounded-xl shadow-md border-0 md:shadow-sm md:border border-slate-200 p-5 md:p-6 h-full">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-slate-500" /> Guest Details
                                    </h3>
                                    <div className="space-y-5">
                                        <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                                            <div>
                                                <div className="text-sm text-slate-500 mb-1">Primary Guest</div>
                                                <div className="font-semibold text-slate-900">{booking.guest_name}</div>
                                                <div className="text-xs text-slate-400 mt-1">{booking.guest_country || 'Country not specified'}</div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                <User className="h-4 w-4" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="p-2 border rounded-lg bg-slate-50/30">
                                                <div className="text-lg font-bold text-slate-700">{booking.guest_male}</div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Male</div>
                                            </div>
                                            <div className="p-2 border rounded-lg bg-slate-50/30">
                                                <div className="text-lg font-bold text-slate-700">{booking.guest_female}</div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Female</div>
                                            </div>
                                            <div className="p-2 border rounded-lg bg-slate-50/30">
                                                <div className="text-lg font-bold text-slate-700">{booking.guest_children}</div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Child</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            {booking.guest_phone ? (
                                                <a href={getWhatsAppLink(booking.guest_phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition-colors p-2 hover:bg-slate-50 rounded-lg">
                                                    <Phone className="w-4 h-4" /> {booking.guest_phone}
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 text-sm text-slate-400 p-2">
                                                    <Phone className="w-4 h-4" /> <span className="italic">No phone</span>
                                                </div>
                                            )}
                                            {booking.guest_email ? (
                                                <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition-colors p-2 hover:bg-slate-50 rounded-lg">
                                                    <Mail className="w-4 h-4" /> {booking.guest_email}
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 text-sm text-slate-400 p-2">
                                                    <Mail className="w-4 h-4" /> <span className="italic">No email</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Card */}
                                <div className="bg-white rounded-xl shadow-md border-0 md:shadow-sm md:border border-slate-200 p-5 md:p-6 h-full flex flex-col">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-slate-500" /> Notes & Requests
                                    </h3>
                                    <div className="flex-1">
                                        {booking.special_requests ? (
                                            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm leading-relaxed border border-yellow-100 flex gap-3 h-full">
                                                <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                                                <span className="whitespace-pre-wrap">{booking.special_requests}</span>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-sm italic flex flex-col items-center justify-center h-full min-h-[150px] border-2 border-dashed rounded-xl bg-slate-50/50">
                                                <MessageSquare className="w-6 h-6 mb-2 opacity-30" />
                                                No special requests
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-6 pt-6 border-t font-mono text-xs text-slate-400">
                                        Created: {new Date(booking.created_at).toLocaleString("id-ID")}
                                    </div>
                                </div>
                            </div>

                            {/* Extra Services Card */}
                            {booking.services && booking.services.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-slate-800 text-base">Extra Services</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {booking.services.map((svc, i) => (
                                            <div key={i} className="flex justify-between items-center p-5 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-sm">
                                                        {svc.service_name}
                                                        {svc.service_date && (
                                                            <span className="text-xs text-slate-500 font-normal ml-2">
                                                                ({new Date(svc.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-slate-500 space-x-2 mt-1">
                                                        <span>Qty: {svc.quantity}</span>
                                                        <span>•</span>
                                                        <span>Price: {formatCurrency(svc.unit_price)}</span>
                                                        {svc.discount_amount && Number(svc.discount_amount) > 0 ? (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-rose-600 font-medium">Discount: -{formatCurrency(svc.discount_amount)}</span>
                                                            </>
                                                        ) : null}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-slate-900">{formatCurrency(svc.total_price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Workflow History Card - Full Width in Left Col */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-slate-500" /> Booking Timeline
                                </h3>
                                <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-2">
                                    {booking.workflow.map((step, index) => (
                                        <div key={step.id} className="relative pl-6">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all -mt-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(step.status)}
                                                        <span className="text-sm font-medium text-slate-700">by {step.processor?.name || 'System'}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {new Date(step.created_at).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                                {step.notes && (
                                                    <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 mt-2">
                                                        "{step.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN (1/3) - Financials & Payment Actions */}
                        <div className="space-y-6 md:space-y-8">

                            {/* Financial Summary Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-blue-600" /> Payment Summary
                                    </h3>
                                    {getPaymentStatusBadge(booking.payment_status)}
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* Breakdown */}
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Base Room Rate</span>
                                            <span>{formatCurrency(booking.base_amount)}</span>
                                        </div>
                                        {booking.extra_bed_amount > 0 && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>Extra Bed Charges</span>
                                                <span>{formatCurrency(booking.extra_bed_amount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-600">
                                            <span>Taxes & Fees</span>
                                            <span>{formatCurrency(booking.tax_amount)}</span>
                                        </div>
                                        {booking.services && booking.services.length > 0 && (
                                            <div className="flex justify-between text-purple-600 font-medium">
                                                <span>Layanan Tambahan</span>
                                                <span>+{formatCurrency(booking.services.reduce((sum, s) => sum + Number(s.total_price), 0))}</span>
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
                                        <div className="border-t border-dashed my-2"></div>
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-slate-700">Total Amount</span>
                                            <span className="text-xl font-bold text-slate-900">
                                                {formatCurrency(totalBilling)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                            <span>Payment Progress</span>
                                            <span>{isPaidOff ? 'Paid Off' : `${Math.round((verifiedPaymentsSum / totalBilling) * 100)}% Paid`}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mb-3">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : 'bg-blue-600'}`}
                                                style={{ width: `${Math.min(100, (verifiedPaymentsSum / totalBilling) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div>
                                                <div className="text-xs text-slate-500">Paid</div>
                                                <div className="font-bold text-green-700">{formatCurrency(verifiedPaymentsSum)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500">Remaining</div>
                                                <div className={`font-bold ${isPaidOff ? 'text-slate-400' : 'text-red-700'}`}>{formatCurrency(remainingAmount)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href={`/admin/payments/booking/${booking.booking_number}/create`}>
                                                <Plus className="h-4 w-4 mr-2" /> Record
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href={`/admin/payments/booking/${booking.booking_number}/additional`}>
                                                <Zap className="h-4 w-4 mr-2" /> Extra
                                            </Link>
                                        </Button>
                                        <div className="col-span-2">
                                            <Dialog open={showPaymentLinkDialog} onOpenChange={setShowPaymentLinkDialog}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                                        <Send className="h-4 w-4 mr-2" /> Send Payment Link
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[500px] bg-white rounded-xl">
                                                    <DialogHeader>
                                                         <DialogTitle>Generate Payment Link</DialogTitle>
                                                         <DialogDescription>Buat dan kirim link pembayaran aman (manual transfer dengan kode unik).</DialogDescription>
                                                    </DialogHeader>
                                                    <form onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const paidAmount = booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0);
                                                        const pendingAmount = booking.total_amount - paidAmount;

                                                        if (parseFloat(paymentLinkData.amount) > pendingAmount) {
                                                            alert(`Jumlah tidak boleh melebihi sisa tagihan: ${formatCurrency(pendingAmount)}`);
                                                            return;
                                                        }

                                                        postPaymentLink(`/admin/bookings/${booking.booking_number}/payment-gateway/send-link`, {
                                                            onSuccess: (page) => {
                                                                const flash = page.props.flash as any;
                                                                if (flash?.payment_url) {
                                                                    setPaymentLinkUrl(flash.payment_url);
                                                                }
                                                                if (flash?.whatsapp_url) {
                                                                    window.open(flash.whatsapp_url, '_blank');
                                                                }
                                                                setShowPaymentLinkDialog(false);
                                                            },
                                                            onError: (errors) => {
                                                                console.error('Error generating payment link:', errors);
                                                            }
                                                        });
                                                    }} className="space-y-4 pt-2">
                                                        <div className="space-y-2">
                                                            <Label>Jumlah (Amount)</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-slate-500">Rp</span>
                                                                <Input
                                                                    type="number"
                                                                    value={paymentLinkData.amount}
                                                                    onChange={(e) => {
                                                                        const paidAmount = booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0);
                                                                        const pendingAmount = booking.total_amount - paidAmount;
                                                                        const amount = Math.min(parseFloat(e.target.value) || 0, pendingAmount);
                                                                        setPaymentLinkData('amount', amount.toString());
                                                                    }}
                                                                    placeholder="0"
                                                                    className="pl-9"
                                                                    required
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Max: {formatCurrency(booking.total_amount - booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Tipe Pembayaran</Label>
                                                            <Select
                                                                value={paymentLinkData.type}
                                                                onValueChange={(val) => setPaymentLinkData('type', val)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="dp">Down Payment (DP)</SelectItem>
                                                                    <SelectItem value="remaining">Pelunasan (Sisa Tagihan)</SelectItem>
                                                                    <SelectItem value="full">Full Payment</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Expiry (Hours)</Label>
                                                            <Input
                                                                type="number"
                                                                value={paymentLinkData.expiry_hours}
                                                                onChange={(e) => setPaymentLinkData('expiry_hours', parseInt(e.target.value) || 24)}
                                                                min={1}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Channel</Label>
                                                            <Select
                                                                value={paymentLinkData.channel}
                                                                onValueChange={(val: any) => setPaymentLinkData('channel', val)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                                    <SelectItem value="email">Email</SelectItem>
                                                                    <SelectItem value="both">Both</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {paymentLinkUrl && (
                                                            <Alert className="bg-green-50 border-green-200">
                                                                <LinkIcon className="h-4 w-4 text-green-600" />
                                                                <AlertDescription className="text-green-800">
                                                                    <div className="space-y-2">
                                                                        <p className="font-medium">Link Generated!</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <Input value={paymentLinkUrl} readOnly className="font-mono text-xs h-8" />
                                                                            <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(paymentLinkUrl)} className="h-8">Copy</Button>
                                                                        </div>
                                                                    </div>
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}

                                                        <div className="flex justify-end gap-2 pt-2">
                                                            <Button type="button" variant="outline" onClick={() => setShowPaymentLinkDialog(false)}>Cancel</Button>
                                                            <Button type="submit" disabled={paymentLinkProcessing} className="bg-indigo-600 hover:bg-indigo-700">
                                                                {paymentLinkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                                Generate & Send
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </div>
                                {/* Tambah Transaksi Form (inline) */}
                                {!isPaidOff && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Plus className="w-4 h-4 text-blue-600 animate-bounce" /> Input Transaksi Pembayaran Baru
                                        </h4>
                                        <form onSubmit={handleSubmitPayment} className="space-y-4">
                                            <div className="space-y-3">
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

                                                    {/* Pilihan Rekening Bank — tampil jika metode bank_transfer */}
                                                    {paymentMethods.find(m => m.id.toString() === paymentMethodId)?.type === 'bank_transfer' && (
                                                        <div className="space-y-1 mt-3">
                                                            <Label className="text-xs text-slate-600 font-semibold">Rekening Bank Tujuan *</Label>
                                                            <CustomSelect
                                                                value={bankAccountId}
                                                                onChange={(accId) => {
                                                                    const acc = bankAccounts.find(a => a.id.toString() === accId);
                                                                    if (acc) {
                                                                        setBankAccountId(acc.id.toString());
                                                                        setPaymentBankName(acc.bank_name);
                                                                        setPaymentAccountNumber(acc.account_number);
                                                                        setPaymentAccountName(acc.account_holder);
                                                                    }
                                                                }}
                                                                options={bankAccounts.map(acc => ({
                                                                    value: acc.id.toString(),
                                                                    label: `${acc.label} — ${acc.account_number}`
                                                                }))}
                                                                placeholder="Pilih Rekening"
                                                            />
                                                        </div>
                                                    )}
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

                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-600 font-semibold">Catatan Pembayaran</Label>
                                                    <Input
                                                        type="text"
                                                        value={paymentNotes}
                                                        onChange={e => setPaymentNotes(e.target.value)}
                                                        placeholder="Keterangan tambahan transaksi"
                                                        className="h-10 bg-white text-base"
                                                    />
                                                </div>

                                                <div className="space-y-1">
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

                                                <div className="pt-2">
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

                            {/* Payments List (Below Summary) */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-500" /> Transaction History
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {booking.payments.length > 0 ? (
                                        booking.payments.map((payment) => (
                                            <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-medium text-sm text-slate-900">
                                                        {payment?.payment_method && typeof payment.payment_method === 'object'
                                                            ? (payment.payment_method as any).name || 'Unknown Method'
                                                            : payment?.payment_method || 'Unknown Method'}
                                                    </span>
                                                    <div className="text-right">
                                                        <span className="font-bold text-sm text-slate-900">{formatCurrency(payment.amount)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                                                    <span>{new Date(payment.created_at).toLocaleDateString("id-ID")}</span>
                                                    {getPaymentStatusBadge(payment.payment_status)}
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                                                    {payment.attachment_path ? (
                                                        <a href={`/storage/${payment.attachment_path}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                            <LinkIcon className="h-3 w-3" /> Proof
                                                        </a>
                                                    ) : <span className="text-xs text-slate-300">No proof</span>}

                                                    <div className="flex gap-2">
                                                        <Link href={`/admin/payments/${payment.payment_number}`} className="text-xs text-slate-500 hover:text-blue-600">View</Link>
                                                        <Link href={`/admin/payments/${payment.payment_number}/edit`} className="text-xs text-slate-500 hover:text-blue-600">Edit</Link>
                                                    </div>
                                                </div>

                                                {payment.payment_status === 'pending' && (
                                                    <PaymentVerificationActions
                                                        payment={payment}
                                                        onVerify={handleVerifyPayment}
                                                        onReject={handleRejectPayment}
                                                    />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 text-sm italic">
                                            No payments recorded
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Footer Actions */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex items-center gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-6">
                    {whatsappData && whatsappData.can_send ? (
                        <Button
                            asChild
                            className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold shadow-md active:scale-95 transition-transform"
                            size="lg"
                        >
                            <a href={whatsappData.whatsapp_url} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-5 w-5 mr-2" /> Chat Guest
                            </a>
                        </Button>
                    ) : (
                        <Button className="flex-1" disabled variant="secondary">
                            <MessageCircle className="h-5 w-5 mr-2" /> No WA Data
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-11 w-11 shrink-0 border-slate-300 shadow-sm active:bg-slate-100">
                                <MoreHorizontal className="h-6 w-6 text-slate-700" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
                            <ActionMenuItems />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Delete Dialog (Reusable) */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent className="bg-white p-6 sm:rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Delete Booking</DialogTitle>
                            <DialogDescription>This action cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleDelete} className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Are you sure you want to delete recording <strong>#{booking.booking_number}</strong>?
                            </p>
                            {requiresExtraConfirmation && (
                                <div className="p-3 bg-orange-50 text-orange-800 text-sm border border-orange-200 rounded-md flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Booking is active/paid. Double check!</span>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Reason (Optional)</Label>
                                <Textarea
                                    value={deleteData.deletion_reason}
                                    onChange={(e) => setDeleteData('deletion_reason', e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            {requiresExtraConfirmation && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={confirmDelete}
                                        onChange={(e) => setConfirmDelete(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600"
                                    />
                                    <Label className="text-sm">I confirm this deletion.</Label>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={deleteProcessing || (requiresExtraConfirmation && !confirmDelete)} className="flex-1">
                                    Delete
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar,
    MapPin,
    Users,
    CreditCard,
    Shield,
    CheckCircle,
    Copy,
    Check,
    Upload,
    ArrowLeft,
    Clock,
    Download,
    Wifi,
    ExternalLink,
    Star,
    ImageIcon,
    X,
    Send
} from 'lucide-react';
import { Map } from '@/components/ui/map';

interface BankAccount {
    id: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    label: string;
}

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'cash' | 'credit_card';
    icon?: string;
    description?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    instructions?: any;
}

interface Review {
    id: number;
    rating: number;
    comment?: string;
    photo_path?: string;
    is_approved: boolean;
    created_at: string;
}

interface Booking {
    id: number;
    booking_number: string;
    guest_name: string;
    payment_token?: string;
    check_in_time?: string;
    property: {
        name: string;
        address: string;
        cover_image?: string;
        check_in_time?: string;
        check_out_time?: string;
        checkin_instructions?: any;
        maps_link?: string;
        current_keybox_code?: string;
        lat?: string | number;
        lng?: string | number;
    };
    check_in: string;
    check_out: string;
    guest_count: number;
    total_amount: number;
    booking_status: string;
    payment_status: string;
    payments?: any[];
    review?: Review | null;
}

interface PaymentInfo {
    paidAmount: number;
    dpAmount: number;
    remainingAmount: number;
    requiredAmount: number;
    paymentType: 'dp' | 'remaining';
    isDpComplete: boolean;
    uniqueCode: number;
}

interface PaymentCreateProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    paymentInfo: PaymentInfo;
    bankAccount?: BankAccount | null;
    review?: Review | null;
    canReview?: boolean;
}

export default function CreatePayment({ booking, paymentMethods, paymentInfo, bankAccount, review, canReview }: PaymentCreateProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
        paymentMethods.find(m => m.type === 'bank_transfer') || paymentMethods[0] || null
    );
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const hasPendingPayment = booking.payments?.some(p => p.payment_status === 'pending');
    const pendingPayment = booking.payments?.find(p => p.payment_status === 'pending');

    // --- Review state ---
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHovered, setReviewHovered] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
    const [reviewPhotoPreview, setReviewPhotoPreview] = useState<string | null>(null);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const reviewFileRef = useRef<HTMLInputElement>(null);

    const compressPhoto = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(file); return; }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const maxDim = 1000;
                    let w = img.width; let h = img.height;
                    if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
                    if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                        else resolve(file);
                    }, 'image/jpeg', 0.72);
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    };

    const handleReviewPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Block non-image types
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
        const compressed = await compressPhoto(file);
        setReviewPhoto(compressed);
        setReviewPhotoPreview(URL.createObjectURL(compressed));
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reviewRating === 0) return;
        setReviewSubmitting(true);
        const fd = new FormData();
        fd.append('payment_token', booking.payment_token || '');
        fd.append('rating', reviewRating.toString());
        if (reviewComment) fd.append('comment', reviewComment);
        if (reviewPhoto) fd.append('photo', reviewPhoto);
        try {
            const resp = await fetch(route('bookings.review.store', booking.booking_number), {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '' },
                body: fd,
            });
            if (resp.redirected) {
                // Laravel redirect → go to home
                window.location.href = resp.url;
                return;
            }
            if (resp.ok) {
                setReviewSubmitted(true);
                setTimeout(() => { window.location.href = '/'; }, 2500);
            }
        } catch {
            // silent
        } finally {
            setReviewSubmitting(false);
        }
    };
    // --- End review state ---

    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: selectedMethod?.id.toString() || '',
        amount: paymentInfo.requiredAmount - (paymentInfo.uniqueCode || 0), // Base amount before unique code
        proof_of_payment: null as File | null,
        payment_notes: '',
        unique_code: paymentInfo.uniqueCode || 0,
    });

    const [currentTime, setCurrentTime] = useState(new Date());
    const [rulesAgreed, setRulesAgreed] = useState(() => {
        return typeof window !== 'undefined' ? localStorage.getItem(`booking_rules_agreed_${booking.booking_number}`) === 'true' : false;
    });

    const parseCheckInDateTime = () => {
        try {
            if (!booking.check_in) return new Date();
            const dateParts = booking.check_in.split('-');
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const day = parseInt(dateParts[2], 10);

            const timeParts = (booking.property.check_in_time || booking.check_in_time || '14:00').split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);

            const parsedDate = new Date(year, month, day, hours, minutes, 0);
            if (isNaN(parsedDate.getTime())) {
                return new Date(`${booking.check_in}T14:00:00`);
            }
            return parsedDate;
        } catch (e) {
            console.error("Error parsing check-in date:", e);
            return new Date(`${booking.check_in}T14:00:00`);
        }
    };

    const checkInDateTime = parseCheckInDateTime();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const timeDiff = checkInDateTime.getTime() - currentTime.getTime();
    // Buka instruksi check-in 30 menit sebelum waktu check-in (30 * 60 * 1000 ms)
    const isBeforeCheckIn = timeDiff > 0;

    const getGoogleCalendarUrl = () => {
        try {
            if (!checkInDateTime || isNaN(checkInDateTime.getTime())) {
                return '#';
            }
            const start = checkInDateTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
            
            const parseCheckOut = () => {
                if (!booking.check_out) return new Date(checkInDateTime.getTime() + 24 * 60 * 60 * 1000);
                const parts = booking.check_out.split('-');
                if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);
                    const parsed = new Date(y, m, d, 12, 0, 0);
                    if (!isNaN(parsed.getTime())) return parsed;
                }
                const fallback = new Date(`${booking.check_out}T12:00:00`);
                return isNaN(fallback.getTime()) ? new Date(checkInDateTime.getTime() + 24 * 60 * 60 * 1000) : fallback;
            };

            const checkOutDateTime = parseCheckOut();
            if (isNaN(checkOutDateTime.getTime())) {
                return '#';
            }
            const end = checkOutDateTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+Homsjogja+-+${encodeURIComponent(booking.property.name)}&dates=${start}/${end}&details=Nomor+Booking:+${booking.booking_number}%0AProperti:+${encodeURIComponent(booking.property.name)}%0AAlamat:+${encodeURIComponent(booking.property.address)}&sf=true&output=xml`;
        } catch (e) {
            console.error("Error creating Google Calendar link:", e);
            return '#';
        }
    };

    const handleAgreeRules = () => {
        localStorage.setItem(`booking_rules_agreed_${booking.booking_number}`, 'true');
        setRulesAgreed(true);
    };

    const formatCountdown = () => {
        const diffSecs = Math.floor(timeDiff / 1000);
        if (diffSecs <= 0) return '0 Detik';

        const days = Math.floor(diffSecs / 86400);
        const hours = Math.floor((diffSecs % 86400) / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const seconds = diffSecs % 60;

        if (days > 0) {
            return `${days} Hari, ${hours} Jam, ${minutes} Menit`;
        }
        return `${hours} Jam, ${minutes} Menit, ${seconds} Detik`;
    };

    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    const nightsCount = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    const getCheckinInstructions = () => {
        const instructions = booking.property.checkin_instructions;
        if (!instructions || (Array.isArray(instructions) && instructions.length === 0)) {
            return [
                `Tunjukkan nomor booking ${booking.booking_number} atau nama Anda (${booking.guest_name}) saat tiba di properti.`,
                `Kunci kamar atau akses card dapat diambil langsung di resepsionis / kotak kunci sesuai petunjuk hospitality.`,
                `Hubungi kami jika ada kendala: 0811-3822-6322 (Admin Hospitality).`
            ];
        }

        const list = Array.isArray(instructions) ? instructions : Object.values(instructions);
        return list.map((inst: any) => {
            if (typeof inst === 'string') {
                return inst
                    .replace(/\{\{property_name\}\}/g, booking.property.name)
                    .replace(/\{\{address\}\}/g, booking.property.address)
                    .replace(/\{\{keybox_code\}\}/g, (booking as any).property.current_keybox_code || '');
            }
            return String(inst);
        });
    };

    const formatCurrency = (amount: any) => {
        const val = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rp ${(val || 0).toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file).then(compressedFile => {
                setData('proof_of_payment', compressedFile);
            });
        }
    };

    const pendingAmountVal = pendingPayment ? (pendingPayment.expected_amount || pendingPayment.amount) : 0;
    const waAdminName = paymentInfo.paymentType === 'dp' ? 'Admin Sales Homsjogja' : 'Admin Hospitality';
    const waMessage = encodeURIComponent(
        `Halo ${waAdminName}, saya telah melakukan transfer untuk booking ${booking.booking_number} atas nama ${booking.guest_name} sebesar ${formatCurrency(pendingAmountVal)}. Mohon untuk dicek dan diverifikasi pembayaran saya. Terima kasih.`
    );
    const waNumber = paymentInfo.paymentType === 'dp' ? '628112500082' : '6281138226322';
    const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('payments.store', booking.booking_number));
    };

    return (
        <>
            <Head title={`Pembayaran Booking - ${booking.booking_number}`} />

            <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-6 w-6 text-brand-primary text-blue-600" />
                            <h1 className="text-2xl font-bold text-slate-900">Alur Pembayaran</h1>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Booking Summary */}
                        <Card className="shadow-sm border-slate-100">
                            <CardHeader className="bg-slate-50/55">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
                                    <Calendar className="h-5 w-5 text-blue-500" /> Ringkasan Booking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <p className="text-xs text-muted-foreground">Nomor Booking</p>
                                         <p className="font-semibold text-slate-800">{booking.booking_number}</p>
                                     </div>
                                     <div>
                                         <p className="text-xs text-muted-foreground">Nama Tamu</p>
                                         <p className="font-semibold text-slate-800">{booking.guest_name}</p>
                                     </div>
                                 </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">Properti</p>
                                    <p className="font-semibold text-slate-800">{booking.property.name}</p>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3.5 w-3.5 mr-1" />
                                        <span>{booking.property.address}</span>
                                    </div>
                                </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <p className="text-xs text-muted-foreground">Check-in</p>
                                         <p className="text-sm font-semibold text-slate-800">{formatDate(booking.check_in)}</p>
                                         <p className="text-xs text-slate-500 font-medium">Jam: {booking.check_in_time || booking.property.check_in_time || '14:00'}</p>
                                     </div>
                                     <div>
                                         <p className="text-xs text-muted-foreground">Check-out</p>
                                         <p className="text-sm font-semibold text-slate-800">{formatDate(booking.check_out)}</p>
                                         <p className="text-xs text-slate-500 font-medium">Jam: {booking.property.check_out_time || '11:00'}</p>
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <p className="text-xs text-muted-foreground">Durasi</p>
                                         <p className="text-sm font-semibold text-slate-800">{nightsCount} Malam</p>
                                     </div>
                                     <div>
                                         <p className="text-xs text-muted-foreground">Tamu</p>
                                         <div className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                                             <Users className="h-4 w-4 text-slate-400" />
                                             <span>{booking.guest_count} Tamu</span>
                                         </div>
                                     </div>
                                 </div>

                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Total Tagihan</span>
                                        <span className="font-semibold text-slate-800">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Sudah Dibayar</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(paymentInfo.paidAmount)}</span>
                                    </div>
                                    <div className="border-t border-dashed border-slate-100 pt-2 flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-900">
                                            {booking.payment_status === 'fully_paid'
                                                ? 'Sisa Tagihan'
                                                : (paymentInfo.paymentType === 'dp' ? 'Uang Muka (DP) + Kode Unik' : 'Sisa Tagihan + Kode Unik')}
                                        </span>
                                        <span className={`text-xl font-extrabold ${booking.payment_status === 'fully_paid' ? 'text-green-600' : 'text-blue-600'}`}>
                                            {booking.payment_status === 'fully_paid' ? 'Rp 0' : formatCurrency(paymentInfo.requiredAmount)}
                                        </span>
                                    </div>
                                    
                                    <div className="border-t border-slate-100 pt-4">
                                        <Button asChild variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold cursor-pointer">
                                            <a href={`/booking/${booking.booking_number}/invoice`} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 text-slate-500" /> Unduh Invoice Booking (PDF)
                                            </a>
                                        </Button>
                                    </div>
                                </div>

                                 {booking.payment_status !== 'fully_paid' && (
                                     <Alert className="bg-blue-50 border-blue-100">
                                         <Shield className="h-4 w-4 text-blue-600" />
                                         <AlertDescription className="text-xs text-blue-800 leading-relaxed">
                                             Harap transfer tepat sesuai nominal di atas (termasuk kode unik) agar sistem dapat memverifikasi pembayaran Anda secara otomatis.
                                         </AlertDescription>
                                     </Alert>
                                 )}
                            </CardContent>
                        </Card>

                        {/* Payment Actions */}
                        <Card className="shadow-sm border-slate-100">
                            <CardHeader className="bg-slate-50/55">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
                                    {booking.booking_status === 'checked_out'
                                        ? <><Star className="h-5 w-5 text-amber-400" /> Berikan Ulasan Anda</>
                                        : <><CreditCard className="h-5 w-5 text-blue-500" /> Metode &amp; Konfirmasi Pembayaran</>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {/* === CHECKED OUT → REVIEW === */}
                                {booking.booking_status === 'checked_out' ? (
                                    reviewSubmitted ? (
                                        <div className="py-10 text-center space-y-3">
                                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-50 mb-2">
                                                <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">Terima kasih! 🙏</h3>
                                            <p className="text-sm text-slate-500">Ulasan Anda telah kami terima.<br/>Anda akan diarahkan ke halaman utama...</p>
                                        </div>
                                    ) : booking.review ? (
                                        <div className="py-8 px-2 text-center space-y-3">
                                            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-50 mb-1">
                                                <CheckCircle className="h-8 w-8 text-green-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">Ulasan Sudah Dikirim</h3>
                                            <div className="flex items-center justify-center gap-1">
                                                {[1,2,3,4,5].map(s => (
                                                    <Star key={s} className={`h-5 w-5 ${ s <= booking.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                                ))}
                                            </div>
                                            {booking.review.comment && (
                                                <p className="text-sm text-slate-600 italic max-w-xs mx-auto">&ldquo;{booking.review.comment}&rdquo;</p>
                                            )}
                                            <p className="text-xs text-slate-400">Status: {booking.review.is_approved ? 'Dipublikasikan ✓' : 'Menunggu persetujuan admin'}</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmitReview} className="space-y-5 py-2">
                                            {/* Star Rating */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 font-semibold text-sm">Rating Pengalaman Anda *</Label>
                                                <div className="flex items-center gap-1.5">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setReviewRating(star)}
                                                            onMouseEnter={() => setReviewHovered(star)}
                                                            onMouseLeave={() => setReviewHovered(0)}
                                                            className="focus:outline-none transition-transform hover:scale-110"
                                                        >
                                                            <Star className={`h-9 w-9 transition-colors ${
                                                                star <= (reviewHovered || reviewRating)
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-slate-200 hover:text-amber-200'
                                                            }`} />
                                                        </button>
                                                    ))}
                                                    {reviewRating > 0 && (
                                                        <span className="text-sm text-slate-500 ml-1">
                                                            {['','Buruk','Cukup','Baik','Sangat Baik','Luar Biasa'][reviewRating]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comment */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="review_comment" className="text-slate-700 font-semibold text-sm">Ceritakan Pengalaman Anda (Opsional)</Label>
                                                <Textarea
                                                    id="review_comment"
                                                    value={reviewComment}
                                                    onChange={e => setReviewComment(e.target.value)}
                                                    placeholder="Bagaimana pengalaman menginap Anda? Fasilitas, kebersihan, pelayanan..."
                                                    rows={4}
                                                    className="resize-none text-sm"
                                                    maxLength={1000}
                                                />
                                                <p className="text-xs text-slate-400 text-right">{reviewComment.length}/1000</p>
                                            </div>

                                            {/* Photo Upload */}
                                            <div className="space-y-1.5">
                                                <Label className="text-slate-700 font-semibold text-sm">Tambah Foto (Opsional)</Label>
                                                {reviewPhotoPreview ? (
                                                    <div className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                                        <img src={reviewPhotoPreview} alt="Preview" className="w-full h-48 object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => { setReviewPhoto(null); setReviewPhotoPreview(null); if(reviewFileRef.current) reviewFileRef.current.value=''; }}
                                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                                                            {reviewPhoto ? (reviewPhoto.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="border border-dashed border-slate-200 rounded-xl p-5 text-center space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => reviewFileRef.current?.click()}
                                                    >
                                                        <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                                                        <p className="text-xs text-slate-400">Klik untuk unggah foto<br/><span className="font-medium">JPG, PNG, WebP · Maks 3MB</span></p>
                                                    </div>
                                                )}
                                                <input
                                                    ref={reviewFileRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="hidden"
                                                    onChange={handleReviewPhoto}
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                disabled={reviewRating === 0 || reviewSubmitting}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                <Send className="h-4 w-4" />
                                                {reviewSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}
                                            </Button>
                                        </form>
                                    )
                                ) : booking.payment_status === 'fully_paid' ? (
                                    isBeforeCheckIn ? (
                                        <div className="text-center py-8 px-4 space-y-5">
                                            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-blue-50 text-blue-600 mb-1">
                                                <CheckCircle className="h-12 w-12 text-blue-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-slate-900">Booking Terkonfirmasi</h3>
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold border-none text-[10px] uppercase">
                                                    LUNAS
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                                                Halo <strong>{booking.guest_name}</strong>, booking Anda dengan nomor <strong>{booking.booking_number}</strong> telah terkonfirmasi. Silakan menunggu waktu check-in tiba.
                                            </p>

                                            {/* Countdown Card */}
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 max-w-sm mx-auto shadow-sm space-y-2">
                                                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    <Clock className="h-4 w-4 text-blue-500 animate-pulse" /> Waktu Menuju Check-in
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-slate-905 tracking-tight text-blue-600">
                                                    {formatCountdown()}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    Check-in: {formatDate(booking.check_in)} ({booking.property.check_in_time || booking.check_in_time || '14:00'})
                                                </div>
                                            </div>

                                            <div className="pt-2 max-w-sm mx-auto space-y-3">
                                                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer">
                                                    <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer">
                                                        <Calendar className="h-5 w-5" /> Tambah Pengingat ke Kalender
                                                    </a>
                                                </Button>
                                                <Button asChild variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer">
                                                     <a href={`https://wa.me/6281138226322?text=${encodeURIComponent(`Halo Admin Hospitality, saya memerlukan bantuan terkait pemesanan ${booking.booking_number} atas nama ${booking.guest_name}.`)}`} target="_blank" rel="noopener noreferrer">
                                                         Butuh bantuan? Hubungi Hospitality
                                                     </a>
                                                 </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 px-2 space-y-6">
                                        <div className="text-center pb-4 border-b border-dashed">
                                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-50 text-green-600 mb-2">
                                                <CheckCircle className="h-10 w-10 text-green-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">Booking Terkonfirmasi</h3>
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold border-none text-[10px] uppercase mt-1">
                                                LUNAS
                                            </Badge>
                                            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                                                Halo <strong>{booking.guest_name}</strong>, booking Anda <strong>{booking.booking_number}</strong> telah lunas. Berikut adalah panduan akses masuk properti Anda.
                                            </p>
                                        </div>

                                        {/* 1. Petunjuk Arah Properti */}
                                        {booking.property.maps_link && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Petunjuk Arah Properti</h4>
                                                
                                                {/* Map Component */}
                                                {booking.property.lat && booking.property.lng && (
                                                    <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
                                                        <CardContent className="p-0 h-64 relative">
                                                            <Map 
                                                                lat={Number(booking.property.lat)} 
                                                                lng={Number(booking.property.lng)} 
                                                                height="105%" 
                                                                zoom={18}
                                                                propertyName={booking.property.name}
                                                                address={booking.property.address}
                                                            />
                                                            <div className="absolute bottom-4 right-4 z-[1000]">
                                                                <Button variant="secondary" size="sm" className="bg-white/90 backdrop-blur shadow-md text-xs font-bold flex items-center gap-1.5" onClick={() => window.open(booking.property.maps_link, '_blank')}>
                                                                    Buka di Google Maps <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {!booking.property.lat && (
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-rose-500" />
                                                            <span className="text-xs font-bold text-slate-700">Rute Petunjuk Arah</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 leading-normal">
                                                            Klik tombol di bawah untuk membuka Google Maps dan melihat rute petunjuk arah menuju <strong>{booking.property.name}</strong>.
                                                        </p>
                                                        <Button asChild variant="outline" className="w-full bg-white hover:bg-slate-100 border-slate-200 text-slate-700 text-xs py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-bold">
                                                            <a href={booking.property.maps_link} target="_blank" rel="noopener noreferrer">
                                                                <MapPin className="h-4 w-4 text-rose-500" /> Buka di Google Maps
                                                            </a>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 2. Panduan & Instruksi Check-in */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Panduan & Instruksi Check-in</h4>
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-3 leading-relaxed">
                                                {booking.property.checkin_instructions?.welcome && (
                                                    <p className="font-medium text-slate-850 border-b pb-2 mb-2">{booking.property.checkin_instructions.welcome.replace(/\{\{property_name\}\}/g, booking.property.name)}</p>
                                                )}
                                                {booking.property.checkin_instructions?.checkin_time && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-blue-600">Info Jam:</span>
                                                        <span>{booking.property.checkin_instructions.checkin_time}</span>
                                                    </div>
                                                )}
                                                {booking.property.checkin_instructions?.emergency_contact && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-blue-600">Bantuan:</span>
                                                        <span>{booking.property.checkin_instructions.emergency_contact}</span>
                                                    </div>
                                                )}
                                                {booking.property.checkin_instructions?.additional_info && booking.property.checkin_instructions.additional_info.length > 0 && (
                                                    <div className="border-t border-slate-200/60 pt-2.5 mt-2 space-y-1.5">
                                                        <span className="font-bold text-slate-700 block mb-1">Informasi Tambahan:</span>
                                                        {booking.property.checkin_instructions.additional_info.map((info: string, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-2 text-slate-500 pl-1">
                                                                <span className="text-blue-500 font-bold">•</span>
                                                                <span>{info}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Pengambilan Kunci (Key Box) */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Pengambilan Kunci (Key Box)</h4>
                                            {booking.property.checkin_instructions?.keybox_location && (
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
                                                    <span className="font-bold text-slate-700 block">Petunjuk Lokasi Keybox:</span>
                                                    <p className="text-slate-500">{booking.property.checkin_instructions.keybox_location}</p>
                                                </div>
                                            )}
                                            
                                            {booking.property.current_keybox_code && (
                                                <div className="bg-amber-50/60 border border-amber-100/70 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">KODE KOTAK KUNCI (KEYBOX)</span>
                                                        <span className="font-mono text-2xl font-black tracking-widest text-amber-900">{booking.property.current_keybox_code}</span>
                                                    </div>
                                                    <Button variant="outline" className="border-amber-200 text-amber-900 hover:bg-amber-100/50 rounded-xl px-4 py-2 font-bold text-xs" onClick={() => copyToClipboard(booking.property.current_keybox_code || '', 'keybox_code')}>
                                                        {copiedField === 'keybox_code' ? 'Tersalin!' : 'Salin Kode'}
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {booking.property.checkin_instructions?.keybox_code && booking.property.current_keybox_code && (
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                                                    <span className="font-bold text-slate-700 block">Petunjuk Membuka:</span>
                                                    <p className="text-slate-500 mt-1">{booking.property.checkin_instructions.keybox_code.replace(/\{\{keybox_code\}\}/g, booking.property.current_keybox_code)}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 4. Peraturan Properti */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Peraturan Properti ({booking.property.name})</h4>
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-2.5">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-500 font-bold">•</span>
                                                    <span><strong>Waktu Check-out:</strong> Maksimal pukul {booking.property.check_out_time || '11:00'} siang WIB.</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-500 font-bold">•</span>
                                                    <span><strong>Ketenangan & Ketertiban:</strong> Harap menjaga ketenangan dan tidak membuat kegaduhan setelah pukul 21:00 malam.</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-500 font-bold">•</span>
                                                    <span><strong>Larangan Merokok:</strong> Merokok di dalam kamar sangat dilarang. Silakan merokok di area outdoor yang telah disediakan.</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-500 font-bold">•</span>
                                                    <span><strong>Kerusakan Properti:</strong> Setiap kehilangan atau kerusakan fasilitas properti selama masa inap menjadi tanggung jawab tamu sepenuhnya.</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5. Akses WiFi Properti */}
                                        {booking.property.checkin_instructions?.wifi_name && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Akses WiFi Properti</h4>
                                                <Card className="bg-slate-900 text-white border-0 shadow-md overflow-hidden relative rounded-2xl">
                                                    <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                                                    <CardHeader className="p-4 pb-2 relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            <Wifi className="h-5 w-5 text-blue-400 animate-pulse" />
                                                            <CardTitle className="text-sm font-bold text-white">WiFi & Internet</CardTitle>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-1 relative z-10 space-y-3">
                                                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                                            <div className="space-y-0.5">
                                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">WiFi Name / SSID</div>
                                                                <div className="font-mono text-sm tracking-wide text-white">{booking.property.checkin_instructions.wifi_name}</div>
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => copyToClipboard(booking.property.checkin_instructions.wifi_name || '', 'wifi_name')}>
                                                                {copiedField === 'wifi_name' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                                            <div className="space-y-0.5">
                                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Password</div>
                                                                <div className="font-mono text-sm tracking-wide text-white">{booking.property.checkin_instructions.wifi_password}</div>
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => copyToClipboard(booking.property.checkin_instructions.wifi_password || '', 'wifi_password')}>
                                                                {copiedField === 'wifi_password' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}
                                    </div>
                                    )
                                ) : hasPendingPayment && pendingPayment ? (
                                    <div className="text-center py-8 px-4 space-y-4">
                                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 text-yellow-500 mb-2">
                                            <Clock className="h-10 w-10 animate-pulse text-yellow-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Pembayaran Menunggu Konfirmasi</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                                            Bukti transfer Anda sebesar <strong>{formatCurrency(pendingPayment.expected_amount || pendingPayment.amount)}</strong> telah kami terima pada <strong>{formatDate(pendingPayment.created_at)}</strong>.
                                        </p>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left text-xs text-slate-500 space-y-1.5 max-w-sm mx-auto">
                                            <div className="flex justify-between">
                                                <span>No. Pembayaran:</span>
                                                <span className="font-semibold text-slate-700">{pendingPayment.payment_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Metode:</span>
                                                <span className="font-semibold text-slate-700">{pendingPayment.payment_method?.toUpperCase().replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Status:</span>
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-[10px] font-bold border-none">
                                                    MENUNGGU VERIFIKASI
                                                </Badge>
                                            </div>
                                        </div>
                                         <p className="text-xs text-slate-400">
                                             Kami sedang memverifikasi pembayaran Anda. Halaman ini akan diperbarui secara otomatis setelah pembayaran terverifikasi.
                                         </p>
                                         <div className="pt-2 max-w-sm mx-auto">
                                             <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-sm transition-all">
                                                 <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                         <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.995-1.878-1.88-4.357-2.912-6.997-2.914-5.443 0-9.865 4.42-9.87 9.865-.002 1.698.443 3.356 1.293 4.806l-.99 3.619 3.708-.973zm12.39-7.37c-.3-.15-1.772-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.77-1.665-2.07-.175-.3-.019-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.625-.926-2.225-.244-.589-.49-.51-.676-.51-.175-.005-.375-.005-.575-.005-.2 0-.525.075-.8.375-.276.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.224 5.112 4.521.714.309 1.272.493 1.706.63.718.228 1.37.196 1.885.12.574-.085 1.772-.725 2.022-1.425.25-.7.25-1.3 1.75-1.4.075-.1.225-.3.075-.45z"/>
                                                     </svg>
                                                     Hubungi {waAdminName} (WhatsApp)
                                                 </a>
                                             </Button>
                                         </div>
                                     </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Bank transfer info card */}
                                        {selectedMethod && (
                                            <div className="space-y-4">
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                                    <div className="flex items-center justify-between border-b pb-2">
                                                        <span className="text-xs font-semibold text-slate-500">TRANSFER KE REKENING</span>
                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">
                                                            BANK TRANSFER
                                                        </Badge>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Bank:</span>
                                                            <span className="font-semibold text-slate-800">
                                                                {selectedMethod.bank_name || (bankAccount ? bankAccount.bank_name : '')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm items-center">
                                                            <span className="text-slate-500">No. Rekening:</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-slate-950">
                                                                    {selectedMethod.account_number || (bankAccount ? bankAccount.account_number : '')}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => copyToClipboard((selectedMethod.account_number || (bankAccount ? bankAccount.account_number : '')) || '', 'account')}
                                                                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    {copiedField === 'account' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Atas Nama:</span>
                                                            <span className="font-semibold text-slate-800">
                                                                {selectedMethod.account_name || (bankAccount ? bankAccount.account_holder : '')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Instructions */}
                                                {selectedMethod.instructions && (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-slate-700 font-semibold">Petunjuk Transfer</Label>
                                                        <ul className="text-xs text-slate-500 space-y-1 list-decimal pl-4">
                                                            {selectedMethod.instructions.map((inst: string, idx: number) => (
                                                                <li key={idx}>{inst}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="border-t border-slate-100 pt-4 space-y-4">
                                                    {/* Expected transfer amount */}
                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-slate-400">Total Nominal (+ Kode Unik)</p>
                                                            <p className="font-extrabold text-blue-600 text-lg">{formatCurrency(paymentInfo.requiredAmount)}</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyToClipboard(paymentInfo.requiredAmount.toString(), 'amount')}
                                                            className="h-8 text-blue-600 hover:text-blue-700"
                                                        >
                                                            {copiedField === 'amount' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Proof of payment upload */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="proof_of_payment" className="text-slate-700 font-semibold">Upload Bukti Transfer *</Label>
                                                    <div className="border border-dashed border-slate-200 p-4 rounded-xl text-center space-y-2 hover:bg-slate-50 transition-colors">
                                                        <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                                                        <input
                                                            id="proof_of_payment"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                            className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Mendukung format JPG, JPEG, PNG, PDF (Maks. 2MB)</p>
                                                    </div>
                                                    {errors.proof_of_payment && (
                                                        <p className="text-xs text-red-600 mt-1 font-medium">{errors.proof_of_payment}</p>
                                                    )}
                                                </div>

                                                {/* Payment notes */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="payment_notes" className="text-slate-700">Catatan Pembayaran (Opsional)</Label>
                                                    <Textarea
                                                        id="payment_notes"
                                                        value={data.payment_notes}
                                                        onChange={(e) => setData('payment_notes', e.target.value)}
                                                        placeholder="Contoh: Transfer dari rekening atas nama Budi"
                                                        rows={2}
                                                        className="resize-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <Button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-lg transition-all duration-200"
                                            disabled={processing}
                                        >
                                            {processing ? 'Memproses...' : 'Kirim Bukti Pembayaran'}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

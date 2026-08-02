import React, { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type Booking, type Property, type BreadcrumbItem, type PaginatedData } from '@/types';
import { Link, router } from '@inertiajs/react';
import {
    Search,
    CheckCircle,
    LogOut,
    Eye,
    ChevronLeft,
    ChevronRight,
    MapPin,
    User,
    ArrowUpDown,
    AlertTriangle,
    CreditCard,
    Calendar,
    Filter,
    MessageSquare,
    Phone,
    Moon,
    Flame,
    Key,
    Check,
    Bed,
    Users,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DailyOperationsProps {
    bookings: PaginatedData<Booking>;
    properties: Property[];
    filters: {
        property_id?: string;
        status?: string;
        search?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

export default function DailyOperations({ bookings, properties, filters }: DailyOperationsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [actionType, setActionType] = useState<'checkin' | 'checkout' | null>(null);
    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const getBookingStyles = (booking: Booking) => {
        const checkInDate = new Date(booking.check_in);
        checkInDate.setHours(0, 0, 0, 0);

        const checkOutDate = new Date(booking.check_out);
        checkOutDate.setHours(0, 0, 0, 0);

        const todayVal = new Date();
        todayVal.setHours(0, 0, 0, 0);

        const isCheckInToday = checkInDate.getTime() === todayVal.getTime();
        const isCheckOutToday = checkOutDate.getTime() === todayVal.getTime();
        const isCheckOutPending = isCheckOutToday && booking.booking_status !== 'checked_out';
        
        const isStay = booking.booking_status === 'checked_in' && checkInDate < todayVal;
        const isUpcoming = checkInDate > todayVal;

        const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        if (booking.booking_status === 'cancelled') {
            return 'bg-red-50/70 border-red-200 hover:bg-red-100/60 text-red-950';
        }
        if (booking.booking_status === 'checked_out') {
            return 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60 text-slate-700';
        }
        if (isCheckOutPending) {
            return 'bg-purple-50 border-purple-300 hover:bg-purple-100/80 text-purple-950 shadow-xs ring-1 ring-purple-400/20';
        }
        if (nights >= 5) {
            return 'bg-pink-50/70 border-pink-200 hover:bg-pink-100/70 text-pink-950';
        }
        if (isCheckInToday) {
            return 'bg-sky-50/80 border-sky-200 hover:bg-sky-100/80 text-sky-950 font-bold';
        }
        if (isStay) {
            return 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 text-slate-800';
        }
        if (isUpcoming) {
            return 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60 text-amber-950';
        }
        return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
    };

    const getWhatsAppAction = (booking: Booking) => {
        const checkInDate = new Date(booking.check_in);
        checkInDate.setHours(0, 0, 0, 0);

        const checkOutDate = new Date(booking.check_out);
        checkOutDate.setHours(0, 0, 0, 0);

        const todayVal = new Date();
        todayVal.setHours(0, 0, 0, 0);

        const isCheckInToday = checkInDate.getTime() === todayVal.getTime();
        const isCheckOutToday = checkOutDate.getTime() === todayVal.getTime();
        const isStay = booking.booking_status === 'checked_in' && checkInDate < todayVal && checkOutDate > todayVal;

        const remaining = booking.remaining_amount ?? 0;
        const isLunas = remaining <= 0;
        const sisaFormat = formatCurrency(remaining);

        let message = '';
        let label = 'Hubungi Tamu';
        let colorClass = 'text-green-700 border-green-200 hover:bg-green-50';

        const paymentLink = `${window.location.origin}/booking/${booking.booking_number}/payment`;
        const phone = booking.guest_phone ? booking.guest_phone.replace(/[^0-9]/g, '') : '';
        const waPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;

        if (booking.booking_status === 'checked_out') {
            // Sudah check-out (Kirim Terima Kasih)
            label = 'Kirim Terima Kasih';
            colorClass = 'bg-slate-600 hover:bg-slate-700 text-white border-none font-semibold';
            message = `Maturnuwun sanget njih kak atas kedatangan nya di homsjogja😊🙏🏻 Dipastikan tidak ada barang yang tertinggal nggih kak. Maturnuwun sudah memilih Homsjogja sebagai pilihan menginap selama di jogja,semoga kakak dan keluarga diberikan kesehatan selalu,dilancarkan rejekinya dan diberikan kelancaran selama perjalanannya ✨ Hati - hati dijalan nggih kak, kami tunggu kedatangan nya kembali menginap di homsjogja untuk mencoba unit kami yang lain😊🙏🏻 Jangan Lupa Follow Instagram & Tiktok kami nggih kak untuk mendapatkan update terbaik dari homsjogja✨\n\nIG : https://www.instagram.com/homsjogja\nTiktok : https://www.tiktok.com/@homsjogja\nWebsite : homsjogja.com`;
        } else if (isCheckInToday) {
            if (!isLunas) {
                // CI Hari ini & Belum Lunas
                label = 'Kirim Link Pelunasan';
                colorClass = 'bg-emerald-600 hover:bg-emerald-700 text-white border-none font-semibold';
                message = `Selamat pagi kak, semoga dalam keadaan sehat selalu. Kami dari admin hospitality Homsjogja reminding/mengingatkan bahwa hari ini jadwal check-in di Homsjogja unit *${booking.property?.name || '?'}* njih Kak. Mohon kesediaannya untuk menginformasikan perkiraan waktu kedatangan/check-in. Perlu kami sampaikan bahwa *waktu check-in dimulai pukul 14.00*. Mohon konfirmasi dari Kakak njih.\n\n*Untuk pelunasan total* *${sisaFormat}* *dapat ditransfer ke rekening melalui link pembayaran berikut:* ${paymentLink}\n\nTerima kasih banyak Kak. Semoga selalu dilancarkan rezekinya.😊🙏🏻`;
            } else {
                // CI Hari ini & Sudah Lunas
                label = 'Kirim Petunjuk CI';
                colorClass = 'bg-sky-600 hover:bg-sky-700 text-white border-none font-semibold';
                message = `Selamat pagi kak, semoga dalam keadaan sehat selalu. Kami dari admin hospitality Homsjogja mengingatkan bahwa hari ini jadwal check-in di Homsjogja unit *${booking.property?.name || '?'}* njih Kak. Mohon kesediaannya untuk menginformasikan perkiraan waktu kedatangan/check-in. Perlu kami sampaikan bahwa *waktu check-in dimulai pukul 14.00*. Mohon konfirmasi dari Kakak njih.\n\nPemesanan Kakak sudah lunas njih, untuk petunjuk arah lokasi (Google Maps) dan instruksi check-in lengkap dapat langsung diakses melalui link berikut Kak:\n${paymentLink}\n\nTerima kasih banyak Kak. Semoga selalu dilancarkan rezekinya.😊🙏🏻`;
            }
        } else if (isCheckOutToday) {
            // Check-out hari ini (Tamu belum check out)
            label = 'Kirim Reminder CO';
            colorClass = 'bg-purple-600 hover:bg-purple-700 text-white border-none font-semibold';
            message = `Sugeng enjang ☀️ Halo kak Ngapunten menganggu waktunya 😊🙏🏼 Hanya ingin mengingatkan saja bahwa hari ini jadwal check out njih kak, untuk jadwal check out Homsjogja max jam 11.00 WIB njih. Nanti rencana check out jam pinten kak, mohon konfirmasinya njih 😊🙏🏼`;
        } else if (isStay) {
            if (!isLunas) {
                // Stay & Belum Lunas
                label = 'Kirim Tagihan Stay';
                colorClass = 'bg-rose-400 hover:bg-orange-600 text-white border-none font-semibold';
                message = `Selamat siang kak, semoga dalam keadaan sehat selalu dan nyaman menginap di Homsjogja unit *${booking.property?.name || '?'}* njih Kak. Kami dari admin hospitality Homsjogja menginfokan terdapat kekurangan pembayaran pelunasan sebesar *${sisaFormat}* Kak.\n\nUntuk pelunasan dapat ditransfer ke rekening melalui link pembayaran berikut Kak:\n${paymentLink}\n\nJika ada hal yang perlu dibantu silakan hubungi kami. Terima kasih banyak Kak. Semoga lancar selalu rezekinya.😊🙏🏻`;
            } else {
                // Stay & Sudah Lunas
                label = 'Kirim Sapaan Stay';
                colorClass = 'bg-pink-400 hover:bg-rose-600 text-white border-none font-semibold';
                message = `Selamat siang kak, semoga dalam keadaan sehat selalu. Bagaimana dengan kenyamanan masa inap Kakak di Homsjogja unit *${booking.property?.name || '?'}* njih Kak? Semoga semua fasilitas berjalan dengan baik.\n\nJika ada keluhan atau memerlukan bantuan layanan, silakan hubungi kami nih Kak. Selamat beristirahat dan semoga liburannya menyenangkan. Terima kasih banyak Kak.😊🙏🏻`;
            }
        } else {
            message = `Selamat hari Kak ${booking.guest_name}, semoga dalam keadaan sehat selalu. Kami dari Admin Hospitality Homsjogja. Ada yang bisa kami bantu terkait pesanan Kakak dengan nomor booking ${booking.booking_number}?`;
        }

        const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : '#';

        return { waUrl, label, colorClass, hasPhone: !!waPhone };
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: 'Daily Operations' },
    ];

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        router.get('/admin/bookings/daily-operations', {
            ...filters,
            ...newFilters,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search: searchQuery });
    };

    const handleSort = (column: string) => {
        const isAsc = filters.sort_by === column && filters.sort_dir === 'asc';
        updateFilters({ sort_by: column, sort_dir: isAsc ? 'desc' : 'asc' });
    };

    const openActionDialog = (booking: Booking, type: 'checkin' | 'checkout') => {
        setSelectedBooking(booking);
        setActionType(type);
        setIsActionDialogOpen(true);
    };

    const handleConfirmAction = () => {
        if (!selectedBooking || !actionType) return;
        setIsProcessing(true);
        router.patch(`/admin/bookings/${selectedBooking.booking_number}/${actionType}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Berhasil memproses ${actionType === 'checkin' ? 'Check-in' : 'Check-out'}`);
                setIsActionDialogOpen(false);
                setSelectedBooking(null);
            },
            onError: (errors) => {
                toast.error(Object.values(errors)[0] as string || 'Terjadi kesalahan saat memproses data.');
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_verification': return <Badge variant="secondary" className="text-xs">Pending</Badge>;
            case 'confirmed': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">Confirmed</Badge>;
            case 'checked_in': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">Checked In</Badge>;
            case 'checked_out': return <Badge variant="outline" className="text-xs">Checked Out</Badge>;
            case 'cancelled': return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
            case 'no_show': return <Badge variant="destructive" className="text-xs">No Show</Badge>;
            default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
    };

    const getPaymentBadge = (booking: Booking) => {
        if (booking.payment_status === 'fully_paid') {
            return (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                    <CreditCard className="h-3 w-3 mr-1" />Lunas
                </Badge>
            );
        }
        if (booking.payment_status === 'dp_received') {
            return (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-3 w-3 mr-1" />DP
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" />Belum Bayar
            </Badge>
        );
    };

    const getActionButton = (booking: Booking, compact = false) => {
        if (booking.booking_status === 'confirmed') {
            if (booking.payment_status === 'fully_paid') {
                return (
                    <Button
                        size="sm"
                        className={cn("bg-emerald-600 hover:bg-emerald-700 text-white", compact && "w-full")}
                        onClick={() => openActionDialog(booking, 'checkin')}
                    >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Check In
                    </Button>
                );
            }
            return (
                <Button
                    size="sm"
                    variant="outline"
                    className={cn("border-orange-300 text-orange-600 hover:bg-orange-50", compact && "w-full")}
                    onClick={() => toast.warning(`Pembayaran belum lunas. Selesaikan pembayaran sebelum check-in.`)}
                >
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    Belum Lunas
                </Button>
            );
        }
        if (booking.booking_status === 'checked_in') {
            return (
                <Button
                    size="sm"
                    className={cn("bg-blue-600 hover:bg-blue-700 text-white", compact && "w-full")}
                    onClick={() => openActionDialog(booking, 'checkout')}
                >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Check Out
                </Button>
            );
        }
        return null;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const unpaidCount = bookings.data.filter(
        b => b.booking_status === 'confirmed' && b.payment_status !== 'fully_paid'
    ).length;

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Daily Operations" subtitle="Kelola alur Check-in dan Check-out tamu harian">
            <div className="space-y-4">

                {/* Filter Card */}
                <Card className="border shadow-sm">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3">
                            {/* Search */}
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kode booking, nama tamu..."
                                    className="pl-9 bg-gray-50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                            {/* Selects */}
                            <div className="flex gap-2">
                                <Select
                                    value={filters.property_id || 'all'}
                                    onValueChange={(val) => updateFilters({ property_id: val === 'all' ? undefined : val })}
                                >
                                    <SelectTrigger className="flex-1 min-w-0">
                                        <SelectValue placeholder="Semua Properti" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Properti</SelectItem>
                                        {properties.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(val) => updateFilters({ status: val === 'all' ? undefined : val })}
                                >
                                    <SelectTrigger className="flex-1 min-w-0">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Default (CI Hari ini/Besok)</SelectItem>
                                        <SelectItem value="confirmed">Confirmed (Siap CI)</SelectItem>
                                        <SelectItem value="checked_in">Checked In (Siap CO)</SelectItem>
                                        <SelectItem value="pending_verification">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Warning unpaid */}
                {unpaidCount > 0 && (
                    <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-700 text-sm">
                            <strong>{unpaidCount} booking</strong> berstatus Confirmed namun pembayaran belum lunas.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Empty state */}
                {bookings.data.length === 0 && (
                    <Card className="border shadow-sm">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Tidak ada data operasional</p>
                            <p className="text-sm mt-1">Coba ubah filter pencarian</p>
                        </CardContent>
                    </Card>
                )}

                {/* Mobile: Card list */}
                {bookings.data.length > 0 && (
                    <div className="flex flex-col gap-3 lg:hidden">
                        {bookings.data.map((booking) => {
                            const bookingCardStyles = getBookingStyles(booking);
                            const waAction = getWhatsAppAction(booking);

                            const checkInDate = new Date(booking.check_in);
                            checkInDate.setHours(0, 0, 0, 0);

                            const checkOutDate = new Date(booking.check_out);
                            checkOutDate.setHours(0, 0, 0, 0);

                            const todayVal = new Date();
                            todayVal.setHours(0, 0, 0, 0);

                            const isCheckInToday = checkInDate.getTime() === todayVal.getTime();
                            const isCheckOutToday = checkOutDate.getTime() === todayVal.getTime();
                            const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

                            return (
                                <Card key={booking.id} className={cn("border shadow-sm overflow-hidden transition-all", bookingCardStyles)}>
                                    {/* Card header strip by status */}
                                    <div className={cn(
                                        "h-1",
                                        booking.booking_status === 'confirmed' && "bg-emerald-500",
                                        booking.booking_status === 'checked_in' && "bg-blue-500",
                                        booking.booking_status === 'checked_out' && "bg-gray-300",
                                        booking.booking_status === 'pending_verification' && "bg-yellow-400",
                                    )} />
                                    <CardContent className="p-4 space-y-3 text-slate-800">
                                        {/* Top row: booking number + badges */}
                                        <div className="flex items-start justify-between gap-2">
                                            <Link
                                                href={`/admin/bookings/${booking.booking_number}`}
                                                className="font-bold text-blue-600 hover:underline text-sm"
                                            >
                                                {booking.booking_number}
                                            </Link>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {getStatusBadge(booking.booking_status)}
                                                {getPaymentBadge(booking)}
                                            </div>
                                        </div>

                                        {/* Guest & Contact & Breakdown */}
                                        <div className="space-y-1.5 border-b border-slate-200/50 pb-2">
                                            <div className="flex items-center gap-1.5 text-sm font-extrabold">
                                                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                {booking.guest_name}
                                            </div>
                                            {booking.guest_phone && (
                                                <a
                                                    href={`https://wa.me/${booking.guest_phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-green-600 hover:underline flex items-center gap-1 font-bold pl-5"
                                                >
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {booking.guest_phone}
                                                </a>
                                            )}
                                            <div className="text-[10px] text-slate-600 bg-white/60 border border-slate-200 rounded px-1.5 py-0.5 w-max font-bold ml-5 flex items-center gap-1.5">
                                                <Users className="h-3 w-3 text-slate-500" />
                                                <span>{booking.guest_count} Pax (L: {booking.guest_male || 0} | P: {booking.guest_female || 0} | Anak: {booking.guest_children || 0})</span>
                                            </div>
                                        </div>

                                        {/* Dates & Location */}
                                        <div className="space-y-2 border-b border-slate-200/50 pb-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                {booking.property?.name}
                                            </div>
                                            <div className="flex gap-4 text-[11px] bg-white/50 rounded-lg px-3 py-2 border border-slate-100/80">
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-muted-foreground mb-0.5">Check-in</p>
                                                    <div className={cn(
                                                        "font-extrabold text-xs flex items-center gap-1",
                                                        isCheckInToday ? "bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.5 rounded-sm block w-max" : "text-emerald-700"
                                                    )}>
                                                        <span>{formatDate(booking.check_in)}</span>
                                                        {isCheckInToday && (
                                                            <span className="flex items-center gap-0.5 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded-sm font-black animate-pulse">
                                                                <Flame className="h-2.5 w-2.5 fill-white" /> HARI INI
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="border-l border-slate-200" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-muted-foreground mb-0.5">Check-out</p>
                                                    <div className={cn(
                                                        "font-extrabold text-xs flex items-center gap-1",
                                                        isCheckOutToday ? "bg-purple-100 text-purple-900 border border-purple-300 px-1 py-0.5 rounded-sm block w-max" : "text-blue-700"
                                                    )}>
                                                        <span>{formatDate(booking.check_out)}</span>
                                                        {isCheckOutToday && (
                                                            <span className="flex items-center gap-0.5 bg-purple-600 text-white text-[9px] px-1 py-0.5 rounded-sm font-black animate-pulse">
                                                                <Key className="h-2.5 w-2.5" /> HARI INI
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold pl-5 flex items-center gap-1">
                                                <Moon className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{nights} Malam Stay</span>
                                            </div>
                                        </div>

                                        {/* Keuangan & Extra Bed */}
                                        <div className="space-y-1.5 border-b border-slate-200/50 pb-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Total Tagihan:</span>
                                                <span className="font-bold">{formatCurrency(booking.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Telah Dibayar:</span>
                                                <span className="font-bold text-emerald-600">{formatCurrency(booking.total_amount - booking.remaining_amount)}</span>
                                            </div>
                                            {booking.remaining_amount > 0 ? (
                                                <div className="flex justify-between bg-red-50/70 border border-red-200 px-2 py-1 rounded">
                                                    <span className="text-red-700 font-extrabold">Kurang Pelunasan:</span>
                                                    <span className="font-extrabold text-red-700">{formatCurrency(booking.remaining_amount)}</span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between bg-emerald-50/70 border border-emerald-200 px-2 py-1 rounded items-center">
                                                    <span className="text-emerald-700 font-extrabold">Kurang Pelunasan:</span>
                                                    <span className="font-extrabold text-emerald-700 flex items-center gap-0.5">
                                                        Lunas <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    </span>
                                                </div>
                                            )}
                                            {booking.extra_bed_count > 0 && (
                                                <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-100 rounded p-1.5 font-bold flex items-center gap-1">
                                                    <Bed className="h-3.5 w-3.5 text-slate-500" />
                                                    <span>Extra Bed: {booking.extra_bed_count} Unit ({formatCurrency(booking.extra_bed_amount)})</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Layanan & Catatan */}
                                        <div className="space-y-2 text-xs">
                                            {/* Extra Services */}
                                            {booking.services && booking.services.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Extra Services</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {booking.services.map((svc) => (
                                                            <Badge key={svc.id} variant="outline" className="bg-sky-50 text-sky-900 border-sky-200 text-[10px] font-bold py-0.5 px-1.5 rounded">
                                                                {svc.service_name} (x{svc.quantity})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Special Requests */}
                                            {booking.special_requests && (
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Request Tamu</span>
                                                    <div className="bg-blue-50 text-blue-900 border border-blue-200 rounded-md p-2 text-[10px] italic leading-normal">
                                                        {booking.special_requests}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Internal Notes */}
                                            {booking.internal_notes && (
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Internal Note</span>
                                                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-md p-2 text-[10px] leading-normal font-bold">
                                                        {booking.internal_notes}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                                            {waAction.hasPhone && (
                                                <Button asChild size="sm" className={cn("w-full text-xs flex items-center justify-center gap-1.5 shadow-xs py-2 rounded-lg cursor-pointer", waAction.colorClass)}>
                                                    <a href={waAction.waUrl} target="_blank" rel="noopener noreferrer">
                                                        <MessageSquare className="h-4 w-4" /> {waAction.label}
                                                    </a>
                                                </Button>
                                            )}
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" asChild className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border">
                                                    <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                        <Eye className="h-4 w-4 mr-1.5" />
                                                        Detail
                                                    </Link>
                                                </Button>
                                                {getActionButton(booking) && (
                                                    <div className="flex-1">
                                                        {getActionButton(booking, true)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Desktop: Table */}
                {bookings.data.length > 0 && (
                    <Card className="border shadow-sm overflow-hidden hidden lg:block">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50 border-b">
                                    <TableRow>
                                        <TableHead className="w-[220px]">Booking & Tamu</TableHead>
                                        <TableHead className="w-[180px]">Inap & Lokasi</TableHead>
                                        <TableHead className="w-[180px]">Keuangan & Extra Bed</TableHead>
                                        <TableHead>Layanan & Catatan</TableHead>
                                        <TableHead className="text-right w-[200px]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.data.map((booking) => {
                                        const bookingRowStyles = getBookingStyles(booking);
                                        const waAction = getWhatsAppAction(booking);

                                        const checkInDate = new Date(booking.check_in);
                                        checkInDate.setHours(0, 0, 0, 0);

                                        const checkOutDate = new Date(booking.check_out);
                                        checkOutDate.setHours(0, 0, 0, 0);

                                        const todayVal = new Date();
                                        todayVal.setHours(0, 0, 0, 0);

                                        const isCheckInToday = checkInDate.getTime() === todayVal.getTime();
                                        const isCheckOutToday = checkOutDate.getTime() === todayVal.getTime();
                                        const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

                                        return (
                                            <TableRow key={booking.id} className={cn("group transition-colors border-b", bookingRowStyles)}>
                                                {/* Booking & Tamu */}
                                                <TableCell className="align-top py-3">
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link href={`/admin/bookings/${booking.booking_number}`} className="text-blue-600 hover:underline font-bold text-sm">
                                                                {booking.booking_number}
                                                            </Link>
                                                        </div>
                                                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                                            {booking.guest_name}
                                                        </div>
                                                        {booking.guest_phone && (
                                                            <a
                                                                href={`https://wa.me/${booking.guest_phone.replace(/[^0-9]/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-green-600 hover:underline flex items-center gap-1 font-semibold"
                                                            >
                                                                <Phone className="h-3 w-3" />
                                                                {booking.guest_phone}
                                                            </a>
                                                        )}
                                                        <div className="text-[10px] text-slate-600 bg-slate-100/80 rounded-md py-1 px-2 w-max font-semibold border border-slate-200 flex items-center gap-1.5">
                                                            <Users className="h-3 w-3 text-slate-500" />
                                                            <span>{booking.guest_count} Pax (L: {booking.guest_male || 0} | P: {booking.guest_female || 0} | Anak: {booking.guest_children || 0})</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Inap & Lokasi */}
                                                <TableCell className="align-top py-3">
                                                    <div className="flex flex-col space-y-1.5">
                                                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                            {booking.property?.name}
                                                        </div>
                                                        <div className="text-xs space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-muted-foreground w-6 font-medium">CI:</span>
                                                                <span className={cn(
                                                                    "font-bold py-0.5 px-1 rounded-sm text-[11px] flex items-center gap-1",
                                                                    isCheckInToday ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold" : "text-emerald-700"
                                                                )}>
                                                                    {formatDate(booking.check_in)}
                                                                    {isCheckInToday && (
                                                                        <span className="flex items-center gap-0.5 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded-sm font-black animate-pulse">
                                                                            <Flame className="h-2.5 w-2.5 fill-white" /> HARI INI
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-muted-foreground w-6 font-medium">CO:</span>
                                                                <span className={cn(
                                                                    "font-bold py-0.5 px-1 rounded-sm text-[11px] flex items-center gap-1",
                                                                    isCheckOutToday ? "bg-purple-100 text-purple-900 border border-purple-300 font-extrabold" : "text-blue-700"
                                                                )}>
                                                                    {formatDate(booking.check_out)}
                                                                    {isCheckOutToday && (
                                                                        <span className="flex items-center gap-0.5 bg-purple-600 text-white text-[9px] px-1 py-0.5 rounded-sm font-black animate-pulse">
                                                                            <Key className="h-2.5 w-2.5" /> HARI INI
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                            <Moon className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>{nights} Malam Stay</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Keuangan & Extra Bed */}
                                                <TableCell className="align-top py-3">
                                                    <div className="flex flex-col space-y-1 text-xs">
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-slate-500 font-medium">Total:</span>
                                                            <span className="font-semibold text-slate-800">{formatCurrency(booking.total_amount)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-slate-500 font-medium">Dibayar:</span>
                                                            <span className="font-semibold text-emerald-600">{formatCurrency(booking.total_amount - booking.remaining_amount)}</span>
                                                        </div>
                                                        {booking.remaining_amount > 0 ? (
                                                            <div className="flex justify-between bg-red-50 px-1.5 py-0.5 rounded border border-red-200 mt-0.5">
                                                                <span className="text-red-700 font-bold">Kurang:</span>
                                                                <span className="font-extrabold text-red-700">{formatCurrency(booking.remaining_amount)}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 items-center">
                                                                <span className="text-emerald-700 font-bold">Kurang:</span>
                                                                <span className="font-extrabold text-emerald-700 flex items-center gap-0.5">
                                                                    Lunas <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                </span>
                                                            </div>
                                                        )}
                                                        {booking.extra_bed_count > 0 && (
                                                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-300 text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                                                                <Bed className="h-3.5 w-3.5 text-slate-500" />
                                                                <span>Extra Bed: {booking.extra_bed_count} Unit ({formatCurrency(booking.extra_bed_amount)})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Layanan & Catatan */}
                                                <TableCell className="align-top py-3">
                                                    <div className="flex flex-col space-y-2 text-xs">
                                                        {/* Extra Services */}
                                                        {booking.services && booking.services.length > 0 && (
                                                            <div className="space-y-0.5">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Extra Services</span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {booking.services.map((svc) => (
                                                                        <Badge key={svc.id} variant="outline" className="bg-sky-50/80 text-sky-900 border-sky-200 text-[10px] font-bold py-0 px-1.5 rounded-sm">
                                                                            {svc.service_name} (x{svc.quantity})
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Special Requests */}
                                                        {booking.special_requests && (
                                                            <div className="space-y-0.5">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Request Tamu</span>
                                                                <div className="bg-blue-50 text-blue-900 border border-blue-200 rounded-md p-1.5 text-[10px] italic leading-normal">
                                                                    {booking.special_requests}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Internal Notes */}
                                                        {booking.internal_notes && (
                                                            <div className="space-y-0.5">
                                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Internal Note</span>
                                                                <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-md p-1.5 text-[10px] leading-normal font-semibold">
                                                                    {booking.internal_notes}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Aksi */}
                                                <TableCell className="align-top py-3 text-right">
                                                    <div className="flex flex-col gap-1.5 items-end">
                                                        <div className="flex gap-1.5 justify-end">
                                                            {getStatusBadge(booking.booking_status)}
                                                            {getPaymentBadge(booking)}
                                                        </div>
                                                        <div className="flex flex-col gap-1 w-full max-w-[170px] mt-1">
                                                            {waAction.hasPhone && (
                                                                <Button asChild size="sm" className={cn("text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer w-full", waAction.colorClass)}>
                                                                    <a href={waAction.waUrl} target="_blank" rel="noopener noreferrer">
                                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                                        {waAction.label}
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            <div className="flex gap-1 w-full">
                                                                <Button variant="outline" size="sm" asChild className="hover:bg-slate-200/50 bg-white flex-1 text-slate-700">
                                                                    <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                                        <Eye className="h-3.5 w-3.5 mr-1" /> Detail
                                                                    </Link>
                                                                </Button>
                                                                {getActionButton(booking) && (
                                                                    <div className="flex-1 text-left">
                                                                        {getActionButton(booking, true)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {/* Pagination */}
                {bookings.data.length > 0 && (
                    <div className="flex items-center justify-between px-1 py-2">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{bookings.from}</span>–<span className="font-medium">{bookings.to}</span> dari <span className="font-medium">{bookings.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!bookings.prev_page_url}
                                onClick={() => router.get(bookings.prev_page_url || '')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">Sebelumnya</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!bookings.next_page_url}
                                onClick={() => router.get(bookings.next_page_url || '')}
                            >
                                <span className="hidden sm:inline mr-1">Berikutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Action Confirmation Dialog */}
                <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {actionType === 'checkin' ? '✅ Konfirmasi Check-in' : '🚪 Konfirmasi Check-out'}
                            </DialogTitle>
                            <DialogDescription>
                                {actionType === 'checkin'
                                    ? `Proses Check-in untuk tamu ${selectedBooking?.guest_name}. Pastikan identitas tamu sesuai.`
                                    : `Proses Check-out untuk tamu ${selectedBooking?.guest_name}. Pastikan semua tagihan telah diselesaikan.`
                                }
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBooking && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Kode Booking</span>
                                    <span className="font-semibold text-brand-primary">{selectedBooking.booking_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Properti</span>
                                    <span className="font-medium">{selectedBooking.property?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Tagihan</span>
                                    <span className="font-semibold">{formatCurrency(selectedBooking.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status Bayar</span>
                                    <span className="font-medium text-emerald-600 capitalize">{selectedBooking.payment_status}</span>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)} disabled={isProcessing}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirmAction}
                                disabled={isProcessing}
                                className={actionType === 'checkin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
                            >
                                {isProcessing ? 'Memproses...' : `Proses ${actionType === 'checkin' ? 'Check-in' : 'Check-out'}`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </AdminLayout>
    );
}

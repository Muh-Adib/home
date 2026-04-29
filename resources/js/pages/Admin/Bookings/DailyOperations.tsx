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
            case 'checked_in': return <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">Checked In</Badge>;
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
                        className={cn("bg-emerald-600 hover:bg-emerald-700", compact && "w-full")}
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
                    className={cn("bg-blue-600 hover:bg-blue-700", compact && "w-full")}
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
                        {bookings.data.map((booking) => (
                            <Card key={booking.id} className="border shadow-sm overflow-hidden">
                                {/* Card header strip by status */}
                                <div className={cn(
                                    "h-1",
                                    booking.booking_status === 'confirmed' && "bg-emerald-500",
                                    booking.booking_status === 'checked_in' && "bg-blue-500",
                                    booking.booking_status === 'checked_out' && "bg-gray-300",
                                    booking.booking_status === 'pending_verification' && "bg-yellow-400",
                                )} />
                                <CardContent className="p-4 space-y-3">
                                    {/* Top row: booking number + badges */}
                                    <div className="flex items-start justify-between gap-2">
                                        <Link
                                            href={`/admin/bookings/${booking.booking_number}`}
                                            className="font-bold text-brand-primary hover:underline text-sm"
                                        >
                                            {booking.booking_number}
                                        </Link>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {getStatusBadge(booking.booking_status)}
                                            {getPaymentBadge(booking)}
                                        </div>
                                    </div>

                                    {/* Guest & property */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            {booking.guest_name}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                            {booking.property?.name}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex gap-4 text-sm bg-gray-50 rounded-lg px-3 py-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Check-in</p>
                                            <p className="font-semibold text-emerald-700">{formatDate(booking.check_in)}</p>
                                        </div>
                                        <div className="border-l border-gray-200" />
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Check-out</p>
                                            <p className="font-semibold text-blue-700">{formatDate(booking.check_out)}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="outline" size="sm" asChild className="flex-1">
                                            <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                <Eye className="h-4 w-4 mr-1.5" />
                                                Detail
                                            </Link>
                                        </Button>
                                        <div className="flex-1">
                                            {getActionButton(booking, true)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Desktop: Table */}
                {bookings.data.length > 0 && (
                    <Card className="border shadow-sm overflow-hidden hidden lg:block">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[130px]">Booking Code</TableHead>
                                        <TableHead>Tamu & Properti</TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('check_in')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Tanggal CI/CO
                                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Status & Pembayaran</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.data.map((booking) => (
                                        <TableRow key={booking.id} className="group">
                                            <TableCell className="font-medium">
                                                <Link href={`/admin/bookings/${booking.booking_number}`} className="text-brand-primary hover:underline">
                                                    {booking.booking_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold flex items-center gap-1.5">
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                        {booking.guest_name}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {booking.property?.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col space-y-1">
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground w-6 inline-block">CI:</span>
                                                        <span className="font-medium text-emerald-700">{formatDate(booking.check_in)}</span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground w-6 inline-block">CO:</span>
                                                        <span className="font-medium text-blue-700">{formatDate(booking.check_out)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {getStatusBadge(booking.booking_status)}
                                                    {getPaymentBadge(booking)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    {getActionButton(booking)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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

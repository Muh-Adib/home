import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { type Payment, type PaymentMethod, type BreadcrumbItem, type User, type PaginatedData, type PageProps } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Search,
    Filter,
    MoreHorizontal,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    CreditCard,
    Download,
    RefreshCw,
    AlertCircle,
    TrendingUp,
    Settings,
    Users,
    Calendar,
    Edit
} from 'lucide-react';
import { useState, Fragment } from 'react';

interface PaymentsIndexProps {
    payments: PaginatedData<Payment>;
    paymentMethods: PaymentMethod[];
    stats: {
        pending_payments: number;
        verified_payments: number;
        failed_payments: number;
        cancelled_payments: number;
        refunded_payments: number;
        total_payments: number;
        today_amount: number;
        month_amount: number;
    };
    filters: {
        search?: string;
        status?: string;
        payment_method?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function PaymentsIndex({ payments, paymentMethods, stats, filters }: PaymentsIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;

    const canEdit = (payment: Payment) => {
        if (!auth.user) return false;
        if (auth.user.role === 'super_admin') return true;
        if (auth.user.role === 'property_manager') return true;
        if (auth.user.role === 'property_owner' && payment.booking?.property?.owner_id === auth.user.id) return true;
        return false;
    };
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState(filters.payment_method || 'all');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const { data: verifyData, setData: setVerifyData, processing: verifyProcessing, patch: verifyPatch, reset: verifyReset } = useForm({
        verification_notes: '',
    });

    const { data: rejectData, setData: setRejectData, processing: rejectProcessing, patch: rejectPatch, reset: rejectReset } = useForm({
        rejection_reason: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments' },
    ];

    const handleSearch = () => {
        router.get('/admin/payments', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
            date_from: filters.date_from,
            date_to: filters.date_to,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleVerify = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowVerifyDialog(true);
        verifyReset();
    };

    const handleReject = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowRejectDialog(true);
        rejectReset();
    };

    const submitVerification = () => {
        if (!selectedPayment) return;

        verifyPatch(`/admin/payments/${selectedPayment.payment_number}/verify`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowVerifyDialog(false);
                setSelectedPayment(null);
                verifyReset();
            },
        });
    };

    const submitRejection = () => {
        if (!selectedPayment) return;

        rejectPatch(`/admin/payments/${selectedPayment.payment_number}/reject`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowRejectDialog(false);
                setSelectedPayment(null);
                rejectReset();
            },
        });
    };

    const getPaymentStatusBadge = (status: Payment['payment_status']) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
            verified: { variant: 'default' as const, label: 'Verified', icon: CheckCircle },
            failed: { variant: 'destructive' as const, label: 'Failed', icon: XCircle },
            refunded: { variant: 'outline' as const, label: 'Refunded', icon: RefreshCw },
            cancelled: { variant: 'outline' as const, label: 'Cancelled', icon: AlertCircle },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || {
            variant: 'outline' as const,
            label: status || 'Unknown',
            icon: AlertCircle
        };
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const checkIsMissRouted = (payment: Payment) => {
        const propBankAccount = payment.booking?.property?.bank_account;
        if (!propBankAccount) return false;

        if (payment.payment_method === 'bank_transfer' || payment.paymentMethod?.type === 'bank_transfer') {
            const destAcc = (payment.paymentMethod?.account_number || payment.account_number || '').replace(/[^0-9]/g, '');
            const correctAcc = (propBankAccount.account_number || '').replace(/[^0-9]/g, '');

            if (destAcc && correctAcc && destAcc !== correctAcc) {
                return true;
            }
        }
        return false;
    };

    const getPaymentTypeBadge = (type: Payment['payment_type']) => {
        const typeConfig = {
            dp: { variant: 'secondary' as const, label: 'DP' },
            remaining: { variant: 'outline' as const, label: 'Remaining' },
            full: { variant: 'default' as const, label: 'Full Payment' },
            refund: { variant: 'destructive' as const, label: 'Refund' },
            penalty: { variant: 'destructive' as const, label: 'Penalty' },
            additional: { variant: 'secondary' as const, label: 'Additional' },
            damage: { variant: 'destructive' as const, label: 'Damage' },
            cleaning: { variant: 'outline' as const, label: 'Cleaning' },
            extra_service: { variant: 'secondary' as const, label: 'Extra Service' },
        };

        const config = typeConfig[type as keyof typeof typeConfig] || {
            variant: 'secondary' as const,
            label: type || 'Unknown'
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Group payments by booking code
    const groupedPayments: { bookingNumber: string; guestName: string; propertyName: string; payments: Payment[] }[] = [];

    payments.data.forEach((payment) => {
        const bookingNumber = payment.booking?.booking_number || 'Tanpa Booking';
        const guestName = payment.booking?.guest_name || 'Tamu Umum';
        const propertyName = payment.booking?.property?.name || 'Properti Umum';

        let group = groupedPayments.find(g => g.bookingNumber === bookingNumber);
        if (!group) {
            group = { bookingNumber, guestName, propertyName, payments: [] };
            groupedPayments.push(group);
        }
        group.payments.push(payment);
    });

    // Check permissions
    const canVerify = ['super_admin', 'property_manager', 'finance'].includes(auth.user.role);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
                        <p className="text-muted-foreground">
                            Manage and verify guest payments
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pending_payments}</div>
                            <p className="text-xs text-muted-foreground">
                                Awaiting verification
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Verified Payments</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.verified_payments}</div>
                            <p className="text-xs text-muted-foreground">
                                Successfully verified
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.today_amount)}</div>
                            <p className="text-xs text-muted-foreground">
                                Verified today
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.month_amount)}</div>
                            <p className="text-xs text-muted-foreground">
                                This month total
                            </p>
                        </CardContent>
                    </Card>

                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by payment number, guest name, booking..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Payment Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Payment Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Methods</SelectItem>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={method.id.toString()}>
                                                {method.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleSearch} className="w-full">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payments Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payments</CardTitle>
                        <CardDescription>
                            {payments.total} payments found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {groupedPayments.map((group, groupIndex) => {
                                const isEven = groupIndex % 2 === 0;
                                return (
                                    <div
                                        key={group.bookingNumber}
                                        className={`border rounded-xl p-4 transition-all ${isEven ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-50/50 border-slate-200 shadow-sm'
                                            }`}
                                    >
                                        {/* Group Header */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Booking Code:</span>
                                                    {group.bookingNumber !== 'Tanpa Booking' ? (
                                                        <Link
                                                            href={`/admin/bookings/${group.bookingNumber}`}
                                                            className="text-sm font-black text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            {group.bookingNumber}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm font-bold text-slate-500">Tanpa Booking</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 font-medium">
                                                    Guest: <span className="text-slate-800 font-bold">{group.guestName}</span> • Unit: <span className="text-slate-800 font-bold">{group.propertyName}</span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-400 font-medium">
                                                {group.payments.length} Transaksi
                                            </div>
                                        </div>

                                        {/* Group Payments Table (Desktop) */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                        <th className="py-2">Payment Number</th>
                                                        <th className="py-2">Nominal</th>
                                                        <th className="py-2">Tipe</th>
                                                        <th className="py-2">Rekening Tujuan</th>
                                                        <th className="py-2">Status</th>
                                                        <th className="py-2">Tanggal</th>
                                                        <th className="py-2 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.payments.map((payment, index) => {
                                                        const isMissRouted = checkIsMissRouted(payment);
                                                        const rowEven = index % 2 === 0;
                                                        return (
                                                            <tr
                                                                key={payment.id}
                                                                className={`border-b border-slate-100/50 hover:bg-slate-200/20 transition-colors ${rowEven ? 'bg-transparent' : 'bg-slate-200/5'
                                                                    }`}
                                                            >
                                                                <td className="py-2.5 font-semibold text-slate-700">
                                                                    <Link
                                                                        href={`/admin/payments/${payment.payment_number}`}
                                                                        className="hover:underline text-blue-600 font-bold"
                                                                    >
                                                                        {payment.payment_number}
                                                                    </Link>
                                                                </td>
                                                                <td className="py-2.5 font-black text-slate-900 text-sm">
                                                                    {formatCurrency(payment.amount)}
                                                                </td>
                                                                <td className="py-2.5">
                                                                    {getPaymentTypeBadge(payment.payment_type)}
                                                                </td>
                                                                <td className="py-2.5 space-y-1">
                                                                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                                                                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                                                        <span>{payment.paymentMethod?.name || payment.bank_name || 'Transfer'}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-medium pl-5">
                                                                        No. Rek: {payment.paymentMethod?.account_number || payment.account_number || '—'}
                                                                    </div>
                                                                    {isMissRouted && (
                                                                        <div className="pl-5 pt-1">
                                                                            <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[9px] py-0.5 px-2 font-black uppercase tracking-wider border-none rounded">
                                                                                ⚠️ Miss Route / Salah Rekening
                                                                            </Badge>
                                                                            {payment.booking?.property?.bank_account && (
                                                                                <div className="text-[9px] text-rose-500 font-bold mt-0.5">
                                                                                    Seharusnya ke: {payment.booking.property.bank_account.bank_name} ({payment.booking.property.bank_account.account_number})
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5">
                                                                    {getPaymentStatusBadge(payment.payment_status)}
                                                                </td>
                                                                <td className="py-2.5 text-slate-500 font-medium">
                                                                    {formatDate(payment.payment_date || '')}
                                                                </td>
                                                                <td className="py-2.5 text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" className="h-7 w-7 p-0">
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                            <DropdownMenuItem asChild>
                                                                                <Link href={`/admin/payments/${payment.payment_number}`}>
                                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                                </Link>
                                                                            </DropdownMenuItem>
                                                                            {canEdit(payment) && (
                                                                                <DropdownMenuItem asChild>
                                                                                    <Link href={`/admin/payments/${payment.payment_number}/edit`}>
                                                                                        <Edit className="mr-2 h-4 w-4" /> Edit Payment
                                                                                    </Link>
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {canVerify && payment.payment_status === 'pending' && (
                                                                                <>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem
                                                                                        onClick={() => handleVerify(payment)}
                                                                                        className="text-green-600"
                                                                                    >
                                                                                        <CheckCircle className="mr-2 h-4 w-4" /> Verify Payment
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem
                                                                                        onClick={() => handleReject(payment)}
                                                                                        className="text-red-600"
                                                                                    >
                                                                                        <XCircle className="mr-2 h-4 w-4" /> Reject Payment
                                                                                    </DropdownMenuItem>
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Group Payments Card List (Mobile) */}
                                        <div className="block sm:hidden space-y-3">
                                            {group.payments.map((payment) => {
                                                const isMissRouted = checkIsMissRouted(payment);
                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2 relative"
                                                    >
                                                        <div className="flex justify-between items-start pr-8">
                                                            <div className="space-y-0.5">
                                                                <Link
                                                                    href={`/admin/payments/${payment.payment_number}`}
                                                                    className="font-bold text-blue-600 hover:underline text-xs"
                                                                >
                                                                    {payment.payment_number}
                                                                </Link>
                                                                <div className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDate(payment.payment_date || '')}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-slate-900 text-sm">
                                                                    {formatCurrency(payment.amount)}
                                                                </div>
                                                                <div className="mt-0.5 scale-90 origin-right">
                                                                    {getPaymentTypeBadge(payment.payment_type)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[11px]">
                                                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                                                                <CreditCard className="h-3 w-3 text-slate-400" />
                                                                <span>{payment.paymentMethod?.name || payment.bank_name || 'Transfer'}</span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="font-mono text-[10px]">{payment.paymentMethod?.account_number || payment.account_number || '—'}</span>
                                                            </div>
                                                            <div>
                                                                {getPaymentStatusBadge(payment.payment_status)}
                                                            </div>
                                                        </div>

                                                        {isMissRouted && (
                                                            <div className="border-t pt-2 border-slate-100">
                                                                <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[9px] py-0.5 px-2 font-black uppercase border-none rounded w-full justify-center">
                                                                    ⚠️ Miss Route
                                                                </Badge>
                                                                {payment.booking?.property?.bank_account && (
                                                                    <div className="text-[9px] text-rose-500 font-bold mt-0.5 text-center">
                                                                        Seharusnya ke: {payment.booking.property.bank_account.bank_name} ({payment.booking.property.bank_account.account_number})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Action Dropdown positioned in top-right absolute */}
                                                        <div className="absolute top-2.5 right-2">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200/50">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/admin/payments/${payment.payment_number}`}>
                                                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    {canEdit(payment) && (
                                                                        <DropdownMenuItem asChild>
                                                                            <Link href={`/admin/payments/${payment.payment_number}/edit`}>
                                                                                <Edit className="mr-2 h-4 w-4" /> Edit Payment
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {canVerify && payment.payment_status === 'pending' && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleVerify(payment)}
                                                                                className="text-green-600"
                                                                            >
                                                                                <CheckCircle className="mr-2 h-4 w-4" /> Verify Payment
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleReject(payment)}
                                                                                className="text-red-600"
                                                                            >
                                                                                <XCircle className="mr-2 h-4 w-4" /> Reject Payment
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {payments.data.length === 0 && (
                                <div className="text-center py-8">
                                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-2 text-sm font-semibold">No payments found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try adjusting your search filters.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {payments.last_page > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-slate-100/60 mt-4">
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Showing <span className="font-semibold text-slate-800">{payments.from}</span> to <span className="font-semibold text-slate-800">{payments.to}</span> of <span className="font-semibold text-slate-800">{payments.total}</span> payments
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                    {payments.prev_page_url ? (
                                        <Link href={payments.prev_page_url} className="flex-1 sm:flex-initial">
                                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                                &laquo; Previous
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-initial text-xs h-8">
                                            &laquo; Previous
                                        </Button>
                                    )}

                                    <span className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md min-w-[90px] text-center">
                                        Page {payments.current_page} of {payments.last_page}
                                    </span>

                                    {payments.next_page_url ? (
                                        <Link href={payments.next_page_url} className="flex-1 sm:flex-initial">
                                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                                Next &raquo;
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-initial text-xs h-8">
                                            Next &raquo;
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Verification Dialog */}
                <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Verify Payment</DialogTitle>
                            <DialogDescription>
                                Confirm verification of payment {selectedPayment?.payment_number}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Verification Notes (Optional)</label>
                                <Textarea
                                    placeholder="Add any notes about this verification..."
                                    value={verifyData.verification_notes}
                                    onChange={(e) => setVerifyData('verification_notes', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowVerifyDialog(false)}
                                disabled={verifyProcessing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitVerification}
                                disabled={verifyProcessing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {verifyProcessing ? 'Verifying...' : 'Verify Payment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rejection Dialog */}
                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Payment</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for rejecting payment {selectedPayment?.payment_number}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Rejection Reason *</label>
                                <Textarea
                                    placeholder="Explain why this payment is being rejected..."
                                    value={rejectData.rejection_reason}
                                    onChange={(e) => setRejectData('rejection_reason', e.target.value)}
                                    className="mt-1"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectDialog(false)}
                                disabled={rejectProcessing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitRejection}
                                disabled={rejectProcessing || !rejectData.rejection_reason}
                                variant="destructive"
                            >
                                {rejectProcessing ? 'Rejecting...' : 'Reject Payment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
} 
import AppLayout from '@/layouts/app-layout';
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
    Calendar
} from 'lucide-react';
import { useState } from 'react';

interface PaymentsIndexProps {
    payments: PaginatedData<Payment>;
    paymentMethods: PaymentMethod[];
    stats: {
        pending: number;
        verified: number;
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
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState(filters.payment_method || 'all');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const { data: verifyData, setData: setVerifyData, processing: verifyProcessing, patch : verifyPatch, reset: verifyReset } = useForm({
        verification_notes: '',
    });

    const { data: rejectData, setData: setRejectData, processing: rejectProcessing, patch : rejectPatch, reset: rejectReset } = useForm({
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
        };
        
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getPaymentTypeBadge = (type: Payment['payment_type']) => {
        const typeConfig = {
            dp: { variant: 'secondary' as const, label: 'DP' },
            full_payment: { variant: 'default' as const, label: 'Full Payment' },
            remaining_payment: { variant: 'outline' as const, label: 'Remaining' },
        };
        
        const config = typeConfig[type];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
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

    // Check permissions
    const canVerify = ['super_admin', 'property_manager', 'finance'].includes(auth.user.role);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
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
                            <div className="text-2xl font-bold">{stats.pending}</div>
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
                            <div className="text-2xl font-bold">{stats.verified}</div>
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
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payment Number</TableHead>
                                        <TableHead>Booking</TableHead>
                                        <TableHead>Guest</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.data.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">
                                                <Link 
                                                    href={`/admin/payments/${payment.payment_number}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    {payment.payment_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link 
                                                    href={`/admin/bookings/${payment.booking?.slug}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    {payment.booking?.booking_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{payment.booking?.guest_name}</TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(payment.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {getPaymentTypeBadge(payment.payment_type)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4" />
                                                    {payment.paymentMethod?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getPaymentStatusBadge(payment.payment_status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{formatDate(payment.payment_date || '')}</div>
                                                    {payment.verified_at && (
                                                        <div className="text-muted-foreground">
                                                            Verified: {formatDate(payment.verified_at)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/payments/${payment.payment_number}`}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        
                                                        {canVerify && payment.payment_status === 'pending' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleVerify(payment)}
                                                                    className="text-green-600"
                                                                >
                                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                                    Verify Payment
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleReject(payment)}
                                                                    className="text-red-600"
                                                                >
                                                                    <XCircle className="mr-2 h-4 w-4" />
                                                                    Reject Payment
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

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
                        {payments.data.length > 0 && (
                            <div className="flex items-center justify-between space-x-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {payments.from} to {payments.to} of {payments.total} payments
                                </div>
                                <div className="flex items-center space-x-2">
                                    {payments.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => link.url && router.visit(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
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
        </AppLayout>
    );
} 
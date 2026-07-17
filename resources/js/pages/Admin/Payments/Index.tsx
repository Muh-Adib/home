import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type Payment, type PaymentMethod, type BreadcrumbItem, type User, type PaginatedData, type PageProps, type Booking } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { apiGet } from '@/lib/api';
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
    Edit,
    Loader2,
    Plus
} from 'lucide-react';
import { useState, useEffect, Fragment } from 'react';
import { toast } from 'sonner';

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
        grouped?: string;
        sort_by?: string;
        sort_dir?: string;
    };
    bookings: Booking[];
    users: User[];
    bankOptions: string[];
}

export default function PaymentsIndex({ payments, paymentMethods, stats, filters, bookings, users, bankOptions }: PaymentsIndexProps) {
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

    // Grouping & Sorting States
    const [isGrouped, setIsGrouped] = useState(filters.grouped !== 'false');
    const [sortBy, setSortBy] = useState(filters.sort_by || 'date');
    const [sortDir, setSortDir] = useState(filters.sort_dir || 'desc');

    // Reverification States
    const [showReverifyAcceptDialog, setShowReverifyAcceptDialog] = useState(false);
    const [showReverifyRejectDialog, setShowReverifyRejectDialog] = useState(false);

    // Create & Edit Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [selectedBookingData, setSelectedBookingData] = useState<Booking | null>(null);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    const createForm = useForm({
        booking_id: '',
        payment_method_id: '',
        amount: '',
        payment_type: 'dp' as 'dp' | 'remaining' | 'full' | 'refund' | 'penalty',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        payment_status: 'pending' as 'pending' | 'verified' | 'failed' | 'cancelled',
        verification_notes: '',
        attachment: null as File | null,
        processed_by: '',
        verified_by: '',
        gateway_transaction_id: '',
        auto_confirm: false,
    });

    const editForm = useForm({
        payment_method_id: '',
        amount: '',
        unique_code: '0',
        payment_type: 'dp' as 'dp' | 'remaining' | 'full' | 'refund' | 'penalty',
        payment_date: '',
        due_date: '',
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        payment_status: 'pending' as 'pending' | 'verified' | 'failed' | 'cancelled',
        verification_notes: '',
        attachment: null as File | null,
        processed_by: '',
        verified_by: '',
        gateway_transaction_id: '',
        keep_existing_attachment: true,
    });

    // Auto-fill create form values when a booking is selected
    useEffect(() => {
        if (createForm.data.booking_id) {
            const booking = bookings.find(b => b.id.toString() === createForm.data.booking_id.toString());
            setSelectedBookingData(booking || null);

            if (booking) {
                if (booking.payment_status === 'dp_pending') {
                    createForm.setData(prev => ({
                        ...prev,
                        payment_type: 'dp',
                        amount: booking.dp_amount ? booking.dp_amount.toString() : ''
                    }));
                } else if (booking.payment_status === 'dp_received') {
                    createForm.setData(prev => ({
                        ...prev,
                        payment_type: 'remaining',
                        amount: booking.remaining_amount ? booking.remaining_amount.toString() : ''
                    }));
                }
            }
        } else {
            setSelectedBookingData(null);
        }
    }, [createForm.data.booking_id]);

    // Auto-fill create form payment method details
    useEffect(() => {
        if (createForm.data.payment_method_id) {
            const method = paymentMethods.find(m => m.id.toString() === createForm.data.payment_method_id.toString());
            if (method) {
                createForm.setData(prev => ({
                    ...prev,
                    bank_name: method.bank_name || '',
                    account_number: method.account_number || '',
                    account_name: method.account_name || ''
                }));
            }
        }
    }, [createForm.data.payment_method_id]);

    // Auto-fill edit form payment method details
    useEffect(() => {
        if (editForm.data.payment_method_id) {
            const method = paymentMethods.find(m => m.id.toString() === editForm.data.payment_method_id.toString());
            if (method) {
                editForm.setData(prev => ({
                    ...prev,
                    bank_name: method.bank_name || '',
                    account_number: method.account_number || '',
                    account_name: method.account_name || ''
                }));
            }
        }
    }, [editForm.data.payment_method_id]);

    const handleEditPayment = (payment: Payment) => {
        setEditingPayment(payment);
        editForm.setData({
            payment_method_id: payment.payment_method_id?.toString() || '',
            amount: payment.amount.toString(),
            unique_code: payment.unique_code?.toString() || '0',
            payment_type: payment.payment_type as any,
            payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
            due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
            reference_number: payment.reference_number || '',
            bank_name: payment.bank_name || '',
            account_number: payment.account_number || '',
            account_name: payment.account_name || '',
            payment_status: payment.payment_status as any,
            verification_notes: payment.verification_notes || '',
            attachment: null,
            processed_by: payment.processed_by?.toString() || '',
            verified_by: payment.verified_by?.toString() || '',
            gateway_transaction_id: payment.gateway_transaction_id || '',
            keep_existing_attachment: true,
        });
        setShowEditModal(true);
    };

    const submitCreatePayment = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/payments', {
            forceFormData: true,
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                toast.success('Pembayaran baru berhasil dicatat.');
            },
        });
    };

    const submitEditPayment = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.post(`/admin/payments/${editingPayment?.payment_number}`, {
            forceFormData: true,
            onSuccess: () => {
                setShowEditModal(false);
                setEditingPayment(null);
                editForm.reset();
                toast.success('Pembayaran berhasil diperbarui.');
            },
        });
    };

    const { data: verifyData, setData: setVerifyData, processing: verifyProcessing, patch: verifyPatch, reset: verifyReset } = useForm({
        verification_notes: '',
    });

    const { data: rejectData, setData: setRejectData, processing: rejectProcessing, patch: rejectPatch, reset: rejectReset } = useForm({
        rejection_reason: '',
    });

    const { data: reverifyAcceptData, setData: setReverifyAcceptData, processing: reverifyAcceptProcessing, patch: reverifyAcceptPatch, reset: reverifyAcceptReset } = useForm({
        reverification_notes: '',
    });

    const { data: reverifyRejectData, setData: setReverifyRejectData, processing: reverifyRejectProcessing, patch: reverifyRejectPatch, reset: reverifyRejectReset } = useForm({
        reverification_notes: '',
        reverification_action: '',
    });

    // Inline Notes Editing States
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
    const [editingNotesValue, setEditingNotesValue] = useState<string>('');
    const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

    // Infinite Scroll States
    const [loadedPayments, setLoadedPayments] = useState<Payment[]>(payments.data);
    const [currentPage, setCurrentPage] = useState(payments.current_page);
    const [lastPage, setLastPage] = useState(payments.last_page);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Sync state when initial props update
    useEffect(() => {
        setLoadedPayments(payments.data);
        setCurrentPage(payments.current_page);
        setLastPage(payments.last_page);
    }, [payments]);

    const loadNextPage = async () => {
        if (currentPage >= lastPage || isLoadingMore) return;
        setIsLoadingMore(true);

        try {
            const res = await apiGet<{ payments: PaginatedData<Payment> }>('/admin/payments', {
                page: currentPage + 1,
                format: 'json',
                search: searchTerm || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
                grouped: isGrouped ? 'true' : 'false',
                sort_by: sortBy,
                sort_dir: sortDir,
            });

            if (res.payments && res.payments.data) {
                setLoadedPayments((prev) => [...prev, ...res.payments.data]);
                setCurrentPage(res.payments.current_page);
                setLastPage(res.payments.last_page);
            }
        } catch (err) {
            console.error('Failed to load more payments:', err);
            toast.error('Gagal memuat data pembayaran selanjutnya.');
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && currentPage < lastPage && !isLoadingMore) {
                    loadNextPage();
                }
            },
            { threshold: 0.1 }
        );

        const target = document.getElementById('infinite-scroll-trigger');
        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) {
                observer.unobserve(target);
            }
        };
    }, [currentPage, lastPage, isLoadingMore, searchTerm, statusFilter, paymentMethodFilter, isGrouped, sortBy, sortDir]);

    const handleStartEditNotes = (payment: Payment) => {
        setEditingPaymentId(payment.id);
        setEditingNotesValue(payment.verification_notes || '');
    };

    const handleCancelEditNotes = () => {
        setEditingPaymentId(null);
        setEditingNotesValue('');
    };

    const handleSaveNotes = (payment: Payment) => {
        setIsSavingNotes(true);
        router.patch(`/admin/payments/${payment.payment_number}`, {
            verification_notes: editingNotesValue,
            keep_existing_attachment: true,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingPaymentId(null);
                setEditingNotesValue('');
                setIsSavingNotes(false);
            },
            onError: () => {
                setIsSavingNotes(false);
            }
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments' },
    ];

    const handleSearch = (newGrouped = isGrouped, newSortBy = sortBy, newSortDir = sortDir) => {
        router.get('/admin/payments', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
            grouped: String(newGrouped),
            sort_by: newSortBy,
            sort_dir: newSortDir,
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

    const handleReverifyAccept = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowReverifyAcceptDialog(true);
        reverifyAcceptReset();
    };

    const handleReverifyReject = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowReverifyRejectDialog(true);
        reverifyRejectReset();
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

    const submitReverifyAccept = () => {
        if (!selectedPayment) return;

        reverifyAcceptPatch(`/admin/payments/${selectedPayment.payment_number}/reverify-accept`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowReverifyAcceptDialog(false);
                setSelectedPayment(null);
                reverifyAcceptReset();
            },
        });
    };

    const submitReverifyReject = () => {
        if (!selectedPayment) return;

        reverifyRejectPatch(`/admin/payments/${selectedPayment.payment_number}/reverify-reject`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowReverifyRejectDialog(false);
                setSelectedPayment(null);
                reverifyRejectReset();
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

    const getReverificationBadge = (status: string) => {
        if (status === 'accepted') {
            return (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 font-bold border-none text-[10px]">
                    ✓ Cek Manual Oke
                </Badge>
            );
        }
        if (status === 'rejected') {
            return (
                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100/80 font-bold border-none text-[10px]">
                    ✗ Cek Manual Salah
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-amber-600 border-amber-300 font-semibold text-[10px]">
                ? Belum Cek Manual
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

    loadedPayments.forEach((payment) => {
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
                        <p className="text-muted-foreground text-sm">
                            Kelola dan verifikasi pembayaran tamu
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                            onClick={() => { createForm.reset(); setSelectedBookingData(null); setShowCreateModal(true); }} 
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Catat Pembayaran
                        </Button>
                        <Button variant="outline" className="w-full sm:w-auto font-semibold rounded-xl">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center justify-between text-amber-700 font-bold text-xs uppercase tracking-wider">
                            <span>Pending</span>
                            <Clock className="h-4 w-4" />
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl md:text-3xl font-black text-amber-900">{stats.pending_payments}</div>
                            <p className="text-[10px] md:text-xs text-amber-700 font-semibold mt-1">Butuh verifikasi</p>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center justify-between text-emerald-700 font-bold text-xs uppercase tracking-wider">
                            <span>Verified</span>
                            <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl md:text-3xl font-black text-emerald-900">{stats.verified_payments}</div>
                            <p className="text-[10px] md:text-xs text-emerald-700 font-semibold mt-1">Berhasil diverifikasi</p>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center justify-between text-blue-700 font-bold text-xs uppercase tracking-wider">
                            <span>Hari Ini</span>
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl md:text-2xl font-black text-blue-900 truncate">{formatCurrency(stats.today_amount)}</div>
                            <p className="text-[10px] md:text-xs text-blue-700 font-semibold mt-1">Total masuk hari ini</p>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center justify-between text-indigo-700 font-bold text-xs uppercase tracking-wider">
                            <span>Bulan Ini</span>
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl md:text-2xl font-black text-indigo-900 truncate">{formatCurrency(stats.month_amount)}</div>
                            <p className="text-[10px] md:text-xs text-indigo-700 font-semibold mt-1">Total bulan berjalan</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cari nomor pembayaran, nama tamu, booking..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 h-10 border-slate-200 focus-visible:ring-blue-500 rounded-xl"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                                className="h-10 px-4 font-semibold border-slate-200 hover:bg-slate-50 flex items-center gap-2 rounded-xl shrink-0"
                            >
                                <Filter className="h-4 w-4" />
                                <span>Filter</span>
                                {(statusFilter !== 'all' || paymentMethodFilter !== 'all') && (
                                    <Badge className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                                        {[statusFilter !== 'all' ? 1 : 0, paymentMethodFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                                    </Badge>
                                )}
                            </Button>
                            <Button onClick={() => handleSearch()} className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-xl shrink-0">
                                Terapkan
                            </Button>
                        </div>
                    </div>

                    {isFilterExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Pembayaran</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                        <SelectValue placeholder="Pilih Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="failed">Gagal (Failed)</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran</label>
                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                        <SelectValue placeholder="Pilih Metode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Metode</SelectItem>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={method.id.toString()}>
                                                {method.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-3.5 border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Tampilan:</span>
                            <Button
                                variant={isGrouped ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setIsGrouped(true);
                                    handleSearch(true, sortBy, sortDir);
                                }}
                                className="h-8 rounded-lg text-xs font-semibold px-3"
                            >
                                Kelompokkan per Booking
                            </Button>
                            <Button
                                variant={!isGrouped ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setIsGrouped(false);
                                    handleSearch(false, sortBy, sortDir);
                                }}
                                className="h-8 rounded-lg text-xs font-semibold px-3"
                            >
                                Daftar Transaksi Tunggal
                            </Button>
                        </div>

                        {!isGrouped && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Urutan:</span>
                                <Select
                                    value={sortBy}
                                    onValueChange={(val) => {
                                        setSortBy(val);
                                        handleSearch(false, val, sortDir);
                                    }}
                                >
                                    <SelectTrigger className="w-[150px] h-8 text-xs border-slate-200 rounded-lg">
                                        <SelectValue placeholder="Kolom" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date">Tanggal Bayar</SelectItem>
                                        <SelectItem value="bank_account">Rekening Tujuan</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={sortDir}
                                    onValueChange={(val) => {
                                        setSortDir(val);
                                        handleSearch(false, sortBy, val);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200 rounded-lg">
                                        <SelectValue placeholder="Arah" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="desc">DESC (Z-A)</SelectItem>
                                        <SelectItem value="asc">ASC (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

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
                            {isGrouped && groupedPayments.map((group, groupIndex) => {
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
                                                        <th className="py-2">Catatan</th>
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
                                                                <td className="py-2.5 max-w-[200px]">
                                                                    {editingPaymentId === payment.id ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                value={editingNotesValue}
                                                                                onChange={(e) => setEditingNotesValue(e.target.value)}
                                                                                disabled={isSavingNotes}
                                                                                className="h-7 text-xs w-full py-0 px-2"
                                                                                placeholder="Tulis catatan..."
                                                                                autoFocus
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        handleSaveNotes(payment);
                                                                                    } else if (e.key === 'Escape') {
                                                                                        handleCancelEditNotes();
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                onClick={() => handleSaveNotes(payment)}
                                                                                disabled={isSavingNotes}
                                                                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                onClick={handleCancelEditNotes}
                                                                                disabled={isSavingNotes}
                                                                                className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                                            >
                                                                                <XCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div 
                                                                            onClick={() => handleStartEditNotes(payment)}
                                                                            className="group flex items-center justify-between gap-1 cursor-pointer hover:bg-slate-100/80 rounded px-1.5 py-1 text-slate-600 hover:text-slate-900 transition-all min-h-[28px]"
                                                                        >
                                                                            <span className="truncate max-w-[150px] font-medium text-xs">
                                                                                {payment.verification_notes || (
                                                                                    <span className="text-slate-400 italic text-[11px]">+ Tambah Catatan</span>
                                                                                )}
                                                                            </span>
                                                                            <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 shrink-0 transition-opacity" />
                                                                        </div>
                                                                    )}
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
                                                                                <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Payment
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
                                                                        <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit Payment
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

                            {!isGrouped && loadedPayments.length > 0 && (
                                <div className="space-y-4">
                                    {/* Desktop Table */}
                                    <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                                                    <th className="py-3 px-4">Payment Number & Booking</th>
                                                    <th className="py-3 px-4">Nominal</th>
                                                    <th className="py-3 px-4">Tipe</th>
                                                    <th className="py-3 px-4">Rekening Tujuan</th>
                                                    <th className="py-3 px-4">Status Bayar</th>
                                                    <th className="py-3 px-4">Cek Manual (Re-verify)</th>
                                                    <th className="py-3 px-4">Tanggal</th>
                                                    <th className="py-3 px-4">Catatan</th>
                                                    <th className="py-3 px-4 text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loadedPayments.map((payment, index) => {
                                                    const isMissRouted = checkIsMissRouted(payment);
                                                    const rowEven = index % 2 === 0;
                                                    const canReverifyPayment = ['super_admin', 'finance'].includes(auth.user?.role) || (auth.user?.role === 'property_owner' && payment.booking?.property?.owner_id === auth.user?.id);

                                                    return (
                                                        <tr
                                                            key={payment.id}
                                                            className={`border-b border-slate-100/50 hover:bg-slate-200/20 transition-colors ${rowEven ? 'bg-transparent' : 'bg-slate-50/30'}`}
                                                        >
                                                            <td className="py-3 px-4 space-y-1">
                                                                <Link
                                                                    href={`/admin/payments/${payment.payment_number}`}
                                                                    className="hover:underline text-blue-600 font-bold block"
                                                                >
                                                                    {payment.payment_number}
                                                                </Link>
                                                                <div className="text-[10px] text-slate-500 font-medium">
                                                                    Booking:{" "}
                                                                    {payment.booking ? (
                                                                        <Link href={`/admin/bookings/${payment.booking.booking_number}`} className="text-blue-500 hover:underline font-bold">
                                                                            {payment.booking.booking_number}
                                                                        </Link>
                                                                    ) : (
                                                                        "Tanpa Booking"
                                                                    )}
                                                                    {" "}• {payment.booking?.guest_name || 'Tamu Umum'}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-black text-slate-900 text-sm">
                                                                {formatCurrency(payment.amount)}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {getPaymentTypeBadge(payment.payment_type)}
                                                            </td>
                                                            <td className="py-3 px-4 space-y-1">
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
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {getPaymentStatusBadge(payment.payment_status)}
                                                            </td>
                                                            <td className="py-3 px-4 space-y-1">
                                                                {getReverificationBadge(payment.reverification_status || 'pending')}
                                                                {payment.reverified_at && (
                                                                    <div className="text-[10px] text-slate-400 font-medium block">
                                                                        Oleh: {payment.reverifier?.name || 'Admin'}
                                                                    </div>
                                                                )}
                                                                {payment.reverification_action && (
                                                                    <div className="text-[9px] text-rose-500 font-bold max-w-[150px] truncate">
                                                                        Tindak Lanjut: {payment.reverification_action}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-500 font-medium">
                                                                {formatDate(payment.payment_date || '')}
                                                            </td>
                                                            <td className="py-3 px-4 max-w-[200px]">
                                                                {editingPaymentId === payment.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <Input
                                                                            value={editingNotesValue}
                                                                            onChange={(e) => setEditingNotesValue(e.target.value)}
                                                                            disabled={isSavingNotes}
                                                                            className="h-7 text-xs w-full py-0 px-2"
                                                                            placeholder="Tulis catatan..."
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    handleSaveNotes(payment);
                                                                                } else if (e.key === 'Escape') {
                                                                                    handleCancelEditNotes();
                                                                                }
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleSaveNotes(payment)}
                                                                            disabled={isSavingNotes}
                                                                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                                                                        >
                                                                            <CheckCircle className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={handleCancelEditNotes}
                                                                            disabled={isSavingNotes}
                                                                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                                        >
                                                                            <XCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div 
                                                                        onClick={() => handleStartEditNotes(payment)}
                                                                        className="group flex items-center justify-between gap-1 cursor-pointer hover:bg-slate-100/80 rounded px-1.5 py-1 text-slate-600 hover:text-slate-900 transition-all min-h-[28px]"
                                                                    >
                                                                        <span className="truncate max-w-[150px] font-medium text-xs">
                                                                            {payment.verification_notes || (
                                                                                <span className="text-slate-400 italic text-[11px]">+ Tambah Catatan</span>
                                                                            )}
                                                                        </span>
                                                                        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 shrink-0 transition-opacity" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
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
                                                                            <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                                                <Edit className="mr-2 h-4 w-4" /> Edit Payment
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
                                                                        {canReverifyPayment && payment.payment_status === 'verified' && payment.reverification_status === 'pending' && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={() => handleReverifyAccept(payment)}
                                                                                    className="text-emerald-600 font-medium"
                                                                                >
                                                                                    <CheckCircle className="mr-2 h-4 w-4" /> Setujui Recheck
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => handleReverifyReject(payment)}
                                                                                    className="text-rose-600 font-medium"
                                                                                >
                                                                                    <XCircle className="mr-2 h-4 w-4" /> Tolak Recheck
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

                                    {/* Mobile Card List */}
                                    <div className="block sm:hidden space-y-3">
                                        {loadedPayments.map((payment) => {
                                            const isMissRouted = checkIsMissRouted(payment);
                                            const canReverifyPayment = ['super_admin', 'finance'].includes(auth.user?.role) || (auth.user?.role === 'property_owner' && payment.booking?.property?.owner_id === auth.user?.id);

                                            return (
                                                <div
                                                    key={payment.id}
                                                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3 relative"
                                                >
                                                    <div className="flex justify-between items-start pr-8">
                                                        <div className="space-y-0.5">
                                                            <Link
                                                                href={`/admin/payments/${payment.payment_number}`}
                                                                className="font-bold text-blue-600 hover:underline text-sm"
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

                                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                                                        <div>Booking: <span className="font-bold">{payment.booking?.booking_number || 'Tanpa Booking'}</span></div>
                                                        <div>Guest: <span className="font-semibold text-slate-800">{payment.booking?.guest_name || 'Tamu Umum'}</span></div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[11px]">
                                                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                                                            <CreditCard className="h-3 w-3 text-slate-400" />
                                                            <span>{payment.paymentMethod?.name || payment.bank_name || 'Transfer'}</span>
                                                        </div>
                                                        <div>
                                                            {getPaymentStatusBadge(payment.payment_status)}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[11px]">
                                                        <span className="text-slate-500 font-medium">Cek Manual:</span>
                                                        <div>{getReverificationBadge(payment.reverification_status || 'pending')}</div>
                                                    </div>

                                                    {isMissRouted && (
                                                        <div className="border-t pt-2 border-slate-100">
                                                            <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[9px] py-0.5 px-2 font-black uppercase border-none rounded w-full justify-center">
                                                                ⚠️ Miss Route
                                                            </Badge>
                                                        </div>
                                                    )}

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
                                                                    <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Edit Payment
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
                                                                {canReverifyPayment && payment.payment_status === 'verified' && payment.reverification_status === 'pending' && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleReverifyAccept(payment)}
                                                                            className="text-emerald-600"
                                                                        >
                                                                            <CheckCircle className="mr-2 h-4 w-4" /> Setujui Recheck
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleReverifyReject(payment)}
                                                                            className="text-rose-600"
                                                                        >
                                                                            <XCircle className="mr-2 h-4 w-4" /> Tolak Recheck
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
                            )}

                            {loadedPayments.length === 0 && (
                                <div className="text-center py-8">
                                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-2 text-sm font-semibold">No payments found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try adjusting your search filters.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Infinite Scroll Trigger Indicator */}
                        <div id="infinite-scroll-trigger" className="flex justify-center items-center py-6 mt-4 border-t border-slate-100/60">
                            {isLoadingMore && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    Memuat lebih banyak pembayaran...
                                </div>
                            )}
                            {!isLoadingMore && currentPage >= lastPage && loadedPayments.length > 0 && (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                                    Semua data pembayaran telah dimuat.
                                </span>
                            )}
                        </div>
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

                {/* Re-verify Accept Dialog */}
                <Dialog open={showReverifyAcceptDialog} onOpenChange={setShowReverifyAcceptDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Verifikasi Ulang: Setujui Pembayaran</DialogTitle>
                            <DialogDescription>
                                Konfirmasi bahwa dana transfer untuk pembayaran {selectedPayment?.payment_number} telah masuk ke rekening yang sesuai.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Catatan Verifikasi Ulang (Opsional)</label>
                                <Textarea
                                    placeholder="Tambahkan catatan pencocokan manual..."
                                    value={reverifyAcceptData.reverification_notes}
                                    onChange={(e) => setReverifyAcceptData('reverification_notes', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowReverifyAcceptDialog(false)}
                                disabled={reverifyAcceptProcessing}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={submitReverifyAccept}
                                disabled={reverifyAcceptProcessing}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {reverifyAcceptProcessing ? 'Memproses...' : 'Setujui & Cocok'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Re-verify Reject Dialog */}
                <Dialog open={showReverifyRejectDialog} onOpenChange={setShowReverifyRejectDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Verifikasi Ulang: Tolak Pembayaran</DialogTitle>
                            <DialogDescription>
                                Masukkan alasan penolakan manual dan rencana tindak lanjut untuk pembayaran {selectedPayment?.payment_number}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Alasan Penolakan (Manual Cek) *</label>
                                <Textarea
                                    placeholder="Jelaskan mengapa pembayaran ini tidak valid atau tidak masuk..."
                                    value={reverifyRejectData.reverification_notes}
                                    onChange={(e) => setReverifyRejectData('reverification_notes', e.target.value)}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Rencana Tindak Lanjut *</label>
                                <Select
                                    value={reverifyRejectData.reverification_action}
                                    onValueChange={(val) => setReverifyRejectData('reverification_action', val)}
                                >
                                    <SelectTrigger className="w-full mt-1">
                                        <SelectValue placeholder="Pilih Tindak Lanjut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Minta Bukti Baru">Minta Tamu Upload Bukti Baru</SelectItem>
                                        <SelectItem value="Hubungi WhatsApp">Hubungi Tamu via WhatsApp/Telepon</SelectItem>
                                        <SelectItem value="Refund Dana">Refund Dana (Jika Salah Transfer)</SelectItem>
                                        <SelectItem value="Batalkan Manual">Batalkan Booking Secara Manual</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya (Lihat Catatan)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowReverifyRejectDialog(false)}
                                disabled={reverifyRejectProcessing}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={submitReverifyReject}
                                disabled={reverifyRejectProcessing || !reverifyRejectData.reverification_notes || !reverifyRejectData.reverification_action}
                                variant="destructive"
                            >
                                {reverifyRejectProcessing ? 'Memproses...' : 'Tolak & Revert'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Payment Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                            <DialogTitle className="text-xl font-bold">Catat Pembayaran Baru</DialogTitle>
                            <DialogDescription>Masukkan detail transaksi pembayaran tamu untuk booking.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={submitCreatePayment} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Pilih Booking *</Label>
                                    <Select 
                                        value={createForm.data.booking_id} 
                                        onValueChange={(val) => createForm.setData('booking_id', val)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Booking Tamu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bookings.map((booking) => (
                                                <SelectItem key={booking.id} value={booking.id.toString()}>
                                                    {booking.booking_number} - {booking.guest_name} ({booking.property?.name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {createForm.errors.booking_id && <p className="text-xs text-rose-500 font-bold">{createForm.errors.booking_id}</p>}
                                </div>

                                {selectedBookingData && (
                                    <div className="col-span-1 sm:col-span-2 bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-medium">Total Tagihan:</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(selectedBookingData.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-medium">Sudah Dibayar:</span>
                                            <span className="font-bold text-emerald-600">{formatCurrency(selectedBookingData.paid_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                            <span className="text-slate-700">Sisa Pembayaran:</span>
                                            <span className="text-blue-600">{formatCurrency(selectedBookingData.remaining_amount || 0)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Tipe Pembayaran *</Label>
                                    <Select 
                                        value={createForm.data.payment_type} 
                                        onValueChange={(val) => createForm.setData('payment_type', val as any)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dp">DP (Down Payment)</SelectItem>
                                            <SelectItem value="remaining">Pelunasan (Remaining)</SelectItem>
                                            <SelectItem value="full">Full Payment</SelectItem>
                                            <SelectItem value="refund">Refund</SelectItem>
                                            <SelectItem value="penalty">Denda (Penalty)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {createForm.errors.payment_type && <p className="text-xs text-rose-500 font-bold">{createForm.errors.payment_type}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Metode Pembayaran *</Label>
                                    <Select 
                                        value={createForm.data.payment_method_id} 
                                        onValueChange={(val) => createForm.setData('payment_method_id', val)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Metode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map((method) => (
                                                <SelectItem key={method.id} value={method.id.toString()}>
                                                    {method.name} ({method.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {createForm.errors.payment_method_id && <p className="text-xs text-rose-500 font-bold">{createForm.errors.payment_method_id}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nominal Pembayaran *</Label>
                                    <CurrencyInput
                                        placeholder="Contoh: 500.000"
                                        value={Number(createForm.data.amount) || 0}
                                        onChange={(val) => createForm.setData('amount', val.toString())}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.amount && <p className="text-xs text-rose-500 font-bold">{createForm.errors.amount}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Tanggal Pembayaran *</Label>
                                    <Input
                                        type="date"
                                        value={createForm.data.payment_date}
                                        onChange={(e) => createForm.setData('payment_date', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.payment_date && <p className="text-xs text-rose-500 font-bold">{createForm.errors.payment_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nama Bank Penerima</Label>
                                    <Input
                                        placeholder="Contoh: Bank Mandiri"
                                        value={createForm.data.bank_name}
                                        onChange={(e) => createForm.setData('bank_name', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.bank_name && <p className="text-xs text-rose-500 font-bold">{createForm.errors.bank_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Rekening Penerima</Label>
                                    <Input
                                        placeholder="Contoh: 13700xxxxxxxx"
                                        value={createForm.data.account_number}
                                        onChange={(e) => createForm.setData('account_number', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.account_number && <p className="text-xs text-rose-500 font-bold">{createForm.errors.account_number}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nama Pemilik Rekening</Label>
                                    <Input
                                        placeholder="Contoh: Indah Arini"
                                        value={createForm.data.account_name}
                                        onChange={(e) => createForm.setData('account_name', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.account_name && <p className="text-xs text-rose-500 font-bold">{createForm.errors.account_name}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Referensi / Ref ID</Label>
                                    <Input
                                        placeholder="Contoh: TRX-19283719"
                                        value={createForm.data.reference_number}
                                        onChange={(e) => createForm.setData('reference_number', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.reference_number && <p className="text-xs text-rose-500 font-bold">{createForm.errors.reference_number}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Upload Bukti Transfer</Label>
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => createForm.setData('attachment', e.target.files?.[0] || null)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500 pointer-events-auto"
                                    />
                                    {createForm.errors.attachment && <p className="text-xs text-rose-500 font-bold">{createForm.errors.attachment}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Catatan Verifikasi</Label>
                                    <Textarea
                                        placeholder="Tambahkan catatan jika diperlukan..."
                                        value={createForm.data.verification_notes}
                                        onChange={(e) => createForm.setData('verification_notes', e.target.value)}
                                        className="border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {createForm.errors.verification_notes && <p className="text-xs text-rose-500 font-bold">{createForm.errors.verification_notes}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Status Awal</Label>
                                    <Select 
                                        value={createForm.data.payment_status} 
                                        onValueChange={(val) => createForm.setData('payment_status', val as any)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending (Perlu Dicek)</SelectItem>
                                            <SelectItem value="verified">Verified (Disetujui)</SelectItem>
                                            <SelectItem value="failed">Failed (Gagal)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {createForm.errors.payment_status && <p className="text-xs text-rose-500 font-bold">{createForm.errors.payment_status}</p>}
                                </div>

                                <div className="flex items-center space-x-2 pt-4">
                                    <Switch
                                        id="auto_confirm"
                                        checked={createForm.data.auto_confirm}
                                        onCheckedChange={(val) => createForm.setData('auto_confirm', val)}
                                    />
                                    <Label htmlFor="auto_confirm" className="text-xs font-semibold cursor-pointer">Konfirmasi Otomatis Booking</Label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4 border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={createForm.processing}
                                    className="rounded-xl h-10 px-4 font-semibold"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-bold"
                                >
                                    {createForm.processing ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Payment Modal */}
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                            <DialogTitle className="text-xl font-bold">Edit Pembayaran: {editingPayment?.payment_number}</DialogTitle>
                            <DialogDescription>Perbarui rincian transaksi pembayaran tamu.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={submitEditPayment} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Booking</Label>
                                    <div className="bg-slate-100 border border-slate-200/60 rounded-xl p-3 text-xs font-semibold text-slate-700">
                                        {editingPayment?.booking?.booking_number} - {editingPayment?.booking?.guest_name} ({editingPayment?.booking?.property?.name})
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Tipe Pembayaran *</Label>
                                    <Select 
                                        value={editForm.data.payment_type} 
                                        onValueChange={(val) => editForm.setData('payment_type', val as any)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dp">DP (Down Payment)</SelectItem>
                                            <SelectItem value="remaining">Pelunasan (Remaining)</SelectItem>
                                            <SelectItem value="full">Full Payment</SelectItem>
                                            <SelectItem value="refund">Refund</SelectItem>
                                            <SelectItem value="penalty">Denda (Penalty)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {editForm.errors.payment_type && <p className="text-xs text-rose-500 font-bold">{editForm.errors.payment_type}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Metode Pembayaran *</Label>
                                    <Select 
                                        value={editForm.data.payment_method_id} 
                                        onValueChange={(val) => editForm.setData('payment_method_id', val)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Metode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map((method) => (
                                                <SelectItem key={method.id} value={method.id.toString()}>
                                                    {method.name} ({method.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {editForm.errors.payment_method_id && <p className="text-xs text-rose-500 font-bold">{editForm.errors.payment_method_id}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nominal Pembayaran *</Label>
                                    <CurrencyInput
                                        placeholder="Contoh: 500.000"
                                        value={Number(editForm.data.amount) || 0}
                                        onChange={(val) => editForm.setData('amount', val.toString())}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.amount && <p className="text-xs text-rose-500 font-bold">{editForm.errors.amount}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Tanggal Pembayaran *</Label>
                                    <Input
                                        type="date"
                                        value={editForm.data.payment_date}
                                        onChange={(e) => editForm.setData('payment_date', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.payment_date && <p className="text-xs text-rose-500 font-bold">{editForm.errors.payment_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nama Bank Penerima</Label>
                                    <Input
                                        placeholder="Contoh: Bank Mandiri"
                                        value={editForm.data.bank_name}
                                        onChange={(e) => editForm.setData('bank_name', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.bank_name && <p className="text-xs text-rose-500 font-bold">{editForm.errors.bank_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Rekening Penerima</Label>
                                    <Input
                                        placeholder="Contoh: 13700xxxxxxxx"
                                        value={editForm.data.account_number}
                                        onChange={(e) => editForm.setData('account_number', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.account_number && <p className="text-xs text-rose-500 font-bold">{editForm.errors.account_number}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nama Pemilik Rekening</Label>
                                    <Input
                                        placeholder="Contoh: Indah Arini"
                                        value={editForm.data.account_name}
                                        onChange={(e) => editForm.setData('account_name', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.account_name && <p className="text-xs text-rose-500 font-bold">{editForm.errors.account_name}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Referensi / Ref ID</Label>
                                    <Input
                                        placeholder="Contoh: TRX-19283719"
                                        value={editForm.data.reference_number}
                                        onChange={(e) => editForm.setData('reference_number', e.target.value)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.reference_number && <p className="text-xs text-rose-500 font-bold">{editForm.errors.reference_number}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Ganti Bukti Transfer Baru</Label>
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => editForm.setData('attachment', e.target.files?.[0] || null)}
                                        className="h-10 border-slate-200 rounded-xl focus-visible:ring-blue-500 pointer-events-auto"
                                    />
                                    {editForm.errors.attachment && <p className="text-xs text-rose-500 font-bold">{editForm.errors.attachment}</p>}
                                </div>

                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Catatan Verifikasi</Label>
                                    <Textarea
                                        placeholder="Tambahkan catatan jika diperlukan..."
                                        value={editForm.data.verification_notes}
                                        onChange={(e) => editForm.setData('verification_notes', e.target.value)}
                                        className="border-slate-200 rounded-xl focus-visible:ring-blue-500"
                                    />
                                    {editForm.errors.verification_notes && <p className="text-xs text-rose-500 font-bold">{editForm.errors.verification_notes}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Status Pembayaran</Label>
                                    <Select 
                                        value={editForm.data.payment_status} 
                                        onValueChange={(val) => editForm.setData('payment_status', val as any)}
                                    >
                                        <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                                            <SelectValue placeholder="Pilih Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                            <SelectItem value="refunded">Refunded</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {editForm.errors.payment_status && <p className="text-xs text-rose-500 font-bold">{editForm.errors.payment_status}</p>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4 border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={editForm.processing}
                                    className="rounded-xl h-10 px-4 font-semibold"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-bold"
                                >
                                    {editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
} 
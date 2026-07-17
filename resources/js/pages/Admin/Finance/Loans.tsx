import React, { useState, useMemo } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Coins,
    Plus,
    User,
    Calendar,
    FileText,
    ArrowUpRight,
    TrendingDown,
    Activity,
    CreditCard,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface LoanPayment {
    id: number;
    amount: number;
    paid_at: string;
    notes?: string;
}

interface EmployeeLoan {
    id: number;
    employee_id: number;
    amount: number;
    disbursed_at: string;
    status: 'active' | 'paid';
    notes?: string;
    employee: {
        id: number;
        name: string;
        role: string;
    };
    creator?: {
        name: string;
    };
    payments: LoanPayment[];
}

interface LoansProps {
    loans: EmployeeLoan[];
    employees: Array<{
        id: number;
        name: string;
        role: string;
    }>;
}

export default function Loans({ loans, employees }: LoansProps) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);

    // Form for new Loan
    const { data: loanData, setData: setLoanData, post: postLoan, processing: processingLoan, reset: resetLoan, errors: loanErrors } = useForm({
        employee_id: '',
        amount: '',
        disbursed_at: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    // Form for new Payment/Cicilan
    const { data: paymentData, setData: setPaymentData, post: postPayment, processing: processingPayment, reset: resetPayment, errors: paymentErrors } = useForm({
        amount: '',
        paid_at: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calculate Loan Remaining Outstanding
    const getLoanOutstanding = (loan: EmployeeLoan) => {
        const totalPaid = loan.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        return Math.max(0, Number(loan.amount) - totalPaid);
    };

    // Statistics
    const metrics = useMemo(() => {
        let totalActiveOutstanding = 0;
        let totalDisbursed = 0;
        let activeCount = 0;
        let paidCount = 0;

        loans.forEach((l) => {
            const outstanding = getLoanOutstanding(l);
            totalDisbursed += Number(l.amount);
            if (l.status === 'active') {
                totalActiveOutstanding += outstanding;
                activeCount++;
            } else {
                paidCount++;
            }
        });

        return {
            totalActiveOutstanding,
            totalDisbursed,
            activeCount,
            paidCount
        };
    }, [loans]);

    const handleCreateLoan = (e: React.FormEvent) => {
        e.preventDefault();
        postLoan(route('admin.finance.loans.store'), {
            onSuccess: () => {
                toast.success('Casbon baru berhasil dicatat.');
                resetLoan();
            },
            onError: () => {
                toast.error('Gagal mencatat casbon.');
            }
        });
    };

    const handleOpenPaymentModal = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        resetPayment();
        setIsPaymentModalOpen(true);
    };

    const handleCreatePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        postPayment(route('admin.finance.loans.payments.store', selectedLoan.id), {
            onSuccess: () => {
                toast.success('Pembayaran cicilan casbon berhasil dicatat.');
                setIsPaymentModalOpen(false);
                resetPayment();
            },
            onError: () => {
                toast.error('Gagal mencatat cicilan.');
            }
        });
    };

    return (
        <AdminLayout
            title="Kelola Casbon Staff"
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Finance', href: '/admin/finance' },
                { title: 'Casbon' }
            ]}
        >
            <Head title="Kelola Casbon Staff" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                            <Coins className="h-6 w-6 text-amber-500" />
                            Kelola Casbon & Pinjaman Staff
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Pencatatan pinjaman (casbon) karyawan serta pencatatan cicilan/pemotongan otomatis via payroll.
                        </p>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Outstanding</span>
                                <div className="text-xl font-black text-rose-600">{formatCurrency(metrics.totalActiveOutstanding)}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Disalurkan</span>
                                <div className="text-xl font-black text-slate-700">{formatCurrency(metrics.totalDisbursed)}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Casbon Aktif</span>
                                <div className="text-xl font-black text-amber-600">{metrics.activeCount} Karyawan</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                                <Activity className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lunas (Paid)</span>
                                <div className="text-xl font-black text-emerald-600">{metrics.paidCount} Pinjaman</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Input Casbon */}
                    <Card className="lg:col-span-1 h-fit shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                <Plus className="w-4 h-4 text-primary" />
                                Catat Casbon Baru
                            </CardTitle>
                            <CardDescription className="text-xs">Catat pencairan dana pinjaman ke staff</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={handleCreateLoan}>
                                <div>
                                    <Label className="text-xs text-slate-500 font-semibold">Pilih Staff / Karyawan <span className="text-red-500">*</span></Label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg h-9 px-2.5 bg-background text-sm mt-1 focus:border-primary focus:ring-1 focus:ring-primary"
                                        value={loanData.employee_id}
                                        onChange={(e) => setLoanData('employee_id', e.target.value)}
                                        required
                                    >
                                        <option value="">— Pilih Karyawan —</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                        ))}
                                    </select>
                                    {loanErrors.employee_id && <p className="text-xs text-red-500 mt-1 font-semibold">{loanErrors.employee_id}</p>}
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-500 font-semibold">Nominal Pinjaman <span className="text-red-500">*</span></Label>
                                    <CurrencyInput
                                        className="mt-1 h-9"
                                        placeholder="Contoh: 1.000.000"
                                        value={Number(loanData.amount) || 0}
                                        onChange={(val) => setLoanData('amount', val.toString())}
                                        required
                                    />
                                    {loanErrors.amount && <p className="text-xs text-red-500 mt-1 font-semibold">{loanErrors.amount}</p>}
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-500 font-semibold">Tanggal Pencairan <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="mt-1 h-9"
                                        value={loanData.disbursed_at}
                                        onChange={(e) => setLoanData('disbursed_at', e.target.value)}
                                        required
                                    />
                                    {loanErrors.disbursed_at && <p className="text-xs text-red-500 mt-1 font-semibold">{loanErrors.disbursed_at}</p>}
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-500 font-semibold">Catatan / Keperluan</Label>
                                    <Input
                                        className="mt-1 h-9"
                                        placeholder="Alasan pinjaman..."
                                        value={loanData.notes}
                                        onChange={(e) => setLoanData('notes', e.target.value)}
                                    />
                                    {loanErrors.notes && <p className="text-xs text-red-500 mt-1 font-semibold">{loanErrors.notes}</p>}
                                </div>

                                <Button type="submit" disabled={processingLoan} className="w-full h-9">
                                    Simpan Pinjaman
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Daftar Riwayat Loans */}
                    <Card className="lg:col-span-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-800">Daftar & Riwayat Casbon Karyawan</CardTitle>
                            <CardDescription className="text-xs">Daftar seluruh piutang karyawan yang terdaftar di sistem</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-xl">
                                <table className="min-w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-4">Karyawan</th>
                                            <th className="py-3 px-4">Pencairan</th>
                                            <th className="py-3 px-4">Nominal</th>
                                            <th className="py-3 px-4">Sisa Outstanding</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loans.map((loan) => {
                                            const outstanding = getLoanOutstanding(loan);
                                            const totalPaid = Number(loan.amount) - outstanding;
                                            return (
                                                <tr key={loan.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-700">
                                                        <div>{loan.employee?.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">{loan.employee?.role}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {formatDate(loan.disbursed_at)}
                                                        </div>
                                                        {loan.notes && <div className="text-[10px] text-slate-400 italic max-w-[150px] truncate" title={loan.notes}>{loan.notes}</div>}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-slate-600">{formatCurrency(Number(loan.amount))}</td>
                                                    <td className="py-3.5 px-4 font-bold text-rose-600">
                                                        {outstanding > 0 ? (
                                                            <div>
                                                                {formatCurrency(outstanding)}
                                                                <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                                                                    Terbayar: {formatCurrency(totalPaid)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-emerald-600">Lunas</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <Badge variant={loan.status === 'active' ? 'outline' : 'default'} className={
                                                            loan.status === 'active' 
                                                                ? 'text-amber-700 bg-amber-50 border-amber-200' 
                                                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                        }>
                                                            {loan.status === 'active' ? 'Aktif' : 'Lunas'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        {loan.status === 'active' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-xs h-7 text-primary border-primary/20 hover:bg-primary/5 font-semibold"
                                                                onClick={() => handleOpenPaymentModal(loan)}
                                                            >
                                                                <CreditCard className="w-3 h-3 mr-1" />
                                                                Bayar
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {loans.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                                    Belum ada data casbon
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="block md:hidden space-y-3">
                                {loans.map((loan) => {
                                    const outstanding = getLoanOutstanding(loan);
                                    const totalPaid = Number(loan.amount) - outstanding;
                                    return (
                                        <div key={loan.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{loan.employee?.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{loan.employee?.role}</div>
                                                </div>
                                                <Badge className={
                                                    loan.status === 'active' 
                                                        ? 'text-amber-700 bg-amber-50 border-amber-200' 
                                                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                }>
                                                    {loan.status === 'active' ? 'Aktif' : 'Lunas'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 py-2.5">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Tanggal Cair</span>
                                                    <span className="font-semibold text-slate-700">{formatDate(loan.disbursed_at)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Total Pinjaman</span>
                                                    <span className="font-bold text-slate-700">{formatCurrency(Number(loan.amount))}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Sisa Terutang</span>
                                                    <span className={`font-black ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {outstanding > 0 ? formatCurrency(outstanding) : 'Lunas'}
                                                    </span>
                                                </div>
                                                {loan.status === 'active' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8 text-primary border-primary/20 hover:bg-primary/5 font-semibold"
                                                        onClick={() => handleOpenPaymentModal(loan)}
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                                                        Bayar Cicilan
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {loans.length === 0 && (
                                    <div className="text-center text-slate-400 py-8 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Belum ada data casbon
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialog Modal Catat Cicilan */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                            <CreditCard className="w-5 h-5 text-primary" />
                            Catat Pembayaran Cicilan
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan nominal cicilan casbon manual untuk {selectedLoan?.employee?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLoan && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1 mt-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Pinjaman:</span>
                                <span className="font-bold text-slate-700">{formatCurrency(Number(selectedLoan.amount))}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Sisa Outstanding:</span>
                                <span className="font-bold text-rose-600">{formatCurrency(getLoanOutstanding(selectedLoan))}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleCreatePayment} className="space-y-4 mt-2">
                        <div>
                            <Label className="text-xs text-slate-500 font-semibold">Nominal Pembayaran <span className="text-red-500">*</span></Label>
                            <CurrencyInput
                                className="mt-1 h-9"
                                placeholder="Contoh: 200.000"
                                value={Number(paymentData.amount) || 0}
                                onChange={(val) => setPaymentData('amount', val.toString())}
                                required
                            />
                            {paymentErrors.amount && <p className="text-xs text-red-500 mt-1 font-semibold">{paymentErrors.amount}</p>}
                        </div>

                        <div>
                            <Label className="text-xs text-slate-500 font-semibold">Tanggal Bayar <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                className="mt-1 h-9"
                                value={paymentData.paid_at}
                                onChange={(e) => setPaymentData('paid_at', e.target.value)}
                                required
                            />
                            {paymentErrors.paid_at && <p className="text-xs text-red-500 mt-1 font-semibold">{paymentErrors.paid_at}</p>}
                        </div>

                        <div>
                            <Label className="text-xs text-slate-500 font-semibold">Catatan</Label>
                            <Input
                                className="mt-1 h-9"
                                placeholder="Misal: Bayar tunai ke kantor..."
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData('notes', e.target.value)}
                            />
                            {paymentErrors.notes && <p className="text-xs text-red-500 mt-1 font-semibold">{paymentErrors.notes}</p>}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" className="h-9" onClick={() => setIsPaymentModalOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={processingPayment} className="h-9">Simpan Pembayaran</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

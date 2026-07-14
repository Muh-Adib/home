import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
    DollarSign,
    Calculator,
    Users,
    Upload,
    Save,
    Calendar,
    Coins,
    Percent,
    AlertCircle,
    CheckCircle2,
    FileSpreadsheet,
    FileText,
    HelpCircle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { apiPostForm } from '@/lib/api';

interface PayrollStaffRow {
    id: number | null;
    user_id: number;
    name: string;
    role: string;
    base_salary: number;
    attendance_days: number;
    absent_days: number;
    late_days: number;
    late_deduction: number;
    loan_deduction: number;
    housekeeping_bonus: number;
    frontdesk_first_night_bonus: number;
    frontdesk_next_nights_bonus_share: number;
    total_salary: number;
    status: 'pending' | 'paid';
    notes: string;
    outstanding_loans: number;
    stored: boolean;
}

interface PayrollProps {
    payrolls: PayrollStaffRow[];
    filters: {
        month: number;
        year: number;
        first_night_rate: number;
        next_night_rate: number;
        housekeeping_rate_per_point: number;
        late_deduction_rate: number;
    };
}

export default function Payroll({ payrolls, filters }: PayrollProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);

    // Rates configuration
    const [firstNightRate, setFirstNightRate] = useState(filters.first_night_rate);
    const [nextNightRate, setNextNightRate] = useState(filters.next_night_rate);
    const [housekeepingRate, setHousekeepingRate] = useState(filters.housekeeping_rate_per_point);
    const [lateDeductionRate, setLateDeductionRate] = useState(filters.late_deduction_rate);

    const [isParsingAttendance, setIsParsingAttendance] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Finance', href: '/admin/finance' },
        { title: 'Sistem Payroll & Gaji' },
    ];

    // Months translation map
    const monthsName = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Local form state representing the staff payroll table rows
    const [staffRows, setStaffRows] = useState<PayrollStaffRow[]>([]);

    useEffect(() => {
        setStaffRows(payrolls);
    }, [payrolls]);

    // Recalculate rates dynamically on configuration changes
    const applyConfigRates = () => {
        router.get(
            route('admin.finance.payroll.index'),
            {
                month: selectedMonth,
                year: selectedYear,
                first_night_rate: firstNightRate,
                next_night_rate: nextNightRate,
                housekeeping_rate_per_point: housekeepingRate,
                late_deduction_rate: lateDeductionRate,
            },
            { preserveState: true }
        );
    };

    // Auto-trigger calculation reload when month/year changes
    useEffect(() => {
        applyConfigRates();
    }, [selectedMonth, selectedYear]);

    // Format currency helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    // Modify a cell value in a staff row and recalculate the total_salary
    const handleCellChange = (userId: number, field: keyof PayrollStaffRow, value: any) => {
        setStaffRows((prevRows) => 
            prevRows.map((row) => {
                if (row.user_id !== userId) return row;

                const updatedRow = { ...row, [field]: value };

                // Ensure numeric fields are correctly parsed
                if (field === 'base_salary') updatedRow.base_salary = parseFloat(value) || 0;
                if (field === 'attendance_days') updatedRow.attendance_days = parseInt(value) || 0;
                if (field === 'absent_days') updatedRow.absent_days = parseInt(value) || 0;
                if (field === 'late_days') {
                    updatedRow.late_days = parseInt(value) || 0;
                    updatedRow.late_deduction = updatedRow.late_days * lateDeductionRate;
                }
                if (field === 'late_deduction') updatedRow.late_deduction = parseFloat(value) || 0;
                if (field === 'loan_deduction') {
                    // Cap loan deduction at outstanding loans
                    const amount = parseFloat(value) || 0;
                    updatedRow.loan_deduction = Math.min(amount, row.outstanding_loans);
                }

                // Math formula: Base + Bonuses - Deductions
                const bonuses = updatedRow.housekeeping_bonus + 
                                updatedRow.frontdesk_first_night_bonus + 
                                updatedRow.frontdesk_next_nights_bonus_share;
                const deductions = updatedRow.late_deduction + updatedRow.loan_deduction;
                
                updatedRow.total_salary = Math.max(0, updatedRow.base_salary + bonuses - deductions);

                return updatedRow;
            })
        );
    };

    // Handle CSV upload for fingerprint machine
    const handleFingerprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingAttendance(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiPostForm<any>('/admin/finance/payroll/attendance', formData);
            if (res.success && res.summary) {
                const summary = res.summary as Array<{ name: string; present_days: number; late_days: number; absent_days: number }>;
                
                let matchCount = 0;
                setStaffRows((prevRows) => 
                    prevRows.map((row) => {
                        // Find matching row in CSV summary (case-insensitive contains)
                        const matchedSummary = summary.find(
                            (item) => item.name.toLowerCase().replace(/\s/g, '').includes(row.name.toLowerCase().replace(/\s/g, '')) ||
                                      row.name.toLowerCase().replace(/\s/g, '').includes(item.name.toLowerCase().replace(/\s/g, ''))
                        );

                        if (matchedSummary) {
                            matchCount++;
                            const updatedRow = {
                                ...row,
                                attendance_days: matchedSummary.present_days,
                                late_days: matchedSummary.late_days,
                                absent_days: matchedSummary.absent_days,
                                late_deduction: matchedSummary.late_days * lateDeductionRate,
                            };

                            const bonuses = updatedRow.housekeeping_bonus + 
                                            updatedRow.frontdesk_first_night_bonus + 
                                            updatedRow.frontdesk_next_nights_bonus_share;
                            const deductions = updatedRow.late_deduction + updatedRow.loan_deduction;

                            updatedRow.total_salary = Math.max(0, updatedRow.base_salary + bonuses - deductions);
                            return updatedRow;
                        }

                        return row;
                    })
                );

                toast.success(`Berhasil mengimpor absensi. ${matchCount} staff berhasil dicocokkan.`);
            } else {
                toast.error('Gagal memproses file absensi.');
            }
        } catch (err) {
            console.error('Attendance parse error:', err);
            toast.error('Error membaca file absensi.');
        } finally {
            setIsParsingAttendance(false);
            // Clear input
            e.target.value = '';
        }
    };

    // Save full payroll dataset to database
    const [isSaving, setIsSaving] = useState(false);
    const handleSavePayroll = () => {
        setIsSaving(true);
        router.post(
            route('admin.finance.payroll.store'),
            {
                month: selectedMonth,
                year: selectedYear,
                payrolls: staffRows,
            },
            {
                onSuccess: () => {
                    toast.success('Laporan payroll berhasil disimpan ke sistem.');
                    setIsSaving(false);
                },
                onError: (err) => {
                    console.error('Save payroll failed:', err);
                    toast.error('Gagal menyimpan laporan payroll.');
                    setIsSaving(false);
                }
            }
        );
    };

    // Total totals summary of all payroll rows
    const totalPayrollSummary = useMemo(() => {
        return staffRows.reduce(
            (acc, curr) => {
                acc.base += curr.base_salary;
                acc.bonuses += curr.housekeeping_bonus + curr.frontdesk_first_night_bonus + curr.frontdesk_next_nights_bonus_share;
                acc.deductions += curr.late_deduction + curr.loan_deduction;
                acc.net += curr.total_salary;
                return acc;
            },
            { base: 0, bonuses: 0, deductions: 0, net: 0 }
        );
    }, [staffRows]);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Sistem Payroll & Gaji" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Coins className="h-6 w-6 text-emerald-600" />
                        Sistem Payroll & Penggajian Karyawan
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Kelola gaji bulanan, bonus frontdesk, poin kerusakan housekeeping, potongan absensi terlambat, dan potongan cicilan casbon.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Month/Year Filter Card */}
                    <Card className="shadow-md">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                Periode Payroll
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bulan</label>
                                    <Select 
                                        value={selectedMonth.toString()} 
                                        onValueChange={(v) => setSelectedMonth(parseInt(v))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthsName.map((m, idx) => (
                                                <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
                                    <Select 
                                        value={selectedYear.toString()} 
                                        onValueChange={(v) => setSelectedYear(parseInt(v))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2025, 2026, 2027].map((y) => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rates Settings Configuration Card */}
                    <Card className="shadow-md lg:col-span-3">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <Calculator className="h-4 w-4 text-slate-400" />
                                Tarif Bonus & Denda Gaji
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">FD Malam Ke-1</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={firstNightRate}
                                            onChange={(e) => setFirstNightRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-8 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">FD Malam Ke-2+</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={nextNightRate}
                                            onChange={(e) => setNextNightRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-8 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Poin HK (Kerusakan)</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={housekeepingRate}
                                            onChange={(e) => setHousekeepingRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-8 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Denda Telambat / Alpa</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={lateDeductionRate}
                                            onChange={(e) => setLateDeductionRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-8 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-3">
                                <Button onClick={applyConfigRates} size="sm" className="bg-slate-800 hover:bg-slate-900 text-xs font-bold">
                                    Simpan & Terapkan Tarif Baru
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Fingerprint CSV Import & Quick Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CSV Uploader */}
                    <Card className="shadow-md bg-slate-50 dark:bg-slate-900/10 border-dashed border-2 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                            <Upload className="h-8 w-8 text-blue-500 mb-2" />
                            <h3 className="text-sm font-bold text-slate-800">Import Data Absensi Karyawan</h3>
                            <p className="text-xs text-slate-400 max-w-xs mb-4">
                                Unggah berkas laporan CSV mesin fingerprint. Sistem akan mencocokkan nama dan menghitung keterlambatan.
                            </p>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFingerprintUpload}
                                    className="hidden"
                                    id="fingerprint-file-input"
                                    disabled={isParsingAttendance}
                                />
                                <Button asChild variant="outline" size="sm" disabled={isParsingAttendance}>
                                    <label htmlFor="fingerprint-file-input" className="cursor-pointer font-bold">
                                        {isParsingAttendance ? 'Sedang Membaca...' : 'Pilih Berkas CSV'}
                                    </label>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Card */}
                    <Card className="shadow-md md:col-span-2 flex flex-col justify-between">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-700">Total Akumulasi Pembayaran Gaji</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Gaji Pokok</span>
                                    <p className="text-base font-black text-slate-800">{formatCurrency(totalPayrollSummary.base)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Bonus</span>
                                    <p className="text-base font-black text-emerald-600">+{formatCurrency(totalPayrollSummary.bonuses)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Potongan</span>
                                    <p className="text-base font-black text-red-500">-{formatCurrency(totalPayrollSummary.deductions)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Gaji Bersih (Net)</span>
                                    <p className="text-lg font-black text-blue-600">{formatCurrency(totalPayrollSummary.net)}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    Perubahan nilai di tabel di bawah akan otomatis memperbarui total gaji bersih.
                                </div>
                                <Button 
                                    onClick={handleSavePayroll} 
                                    disabled={isSaving || staffRows.length === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 shadow-md"
                                >
                                    {isSaving ? 'Menyimpan...' : (
                                        <>
                                            <Save className="h-4 w-4 mr-1.5" />
                                            Simpan & Finalisasi Gaji
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payroll Table */}
                <Card className="shadow-lg overflow-hidden">
                    <CardHeader className="bg-slate-50 p-4 border-b">
                        <CardTitle className="text-base font-black text-slate-800">Daftar Pembayaran Gaji Staff</CardTitle>
                        <CardDescription className="text-xs font-semibold">
                            Tinjau dan sesuaikan parameter gaji di bawah untuk bulan {monthsName[selectedMonth - 1]} {selectedYear}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[1100px]">
                            <TableHeader>
                                <TableRow className="bg-slate-100/50">
                                    <TableHead className="font-bold py-3 pl-6">Nama / Peran</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Pokok</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Kehadiran (Hadir/Late/Alpa)</TableHead>
                                    <TableHead className="font-bold py-3">Denda Terlambat</TableHead>
                                    <TableHead className="font-bold py-3">Poin / Bonus HK</TableHead>
                                    <TableHead className="font-bold py-3">Bonus FD (Mlm 1 / Share)</TableHead>
                                    <TableHead className="font-bold py-3">Potongan Casbon</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Bersih</TableHead>
                                    <TableHead className="font-bold py-3">Status</TableHead>
                                    <TableHead className="font-bold py-3 pr-6">Catatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-slate-400">
                                            Tidak ada staff terdaftar.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffRows.map((row) => (
                                        <TableRow key={row.user_id} className="hover:bg-slate-50/50">
                                            {/* Name / Role */}
                                            <TableCell className="py-3 pl-6">
                                                <div className="font-bold text-slate-800">{row.name}</div>
                                                <Badge variant="secondary" className="capitalize text-[10px] font-bold px-1.5 py-0">
                                                    {row.role.replace('_', ' ')}
                                                </Badge>
                                                {row.stored && (
                                                    <span className="ml-1 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100">
                                                        Saved
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Base Salary */}
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={row.base_salary}
                                                    onChange={(e) => handleCellChange(row.user_id, 'base_salary', e.target.value)}
                                                    className="w-24 h-8 text-xs font-bold"
                                                />
                                            </TableCell>

                                            {/* Attendance details (Present, Late, Absent) */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={row.attendance_days}
                                                        onChange={(e) => handleCellChange(row.user_id, 'attendance_days', e.target.value)}
                                                        className="w-10 h-8 text-center text-xs p-0 font-bold border-emerald-200"
                                                        title="Hadir"
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={row.late_days}
                                                        onChange={(e) => handleCellChange(row.user_id, 'late_days', e.target.value)}
                                                        className="w-10 h-8 text-center text-xs p-0 font-bold border-amber-200"
                                                        title="Terlambat"
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={row.absent_days}
                                                        onChange={(e) => handleCellChange(row.user_id, 'absent_days', e.target.value)}
                                                        className="w-10 h-8 text-center text-xs p-0 font-bold border-red-200"
                                                        title="Alpa"
                                                    />
                                                </div>
                                            </TableCell>

                                            {/* Late Deduction */}
                                            <TableCell className="font-bold text-red-500 text-xs">
                                                {formatCurrency(row.late_deduction)}
                                            </TableCell>

                                            {/* Housekeeping Points & Bonus */}
                                            <TableCell className="text-xs font-medium">
                                                {row.role === 'housekeeping' ? (
                                                    <div>
                                                        <div className="font-black text-slate-800">{formatCurrency(row.housekeeping_bonus)}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold">(Poin kerusakan ter-resolve)</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </TableCell>

                                            {/* Frontdesk Night Bonuses */}
                                            <TableCell className="text-xs font-semibold">
                                                {row.role === 'front_desk' ? (
                                                    <div>
                                                        <div className="text-slate-700">Mlm 1: <span className="font-bold text-slate-900">{formatCurrency(row.frontdesk_first_night_bonus)}</span></div>
                                                        <div className="text-slate-700">Pool: <span className="font-bold text-emerald-600">+{formatCurrency(row.frontdesk_next_nights_bonus_share)}</span></div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </TableCell>

                                            {/* Casbon Deduction */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Input
                                                        type="number"
                                                        value={row.loan_deduction}
                                                        max={row.outstanding_loans}
                                                        onChange={(e) => handleCellChange(row.user_id, 'loan_deduction', e.target.value)}
                                                        className="w-24 h-8 text-xs font-bold text-red-500"
                                                    />
                                                    {row.outstanding_loans > 0 && (
                                                        <div className="text-[9px] text-amber-600 font-bold leading-none">
                                                            Sisa Casbon: {formatCurrency(row.outstanding_loans)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Total Salary (Net) */}
                                            <TableCell className="font-black text-blue-600 text-sm">
                                                {formatCurrency(row.total_salary)}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Select
                                                    value={row.status}
                                                    onValueChange={(val) => handleCellChange(row.user_id, 'status', val)}
                                                >
                                                    <SelectTrigger className="h-8 w-24 text-xs font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">
                                                            <span className="text-amber-500">Pending</span>
                                                        </SelectItem>
                                                        <SelectItem value="paid">
                                                            <span className="text-emerald-500 font-bold">Lunas</span>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            {/* Notes */}
                                            <TableCell className="pr-6">
                                                <Input
                                                    value={row.notes}
                                                    onChange={(e) => handleCellChange(row.user_id, 'notes', e.target.value)}
                                                    placeholder="Catatan..."
                                                    className="w-36 h-8 text-xs"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

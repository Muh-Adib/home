import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
    Coins,
    Calculator,
    Upload,
    Save,
    Calendar,
    AlertCircle,
    Settings,
    Clock,
    UserCheck,
    Loader2,
    Sparkles
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { apiPostForm } from '@/lib/api';

interface PayrollStaffRow {
    id: number | null;
    user_id: number;
    name: string;
    role: string;
    fingerprint_id: string | null;
    shift_start_time: string;
    shift_end_time: string;
    base_salary: number;
    attendance_days: number;
    absent_days: number;
    late_days: number;
    standby_nights: number;
    late_deduction: number;
    loan_deduction: number;
    housekeeping_bonus: number;
    standby_bonus: number;
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
    poolData: {
        eligible_turnover: number;
        total_pool: number;
        total_points: number;
        point_rate: number;
    };
    filters: {
        month: number;
        year: number;
        first_night_rate: number;
        next_night_rate: number;
        housekeeping_rate_per_point: number;
        late_deduction_rate: number;
        standby_rate: number;
    };
}

export default function Payroll({ payrolls, poolData, filters }: PayrollProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);

    // Rates configuration
    const [firstNightRate, setFirstNightRate] = useState(filters.first_night_rate);
    const [nextNightRate, setNextNightRate] = useState(filters.next_night_rate);
    const [housekeepingRate, setHousekeepingRate] = useState(poolData ? poolData.point_rate : filters.housekeeping_rate_per_point);
    const [lateDeductionRate, setLateDeductionRate] = useState(filters.late_deduction_rate);
    const [standbyRate, setStandbyRate] = useState(filters.standby_rate || 50000);

    const [isParsingAttendance, setIsParsingAttendance] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    // User selected for editing shift settings
    const [selectedUserForShift, setSelectedUserForShift] = useState<PayrollStaffRow | null>(null);
    const [tempFingerprintId, setTempFingerprintId] = useState('');
    const [tempShiftStart, setTempShiftStart] = useState('');
    const [tempShiftEnd, setTempShiftEnd] = useState('');
    const [isSavingShift, setIsSavingShift] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Finance', href: '/admin/finance' },
        { title: 'Sistem Payroll & Gaji' },
    ];

    const monthsName = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

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
                standby_rate: standbyRate,
            },
            { preserveState: true }
        );
    };

    useEffect(() => {
        applyConfigRates();
    }, [selectedMonth, selectedYear]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    // Modify a cell value and recalculate
    const handleCellChange = (userId: number, field: keyof PayrollStaffRow, value: any) => {
        setStaffRows((prevRows) => 
            prevRows.map((row) => {
                if (row.user_id !== userId) return row;

                const updatedRow = { ...row, [field]: value };

                if (field === 'base_salary') updatedRow.base_salary = parseFloat(value) || 0;
                if (field === 'attendance_days') updatedRow.attendance_days = parseInt(value) || 0;
                if (field === 'absent_days') updatedRow.absent_days = parseInt(value) || 0;
                if (field === 'late_days') {
                    updatedRow.late_days = parseInt(value) || 0;
                    updatedRow.late_deduction = updatedRow.late_days * lateDeductionRate;
                }
                if (field === 'standby_nights') {
                    updatedRow.standby_nights = parseInt(value) || 0;
                    updatedRow.standby_bonus = updatedRow.standby_nights * standbyRate;
                }
                if (field === 'late_deduction') updatedRow.late_deduction = parseFloat(value) || 0;
                if (field === 'loan_deduction') {
                    const amount = parseFloat(value) || 0;
                    updatedRow.loan_deduction = Math.min(amount, row.outstanding_loans);
                }

                // Math formula: Base + Housekeeping Points + Standby nights + Frontdesk bonuses - Deductions
                const bonuses = updatedRow.housekeeping_bonus + 
                                updatedRow.standby_bonus + 
                                updatedRow.frontdesk_first_night_bonus + 
                                updatedRow.frontdesk_next_nights_bonus_share;
                const deductions = updatedRow.late_deduction + updatedRow.loan_deduction;
                
                updatedRow.total_salary = Math.max(0, updatedRow.base_salary + bonuses - deductions);

                return updatedRow;
            })
        );
    };

    // Handle excel attendance file upload
    const handleFingerprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingAttendance(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiPostForm<any>('/admin/finance/payroll/attendance', formData);
            if (res.success && res.summary) {
                const summary = res.summary as Array<{ 
                    name: string; 
                    fingerprint_id: string;
                    present_days: number; 
                    late_days: number; 
                    absent_days: number;
                    standby_nights: number;
                }>;
                
                let matchCount = 0;
                setStaffRows((prevRows) => 
                    prevRows.map((row) => {
                        // Match by fingerprint_id first, fallback to fuzzy name contains
                        const matchedSummary = summary.find(
                            (item) => (row.fingerprint_id && item.fingerprint_id === row.fingerprint_id) ||
                                      item.name.toLowerCase().replace(/\s/g, '').includes(row.name.toLowerCase().replace(/\s/g, '')) ||
                                      row.name.toLowerCase().replace(/\s/g, '').includes(item.name.toLowerCase().replace(/\s/g, ''))
                        );

                        if (matchedSummary) {
                            matchCount++;
                            const updatedRow = {
                                ...row,
                                attendance_days: matchedSummary.present_days,
                                late_days: matchedSummary.late_days,
                                absent_days: matchedSummary.absent_days,
                                standby_nights: matchedSummary.standby_nights,
                                late_deduction: matchedSummary.late_days * lateDeductionRate,
                                standby_bonus: matchedSummary.standby_nights * standbyRate,
                            };

                            const bonuses = updatedRow.housekeeping_bonus + 
                                            updatedRow.standby_bonus +
                                            updatedRow.frontdesk_first_night_bonus + 
                                            updatedRow.frontdesk_next_nights_bonus_share;
                            const deductions = updatedRow.late_deduction + updatedRow.loan_deduction;

                            updatedRow.total_salary = Math.max(0, updatedRow.base_salary + bonuses - deductions);
                            return updatedRow;
                        }

                        return row;
                    })
                );

                toast.success(`Berhasil mengimpor absensi sidik jari. ${matchCount} staff berhasil dicocokkan.`);
            } else {
                toast.error('Gagal memproses file absensi sidik jari.');
            }
        } catch (err) {
            console.error('Attendance parse error:', err);
            toast.error('Error membaca file absensi.');
        } finally {
            setIsParsingAttendance(false);
            e.target.value = '';
        }
    };

    // Save user shift settings to database
    const handleSaveShiftSettings = () => {
        if (!selectedUserForShift) return;
        setIsSavingShift(true);

        router.post(
            route('admin.finance.payroll.user-settings'),
            {
                user_id: selectedUserForShift.user_id,
                fingerprint_id: tempFingerprintId || null,
                shift_start_time: tempShiftStart,
                shift_end_time: tempShiftEnd,
            },
            {
                onSuccess: () => {
                    toast.success('Pengaturan shift karyawan berhasil diperbarui.');
                    setIsSavingShift(false);
                    setIsShiftModalOpen(false);
                    // Update state locally
                    setStaffRows((prev) => 
                        prev.map((row) => 
                            row.user_id === selectedUserForShift.user_id 
                                ? { ...row, fingerprint_id: tempFingerprintId || null, shift_start_time: tempShiftStart, shift_end_time: tempShiftEnd } 
                                : row
                        )
                    );
                },
                onError: () => {
                    toast.error('Gagal menyimpan pengaturan shift.');
                    setIsSavingShift(false);
                }
            }
        );
    };

    // Save full payroll data
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

    const totalPayrollSummary = useMemo(() => {
        return staffRows.reduce(
            (acc, curr) => {
                acc.base += curr.base_salary;
                acc.bonuses += curr.housekeeping_bonus + curr.standby_bonus + curr.frontdesk_first_night_bonus + curr.frontdesk_next_nights_bonus_share;
                acc.deductions += curr.late_deduction + curr.loan_deduction;
                acc.net += curr.total_salary;
                return acc;
            },
            { base: 0, bonuses: 0, deductions: 0, net: 0 }
        );
    }, [staffRows]);

    const openShiftModal = (row: PayrollStaffRow) => {
        setSelectedUserForShift(row);
        setTempFingerprintId(row.fingerprint_id || '');
        setTempShiftStart(row.shift_start_time || '08:00');
        setTempShiftEnd(row.shift_end_time || '16:00');
        setIsShiftModalOpen(true);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Sistem Payroll & Gaji" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Coins className="h-6 w-6 text-emerald-600" />
                            Sistem Payroll & Penggajian Karyawan
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Kelola gaji bulanan, denda keterlambatan sidik jari, bonus HK/standby, dan potongan cicilan casbon.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Period Card */}
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

                    {/* Sharing Pool Info Banner */}
                    {poolData && (
                        <div className="lg:col-span-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="space-y-1">
                                <div className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                                    Sharing Pool Housekeeping Bulan Ini
                                </div>
                                <p className="text-xs text-blue-600 font-medium">
                                    Total 0.7% omset bersih dari seluruh properti aktif (di luar properti defisit) yang dibagi rata berdasarkan kontribusi poin.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 bg-white/80 p-3 rounded-xl border border-blue-100/50 shrink-0">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Omset Bersih</span>
                                    <span className="text-xs font-black text-slate-800">{formatCurrency(poolData.eligible_turnover)}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sharing Pool (0.7%)</span>
                                    <span className="text-xs font-black text-blue-700">{formatCurrency(poolData.total_pool)}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Poin Karyawan</span>
                                    <span className="text-xs font-black text-slate-800">{poolData.total_points.toFixed(2)} Poin</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nilai Per Poin</span>
                                    <span className="text-xs font-black text-indigo-700">{formatCurrency(poolData.point_rate)} / Pts</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Configuration Card */}
                    <Card className="shadow-md lg:col-span-3">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <Calculator className="h-4 w-4 text-slate-400" />
                                Tarif Bonus & Denda Gaji Karyawan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">FD Malam Ke-1</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={firstNightRate}
                                            onChange={(e) => setFirstNightRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-6 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">FD Malam 2+</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={nextNightRate}
                                            onChange={(e) => setNextNightRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-6 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">HK Poin</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={housekeepingRate}
                                            onChange={(e) => setHousekeepingRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-6 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">HK Jaga Malam</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={standbyRate}
                                            onChange={(e) => setStandbyRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-6 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Denda Telat</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            value={lateDeductionRate}
                                            onChange={(e) => setLateDeductionRate(parseFloat(e.target.value) || 0)}
                                            className="h-8 pl-6 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-3">
                                <Button onClick={applyConfigRates} size="sm" className="bg-slate-800 hover:bg-slate-900 text-xs font-bold">
                                    Simpan & Terapkan Tarif
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Fingerprint XLS Import & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* XLS/CSV Uploader */}
                    <Card className="shadow-md bg-slate-50 dark:bg-slate-900/10 border-dashed border-2 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                            <Upload className="h-8 w-8 text-blue-500 mb-2" />
                            <h3 className="text-sm font-bold text-slate-800">Upload Excel Fingerprint</h3>
                            <p className="text-xs text-slate-400 max-w-xs mb-4">
                                Unggah berkas absensi format **.xls / .xlsx**. Sistem otomatis memilah card rincian jam kehadiran dan shift start staff.
                            </p>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept=".xls,.xlsx,.csv"
                                    onChange={handleFingerprintUpload}
                                    className="hidden"
                                    id="fingerprint-file-input"
                                    disabled={isParsingAttendance}
                                />
                                <Button asChild variant="outline" size="sm" disabled={isParsingAttendance}>
                                    <label htmlFor="fingerprint-file-input" className="cursor-pointer font-bold">
                                        {isParsingAttendance ? 'Membaca Excel...' : 'Pilih File Excel / CSV'}
                                    </label>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Total Card */}
                    <Card className="shadow-md md:col-span-2 flex flex-col justify-between">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-700">Total Akumulasi Pembayaran Gaji Karyawan</CardTitle>
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
                                    Data slip yang lunas akan otomatis memotong sisa pinjaman casbon aktif.
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
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[1250px]">
                            <TableHeader>
                                <TableRow className="bg-slate-100/50">
                                    <TableHead className="font-bold py-3 pl-6">Nama / Shift</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Pokok</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Kehadiran (Hdr/Tlt/Alp)</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Jaga Malam (HK)</TableHead>
                                    <TableHead className="font-bold py-3">Denda Terlambat</TableHead>
                                    <TableHead className="font-bold py-3">Bonus Poin HK</TableHead>
                                    <TableHead className="font-bold py-3">Bonus FD (Mlm 1 / Share)</TableHead>
                                    <TableHead className="font-bold py-3">Potongan Casbon</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Bersih</TableHead>
                                    <TableHead className="font-bold py-3">Status</TableHead>
                                    <TableHead className="font-bold py-3 pr-6">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-32 text-center text-slate-400">
                                            Tidak ada staff terdaftar.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffRows.map((row) => (
                                        <TableRow key={row.user_id} className="hover:bg-slate-50/50">
                                            {/* Name / Role / Shift settings */}
                                            <TableCell className="py-3 pl-6">
                                                <div className="font-bold text-slate-800">{row.name}</div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                    <Badge variant="secondary" className="capitalize text-[9px] font-bold px-1 py-0">
                                                        {row.role.replace('_', ' ')}
                                                    </Badge>
                                                    <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {row.shift_start_time} - {row.shift_end_time}
                                                    </span>
                                                    {row.fingerprint_id && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-200 text-blue-600 bg-blue-50/20 font-bold">
                                                            ID: {row.fingerprint_id}
                                                        </Badge>
                                                    )}
                                                </div>
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

                                            {/* Attendance details */}
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

                                            {/* Jaga Malam Standby Nights (Housekeeping Only) */}
                                            <TableCell className="text-center">
                                                {row.role === 'housekeeping' ? (
                                                    <div className="flex flex-col items-center justify-center space-y-1">
                                                        <Input
                                                            type="number"
                                                            value={row.standby_nights}
                                                            onChange={(e) => handleCellChange(row.user_id, 'standby_nights', e.target.value)}
                                                            className="w-12 h-8 text-center text-xs font-bold border-indigo-200"
                                                        />
                                                        {row.standby_bonus > 0 && (
                                                            <span className="text-[9px] text-indigo-600 font-bold">
                                                                {formatCurrency(row.standby_bonus)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </TableCell>

                                            {/* Late Deduction */}
                                            <TableCell className="font-bold text-red-500 text-xs">
                                                {formatCurrency(row.late_deduction)}
                                            </TableCell>

                                            {/* Housekeeping Points Bonus */}
                                            <TableCell className="text-xs font-medium">
                                                {row.role === 'housekeeping' ? (
                                                    <div>
                                                        <div className="font-black text-slate-800">{formatCurrency(row.housekeeping_bonus)}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold leading-none">Poin kerusakan</div>
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
                                                            Sisa: {formatCurrency(row.outstanding_loans)}
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

                                            {/* Aksi */}
                                            <TableCell className="pr-6">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openShiftModal(row)}
                                                    className="h-8 font-bold text-xs"
                                                >
                                                    <Settings className="h-3.5 w-3.5 mr-1" />
                                                    Shift
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Shift & Fingerprint Settings Modal */}
            <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            Pengaturan Shift & Fingerprint Karyawan
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Sesuaikan jam masuk, jam keluar, dan ID sidik jari untuk staff **{selectedUserForShift?.name}**.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">ID Sidik Jari (Fingerprint ID)</label>
                            <Input
                                placeholder="Masukkan ID Sidik Jari Mesin..."
                                value={tempFingerprintId}
                                onChange={(e) => setTempFingerprintId(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Jam Shift Masuk</label>
                                <Input
                                    type="text"
                                    placeholder="Format e.g. 08:00"
                                    value={tempShiftStart}
                                    onChange={(e) => setTempShiftStart(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Jam Shift Keluar</label>
                                <Input
                                    type="text"
                                    placeholder="Format e.g. 16:00"
                                    value={tempShiftEnd}
                                    onChange={(e) => setTempShiftEnd(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsShiftModalOpen(false)}>
                            Batal
                        </Button>
                        <Button 
                            onClick={handleSaveShiftSettings} 
                            disabled={isSavingShift}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            size="sm"
                        >
                            {isSavingShift ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-1.5" />
                                    Simpan Shift Settings
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

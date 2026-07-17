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
    Sparkles,
    TrendingUp,
    Printer
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
    sick_days: number;
    sick_deduction: number;
    permission_days: number;
    permission_deduction: number;
    absent_deduction: number;
    late_days: number;
    late_hours: number;
    standby_nights: number;
    late_deduction: number;
    loan_deduction: number;
    housekeeping_bonus: number;
    standby_bonus: number;
    frontdesk_first_night_bonus: number;
    frontdesk_next_nights_bonus_share: number;
    overtime_hours: number;
    overtime_bonus: number;
    holiday_days: number;
    total_salary: number;
    status: 'pending' | 'paid';
    notes: string;
    outstanding_loans: number;
    stored: boolean;
    holiday_quota: number;
    expense_id: number | null;
    original_base_salary?: number;
    prorated?: boolean;
    active_employment_days?: number;
    hk_points?: number;
    first_nights_count?: number;
    next_nights_pool_count?: number;
    frontdesk_count?: number;
}

interface PayrollProps {
    payrolls: PayrollStaffRow[];
    wallets: Array<{ id: number; name: string; balance: number }>;
    userShifts: Record<number, Array<{ date: string; shift_start_time: string; shift_end_time: string; is_off_day: boolean }>>;
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
        overtime_rate: number;
        absent_deduction_rate: number;
        sick_deduction_rate: number;
        permission_deduction_rate: number;
    };
}

interface CurrencyInputProps {
    value: number;
    onChange: (val: number) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className = '', placeholder = '', disabled = false }) => {
    const formatNumber = (num: number): string => {
        if (!num && num !== 0) return '';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const parseNumber = (str: string): number => {
        const cleaned = str.replace(/[^0-9]/g, '');
        if (cleaned === '') return 0;
        return parseInt(cleaned, 10);
    };

    const [inputValue, setInputValue] = React.useState(formatNumber(value));

    React.useEffect(() => {
        setInputValue(formatNumber(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const numericStr = val.replace(/[^0-9]/g, '');
        const parsed = parseNumber(numericStr);
        setInputValue(formatNumber(parsed));
        onChange(parsed);
    };

    return (
        <div className="relative flex items-center w-full">
            <span className="absolute left-2.5 text-slate-400 font-bold text-[10px] select-none pointer-events-none">Rp</span>
            <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className={`pl-7 pr-2 font-bold ${className}`}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    );
};

export default function Payroll({ payrolls, wallets, userShifts, poolData, filters }: PayrollProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);

    // Rates configuration
    const [firstNightRate, setFirstNightRate] = useState(filters.first_night_rate);
    const [nextNightRate, setNextNightRate] = useState(filters.next_night_rate);
    const [housekeepingRate, setHousekeepingRate] = useState(poolData ? poolData.point_rate : filters.housekeeping_rate_per_point);
    const [lateDeductionRate, setLateDeductionRate] = useState(filters.late_deduction_rate); // late rate per hour
    const [standbyRate, setStandbyRate] = useState(filters.standby_rate || 50000);
    const [overtimeRate, setOvertimeRate] = useState(filters.overtime_rate || 25000); // overtime rate per hour
    const [absentDeductionRate, setAbsentDeductionRate] = useState(filters.absent_deduction_rate || 100000);
    const [sickDeductionRate, setSickDeductionRate] = useState(filters.sick_deduction_rate || 50000);
    const [permissionDeductionRate, setPermissionDeductionRate] = useState(filters.permission_deduction_rate || 75000);

    const [isParsingAttendance, setIsParsingAttendance] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    // Wallet selection state for payment
    const [selectedWalletId, setSelectedWalletId] = useState<string>('');

    // User selected for editing shift settings
    const [selectedUserForShift, setSelectedUserForShift] = useState<PayrollStaffRow | null>(null);
    const [tempFingerprintId, setTempFingerprintId] = useState('');
    const [tempShiftStart, setTempShiftStart] = useState('');
    const [tempShiftEnd, setTempShiftEnd] = useState('');
    const [tempBaseSalary, setTempBaseSalary] = useState(0);
    const [tempHolidayQuota, setTempHolidayQuota] = useState(4);
    const [isSavingShift, setIsSavingShift] = useState(false);

    const [selectedUserForPrint, setSelectedUserForPrint] = useState<PayrollStaffRow | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const openPrintModal = (row: PayrollStaffRow) => {
        setSelectedUserForPrint(row);
        setIsPrintModalOpen(true);
    };

    const handlePrint = () => {
        if (!selectedUserForPrint) return;
        const printContent = document.getElementById('printable-payslip')?.innerHTML;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Slip Gaji - ${selectedUserForPrint.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        body { padding: 40px; background-color: white; font-family: 'Courier New', Courier, monospace; }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    // Shift planning calendar variables
    const [showDailyShifts, setShowDailyShifts] = useState(false);
    const [dailyShifts, setDailyShifts] = useState<Array<{ date: string; shift_start_time: string; shift_end_time: string; is_off_day: boolean }>>([]);
    const [importedLogs, setImportedLogs] = useState<Record<number, Array<{
        day: number;
        date: string;
        check_in: string;
        check_out: string;
        is_off_day: boolean;
        shift_start: string;
        shift_end: string;
        late_hours: number;
        overtime_hours: number;
    }>>>({});

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
    const handleMonthChange = (monthVal: number) => {
        setSelectedMonth(monthVal);
        router.get(
            route('admin.finance.payroll.index'),
            {
                month: monthVal,
                year: selectedYear,
            },
            { preserveState: false }
        );
    };

    const handleYearChange = (yearVal: number) => {
        setSelectedYear(yearVal);
        router.get(
            route('admin.finance.payroll.index'),
            {
                month: selectedMonth,
                year: yearVal,
            },
            { preserveState: false }
        );
    };
    // Recalculate all rows locally when rates change
    useEffect(() => {
        setStaffRows((prevRows) => 
            prevRows.map((row) => {
                const late_deduction = (Number(row.late_hours) || 0) * lateDeductionRate;
                const overtime_bonus = (Number(row.overtime_hours) || 0) * overtimeRate;
                const sick_deduction = (Number(row.sick_days) || 0) * sickDeductionRate;
                const permission_deduction = (Number(row.permission_days) || 0) * permissionDeductionRate;
                const absent_deduction = (Number(row.absent_days) || 0) * absentDeductionRate;
                const standby_bonus = (Number(row.standby_nights) || 0) * standbyRate;

                // Housekeeping points rate update
                const hkPoints = Number((row as any).hk_points) || 0;
                const housekeeping_bonus = hkPoints * housekeepingRate;

                // Frontdesk reservation bonuses
                const firstNightsCount = Number((row as any).first_nights_count) || 0;
                const nextNightsPoolCount = Number((row as any).next_nights_pool_count) || 0;
                const frontdeskCount = Number((row as any).frontdesk_count) || 0;

                const frontdesk_first_night_bonus = firstNightsCount * firstNightRate;
                const frontdesk_next_nights_bonus_share = frontdeskCount > 0 
                    ? (nextNightsPoolCount * nextNightRate) / frontdeskCount 
                    : 0;

                const bonuses = (Number(housekeeping_bonus) || 0) + 
                                (Number(standby_bonus) || 0) + 
                                (Number(frontdesk_first_night_bonus) || 0) + 
                                (Number(frontdesk_next_nights_bonus_share) || 0) +
                                (Number(overtime_bonus) || 0);

                const deductions = (Number(late_deduction) || 0) + 
                                   (Number(row.loan_deduction) || 0) + 
                                   (Number(sick_deduction) || 0) + 
                                   (Number(permission_deduction) || 0) + 
                                   (Number(absent_deduction) || 0);

                const total_salary = Math.max(0, (Number(row.base_salary) || 0) + bonuses - deductions);

                return {
                    ...row,
                    late_deduction,
                    overtime_bonus,
                    sick_deduction,
                    permission_deduction,
                    absent_deduction,
                    standby_bonus,
                    housekeeping_bonus,
                    frontdesk_first_night_bonus,
                    frontdesk_next_nights_bonus_share,
                    total_salary
                };
            })
        );
    }, [
        firstNightRate,
        nextNightRate,
        housekeepingRate,
        lateDeductionRate,
        standbyRate,
        overtimeRate,
        absentDeductionRate,
        sickDeductionRate,
        permissionDeductionRate
    ]);

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
                if (field === 'holiday_quota') updatedRow.holiday_quota = parseInt(value) || 0;
                if (field === 'attendance_days') updatedRow.attendance_days = parseInt(value) || 0;
                
                if (field === 'absent_days') {
                    updatedRow.absent_days = parseInt(value) || 0;
                    updatedRow.absent_deduction = updatedRow.absent_days * absentDeductionRate;
                }
                if (field === 'sick_days') {
                    updatedRow.sick_days = parseInt(value) || 0;
                    updatedRow.sick_deduction = updatedRow.sick_days * sickDeductionRate;
                }
                if (field === 'permission_days') {
                    updatedRow.permission_days = parseInt(value) || 0;
                    updatedRow.permission_deduction = updatedRow.permission_days * permissionDeductionRate;
                }
                if (field === 'holiday_days') updatedRow.holiday_days = parseInt(value) || 0;

                if (field === 'late_hours') {
                    updatedRow.late_hours = parseFloat(value) || 0;
                    updatedRow.late_deduction = updatedRow.late_hours * lateDeductionRate;
                }
                if (field === 'overtime_hours') {
                    updatedRow.overtime_hours = parseFloat(value) || 0;
                    updatedRow.overtime_bonus = updatedRow.overtime_hours * overtimeRate;
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

                // Math formula: Base + Housekeeping Points + Standby nights + Frontdesk bonuses + Overtime bonus - Deductions (Lateness, Loans, Absences, Sickness, Permission)
                const bonuses = (Number(updatedRow.housekeeping_bonus) || 0) + 
                                (Number(updatedRow.standby_bonus) || 0) + 
                                (Number(updatedRow.frontdesk_first_night_bonus) || 0) + 
                                (Number(updatedRow.frontdesk_next_nights_bonus_share) || 0) +
                                (Number(updatedRow.overtime_bonus) || 0);
                const deductions = (Number(updatedRow.late_deduction) || 0) + 
                                   (Number(updatedRow.loan_deduction) || 0) + 
                                   (Number(updatedRow.sick_deduction) || 0) + 
                                   (Number(updatedRow.permission_deduction) || 0) + 
                                   (Number(updatedRow.absent_deduction) || 0);
                
                updatedRow.total_salary = Math.max(0, (Number(updatedRow.base_salary) || 0) + bonuses - deductions);

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
        formData.append('month', selectedMonth.toString());
        formData.append('year', selectedYear.toString());
        formData.append('late_deduction_rate', lateDeductionRate.toString());
        formData.append('overtime_rate', overtimeRate.toString());
        formData.append('standby_rate', standbyRate.toString());

        try {
            const res = await apiPostForm<any>('/admin/finance/payroll/attendance', formData);
            if (res.success && res.summary) {
                const summary = res.summary as Array<{ 
                    name: string; 
                    fingerprint_id: string;
                    present_days: number; 
                    late_days: number; 
                    late_hours: number;
                    overtime_hours: number;
                    absent_days: number;
                    standby_nights: number;
                    holiday_days: number;
                    days_logs?: any[];
                }>;
                
                const logsMap: Record<number, any[]> = {};
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
                            if (matchedSummary.days_logs) {
                                logsMap[row.user_id] = matchedSummary.days_logs;
                            }
                            const updatedRow = {
                                ...row,
                                attendance_days: matchedSummary.present_days,
                                absent_days: matchedSummary.absent_days,
                                late_days: matchedSummary.late_days,
                                late_hours: matchedSummary.late_hours,
                                overtime_hours: matchedSummary.overtime_hours,
                                standby_nights: matchedSummary.standby_nights,
                                holiday_days: matchedSummary.holiday_days || 0,
                                
                                // Recalculate rates
                                late_deduction: matchedSummary.late_hours * lateDeductionRate,
                                overtime_bonus: matchedSummary.overtime_hours * overtimeRate,
                                standby_bonus: matchedSummary.standby_nights * standbyRate,
                                absent_deduction: matchedSummary.absent_days * absentDeductionRate,
                            };

                            const bonuses = (Number(updatedRow.housekeeping_bonus) || 0) + 
                                            (Number(updatedRow.standby_bonus) || 0) +
                                            (Number(updatedRow.frontdesk_first_night_bonus) || 0) + 
                                            (Number(updatedRow.frontdesk_next_nights_bonus_share) || 0) +
                                            (Number(updatedRow.overtime_bonus) || 0);
                            const deductions = (Number(updatedRow.late_deduction) || 0) + 
                                               (Number(updatedRow.loan_deduction) || 0) +
                                               (Number(updatedRow.sick_deduction) || 0) +
                                               (Number(updatedRow.permission_deduction) || 0) +
                                               (Number(updatedRow.absent_deduction) || 0);

                            updatedRow.total_salary = Math.max(0, (Number(updatedRow.base_salary) || 0) + bonuses - deductions);
                            return updatedRow;
                        }

                        return row;
                    })
                );

                setImportedLogs(logsMap);
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

    // Save user settings (default start/end, default base salary, default holiday quota) and daily shifts
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
                base_salary: tempBaseSalary,
                holiday_quota: tempHolidayQuota,
            },
            {
                onSuccess: () => {
                    // Save custom daily shifts list
                    router.post(
                        route('admin.finance.payroll.shifts'),
                        {
                            user_id: selectedUserForShift.user_id,
                            shifts: dailyShifts,
                        },
                        {
                            onSuccess: () => {
                                toast.success('Jadwal shift & konfigurasi gaji berhasil disimpan.');
                                setIsSavingShift(false);
                                setIsShiftModalOpen(false);
                                // Update local state
                                setStaffRows((prev) => 
                                    prev.map((row) => 
                                        row.user_id === selectedUserForShift.user_id 
                                            ? { ...row, fingerprint_id: tempFingerprintId || null, shift_start_time: tempShiftStart, shift_end_time: tempShiftEnd, base_salary: tempBaseSalary, holiday_quota: tempHolidayQuota } 
                                            : row
                                    )
                                );
                            },
                            onError: () => {
                                toast.error('Gagal menyimpan jadwal shift harian.');
                                setIsSavingShift(false);
                            }
                        }
                    );
                },
                onError: () => {
                    toast.error('Gagal menyimpan pengaturan.');
                    setIsSavingShift(false);
                }
            }
        );
    };

    // Save full payroll data
    const [isSaving, setIsSaving] = useState(false);
    const handleSavePayroll = () => {
        if (!selectedWalletId) {
            toast.error('Pilih rekening sumber pembayaran sebelum finalisasi gaji!');
            return;
        }

        setIsSaving(true);
        router.post(
            route('admin.finance.payroll.store'),
            {
                month: selectedMonth,
                year: selectedYear,
                wallet_id: selectedWalletId,
                payrolls: staffRows as any,
            },
            {
                onSuccess: () => {
                    toast.success('Laporan payroll & pengeluaran operasional berhasil disimpan ke sistem.');
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
                acc.base += Number(curr.base_salary) || 0;
                acc.bonuses += (Number(curr.housekeeping_bonus) || 0) + 
                               (Number(curr.standby_bonus) || 0) + 
                               (Number(curr.frontdesk_first_night_bonus) || 0) + 
                               (Number(curr.frontdesk_next_nights_bonus_share) || 0) + 
                               (Number(curr.overtime_bonus) || 0);
                acc.deductions += (Number(curr.late_deduction) || 0) + 
                                  (Number(curr.loan_deduction) || 0) + 
                                  (Number(curr.sick_deduction) || 0) + 
                                  (Number(curr.permission_deduction) || 0) + 
                                  (Number(curr.absent_deduction) || 0);
                acc.net += Number(curr.total_salary) || 0;
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
        setTempBaseSalary(row.original_base_salary || row.base_salary);
        setTempHolidayQuota(row.holiday_quota || 4);

        // Build daily shifts for selectedMonth and selectedYear
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const existingShifts = userShifts[row.user_id] || [];
        const shiftsList = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const existing = existingShifts.find(s => s.date === dateString);

            shiftsList.push({
                date: dateString,
                shift_start_time: existing?.shift_start_time || row.shift_start_time || '08:00',
                shift_end_time: existing?.shift_end_time || row.shift_end_time || '16:00',
                is_off_day: existing ? existing.is_off_day : new Date(selectedYear, selectedMonth - 1, d).getDay() === 0 // default sunday off
            });
        }

        setDailyShifts(shiftsList);
        setShowDailyShifts(false);
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
                            Kelola gaji bulanan, shift harian staff, potongan absensi/terlambat per jam, bonus lembur, dan integrasi cicilan casbon.
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
                                        onValueChange={(v) => handleMonthChange(parseInt(v))}
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
                                        onValueChange={(v) => handleYearChange(parseInt(v))}
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

                    {/* Fingerprint Upload Card */}
                    <Card className="shadow-md">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <Upload className="h-4 w-4 text-slate-400" />
                                Impor Data Absensi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept=".xls,.xlsx,.csv"
                                    onChange={handleFingerprintUpload}
                                    className="hidden"
                                    id="fingerprint-file-input"
                                    disabled={isParsingAttendance}
                                />
                                <Button asChild variant="outline" size="sm" className="w-full h-9" disabled={isParsingAttendance}>
                                    <label htmlFor="fingerprint-file-input" className="cursor-pointer font-bold flex items-center justify-center gap-1">
                                        {isParsingAttendance ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Membaca...
                                            </>
                                        ) : 'Pilih File Excel / CSV'}
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
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Gaji Pokok</span>
                                    <p className="text-sm font-black text-slate-800">{formatCurrency(totalPayrollSummary.base)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Bonus</span>
                                    <p className="text-sm font-black text-emerald-600">+{formatCurrency(totalPayrollSummary.bonuses)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Potongan</span>
                                    <p className="text-sm font-black text-red-500">-{formatCurrency(totalPayrollSummary.deductions)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Gaji Bersih (Net)</span>
                                    <p className="text-base font-black text-blue-600">{formatCurrency(totalPayrollSummary.net)}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rekening Pembayar (Gaji) <span className="text-red-500">*</span></label>
                                        <select
                                            value={selectedWalletId}
                                            onChange={(e) => setSelectedWalletId(e.target.value)}
                                            className="border border-slate-200 rounded h-9 px-2.5 bg-background text-xs w-48 font-bold focus:ring-1 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">— Pilih Rekening —</option>
                                            {wallets?.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleSavePayroll} 
                                    disabled={isSaving || staffRows.length === 0 || !selectedWalletId}
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 shadow-md h-9"
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
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Omset Gowa</span>
                                    <span className="text-xs font-black text-slate-800">{formatCurrency(poolData.eligible_turnover)}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sharing Pool (0.7%)</span>
                                    <span className="text-xs font-black text-blue-700">{formatCurrency(poolData.total_pool)}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Poin HK</span>
                                    <span className="text-xs font-black text-slate-800">{poolData.total_points.toFixed(2)} Poin</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Per Poin</span>
                                    <span className="text-xs font-black text-indigo-700">{formatCurrency(poolData.point_rate)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Configuration Card */}
                    <Card className="shadow-md lg:col-span-4">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <Calculator className="h-4 w-4 text-slate-400" />
                                Parameter Tarif Lembur, Jaga Malam, Hasil Reservasi & Denda Absensi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Lembur (/Jam)</label>
                                    <CurrencyInput
                                        value={overtimeRate}
                                        onChange={setOvertimeRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Lambat (/Jam)</label>
                                    <CurrencyInput
                                        value={lateDeductionRate}
                                        onChange={setLateDeductionRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Sakit (/Hari)</label>
                                    <CurrencyInput
                                        value={sickDeductionRate}
                                        onChange={setSickDeductionRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Izin (/Hari)</label>
                                    <CurrencyInput
                                        value={permissionDeductionRate}
                                        onChange={setPermissionDeductionRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Alpha (/Hari)</label>
                                    <CurrencyInput
                                        value={absentDeductionRate}
                                        onChange={setAbsentDeductionRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Jaga Malam</label>
                                    <CurrencyInput
                                        value={standbyRate}
                                        onChange={setStandbyRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Poin HK (/Poin)</label>
                                    <CurrencyInput
                                        value={housekeepingRate}
                                        onChange={setHousekeepingRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">FD Reservasi Mlm 1</label>
                                    <CurrencyInput
                                        value={firstNightRate}
                                        onChange={setFirstNightRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">FD Share Mlm 2+</label>
                                    <CurrencyInput
                                        value={nextNightRate}
                                        onChange={setNextNightRate}
                                        className="h-8 text-xs font-bold mt-1"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payroll Table */}
                <Card className="shadow-lg overflow-hidden">
                    <CardHeader className="bg-slate-50 p-4 border-b">
                        <CardTitle className="text-base font-black text-slate-800">Daftar Rincian & Kalkulasi Gaji Karyawan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[1450px]">
                            <TableHeader>
                                <TableRow className="bg-slate-100/50">
                                    <TableHead className="font-bold py-3 pl-6">Nama / Info Shift</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Pokok</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Kehadiran (Hdr / Skt / Ijn / Alp / Lbr)</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Keterlambatan (Jam)</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Lembur (Jam)</TableHead>
                                    <TableHead className="font-bold py-3 text-center">Jaga Malam (HK)</TableHead>
                                    <TableHead className="font-bold py-3">Bonus Poin HK</TableHead>
                                    <TableHead className="font-bold py-3">Bonus FD (Mlm 1 / Share)</TableHead>
                                    <TableHead className="font-bold py-3">Daftar Potongan</TableHead>
                                    <TableHead className="font-bold py-3">Gaji Bersih</TableHead>
                                    <TableHead className="font-bold py-3">Status</TableHead>
                                    <TableHead className="font-bold py-3 pr-6 text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-32 text-center text-slate-400">
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
                                                    {row.holiday_quota !== null && (
                                                        <span className="text-[9px] text-slate-400 font-bold">
                                                            Quota Off: {row.holiday_quota} Hari
                                                        </span>
                                                    )}
                                                    {row.fingerprint_id && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-200 text-blue-600 bg-blue-50/20 font-bold">
                                                            ID: {row.fingerprint_id}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Base Salary */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <CurrencyInput
                                                        value={row.base_salary}
                                                        onChange={(val) => handleCellChange(row.user_id, 'base_salary', val)}
                                                        className="w-32 h-8 text-xs font-bold"
                                                    />
                                                    {row.prorated && (
                                                        <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded border border-blue-100 w-fit" title={`Diproporsikan karena masa kerja aktif: ${row.active_employment_days} hari kerja`}>
                                                            Prorata ({row.active_employment_days}/26 Hari)
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Attendance details (Hdr / Skt / Ijn / Alp / Lbr) */}
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Input
                                                            type="number"
                                                            value={row.attendance_days}
                                                            onChange={(e) => handleCellChange(row.user_id, 'attendance_days', e.target.value)}
                                                            className="w-8 h-8 text-center text-xs p-0 font-bold border-emerald-200"
                                                            title="Hadir"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={row.sick_days}
                                                            onChange={(e) => handleCellChange(row.user_id, 'sick_days', e.target.value)}
                                                            className="w-8 h-8 text-center text-xs p-0 font-bold border-yellow-200"
                                                            title="Sakit"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={row.permission_days}
                                                            onChange={(e) => handleCellChange(row.user_id, 'permission_days', e.target.value)}
                                                            className="w-8 h-8 text-center text-xs p-0 font-bold border-sky-200"
                                                            title="Izin"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={row.absent_days}
                                                            onChange={(e) => handleCellChange(row.user_id, 'absent_days', e.target.value)}
                                                            className="w-8 h-8 text-center text-xs p-0 font-bold border-rose-200"
                                                            title="Alpa"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={row.holiday_days}
                                                            onChange={(e) => handleCellChange(row.user_id, 'holiday_days', e.target.value)}
                                                            className="w-8 h-8 text-center text-xs p-0 font-bold border-slate-200"
                                                            title="Libur"
                                                        />
                                                    </div>
                                                    {importedLogs[row.user_id] && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => openShiftModal(row)}
                                                            className="text-[9px] text-emerald-600 hover:text-emerald-700 font-black tracking-wide hover:underline cursor-pointer flex items-center gap-0.5"
                                                        >
                                                            <Clock className="w-2.5 h-2.5" /> Lihat Rincian Harian
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Late Hours */}
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        value={row.late_hours}
                                                        onChange={(e) => handleCellChange(row.user_id, 'late_hours', e.target.value)}
                                                        className="w-14 h-8 text-center text-xs font-bold border-amber-200"
                                                        title="Jam Terlambat"
                                                    />
                                                    {row.late_deduction > 0 && (
                                                        <span className="text-[10px] text-red-500 font-bold">
                                                            -{formatCurrency(row.late_deduction)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Overtime Hours */}
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        value={row.overtime_hours}
                                                        onChange={(e) => handleCellChange(row.user_id, 'overtime_hours', e.target.value)}
                                                        className="w-14 h-8 text-center text-xs font-bold border-emerald-200"
                                                        title="Jam Lembur"
                                                    />
                                                    {row.overtime_bonus > 0 && (
                                                        <span className="text-[10px] text-emerald-600 font-bold">
                                                            +{formatCurrency(row.overtime_bonus)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Jaga Malam Standby Nights */}
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

                                            {/* Deductions breakdown & loans */}
                                            <TableCell className="text-xs font-semibold">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase w-10">Casbon:</span>
                                                        <CurrencyInput
                                                            value={row.loan_deduction}
                                                            onChange={(val) => handleCellChange(row.user_id, 'loan_deduction', val)}
                                                            className="w-28 h-7 text-xs font-bold text-red-500"
                                                        />
                                                    </div>
                                                    {row.outstanding_loans > 0 && (
                                                        <div className="text-[9px] text-amber-600 font-bold leading-none mb-1">
                                                            Sisa Pinjaman: {formatCurrency(row.outstanding_loans)}
                                                        </div>
                                                    )}
                                                    {(row.sick_deduction > 0 || row.permission_deduction > 0 || row.absent_deduction > 0) && (
                                                        <div className="text-[9px] text-slate-500 space-y-0.5 border-t pt-1">
                                                            {row.sick_deduction > 0 && <div>Sakit: -{formatCurrency(row.sick_deduction)}</div>}
                                                            {row.permission_deduction > 0 && <div>Izin: -{formatCurrency(row.permission_deduction)}</div>}
                                                            {row.absent_deduction > 0 && <div>Alpha: -{formatCurrency(row.absent_deduction)}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Total Salary (Net) */}
                                            <TableCell className="font-black text-blue-600 text-xs">
                                                {formatCurrency(row.total_salary)}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Select
                                                    value={row.status}
                                                    onValueChange={(val) => handleCellChange(row.user_id, 'status', val)}
                                                    disabled={row.expense_id !== null}
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
                                            <TableCell className="pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openShiftModal(row)}
                                                        className="h-8 font-bold text-xs rounded-xl"
                                                    >
                                                        <Settings className="h-3.5 w-3.5 mr-1" />
                                                        Atur Gaji/Shift
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openPrintModal(row)}
                                                        className="h-8 font-bold text-xs rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Printer className="h-3.5 w-3.5 mr-1" />
                                                        Cetak Slip
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Shift & Wage Settings Modal */}
            <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Clock className="h-5 w-5 text-blue-600" />
                            Konfigurasi Gaji Pokok & Shift Karyawan
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Sesuaikan gaji pokok bulanan, kuota cuti/libur, dan jadwal shift harian untuk staff **{selectedUserForShift?.name}**.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Gaji Pokok Bulanan</label>
                                <CurrencyInput
                                    placeholder="Gaji pokok..."
                                    value={tempBaseSalary}
                                    onChange={setTempBaseSalary}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Kuota Libur Bulanan (Hari)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Jatah libur..."
                                    value={tempHolidayQuota}
                                    onChange={(e) => setTempHolidayQuota(parseInt(e.target.value) || 0)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1 col-span-1">
                                <label className="text-xs font-bold text-slate-500">ID Sidik Jari</label>
                                <Input
                                    placeholder="ID Mesin..."
                                    value={tempFingerprintId}
                                    onChange={(e) => setTempFingerprintId(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Shift Masuk Default</label>
                                <Input
                                    placeholder="08:00"
                                    value={tempShiftStart}
                                    onChange={(e) => setTempShiftStart(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Shift Keluar Default</label>
                                <Input
                                    placeholder="16:00"
                                    value={tempShiftEnd}
                                    onChange={(e) => setTempShiftEnd(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {/* Collapsible Daily Shifts Scheduler */}
                        <div className="border-t pt-3 mt-3">
                            {showDailyShifts ? (
                                <div className="space-y-2.5 max-h-60 overflow-y-auto border border-slate-200 p-3 rounded-lg bg-slate-50">
                                    <div className="flex justify-between items-center pb-1.5 border-b">
                                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Jadwal Shift Harian ({monthsName[selectedMonth - 1]} {selectedYear})</h4>
                                        <Button type="button" variant="ghost" className="h-5 text-[9px] px-1" onClick={() => setShowDailyShifts(false)}>Sembunyikan</Button>
                                    </div>
                                    {dailyShifts.map((ds, idx) => {
                                        const dateObj = new Date(ds.date);
                                        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
                                        return (
                                            <div key={ds.date} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 text-xs">
                                                <span className="font-bold text-slate-600">{dayName}, {dateObj.getDate()} {monthsName[selectedMonth - 1]}</span>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-1 cursor-pointer font-semibold text-slate-500 text-[11px]">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={ds.is_off_day} 
                                                            onChange={(e) => {
                                                                setDailyShifts(prev => prev.map((s, i) => i === idx ? { ...s, is_off_day: e.target.checked } : s));
                                                            }}
                                                            className="rounded border-slate-300"
                                                        />
                                                        <span>Off</span>
                                                    </label>
                                                    {!ds.is_off_day && (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text" 
                                                                value={ds.shift_start_time} 
                                                                onChange={(e) => {
                                                                    setDailyShifts(prev => prev.map((s, i) => i === idx ? { ...s, shift_start_time: e.target.value } : s));
                                                                }}
                                                                className="w-12 h-6 border border-slate-200 rounded text-center text-[10px] font-bold"
                                                            />
                                                            <span className="text-slate-400">-</span>
                                                            <input 
                                                                type="text" 
                                                                value={ds.shift_end_time} 
                                                                onChange={(e) => {
                                                                    setDailyShifts(prev => prev.map((s, i) => i === idx ? { ...s, shift_end_time: e.target.value } : s));
                                                                }}
                                                                className="w-12 h-6 border border-slate-200 rounded text-center text-[10px] font-bold"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs h-8 text-primary border-primary/20 hover:bg-primary/5 font-semibold" onClick={() => setShowDailyShifts(true)}>
                                    <Calendar className="w-3.5 h-3.5 mr-1" />
                                    Atur Shift Harian Tanggal Off...
                                </Button>
                            )}
                        </div>

                        {/* Detail Jam Hadir Sidik Jari (Hasil Import) */}
                        {selectedUserForShift && importedLogs[selectedUserForShift.user_id] && (
                            <div className="border-t pt-3 mt-3">
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Detail Jam Hadir Sidik Jari ({monthsName[selectedMonth - 1]})
                                </h4>
                                <div className="max-h-52 overflow-y-auto border border-emerald-100 rounded-lg p-2 bg-emerald-50/20 text-[10px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-emerald-100/50 text-slate-400 font-bold uppercase text-[9px]">
                                                <th className="pb-1.5">Tgl</th>
                                                <th className="pb-1.5">Masuk</th>
                                                <th className="pb-1.5">Keluar</th>
                                                <th className="pb-1.5">Shift</th>
                                                <th className="pb-1.5 text-right">Lembur</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedLogs[selectedUserForShift.user_id].map((log) => (
                                                <tr key={log.date} className="border-b border-slate-100/30 hover:bg-emerald-50/30">
                                                    <td className="py-1 font-bold text-slate-600">{log.day}</td>
                                                    <td className="py-1 font-semibold text-slate-700">{log.check_in}</td>
                                                    <td className="py-1 font-semibold text-slate-700">{log.check_out}</td>
                                                    <td className="py-1 text-slate-400">
                                                        {log.is_off_day ? 'Off' : `${log.shift_start}-${log.shift_end}`}
                                                    </td>
                                                    <td className="py-1 text-right font-bold text-emerald-600">
                                                        {log.overtime_hours > 0 ? `+${log.overtime_hours} jam` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsShiftModalOpen(false)}>
                            Batal
                        </Button>
                        <Button 
                            onClick={handleSaveShiftSettings} 
                            disabled={isSavingShift}
                            className="font-bold text-xs h-8 shadow-sm"
                            size="sm"
                        >
                            {isSavingShift ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-1.5" />
                                    Simpan Pengaturan
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Print Slip Dialog */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="max-w-2xl bg-white shadow-xl rounded-2xl p-6 border-0">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                            <Printer className="h-5 w-5 text-blue-600" />
                            Cetak Slip Gaji Karyawan
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Pratinjau slip gaji resmi untuk karyawan **{selectedUserForPrint?.name}**.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUserForPrint && (
                        <div className="py-2">
                            <div 
                                id="printable-payslip" 
                                className="p-6 border border-slate-200 rounded-xl bg-white text-slate-800 space-y-6"
                                style={{ fontFamily: "'Courier New', Courier, monospace" }}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                                    <div>
                                        <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">ANTIGRAVITY HOME</h2>
                                        <p className="text-[10px] text-slate-500 font-bold">Lombok, NTB, Indonesia</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Sistem Payroll Homestay Dev</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-base font-black text-slate-800 uppercase">SLIP GAJI BULANAN</h3>
                                        <p className="text-[10px] text-slate-500 font-bold">Periode: {monthsName[selectedMonth - 1]} {selectedYear}</p>
                                    </div>
                                </div>

                                {/* Employee Details */}
                                <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div>
                                        <table className="w-full">
                                            <tbody>
                                                <tr>
                                                    <td className="font-bold py-0.5 w-24 text-slate-500 uppercase">Karyawan</td>
                                                    <td className="py-0.5 font-bold text-slate-800">: {selectedUserForPrint.name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-bold py-0.5 text-slate-500 uppercase">Fingerprint</td>
                                                    <td className="py-0.5 font-bold text-slate-800">: {selectedUserForPrint.fingerprint_id || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-bold py-0.5 text-slate-500 uppercase">Jabatan</td>
                                                    <td className="py-0.5 font-bold text-slate-800">: {selectedUserForPrint.role.toUpperCase().replace('_', ' ')}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <table className="w-full">
                                            <tbody>
                                                <tr>
                                                    <td className="font-bold py-0.5 w-28 text-slate-500 uppercase">Hari Aktif Kerja</td>
                                                    <td className="py-0.5 font-bold text-slate-800">: {selectedUserForPrint.active_employment_days ?? 26} Hari</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-bold py-0.5 text-slate-500 uppercase">Hari Kehadiran</td>
                                                    <td className="py-0.5 font-bold text-slate-800">: {selectedUserForPrint.attendance_days} Hari</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-bold py-0.5 text-slate-500 uppercase">Status Gaji</td>
                                                    <td className="py-0.5 font-bold text-slate-800">
                                                        : <span className={selectedUserForPrint.status === 'paid' ? 'text-emerald-600 uppercase font-black' : 'text-amber-500 uppercase font-black'}>
                                                            {selectedUserForPrint.status === 'paid' ? 'LUNAS' : 'PENDING'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Earnings & Deductions Tables */}
                                <div className="grid grid-cols-2 gap-6 pt-2">
                                    {/* Earnings */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider">Penerimaan (Earnings)</h4>
                                        <table className="w-full text-[10px]">
                                            <tbody>
                                                <tr>
                                                    <td className="py-1 text-slate-600 font-bold">Gaji Pokok {selectedUserForPrint.prorated ? '(Prorata)' : ''}</td>
                                                    <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.base_salary)}</td>
                                                </tr>
                                                {selectedUserForPrint.overtime_bonus > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Uang Lembur ({selectedUserForPrint.overtime_hours} Jam)</td>
                                                        <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.overtime_bonus)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.standby_bonus > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Bonus Jaga Malam ({selectedUserForPrint.standby_nights} Mlm)</td>
                                                        <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.standby_bonus)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.housekeeping_bonus > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Bonus Poin HK ({selectedUserForPrint.hk_points} Poin)</td>
                                                        <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.housekeeping_bonus)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.frontdesk_first_night_bonus > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Bonus FD Mlm 1</td>
                                                        <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.frontdesk_first_night_bonus)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.frontdesk_next_nights_bonus_share > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Bonus Share Mlm 2+</td>
                                                        <td className="py-1 text-right font-bold text-slate-800">{formatCurrency(selectedUserForPrint.frontdesk_next_nights_bonus_share)}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Deductions */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider">Potongan (Deductions)</h4>
                                        <table className="w-full text-[10px]">
                                            <tbody>
                                                {selectedUserForPrint.late_deduction > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Denda Lambat ({selectedUserForPrint.late_hours} Jam)</td>
                                                        <td className="py-1 text-right text-rose-600 font-bold">-{formatCurrency(selectedUserForPrint.late_deduction)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.sick_deduction > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Potongan Sakit ({selectedUserForPrint.sick_days} Hari)</td>
                                                        <td className="py-1 text-right text-rose-600 font-bold">-{formatCurrency(selectedUserForPrint.sick_deduction)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.permission_deduction > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Potongan Izin ({selectedUserForPrint.permission_days} Hari)</td>
                                                        <td className="py-1 text-right text-rose-600 font-bold">-{formatCurrency(selectedUserForPrint.permission_deduction)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.absent_deduction > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Potongan Alpha ({selectedUserForPrint.absent_days} Hari)</td>
                                                        <td className="py-1 text-right text-rose-600 font-bold">-{formatCurrency(selectedUserForPrint.absent_deduction)}</td>
                                                    </tr>
                                                )}
                                                {selectedUserForPrint.loan_deduction > 0 && (
                                                    <tr>
                                                        <td className="py-1 text-slate-600 font-bold">Potongan Kasbon (Loan)</td>
                                                        <td className="py-1 text-right text-rose-600 font-bold">-{formatCurrency(selectedUserForPrint.loan_deduction)}</td>
                                                    </tr>
                                                )}
                                                {!(selectedUserForPrint.late_deduction > 0 || selectedUserForPrint.sick_deduction > 0 || selectedUserForPrint.permission_deduction > 0 || selectedUserForPrint.absent_deduction > 0 || selectedUserForPrint.loan_deduction > 0) && (
                                                    <tr>
                                                        <td className="py-1 text-slate-400 italic">Tidak ada potongan</td>
                                                        <td className="py-1 text-right text-slate-500 font-bold">Rp 0</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Summary / Total Salary */}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-300 border-dashed">
                                    <span className="text-xs font-black text-slate-950 uppercase tracking-wider">GAJI BERSIH (NET PAY)</span>
                                    <span className="text-base font-black text-blue-600">{formatCurrency(selectedUserForPrint.total_salary)}</span>
                                </div>

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-4 pt-8 text-[9px]">
                                    <div className="text-center space-y-12">
                                        <p className="text-slate-500 font-bold">Penerima,</p>
                                        <div className="border-t border-slate-300 w-28 mx-auto pt-1 font-bold text-slate-700 uppercase">{selectedUserForPrint.name}</div>
                                    </div>
                                    <div className="text-center space-y-12">
                                        <p className="text-slate-500 font-bold">Dibuat oleh,</p>
                                        <div className="border-t border-slate-300 w-28 mx-auto pt-1 font-bold text-slate-700 uppercase">FINANCE DEPT</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)} className="rounded-xl">
                            Tutup
                        </Button>
                        <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm">
                            <Printer className="h-4 w-4 mr-1.5" />
                            Cetak / Download PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
    Coins,
    Calculator,
    Upload,
    Save,
    Calendar as CalendarIcon,
    AlertCircle,
    Settings,
    Clock,
    UserCheck,
    Loader2,
    Sparkles,
    TrendingUp,
    Printer,
    CheckCircle2,
    History,
    RefreshCw,
    ShieldCheck,
    CreditCard,
    Edit,
    CalendarCheck,
    SlidersHorizontal,
    PlusCircle,
    MinusCircle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { apiPostForm } from '@/lib/api';

interface PayrollStaffRow {
    id: number | null;
    user_id: number;
    name: string;
    role: string;
    fingerprint_id: string | null;
    version?: number;
    batch_id?: string | null;
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
    performance_bonus: number;
    custom_allowance: number;
    custom_deduction: number;
    custom_allowance_reason?: string;
    custom_deduction_reason?: string;
    overtime_hours: number;
    overtime_bonus: number;
    holiday_days: number;
    total_salary: number;
    status: 'draft' | 'generated' | 'reviewed' | 'approved' | 'paid' | 'archived';
    notes: string;
    outstanding_loans: number;
    stored: boolean;
    expense_id: number | null;
    original_base_salary?: number;
    prorated?: boolean;
    active_employment_days?: number;
    bonus_finalized?: boolean;
    hk_points?: number;
    first_nights_count?: number;
    next_nights_pool_count?: number;
    frontdesk_count?: number;
    join_date?: string | null;
    resign_date?: string | null;
    holiday_quota?: number;
}

interface DailyShiftItem {
    date: string;
    day: number;
    shift_start_time: string;
    shift_end_time: string;
    is_off_day: boolean;
}

interface PayrollProps {
    payrolls: PayrollStaffRow[];
    wallets: Array<{ id: number; name: string; balance: number }>;
    userShifts: Record<number, Array<{ date: string; shift_start_time: string; shift_end_time: string; is_off_day: boolean }>>;
    versions: Array<{ version: number; batch_id: string; is_active: boolean; status: string; created_at: string }>;
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
        housekeeping_bonus_mode?: string;
        housekeeping_rate_per_point?: number;
        housekeeping_fixed_pool?: number;
        housekeeping_pool_percentage?: number;
        housekeeping_max_cap?: number;
        late_deduction_rate: number;
        standby_rate: number;
        overtime_rate: number;
        absent_deduction_rate: number;
        sick_deduction_rate: number;
        permission_deduction_rate: number;
        follow_up_rate?: number;
        creation_rate?: number;
        proration_standard_days?: number;
    };
}

export default function Payroll({ payrolls, wallets, userShifts, versions, poolData, filters }: PayrollProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);

    // Rates configuration state
    const [firstNightRate, setFirstNightRate] = useState(filters.first_night_rate || 1000);
    const [nextNightRate, setNextNightRate] = useState(filters.next_night_rate || 1000);
    const [housekeepingBonusMode, setHousekeepingBonusMode] = useState(filters.housekeeping_bonus_mode || 'rate_per_point');
    const [housekeepingRate, setHousekeepingRate] = useState(filters.housekeeping_rate_per_point || 2000);
    const [housekeepingFixedPool, setHousekeepingFixedPool] = useState(filters.housekeeping_fixed_pool || 1500000);
    const [housekeepingPoolPercentage, setHousekeepingPoolPercentage] = useState(filters.housekeeping_pool_percentage || 5.0);
    const [housekeepingMaxCap, setHousekeepingMaxCap] = useState(filters.housekeeping_max_cap || 1500000);

    const [lateDeductionRate, setLateDeductionRate] = useState(filters.late_deduction_rate || 20000);
    const [standbyRate, setStandbyRate] = useState(filters.standby_rate || 50000);
    const [overtimeRate, setOvertimeRate] = useState(filters.overtime_rate || 25000);
    const [absentDeductionRate, setAbsentDeductionRate] = useState(filters.absent_deduction_rate || 100000);
    const [sickDeductionRate, setSickDeductionRate] = useState(filters.sick_deduction_rate || 50000);
    const [permissionDeductionRate, setPermissionDeductionRate] = useState(filters.permission_deduction_rate || 75000);
    const [followUpRate, setFollowUpRate] = useState(filters.follow_up_rate || 1000);
    const [creationRate, setCreationRate] = useState(filters.creation_rate || 1000);
    const [prorationStandardDays, setProrationStandardDays] = useState(filters.proration_standard_days || 26);

    const [isParsingAttendance, setIsParsingAttendance] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState<string>('');

    const [selectedUserForPrint, setSelectedUserForPrint] = useState<PayrollStaffRow | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);

    // HR Staff Salary & Shift Modal state
    const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<PayrollStaffRow | null>(null);
    const [staffBaseSalary, setStaffBaseSalary] = useState(0);
    const [staffFingerprintId, setStaffFingerprintId] = useState('');
    const [staffShiftStart, setStaffShiftStart] = useState('08:00');
    const [staffShiftEnd, setStaffShiftEnd] = useState('16:00');
    const [staffJoinDate, setStaffJoinDate] = useState('');
    const [staffResignDate, setStaffResignDate] = useState('');
    const [staffHolidayQuota, setStaffHolidayQuota] = useState(4);
    const [isUpdatingUserSettings, setIsUpdatingUserSettings] = useState(false);

    // Modal Penyesuaian Gaji Khusus (Penambahan & Pengurangan Manual)
    const [isCustomAdjustmentModalOpen, setIsCustomAdjustmentModalOpen] = useState(false);
    const [adjustingStaffIndex, setAdjustingStaffIndex] = useState<number | null>(null);
    const [customAllowanceInput, setCustomAllowanceInput] = useState(0);
    const [customAllowanceReasonInput, setCustomAllowanceReasonInput] = useState('');
    const [customDeductionInput, setCustomDeductionInput] = useState(0);
    const [customDeductionReasonInput, setCustomDeductionReasonInput] = useState('');

    // Monthly Daily Shift Calendar Modal State
    const [isShiftCalendarModalOpen, setIsShiftCalendarModalOpen] = useState(false);
    const [selectedShiftStaff, setSelectedShiftStaff] = useState<PayrollStaffRow | null>(null);
    const [dailyShifts, setDailyShifts] = useState<DailyShiftItem[]>([]);
    const [isSavingShifts, setIsSavingShifts] = useState(false);

    const [isGeneratingBonuses, setIsGeneratingBonuses] = useState(false);
    const [isSavingRates, setIsSavingRates] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

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

    const activeVersion = useMemo(() => {
        return staffRows[0]?.version || 1;
    }, [staffRows]);

    const activeStatus = useMemo(() => {
        return staffRows[0]?.status || 'draft';
    }, [staffRows]);

    const handleMonthChange = (monthVal: number) => {
        setSelectedMonth(monthVal);
        router.get(route('admin.finance.payroll.index'), { month: monthVal, year: selectedYear }, { preserveState: false });
    };

    const handleYearChange = (yearVal: number) => {
        setSelectedYear(yearVal);
        router.get(route('admin.finance.payroll.index'), { month: selectedMonth, year: yearVal }, { preserveState: false });
    };

    const openCustomAdjustmentModal = (index: number) => {
        const staff = staffRows[index];
        setAdjustingStaffIndex(index);
        setCustomAllowanceInput(staff.custom_allowance || 0);
        setCustomAllowanceReasonInput(staff.custom_allowance_reason || '');
        setCustomDeductionInput(staff.custom_deduction || 0);
        setCustomDeductionReasonInput(staff.custom_deduction_reason || '');
        setIsCustomAdjustmentModalOpen(true);
    };

    const handleSaveCustomAdjustment = () => {
        if (adjustingStaffIndex === null) return;

        setStaffRows((prev) => {
            const updated = [...prev];
            const item = { ...updated[adjustingStaffIndex] };

            item.custom_allowance = customAllowanceInput;
            item.custom_allowance_reason = customAllowanceReasonInput;
            item.custom_deduction = customDeductionInput;
            item.custom_deduction_reason = customDeductionReasonInput;

            const base = Number(item.base_salary) || 0;
            const bonuses = (Number(item.housekeeping_bonus) || 0) + 
                            (Number(item.standby_bonus) || 0) + 
                            (Number(item.frontdesk_first_night_bonus) || 0) + 
                            (Number(item.frontdesk_next_nights_bonus_share) || 0) + 
                            (Number(item.performance_bonus) || 0) + 
                            (Number(item.overtime_bonus) || 0) + 
                            Number(item.custom_allowance);

            const deductions = (Number(item.late_deduction) || 0) + 
                               (Number(item.loan_deduction) || 0) + 
                               (Number(item.sick_deduction) || 0) + 
                               (Number(item.permission_deduction) || 0) + 
                               (Number(item.absent_deduction) || 0) + 
                               Number(item.custom_deduction);

            item.total_salary = maxZero(base + bonuses - deductions);
            updated[adjustingStaffIndex] = item;
            return updated;
        });

        toast.success('Penyesuaian gaji khusus (penambahan & pengurangan) berhasil diperbarui di draft payroll.');
        setIsCustomAdjustmentModalOpen(false);
    };

    const maxZero = (val: number) => (val > 0 ? val : 0);

    const openUserSettingsModal = (row: PayrollStaffRow) => {
        setEditingStaff(row);
        setStaffBaseSalary(row.original_base_salary || row.base_salary || 0);
        setStaffFingerprintId(row.fingerprint_id || '');
        setStaffShiftStart(row.shift_start_time || '08:00');
        setStaffShiftEnd(row.shift_end_time || '16:00');
        setStaffJoinDate(row.join_date ? row.join_date.substring(0, 10) : '');
        setStaffResignDate(row.resign_date ? row.resign_date.substring(0, 10) : '');
        setStaffHolidayQuota(row.holiday_quota || 4);
        setIsUserSettingsModalOpen(true);
    };

    const openShiftCalendarModal = (row: PayrollStaffRow) => {
        setSelectedShiftStaff(row);
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const existingShifts = userShifts[row.user_id] || [];

        const generatedShifts: DailyShiftItem[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const found = existingShifts.find((s) => s.date === dateStr);

            generatedShifts.push({
                date: dateStr,
                day: d,
                shift_start_time: found ? found.shift_start_time : row.shift_start_time || '08:00',
                shift_end_time: found ? found.shift_end_time : row.shift_end_time || '16:00',
                is_off_day: found ? Boolean(found.is_off_day) : false,
            });
        }

        setDailyShifts(generatedShifts);
        setIsShiftCalendarModalOpen(true);
    };

    const toggleOffDay = (index: number) => {
        setDailyShifts((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], is_off_day: !updated[index].is_off_day };
            return updated;
        });
    };

    const updateShiftTime = (index: number, start: string, end: string) => {
        setDailyShifts((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], shift_start_time: start, shift_end_time: end };
            return updated;
        });
    };

    const handleSaveDailyShifts = () => {
        if (!selectedShiftStaff) return;
        setIsSavingShifts(true);

        router.post(
            route('admin.finance.payroll.shifts'),
            {
                user_id: selectedShiftStaff.user_id,
                shifts: dailyShifts.map((s) => ({
                    date: s.date,
                    shift_start_time: s.shift_start_time,
                    shift_end_time: s.shift_end_time,
                    is_off_day: s.is_off_day,
                })),
            },
            {
                onSuccess: () => {
                    toast.success(`Jadwal shift harian untuk ${selectedShiftStaff.name} berhasil disimpan.`);
                    setIsShiftCalendarModalOpen(false);
                    setIsSavingShifts(false);
                    router.reload();
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Gagal menyimpan jadwal shift harian.');
                    setIsSavingShifts(false);
                }
            }
        );
    };

    const handleSaveUserSettings = () => {
        if (!editingStaff) return;
        setIsUpdatingUserSettings(true);
        router.post(
            route('admin.finance.payroll.user-settings'),
            {
                user_id: editingStaff.user_id,
                base_salary: staffBaseSalary,
                fingerprint_id: staffFingerprintId || null,
                shift_start_time: staffShiftStart,
                shift_end_time: staffShiftEnd,
                join_date: staffJoinDate || null,
                resign_date: staffResignDate || null,
                holiday_quota: staffHolidayQuota,
            },
            {
                onSuccess: () => {
                    toast.success(`Pengaturan gaji, shift, & tanggal bergabung/resign untuk ${editingStaff.name} berhasil diperbarui.`);
                    setIsUserSettingsModalOpen(false);
                    setIsUpdatingUserSettings(false);
                    router.reload();
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Gagal memperbarui pengaturan gaji staff.');
                    setIsUpdatingUserSettings(false);
                }
            }
        );
    };

    const handleFingerprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingAttendance(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('month', selectedMonth.toString());
        formData.append('year', selectedYear.toString());

        try {
            const res = await apiPostForm<any>('/admin/finance/payroll/attendance', formData);
            if (res.success) {
                toast.success(res.message || 'Berhasil mengimpor data absensi ke database.');
                router.reload();
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

    const handleSaveRates = () => {
        setIsSavingRates(true);
        router.post(
            route('admin.finance.payroll.rates'),
            {
                month: selectedMonth,
                year: selectedYear,
                first_night_rate: firstNightRate,
                next_night_rate: nextNightRate,
                housekeeping_bonus_mode: housekeepingBonusMode,
                housekeeping_rate_per_point: housekeepingRate,
                housekeeping_fixed_pool: housekeepingFixedPool,
                housekeeping_pool_percentage: housekeepingPoolPercentage,
                housekeeping_max_cap: housekeepingMaxCap,
                late_deduction_rate: lateDeductionRate,
                standby_rate: standbyRate,
                overtime_rate: overtimeRate,
                absent_deduction_rate: absentDeductionRate,
                sick_deduction_rate: sickDeductionRate,
                permission_deduction_rate: permissionDeductionRate,
                follow_up_rate: followUpRate,
                creation_rate: creationRate,
                proration_standard_days: prorationStandardDays,
            },
            {
                onSuccess: () => {
                    toast.success('Pengaturan tarif denda & insentif berhasil disimpan secara permanen di database.');
                    setIsSavingRates(false);
                    setIsRatesModalOpen(false);
                    router.reload();
                },
                onError: () => {
                    toast.error('Gagal menyimpan pengaturan tarif.');
                    setIsSavingRates(false);
                }
            }
        );
    };

    const handleGenerateBonuses = () => {
        setIsGeneratingBonuses(true);
        router.post(
            route('admin.finance.payroll.generate-bonuses'),
            {
                month: selectedMonth,
                year: selectedYear,
                first_night_rate: firstNightRate,
                next_night_rate: nextNightRate,
                housekeeping_bonus_mode: housekeepingBonusMode,
                housekeeping_rate_per_point: housekeepingRate,
                housekeeping_fixed_pool: housekeepingFixedPool,
                housekeeping_pool_percentage: housekeepingPoolPercentage,
                housekeeping_max_cap: housekeepingMaxCap,
                follow_up_rate: followUpRate,
                creation_rate: creationRate,
            },
            {
                onSuccess: () => {
                    toast.success('Bonus Staff Performance (HK & FO) berhasil digenerate.');
                    setIsGeneratingBonuses(false);
                    router.reload();
                },
                onError: () => {
                    toast.error('Gagal memproses bonus staff performance.');
                    setIsGeneratingBonuses(false);
                }
            }
        );
    };

    const handleSavePayroll = (replaceExisting: boolean = false) => {
        setIsSaving(true);
        router.post(
            route('admin.finance.payroll.store'),
            {
                month: selectedMonth,
                year: selectedYear,
                wallet_id: selectedWalletId || null,
                replace_existing: replaceExisting,
                payrolls: staffRows as any,
            },
            {
                onSuccess: () => {
                    toast.success(replaceExisting ? 'Payroll versi baru berhasil dibuat dan versi lama diarsipkan.' : 'Data payroll berhasil disimpan.');
                    setIsSaving(false);
                },
                onError: (err) => {
                    console.error('Save payroll failed:', err);
                    toast.error('Gagal menyimpan payroll.');
                    setIsSaving(false);
                }
            }
        );
    };

    const handleApprovePayroll = () => {
        setIsApproving(true);
        router.post(
            route('admin.finance.payroll.approve'),
            { month: selectedMonth, year: selectedYear },
            {
                onSuccess: () => {
                    toast.success('Payroll berhasil disetujui (Approved).');
                    setIsApproving(false);
                },
                onError: () => {
                    toast.error('Gagal me-review payroll.');
                    setIsApproving(false);
                }
            }
        );
    };

    const handlePayPayroll = () => {
        if (!selectedWalletId) {
            toast.error('Pilih rekening sumber pembayaran sebelum menandai lunas!');
            return;
        }

        setIsPaying(true);
        router.post(
            route('admin.finance.payroll.pay'),
            {
                month: selectedMonth,
                year: selectedYear,
                wallet_id: selectedWalletId,
            },
            {
                onSuccess: () => {
                    toast.success('Payroll berhasil dibayarkan dan transaksi kas/wallet telah dicatat.');
                    setIsPaying(false);
                },
                onError: () => {
                    toast.error('Gagal memproses pembayaran payroll.');
                    setIsPaying(false);
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
                               (Number(curr.performance_bonus) || 0) + 
                               (Number(curr.overtime_bonus) || 0) + 
                               (Number(curr.custom_allowance) || 0);

                acc.deductions += (Number(curr.late_deduction) || 0) + 
                                  (Number(curr.loan_deduction) || 0) + 
                                  (Number(curr.sick_deduction) || 0) + 
                                  (Number(curr.permission_deduction) || 0) + 
                                  (Number(curr.absent_deduction) || 0) + 
                                  (Number(curr.custom_deduction) || 0);

                acc.net += Number(curr.total_salary) || 0;
                return acc;
            },
            { base: 0, bonuses: 0, deductions: 0, net: 0 }
        );
    }, [staffRows]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

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
                    <title>Slip Gaji Versi ${selectedUserForPrint.version || 1} - ${selectedUserForPrint.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        body { padding: 40px; background-color: white; font-family: 'Courier New', Courier, monospace; }
                        @media print { body { padding: 0; } }
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-emerald-600 text-white font-bold">Lunas (Paid)</Badge>;
            case 'approved':
                return <Badge className="bg-blue-600 text-white font-bold">Approved</Badge>;
            case 'generated':
            case 'reviewed':
                return <Badge className="bg-purple-600 text-white font-bold">Generated (v{activeVersion})</Badge>;
            case 'archived':
                return <Badge variant="outline" className="text-slate-400">Arsip</Badge>;
            default:
                return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Draft</Badge>;
        }
    };

    // Calculate detailed breakdown for selected printable staff
    const payslipTotals = useMemo(() => {
        if (!selectedUserForPrint) return { totalAllowances: 0, totalDeductions: 0, netSalary: 0 };
        const u = selectedUserForPrint;
        const base = Number(u.base_salary) || 0;
        const allowances = base + 
            (Number(u.performance_bonus) || 0) + 
            (Number(u.frontdesk_first_night_bonus) || 0) + 
            (Number(u.frontdesk_next_nights_bonus_share) || 0) + 
            (Number(u.housekeeping_bonus) || 0) + 
            (Number(u.standby_bonus) || 0) + 
            (Number(u.overtime_bonus) || 0) + 
            (Number(u.custom_allowance) || 0);

        const deductions = (Number(u.late_deduction) || 0) + 
            (Number(u.absent_deduction) || 0) + 
            (Number(u.sick_deduction) || 0) + 
            (Number(u.permission_deduction) || 0) + 
            (Number(u.loan_deduction) || 0) + 
            (Number(u.custom_deduction) || 0);

        return {
            totalAllowances: allowances,
            totalDeductions: deductions,
            netSalary: maxZero(allowances - deductions),
        };
    }, [selectedUserForPrint]);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Sistem Payroll & Gaji Karyawan" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header Title & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Coins className="h-6 w-6 text-emerald-600" />
                                Sistem Payroll & Penggajian Karyawan
                            </h1>
                            {getStatusBadge(activeStatus)}
                            <Badge variant="outline" className="border-slate-300 font-bold">Versi {activeVersion}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            Kelola alur 7-langkah HR, gaji pokok prorated, penyesuaian khusus (bonus/potongan manual), dan rincian lengkap pembayaran lunas.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsRatesModalOpen(true)} className="h-9 font-bold border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100">
                            <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Pengaturan Tarif Denda & Insentif
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsVersionModalOpen(true)} className="h-9 font-bold">
                            <History className="w-4 h-4 mr-1.5 text-blue-600" /> Histori Versi ({versions.length})
                        </Button>
                        <Link href={route('admin.finance.payroll.attendance-review')}>
                            <Button variant="outline" size="sm" className="h-9 font-bold border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                                <Clock className="w-4 h-4 mr-1.5" /> Review Absensi Staff
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 7-STEP WORKFLOW GUIDE BANNER */}
                <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
                    <CardHeader className="p-4 pb-2 border-b border-slate-800">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" /> Workflow Utama Payroll HR (7 Langkah Sederhana)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs">
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 1</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><Upload className="w-3.5 h-3.5 text-emerald-400" /> Fingerprint</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 2</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> Review</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 3</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Koreksi</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 4</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Bonus HK/FO</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 5</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><Calculator className="w-3.5 h-3.5 text-indigo-400" /> Generate</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 6</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Approve</div>
                            </div>
                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400">Step 7</span>
                                <div className="font-bold text-white flex items-center justify-center gap-1"><CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Bayar (Paid)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Control Panel Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Period Card */}
                    <Card className="shadow-md">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                                <CalendarIcon className="h-4 w-4 text-slate-400" /> Periode Payroll
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bulan</label>
                                    <Select value={selectedMonth.toString()} onValueChange={(v) => handleMonthChange(parseInt(v))}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {monthsName.map((m, idx) => (
                                                <SelectItem key={idx + 1} value={(idx + 1).toString()}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
                                    <Select value={selectedYear.toString()} onValueChange={(v) => handleYearChange(parseInt(v))}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
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
                                <Upload className="h-4 w-4 text-slate-400" /> Impor Data Absensi (Step 1)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <Input
                                type="file"
                                accept=".xls,.xlsx,.csv"
                                onChange={handleFingerprintUpload}
                                className="hidden"
                                id="fingerprint-file-input"
                                disabled={isParsingAttendance}
                            />
                            <Button asChild variant="outline" size="sm" className="w-full h-9 font-bold" disabled={isParsingAttendance}>
                                <label htmlFor="fingerprint-file-input" className="cursor-pointer flex items-center justify-center gap-1">
                                    {isParsingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pilih File Excel / CSV'}
                                </label>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Generate Bonus Performance Card */}
                    <Card className="shadow-md">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-700">
                                <span className="flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4 text-purple-600" /> Bonus Staff (Step 4)
                                </span>
                                <Button 
                                    onClick={() => setIsRatesModalOpen(true)} 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-2 text-[10px] font-bold text-slate-500 hover:text-purple-700"
                                >
                                    <SlidersHorizontal className="w-3 h-3 mr-1" /> Atur Tarif
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <Button 
                                onClick={handleGenerateBonuses}
                                disabled={isGeneratingBonuses}
                                variant="outline" 
                                size="sm" 
                                className="w-full h-9 font-bold border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                            >
                                {isGeneratingBonuses ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate & Finalkan Bonus HK/FO'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Summary & Lifecycle Actions */}
                    <Card className="shadow-md flex flex-col justify-between">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-700">Total Akumulasi Pembayaran Gaji</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs text-slate-500 font-medium">Gaji Bersih (Net)</span>
                                <span className="text-base font-black text-emerald-600">{formatCurrency(totalPayrollSummary.net)}</span>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block">Rekening Pembayar <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedWalletId}
                                    onChange={(e) => setSelectedWalletId(e.target.value)}
                                    className="border border-slate-200 rounded h-8 px-2 bg-background text-xs w-full font-bold focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">— Pilih Rekening Sumber —</option>
                                    {wallets?.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Workflow Action Buttons Bar */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => handleSavePayroll(false)} 
                            disabled={isSaving} 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold h-9"
                        >
                            <Save className="w-4 h-4 mr-1.5" /> Simpan Draft / Generate (v{activeVersion})
                        </Button>
                        {staffRows[0]?.stored && (
                            <Button 
                                onClick={() => handleSavePayroll(true)} 
                                disabled={isSaving} 
                                variant="outline"
                                size="sm" 
                                className="border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold h-9"
                            >
                                <RefreshCw className="w-4 h-4 mr-1.5" /> Buat Versi Baru (Regenerate v{activeVersion + 1})
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {activeStatus !== 'approved' && activeStatus !== 'paid' && (
                            <Button 
                                onClick={handleApprovePayroll} 
                                disabled={isApproving || !staffRows[0]?.stored} 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 font-bold h-9"
                            >
                                <ShieldCheck className="w-4 h-4 mr-1.5" /> Approve Payroll
                            </Button>
                        )}
                        <Button 
                            onClick={handlePayPayroll} 
                            disabled={isPaying || !selectedWalletId || activeStatus === 'paid'} 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold h-9"
                        >
                            <CreditCard className="w-4 h-4 mr-1.5" /> Tandai Lunas (Mark as Paid)
                        </Button>
                    </div>
                </div>

                {/* Main Payroll Staff Table */}
                <Card className="shadow-md">
                    <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800">Tabel Rincian Gaji Staff (Versi {activeVersion})</CardTitle>
                        <p className="text-xs text-slate-400 font-medium">Klik <span className="font-bold text-indigo-600">Adjust</span> untuk penyesuaian khusus (bonus/potongan manual) per staff.</p>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-xs">Nama Staff & Role</TableHead>
                                    <TableHead className="font-bold text-xs">Gaji Pokok (Prorated)</TableHead>
                                    <TableHead className="font-bold text-xs">Hadir / Terlambat</TableHead>
                                    <TableHead className="font-bold text-xs">Rincian Bonus & Insentif</TableHead>
                                    <TableHead className="font-bold text-xs">Rincian Potongan & Denda</TableHead>
                                    <TableHead className="font-bold text-xs">Total Net Salary</TableHead>
                                    <TableHead className="font-bold text-xs text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                                            Belum ada data staff untuk periode ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffRows.map((row, idx) => (
                                        <TableRow key={row.user_id} className="hover:bg-slate-50/80">
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-xs text-slate-800">{row.name}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 text-slate-400 hover:text-blue-600 hover:bg-blue-50" 
                                                        onClick={() => openUserSettingsModal(row)}
                                                        title="Edit Gaji Pokok & Shift Standar Staff"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase font-semibold">{row.role}</div>
                                                {row.prorated && (
                                                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 mt-0.5">
                                                        Prorated ({row.active_employment_days}/26 hr)
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-xs flex items-center gap-1">
                                                    {formatCurrency(row.base_salary)}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-4 w-4 text-slate-400 hover:text-blue-600" 
                                                        onClick={() => openUserSettingsModal(row)}
                                                        title="Ubah Gaji Pokok"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs space-y-0.5">
                                                <div>Hadir: <span className="font-bold">{row.attendance_days} hari</span></div>
                                                {row.late_hours > 0 && <div className="text-red-500 font-semibold">Late: {row.late_hours} jam</div>}
                                            </TableCell>
                                            <TableCell className="text-xs space-y-0.5 font-medium">
                                                {row.performance_bonus > 0 && <div className="text-purple-600">FO Follow-Up: +{formatCurrency(row.performance_bonus)}</div>}
                                                {row.frontdesk_first_night_bonus > 0 && <div className="text-blue-600">FO Input Data: +{formatCurrency(row.frontdesk_first_night_bonus)}</div>}
                                                {row.frontdesk_next_nights_bonus_share > 0 && <div className="text-indigo-600">FO Pool Malam: +{formatCurrency(row.frontdesk_next_nights_bonus_share)}</div>}
                                                {row.housekeeping_bonus > 0 && <div className="text-emerald-600">HK Poin: +{formatCurrency(row.housekeeping_bonus)}</div>}
                                                {row.standby_bonus > 0 && <div className="text-amber-600">Standby: +{formatCurrency(row.standby_bonus)}</div>}
                                                {row.overtime_bonus > 0 && <div className="text-emerald-600">Lembur: +{formatCurrency(row.overtime_bonus)}</div>}
                                                {row.custom_allowance > 0 && (
                                                    <div className="text-indigo-600 font-bold">
                                                        Bonus Khusus: +{formatCurrency(row.custom_allowance)}
                                                        {row.custom_allowance_reason && <span className="block text-[10px] font-normal text-slate-400">({row.custom_allowance_reason})</span>}
                                                    </div>
                                                )}
                                                {row.performance_bonus === 0 && row.housekeeping_bonus === 0 && row.frontdesk_first_night_bonus === 0 && row.frontdesk_next_nights_bonus_share === 0 && row.standby_bonus === 0 && row.overtime_bonus === 0 && row.custom_allowance === 0 && (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs space-y-0.5 font-medium text-red-500">
                                                {row.late_deduction > 0 && <div>Terlambat: -{formatCurrency(row.late_deduction)}</div>}
                                                {row.absent_deduction > 0 && <div>Mangkir: -{formatCurrency(row.absent_deduction)}</div>}
                                                {row.sick_deduction > 0 && <div>Sakit: -{formatCurrency(row.sick_deduction)}</div>}
                                                {row.permission_deduction > 0 && <div>Izin: -{formatCurrency(row.permission_deduction)}</div>}
                                                {row.loan_deduction > 0 && <div>Casbon: -{formatCurrency(row.loan_deduction)}</div>}
                                                {row.custom_deduction > 0 && (
                                                    <div className="text-red-700 font-bold">
                                                        Potongan Khusus: -{formatCurrency(row.custom_deduction)}
                                                        {row.custom_deduction_reason && <span className="block text-[10px] font-normal text-slate-400">({row.custom_deduction_reason})</span>}
                                                    </div>
                                                )}
                                                {row.late_deduction === 0 && row.absent_deduction === 0 && row.sick_deduction === 0 && row.permission_deduction === 0 && row.loan_deduction === 0 && row.custom_deduction === 0 && (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-black text-sm text-blue-600">{formatCurrency(row.total_salary)}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openCustomAdjustmentModal(idx)} 
                                                    className="h-7 px-2 text-xs font-bold border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                                    title="Input Penambahan / Pengurangan Khusus Gaji"
                                                >
                                                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Adjust
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openShiftCalendarModal(row)} 
                                                    className="h-7 px-2 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
                                                >
                                                    <CalendarCheck className="w-3.5 h-3.5 mr-1" /> Shift
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openPrintModal(row)} className="h-7 px-2.5 text-xs font-bold">
                                                    <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" /> Slip
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

            {/* MODAL PENYESUAIAN GAJI KHUSUS (BONUS & POTONGAN MANUAL) */}
            <Dialog open={isCustomAdjustmentModalOpen} onOpenChange={setIsCustomAdjustmentModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-900">
                            <SlidersHorizontal className="w-5 h-5 text-indigo-600" /> Modal Penyesuaian Gaji Khusus
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan jumlah penambahan (bonus manual) atau pengurangan (potongan manual) khusus untuk <span className="font-bold text-slate-800">{adjustingStaffIndex !== null ? staffRows[adjustingStaffIndex]?.name : ''}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Penambahan Gaji Khusus */}
                        <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2">
                            <Label className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                                <PlusCircle className="w-4 h-4 text-indigo-600" /> Penambahan Gaji Khusus / Bonus Manual (Rp)
                            </Label>
                            <Input 
                                type="number" 
                                value={customAllowanceInput} 
                                onChange={(e) => setCustomAllowanceInput(Number(e.target.value) || 0)} 
                                placeholder="Contoh: 150000"
                                className="font-bold bg-white"
                            />
                            <Input 
                                type="text" 
                                value={customAllowanceReasonInput} 
                                onChange={(e) => setCustomAllowanceReasonInput(e.target.value)} 
                                placeholder="Alasan penambahan (misal: Bonus Pencapaian Khusus)"
                                className="bg-white"
                            />
                        </div>

                        {/* Pengurangan Gaji Khusus */}
                        <div className="p-3 bg-red-50/70 rounded-lg border border-red-200 space-y-2">
                            <Label className="font-bold text-xs text-red-900 flex items-center gap-1.5">
                                <MinusCircle className="w-4 h-4 text-red-600" /> Pengurangan Gaji Khusus / Potongan Manual (Rp)
                            </Label>
                            <Input 
                                type="number" 
                                value={customDeductionInput} 
                                onChange={(e) => setCustomDeductionInput(Number(e.target.value) || 0)} 
                                placeholder="Contoh: 50000"
                                className="font-bold bg-white"
                            />
                            <Input 
                                type="text" 
                                value={customDeductionReasonInput} 
                                onChange={(e) => setCustomDeductionReasonInput(e.target.value)} 
                                placeholder="Alasan pengurangan (misal: Ganti Rugi Barang Hilang)"
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsCustomAdjustmentModalOpen(false)}>Batal</Button>
                        <Button size="sm" onClick={handleSaveCustomAdjustment} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                            Terapkan ke Draft Payroll
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL PENGATURAN SEMUA TARIF DENDA & INSENTIF PAYROLL (TERMASUK SETTING POIN HK) */}
            <Dialog open={isRatesModalOpen} onOpenChange={setIsRatesModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-purple-900">
                            <SlidersHorizontal className="w-5 h-5 text-purple-600" /> Modal Pengaturan Tarif Denda & Insentif Staff
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Atur metode perhitungan Poin HK, nominal denda absensi, serta tarif bonus FO/HK yang tersimpan secara permanen.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
                        {/* Group Housekeeping Bonus Settings */}
                        <div className="col-span-1 md:col-span-2 space-y-3 p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                            <h4 className="font-bold text-xs text-emerald-900 border-b border-emerald-200 pb-1 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-600" /> Pengaturan Kalkulasi Bonus Housekeeping (HK)
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-slate-700">Metode Bonus HK</Label>
                                    <Select value={housekeepingBonusMode} onValueChange={(v) => setHousekeepingBonusMode(v)}>
                                        <SelectTrigger className="bg-white font-bold h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rate_per_point">Tarif Flat per Poin (Rp)</SelectItem>
                                            <SelectItem value="fixed_pool">Total Budget Pool HK Fix (Rp)</SelectItem>
                                            <SelectItem value="profit_sharing">Profit Sharing Pool Net (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {housekeepingBonusMode === 'rate_per_point' && (
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Tarif Flat per Poin HK (Rp)</Label>
                                        <Input type="number" value={housekeepingRate} onChange={(e) => setHousekeepingRate(Number(e.target.value) || 0)} className="bg-white font-bold h-9" />
                                    </div>
                                )}

                                {housekeepingBonusMode === 'fixed_pool' && (
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Total Budget Pool HK Fix (Rp)</Label>
                                        <Input type="number" value={housekeepingFixedPool} onChange={(e) => setHousekeepingFixedPool(Number(e.target.value) || 0)} className="bg-white font-bold h-9" />
                                    </div>
                                )}

                                {housekeepingBonusMode === 'profit_sharing' && (
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Persentase Pool HK dari Profit Net (%)</Label>
                                        <Input type="number" step="0.1" value={housekeepingPoolPercentage} onChange={(e) => setHousekeepingPoolPercentage(Number(e.target.value) || 0)} className="bg-white font-bold h-9" />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-slate-700">Cap Maksimum Bonus per Staff HK (Rp)</Label>
                                    <Input type="number" value={housekeepingMaxCap} onChange={(e) => setHousekeepingMaxCap(Number(e.target.value) || 0)} className="bg-white font-bold h-9" placeholder="0 = tanpa batas" />
                                </div>
                            </div>
                        </div>

                        {/* Group Denda */}
                        <div className="space-y-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                            <h4 className="font-bold text-xs text-red-900 border-b pb-1">Nominal Denda & Potongan Absensi</h4>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Denda Keterlambatan (per Jam)</Label>
                                <Input type="number" value={lateDeductionRate} onChange={(e) => setLateDeductionRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Potongan Mangkir/Absent (per Hari)</Label>
                                <Input type="number" value={absentDeductionRate} onChange={(e) => setAbsentDeductionRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Potongan Sakit Tanpa Surat (per Hari)</Label>
                                <Input type="number" value={sickDeductionRate} onChange={(e) => setSickDeductionRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Potongan Izin Karyawan (per Hari)</Label>
                                <Input type="number" value={permissionDeductionRate} onChange={(e) => setPermissionDeductionRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1 pt-1 border-t border-red-200">
                                <Label className="text-[11px] font-semibold text-slate-700">Standar Hari Kerja Prorasi (Hari/Bulan)</Label>
                                <Input type="number" value={prorationStandardDays} onChange={(e) => setProrationStandardDays(Number(e.target.value) || 26)} className="bg-white font-bold" placeholder="Default 26 hari" />
                            </div>
                        </div>

                        {/* Group Insentif & Bonus FO */}
                        <div className="space-y-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                            <h4 className="font-bold text-xs text-purple-900 border-b pb-1">Tarif Insentif & Bonus Front Office (FO)</h4>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Insentif Shift Standby (per Malam)</Label>
                                <Input type="number" value={standbyRate} onChange={(e) => setStandbyRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Insentif Lembur (per Jam)</Label>
                                <Input type="number" value={overtimeRate} onChange={(e) => setOvertimeRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Bonus Input Data Booking FO (per Unit)</Label>
                                <Input type="number" value={creationRate} onChange={(e) => setCreationRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Bonus Follow-up Booking FO (per Unit)</Label>
                                <Input type="number" value={followUpRate} onChange={(e) => setFollowUpRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Bonus Malam Tambahan Pool FO (per Malam)</Label>
                                <Input type="number" value={nextNightRate} onChange={(e) => setNextNightRate(Number(e.target.value) || 0)} className="bg-white font-bold" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsRatesModalOpen(false)}>Tutup</Button>
                        <Button size="sm" onClick={handleSaveRates} disabled={isSavingRates} className="bg-purple-600 hover:bg-purple-700 font-bold">
                            {isSavingRates ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Semua Tarif Permanen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL JADWAL SHIFT HARIAN STAFF (KALENDER MONTHLY SHIFT & OFF DAY) */}
            <Dialog open={isShiftCalendarModalOpen} onOpenChange={setIsShiftCalendarModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-900">
                            <CalendarCheck className="w-5 h-5 text-indigo-600" /> Jadwal Shift Harian & Hari Libur (Off Day)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Atur jam kerja harian dan tentukan hari libur (Off Day) untuk <span className="font-bold text-slate-800">{selectedShiftStaff?.name}</span> periode {monthsName[selectedMonth - 1]} {selectedYear}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">Jam Shift Standar:</span>
                                <Badge variant="outline" className="font-mono bg-white">{selectedShiftStaff?.shift_start_time || '08:00'} - {selectedShiftStaff?.shift_end_time || '16:00'}</Badge>
                            </div>
                            <div className="text-[11px] text-slate-500">
                                Klik tombol <span className="font-bold text-red-600">OFF (Libur)</span> untuk mengubah status hari.
                            </div>
                        </div>

                        {/* Grid Kalender Hari 1 s/d End of Month */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 max-h-80 overflow-y-auto p-1">
                            {dailyShifts.map((item, idx) => (
                                <div 
                                    key={item.date} 
                                    className={`p-2 rounded-lg border flex flex-col justify-between text-xs space-y-1.5 transition-all ${
                                        item.is_off_day 
                                            ? 'bg-red-50/80 border-red-200' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-800 text-xs">Tgl {item.day}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleOffDay(idx)}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                                item.is_off_day
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {item.is_off_day ? 'OFF' : 'Kerja'}
                                        </button>
                                    </div>

                                    {!item.is_off_day ? (
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                value={item.shift_start_time}
                                                onChange={(e) => updateShiftTime(idx, e.target.value, item.shift_end_time)}
                                                className="w-full text-[11px] font-mono h-6 px-1 border rounded text-center bg-slate-50"
                                                placeholder="08:00"
                                            />
                                            <input
                                                type="text"
                                                value={item.shift_end_time}
                                                onChange={(e) => updateShiftTime(idx, item.shift_start_time, e.target.value)}
                                                className="w-full text-[11px] font-mono h-6 px-1 border rounded text-center bg-slate-50"
                                                placeholder="16:00"
                                            />
                                        </div>
                                    ) : (
                                        <div className="py-2 text-center text-red-500 font-bold text-[10px]">
                                            Libur
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsShiftCalendarModalOpen(false)}>Batal</Button>
                        <Button 
                            size="sm" 
                            onClick={handleSaveDailyShifts} 
                            disabled={isSavingShifts}
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                        >
                            {isSavingShifts ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Jadwal Shift Bulan Ini'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Edit Gaji Pokok & Shift Staff */}
            <Dialog open={isUserSettingsModalOpen} onOpenChange={setIsUserSettingsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-600" /> Pengaturan Gaji Pokok & Shift Staff
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Atur nilai Gaji Pokok standar per bulan, ID mesin fingerprint, dan jam shift untuk <span className="font-bold text-slate-800">{editingStaff?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="font-bold text-xs">Gaji Pokok Standar Bulanan (Rp)</Label>
                            <Input 
                                type="number" 
                                value={staffBaseSalary} 
                                onChange={(e) => setStaffBaseSalary(Number(e.target.value) || 0)} 
                                placeholder="Contoh: 3000000"
                                className="font-bold"
                            />
                            <p className="text-[10px] text-slate-400">Gaji ini akan dihitung secara proporsional (prorated) jika staff masuk pertengahan bulan.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">ID Mesin Fingerprint</Label>
                                <Input 
                                    type="text" 
                                    value={staffFingerprintId} 
                                    onChange={(e) => setStaffFingerprintId(e.target.value)} 
                                    placeholder="Contoh: 101"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">Jatah Libur / Off (Hari/Bulan)</Label>
                                <Input 
                                    type="number" 
                                    value={staffHolidayQuota} 
                                    onChange={(e) => setStaffHolidayQuota(Number(e.target.value) || 0)} 
                                    placeholder="Default: 4 hari"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">Jam Masuk Shift</Label>
                                <Input 
                                    type="time" 
                                    value={staffShiftStart} 
                                    onChange={(e) => setStaffShiftStart(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">Jam Keluar Shift</Label>
                                <Input 
                                    type="time" 
                                    value={staffShiftEnd} 
                                    onChange={(e) => setStaffShiftEnd(e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* Tanggal Resmi Bergabung & Resign untuk kontrol prorasi */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">Tgl Resmi Bergabung (Join Date)</Label>
                                <Input 
                                    type="date" 
                                    value={staffJoinDate} 
                                    onChange={(e) => setStaffJoinDate(e.target.value)} 
                                    className="text-xs font-mono"
                                />
                                <span className="block text-[9px] text-slate-400">Kosongkan jika karyawan lama</span>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-bold text-xs">Tgl Resmi Resign/Keluar (Resign Date)</Label>
                                <Input 
                                    type="date" 
                                    value={staffResignDate} 
                                    onChange={(e) => setStaffResignDate(e.target.value)} 
                                    className="text-xs font-mono"
                                />
                                <span className="block text-[9px] text-slate-400">Kosongkan jika masih aktif</span>
                            </div>
                        </div>

                        {/* Box Simulasi Live Hitungan Gaji Pokok & Status Prorasi */}
                        {editingStaff && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                                <div className="font-bold text-slate-800 flex items-center justify-between border-b pb-1">
                                    <span>Simulasi Hitungan Gaji Pokok ({editingStaff.name})</span>
                                    {editingStaff.prorated ? (
                                        <Badge className="bg-amber-500 text-white font-bold text-[10px]">Prorated ({editingStaff.active_employment_days}/26 hr)</Badge>
                                    ) : (
                                        <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Penuh 100% (26/26 hr)</Badge>
                                    )}
                                </div>
                                <div className="space-y-1 text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Gaji Standar 1 Bulan:</span>
                                        <span className="font-mono font-bold">{formatCurrency(staffBaseSalary)}</span>
                                    </div>
                                    {editingStaff.prorated && (
                                        <div className="flex justify-between text-amber-700 font-bold">
                                            <span>Gaji Pokok Diterima (Prorated):</span>
                                            <span className="font-mono font-bold">{formatCurrency(Math.round(staffBaseSalary * ((editingStaff.active_employment_days || 26) / 26)))}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 italic pt-1 border-t">
                                        {editingStaff.prorated 
                                            ? `Karyawan terdaftar/resign di pertengahan bulan, sehingga dihitung ${editingStaff.active_employment_days} hari kerja dari standar 26 hari.` 
                                            : `Karyawan bekerja sebulan penuh, tidak ada potongan prorasi.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsUserSettingsModalOpen(false)}>Batal</Button>
                        <Button 
                            size="sm" 
                            onClick={handleSaveUserSettings} 
                            disabled={isUpdatingUserSettings}
                            className="bg-blue-600 hover:bg-blue-700 font-bold"
                        >
                            {isUpdatingUserSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Pengaturan Staff'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Histori Versi Payroll */}
            <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600" /> Histori Versi Snapshot Payroll
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Daftar versi payroll yang pernah digenerate untuk periode {monthsName[selectedMonth - 1]} {selectedYear}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
                        {versions.map((v) => (
                            <div key={v.version} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${v.is_active ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                    <div className="font-bold text-slate-800">Versi {v.version} {v.is_active && <span className="text-emerald-600">(Aktif)</span>}</div>
                                    <div className="text-[10px] text-slate-400">Batch: {v.batch_id?.substring(0, 8)}...</div>
                                </div>
                                <div className="text-right">
                                    {getStatusBadge(v.status)}
                                    <div className="text-[10px] text-slate-400 mt-1">{new Date(v.created_at).toLocaleDateString('id-ID')}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsVersionModalOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Print Payslip */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center justify-between">
                            <span>Slip Gaji Karyawan (Versi {selectedUserForPrint?.version || 1})</span>
                            <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 font-bold h-8">
                                <Printer className="w-3.5 h-3.5 mr-1" /> Cetak Sekarang
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    <div id="printable-payslip" className="border p-6 rounded-lg font-mono text-xs space-y-4 bg-white text-slate-900">
                        <div className="border-b pb-3 text-center">
                            <h2 className="text-base font-bold uppercase tracking-wider">SLIP GAJI KARYAWAN</h2>
                            <p className="text-[10px] text-slate-500">Periode: {monthsName[selectedMonth - 1]} {selectedYear} | Versi: {selectedUserForPrint?.version || 1}</p>
                        </div>

                        {selectedUserForPrint && (
                        <div className="py-2 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border">
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-semibold">NAMA KARYAWAN</span>
                                    <span className="font-bold text-slate-800">{selectedUserForPrint.name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-semibold">JABATAN / ROLE</span>
                                    <span className="font-bold text-indigo-700 capitalize">{selectedUserForPrint.role.replace('_', ' ')}</span>
                                </div>
                            </div>

                            {/* Rincian Penerimaan (Allowances) */}
                            <div className="border-t border-b py-2 space-y-1">
                                <div className="font-bold text-slate-700 border-b pb-1 mb-1">PENERIMAAN (ALLOWANCES)</div>
                                <div className="flex justify-between">
                                    <span>Gaji Pokok Sebulan</span>
                                    <span>{formatCurrency(selectedUserForPrint.original_base_salary || selectedUserForPrint.base_salary || 0)}</span>
                                </div>
                                {selectedUserForPrint.prorated && (
                                    <div className="flex justify-between text-amber-700 font-bold pl-2 text-[11px]">
                                        <span>↳ Disesuaikan (Prorated {selectedUserForPrint.active_employment_days}/26 hari kerja)</span>
                                        <span>{formatCurrency(selectedUserForPrint.base_salary)}</span>
                                    </div>
                                )}
                                
                                {(selectedUserForPrint.performance_bonus || 0) > 0 && (
                                    <div className="flex justify-between text-purple-700">
                                        <span>Bonus Front Office (Follow-up)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.performance_bonus)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.frontdesk_first_night_bonus || 0) > 0 && (
                                    <div className="flex justify-between text-blue-700">
                                        <span>Bonus Front Office (Input Data)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.frontdesk_first_night_bonus)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.frontdesk_next_nights_bonus_share || 0) > 0 && (
                                    <div className="flex justify-between text-indigo-700">
                                        <span>Bonus Front Office (Pool Extra Nights)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.frontdesk_next_nights_bonus_share)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.housekeeping_bonus || 0) > 0 && (
                                    <div className="flex justify-between text-emerald-700">
                                        <span>Bonus Housekeeping (Poin Sharing Pool)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.housekeeping_bonus)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.standby_bonus || 0) > 0 && (
                                    <div className="flex justify-between text-amber-700">
                                        <span>Insentif Shift Standby ({selectedUserForPrint.standby_nights || 0} malam)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.standby_bonus)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.overtime_bonus || 0) > 0 && (
                                    <div className="flex justify-between text-emerald-700">
                                        <span>Insentif Lembur ({selectedUserForPrint.overtime_hours || 0} jam)</span>
                                        <span>+{formatCurrency(selectedUserForPrint.overtime_bonus)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.custom_allowance || 0) > 0 && (
                                    <div className="flex justify-between text-indigo-700 font-bold">
                                        <span>Bonus Khusus Manual ({selectedUserForPrint.custom_allowance_reason || 'Bonus Khusus'})</span>
                                        <span>+{formatCurrency(selectedUserForPrint.custom_allowance)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between font-bold border-t pt-1 text-slate-800">
                                    <span>TOTAL PENERIMAAN</span>
                                    <span>{formatCurrency(payslipTotals.totalAllowances)}</span>
                                </div>
                            </div>

                            {/* Rincian Potongan (Deductions) */}
                            <div className="border-b pb-2 space-y-1">
                                <div className="font-bold text-slate-700 border-b pb-1 mb-1">POTONGAN (DEDUCTIONS)</div>
                                {(selectedUserForPrint.late_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Denda Keterlambatan ({selectedUserForPrint.late_hours || 0} jam)</span>
                                        <span>-{formatCurrency(selectedUserForPrint.late_deduction)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.absent_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Potongan Mangkir/Absent ({selectedUserForPrint.absent_days || 0} hari)</span>
                                        <span>-{formatCurrency(selectedUserForPrint.absent_deduction)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.sick_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Potongan Sakit Tanpa Surat ({selectedUserForPrint.sick_days || 0} hari)</span>
                                        <span>-{formatCurrency(selectedUserForPrint.sick_deduction)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.permission_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Potongan Izin Karyawan ({selectedUserForPrint.permission_days || 0} hari)</span>
                                        <span>-{formatCurrency(selectedUserForPrint.permission_deduction)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.loan_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Potongan Pinjaman (Casbon)</span>
                                        <span>-{formatCurrency(selectedUserForPrint.loan_deduction)}</span>
                                    </div>
                                )}
                                {(selectedUserForPrint.custom_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-red-700 font-bold">
                                        <span>Potongan Khusus Manual ({selectedUserForPrint.custom_deduction_reason || 'Potongan Khusus'})</span>
                                        <span>-{formatCurrency(selectedUserForPrint.custom_deduction)}</span>
                                    </div>
                                )}

                                {!selectedUserForPrint.late_deduction && !selectedUserForPrint.absent_deduction && !selectedUserForPrint.sick_deduction && !selectedUserForPrint.permission_deduction && !selectedUserForPrint.loan_deduction && !selectedUserForPrint.custom_deduction && (
                                    <div className="flex justify-between text-slate-400 italic">
                                        <span>Tidak ada potongan</span>
                                        <span>Rp 0</span>
                                    </div>
                                )}

                                <div className="flex justify-between font-bold border-t pt-1 text-slate-800">
                                    <span>TOTAL POTONGAN</span>
                                    <span>{formatCurrency(payslipTotals.totalDeductions)}</span>
                                </div>
                            </div>

                            {/* Total Net Salary */}
                            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t-2 border-slate-900">
                                <span>TOTAL GAJI BERSIH (NET SALARY)</span>
                                <span className="text-emerald-700 text-base">{formatCurrency(payslipTotals.netSalary)}</span>
                            </div>
                        </div>
                    )}    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

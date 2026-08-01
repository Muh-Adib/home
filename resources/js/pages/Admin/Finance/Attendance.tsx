import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
    Clock, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    Edit, 
    History, 
    UserCheck, 
    ArrowLeft,
    FileText,
    Grid,
    List,
    PlusCircle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface AttendanceRecord {
    id?: number;
    user_id: number;
    date: string;
    shift_start_time?: string;
    shift_end_time?: string;
    check_in: string | null;
    check_out: string | null;
    work_hours?: number;
    late_minutes?: number;
    overtime_minutes?: number;
    status?: string;
    is_off_day?: boolean;
    is_corrected?: boolean;
    notes?: string | null;
    user?: {
        id: number;
        name: string;
        role: string;
    };
    corrections?: Array<{
        id: number;
        original_check_in: string | null;
        original_check_out: string | null;
        corrected_check_in: string | null;
        corrected_check_out: string | null;
        reason: string;
        notes: string | null;
        created_at: string;
        corrector: {
            id: number;
            name: string;
        };
    }>;
}

interface StaffMember {
    id: number;
    name: string;
    role: string;
    fingerprint_id: string | null;
    hk_points?: number;
}

interface AttendanceProps {
    staff: StaffMember[];
    attendances: AttendanceRecord[];
    daysInMonth: number;
    filters: {
        month: number;
        year: number;
    };
}

export default function Attendance({ staff, attendances, daysInMonth = 31, filters }: AttendanceProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);
    const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [selectedStaffForNew, setSelectedStaffForNew] = useState<StaffMember | null>(null);
    const [selectedDateForNew, setSelectedDateForNew] = useState<string>('');

    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [tempCheckIn, setTempCheckIn] = useState('');
    const [tempCheckOut, setTempCheckOut] = useState('');
    const [tempStatus, setTempStatus] = useState('present');
    const [tempReason, setTempReason] = useState('Lupa Tap / Absen Manual');
    const [tempNotes, setTempNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Finance & Payroll', href: '/admin/finance/payroll' },
        { title: 'Review & Koreksi Absensi Staff' },
    ];

    const monthsName = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayNamesMin = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const daysNameFull = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const formatDateWithDayName = (dateStr?: string) => {
        if (!dateStr) return '';
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length !== 3) return dateStr;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const dayName = daysNameFull[d.getDay()] || '';
        return `${dayName}, ${day} ${monthsName[month]} ${year}`;
    };

    // Build fast lookup map: key = `${userId}_${dateStr}`
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendances.forEach((att) => {
            const dateOnly = att.date.split('T')[0];
            map.set(`${att.user_id}_${dateOnly}`, att);
        });
        return map;
    }, [attendances]);

    const handleMonthChange = (monthVal: number) => {
        setSelectedMonth(monthVal);
        router.get(route('admin.finance.payroll.attendance-review'), { month: monthVal, year: selectedYear }, { preserveState: false });
    };

    const handleYearChange = (yearVal: number) => {
        setSelectedYear(yearVal);
        router.get(route('admin.finance.payroll.attendance-review'), { month: selectedMonth, year: yearVal }, { preserveState: false });
    };

    const openCellEditModal = (staffMember: StaffMember, day: number) => {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existing = attendanceMap.get(`${staffMember.id}_${dateStr}`);

        setSelectedStaffForNew(staffMember);
        setSelectedDateForNew(dateStr);

        if (existing) {
            setSelectedRecord(existing);
            setTempCheckIn(existing.check_in || '');
            setTempCheckOut(existing.check_out || '');
            setTempStatus(existing.status || 'present');
            setTempNotes(existing.notes || '');
        } else {
            setSelectedRecord(null);
            setTempCheckIn('');
            setTempCheckOut('');
            setTempStatus('present');
            setTempNotes('');
        }

        setTempReason('Lupa Tap / Absen Manual');
        setIsCorrectionModalOpen(true);
    };

    const openCorrectionModal = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setSelectedStaffForNew(null);
        setSelectedDateForNew(record.date);
        setTempCheckIn(record.check_in || '');
        setTempCheckOut(record.check_out || '');
        setTempStatus(record.status || 'present');
        setTempReason('Lupa Tap / Absen Manual');
        setTempNotes(record.notes || '');
        setIsCorrectionModalOpen(true);
    };

    const openHistoryModal = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setIsHistoryModalOpen(true);
    };

    const handleSaveCorrection = () => {
        if (!tempReason) {
            toast.error('Alasan koreksi wajib diisi!');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            attendance_id: selectedRecord?.id || null,
            user_id: selectedRecord?.user_id || selectedStaffForNew?.id,
            date: selectedRecord?.date || selectedDateForNew,
            check_in: tempCheckIn || null,
            check_out: tempCheckOut || null,
            status: tempStatus,
            reason: tempReason,
            notes: tempNotes || null,
        };

        router.post(
            route('admin.finance.payroll.attendance-correction'),
            payload,
            {
                onSuccess: () => {
                    toast.success('Koreksi jam masuk/keluar absensi berhasil disimpan dengan audit trail.');
                    setIsSubmitting(false);
                    setIsCorrectionModalOpen(false);
                },
                onError: (err) => {
                    console.error('Correction failed:', err);
                    toast.error('Gagal menyimpan koreksi absensi.');
                    setIsSubmitting(false);
                }
            }
        );
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'present':
                return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold">Hadir</Badge>;
            case 'standby':
                return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 font-bold">Standby</Badge>;
            case 'absent':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-bold">Alpha</Badge>;
            case 'sick':
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-bold">Sakit</Badge>;
            case 'permission':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-bold">Izin</Badge>;
            case 'off':
            case 'holiday':
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-bold">Libur</Badge>;
            default:
                return <Badge variant="outline">{status || '—'}</Badge>;
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Review & Koreksi Absensi Staff" />

            <div className="space-y-6 max-w-[98%] mx-auto pb-12">
                {/* Header Title & Navigation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href={route('admin.finance.payroll.index')} className="text-xs text-slate-500 font-bold hover:text-emerald-600 flex items-center gap-1 mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Payroll Dashboard
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-emerald-600" />
                            Review & Matrix Absensi Staff
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Klik sel tanggal karyawan untuk mengedit jam masuk/pulang secara instan jika karyawan lupa tap absensi.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <Button 
                                variant={viewMode === 'matrix' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('matrix')}
                                className="h-8 text-xs font-bold"
                            >
                                <Grid className="w-3.5 h-3.5 mr-1" /> Matrix View (Grid 31 Hari)
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className="h-8 text-xs font-bold"
                            >
                                <List className="w-3.5 h-3.5 mr-1" /> List Log Detail
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={selectedMonth.toString()} onValueChange={(v) => handleMonthChange(parseInt(v))}>
                                <SelectTrigger className="w-36 h-9 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthsName.map((m, idx) => (
                                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedYear.toString()} onValueChange={(v) => handleYearChange(parseInt(v))}>
                                <SelectTrigger className="w-28 h-9 font-bold">
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
                </div>

                {/* Legend Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium">
                    <span className="font-bold text-slate-700">Keterangan Sel Matrix:</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span> Hadir Lengkap (Pagi & Sore)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Lupa Tap Pagi / Sore</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> Mangkir / Terlambat</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span> Standby / Lembur</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span> Libur / Off / Kosong</span>
                </div>

                {/* VIEW MODE 1: MATRIX GRID VIEW */}
                {viewMode === 'matrix' && (
                    <Card className="shadow-md">
                        <CardHeader className="p-4 border-b">
                            <CardTitle className="text-base font-bold text-slate-800">
                                Matrix Kehadiran Harian Staff ({monthsName[selectedMonth - 1]} {selectedYear})
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Baris berisi Nama Karyawan, Header berisi Tanggal 1 s/d {daysInMonth}. Klik pada sel mana saja untuk mengedit/mengisi jam masuk dan keluar secara langsung.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <div className="min-w-[1400px]">
                                <Table className="border-collapse">
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="w-48 sticky left-0 z-20 bg-slate-100 font-black text-xs text-slate-800 border-r border-slate-300">
                                                Nama Staff & Role
                                            </TableHead>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                                const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                                                const dayIndex = dateObj.getDay();
                                                const dayName = dayNamesMin[dayIndex];
                                                const isSunday = dayIndex === 0;

                                                return (
                                                    <TableHead 
                                                        key={day} 
                                                        className={`text-center w-24 font-bold text-[11px] p-1 border-r border-slate-200 ${
                                                            isSunday ? 'bg-red-100/80 text-red-900 font-black' : ''
                                                        }`}
                                                    >
                                                        <div className={`text-[10px] font-black uppercase tracking-wider ${isSunday ? 'text-red-700 font-black' : 'text-slate-500'}`}>
                                                            {dayName}
                                                        </div>
                                                        <div className={`font-mono text-xs font-bold ${isSunday ? 'text-red-900 font-black' : 'text-slate-800'}`}>
                                                            {day}
                                                        </div>
                                                    </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {staff.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={daysInMonth + 1} className="text-center py-12 text-slate-400 font-medium">
                                                    Tidak ada karyawan ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            staff.map((member) => (
                                                <TableRow key={member.id} className="hover:bg-slate-50/50">
                                                    {/* Sticky Staff Column */}
                                                    <TableCell className="sticky left-0 z-10 bg-white font-bold text-xs border-r border-slate-300 p-2 shadow-sm">
                                                        <div className="text-slate-900 font-black truncate max-w-[180px]">{member.name}</div>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <div className="text-[10px] text-slate-400 font-semibold uppercase">{member.role}</div>
                                                            {member.role === 'housekeeping' && (
                                                                <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-1 py-0.5 mt-0.5">
                                                                    {member.hk_points ?? 0} Poin HK
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Days Columns */}
                                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const record = attendanceMap.get(`${member.id}_${dateStr}`);
                                                        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                                                        const isSunday = dateObj.getDay() === 0;

                                                        const hasIn = Boolean(record?.check_in);
                                                        const hasOut = Boolean(record?.check_out);
                                                        const isPartial = (hasIn && !hasOut) || (!hasIn && hasOut);
                                                        const isComplete = hasIn && hasOut;
                                                        const isLate = Boolean(record && record.late_minutes > 0);

                                                        let cellBg = isSunday ? 'bg-red-50/40 text-slate-400 hover:bg-red-100/50' : 'bg-slate-50 text-slate-400 hover:bg-slate-200';
                                                        if (record?.status === 'sick') cellBg = 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 font-bold';
                                                        else if (record?.status === 'permission') cellBg = 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200 font-bold';
                                                        else if (record?.status === 'absent') cellBg = 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
                                                        else if (record?.status === 'standby') cellBg = 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200';
                                                        else if (record?.status === 'holiday' || record?.status === 'off') cellBg = 'bg-slate-200/80 text-slate-700 border-slate-300 hover:bg-slate-300';
                                                        else if (isComplete && !isLate) cellBg = 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100';
                                                        else if (isComplete && isLate) cellBg = 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100';
                                                        else if (isPartial) cellBg = 'bg-amber-100 text-amber-900 border-amber-400 font-bold hover:bg-amber-200';

                                                        return (
                                                            <TableCell 
                                                                key={day}
                                                                onClick={() => openCellEditModal(member, day)}
                                                                className={`p-1.5 text-center text-[10px] border-r border-b border-slate-200 cursor-pointer transition-colors ${cellBg}`}
                                                                title={`Klik untuk edit absensi ${member.name} tanggal ${dateStr}`}
                                                            >
                                                                {record ? (
                                                                    <div className="space-y-0.5">
                                                                        <div className="font-mono font-bold">
                                                                            <span className={hasIn ? 'text-slate-800' : 'text-red-500 font-black'}>
                                                                                {record.check_in ? record.check_in.substring(0, 5) : '—'}
                                                                            </span>
                                                                            <span className="text-slate-400"> - </span>
                                                                            <span className={hasOut ? 'text-slate-800' : 'text-red-500 font-black'}>
                                                                                {record.check_out ? record.check_out.substring(0, 5) : '—'}
                                                                            </span>
                                                                        </div>
                                                                        {record.status === 'sick' && (
                                                                            <span className="block text-[8px] font-black text-amber-900 bg-amber-200/90 rounded px-0.5">🟡 Sakit</span>
                                                                        )}
                                                                        {record.status === 'permission' && (
                                                                            <span className="block text-[8px] font-black text-blue-900 bg-blue-200/90 rounded px-0.5">🔵 Izin</span>
                                                                        )}
                                                                        {record.status === 'absent' && (
                                                                            <span className="block text-[8px] font-black text-red-900 bg-red-200/90 rounded px-0.5">🔴 Mangkir</span>
                                                                        )}
                                                                        {(record.status === 'holiday' || record.status === 'off') && (
                                                                            <span className="block text-[8px] font-bold text-slate-800 bg-slate-300/90 rounded px-0.5">🟣 Libur</span>
                                                                        )}
                                                                        {record.is_corrected && record.status === 'present' && (
                                                                            <span className="block text-[8px] font-bold text-emerald-800 bg-emerald-100 rounded px-0.5">Edit HR</span>
                                                                        )}
                                                                        {isPartial && record.status === 'present' && (
                                                                            <span className="block text-[8px] font-bold text-amber-800 bg-amber-200 rounded px-0.5">Lupa Tap</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-slate-400 py-1 font-mono text-[9px] hover:text-slate-600">+ Edit</div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* VIEW MODE 2: LIST DETAIL LOG */}
                {viewMode === 'list' && (
                    <Card className="shadow-md">
                        <CardHeader className="p-4 border-b">
                            <CardTitle className="text-base font-bold text-slate-800">Tabel Rekapan Detail Log Kehadiran Staff</CardTitle>
                            <CardDescription className="text-xs">
                                Menampilkan {attendances.length} log kehadiran staff pada periode {monthsName[selectedMonth - 1]} {selectedYear}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Tanggal</TableHead>
                                        <TableHead className="font-bold text-xs">Nama Staff</TableHead>
                                        <TableHead className="font-bold text-xs">Shift Kerja</TableHead>
                                        <TableHead className="font-bold text-xs">Jam Masuk</TableHead>
                                        <TableHead className="font-bold text-xs">Jam Keluar</TableHead>
                                        <TableHead className="font-bold text-xs">Durasi Kerja</TableHead>
                                        <TableHead className="font-bold text-xs">Terlambat</TableHead>
                                        <TableHead className="font-bold text-xs">Lembur</TableHead>
                                        <TableHead className="font-bold text-xs">Status</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Aksi HR</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {attendances.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                                                Belum ada data absensi yang tersimpan untuk periode bulan ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        attendances.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/80">
                                                <TableCell className="font-bold text-xs">{row.date}</TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-xs text-slate-800">{row.user?.name}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{row.user?.role}</div>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">{row.shift_start_time || '08:00'} - {row.shift_end_time || '16:00'}</TableCell>
                                                <TableCell className="text-xs font-bold font-mono">
                                                    {row.check_in || <span className="text-red-500 font-normal">— (Lupa Tap Pagi)</span>}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold font-mono">
                                                    {row.check_out || <span className="text-red-500 font-normal">— (Lupa Tap Sore)</span>}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">{row.work_hours || 0} jam</TableCell>
                                                <TableCell className="text-xs">
                                                    {row.late_minutes && row.late_minutes > 0 ? (
                                                        <span className="text-red-600 font-bold">{row.late_minutes} menit</span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {row.overtime_minutes && row.overtime_minutes > 0 ? (
                                                        <span className="text-emerald-600 font-bold">{(row.overtime_minutes / 60).toFixed(1)} jam</span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1">
                                                        {getStatusBadge(row.status)}
                                                        {row.is_corrected && (
                                                            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[9px]">
                                                                Koreksi HR
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    {row.is_corrected && row.corrections && row.corrections.length > 0 && (
                                                        <Button variant="ghost" size="sm" onClick={() => openHistoryModal(row)} className="h-7 px-2 text-xs text-slate-600">
                                                            <History className="w-3.5 h-3.5 mr-1" /> Log ({row.corrections.length})
                                                        </Button>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={() => openCorrectionModal(row)} className="h-7 px-2.5 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                                        <Edit className="w-3.5 h-3.5 mr-1" /> Koreksi
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modal Edit / Koreksi Absensi Sel Matrix */}
            <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-emerald-600" />
                            Koreksi Manual Absensi HR
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Koreksi/isi jam masuk dan keluar untuk <strong>{selectedRecord?.user?.name || selectedStaffForNew?.name}</strong> pada hari <strong>{formatDateWithDayName(selectedRecord?.date || selectedDateForNew)}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Status Kehadiran Hari Ini <span className="text-red-500">*</span></Label>
                            <Select value={tempStatus} onValueChange={setTempStatus}>
                                <SelectTrigger className="h-9 text-xs font-bold bg-white">
                                    <SelectValue placeholder="— Pilih Status Kehadiran —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="present">🟢 Hadir (Present)</SelectItem>
                                    <SelectItem value="sick">🟡 Sakit (Sick Leave)</SelectItem>
                                    <SelectItem value="permission">🔵 Izin Karyawan (Permission)</SelectItem>
                                    <SelectItem value="absent">🔴 Mangkir / Alpha (Absent)</SelectItem>
                                    <SelectItem value="holiday">🟣 Libur / Off Day (Holiday)</SelectItem>
                                    <SelectItem value="standby">🟠 Shift Standby (Standby)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Jam Masuk (Pagi) [HH:MM]</Label>
                                <Input 
                                    type="text" 
                                    placeholder="08:00" 
                                    value={tempCheckIn} 
                                    onChange={(e) => setTempCheckIn(e.target.value)} 
                                    className="h-9 font-mono font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Jam Keluar (Sore) [HH:MM]</Label>
                                <Input 
                                    type="text" 
                                    placeholder="16:00" 
                                    value={tempCheckOut} 
                                    onChange={(e) => setTempCheckOut(e.target.value)} 
                                    className="h-9 font-mono font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Alasan Koreksi HR <span className="text-red-500">*</span></Label>
                            <Select value={tempReason} onValueChange={setTempReason}>
                                <SelectTrigger className="h-9 text-xs font-medium">
                                    <SelectValue placeholder="— Pilih Alasan Koreksi —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Izin / Sakit Karyawan">Izin / Sakit Karyawan</SelectItem>
                                    <SelectItem value="Lupa Tap / Absen Manual">Lupa Tap / Absen Manual</SelectItem>
                                    <SelectItem value="Fingerprint Error / Mesin Rusak">Fingerprint Error / Mesin Rusak</SelectItem>
                                    <SelectItem value="Dinas Luar / Tugas Lapangan">Dinas Luar / Tugas Lapangan</SelectItem>
                                    <SelectItem value="Koreksi Jam Lembur">Koreksi Jam Lembur</SelectItem>
                                    <SelectItem value="Koreksi Shift">Koreksi Shift</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Catatan Tambahan (Opsional)</Label>
                            <Input 
                                type="text" 
                                placeholder="Misal: Disertai Surat Doktor / Surat Izin HR" 
                                value={tempNotes} 
                                onChange={(e) => setTempNotes(e.target.value)} 
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsCorrectionModalOpen(false)}>Batal</Button>
                        <Button size="sm" onClick={handleSaveCorrection} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Koreksi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Audit Log Koreksi */}
            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600" />
                            Riwayat Audit Log Koreksi HR
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Daftar histori perubahan dan koreksi manual yang pernah dilakukan pada catatan absensi ini.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 max-h-80 overflow-y-auto py-2">
                        {selectedRecord?.corrections?.map((log) => (
                            <div key={log.id} className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 bg-slate-50">
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                    <span>Dikoreksi oleh: {log.corrector?.name}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="text-slate-600 font-medium">Alasan: <span className="font-bold text-slate-800">{log.reason}</span></div>
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                                    <div>Semula: <span className="font-mono font-bold">{log.original_check_in || '—'} - {log.original_check_out || '—'}</span></div>
                                    <div>Menjadi: <span className="font-mono font-bold text-emerald-700">{log.corrected_check_in || '—'} - {log.corrected_check_out || '—'}</span></div>
                                </div>
                                {log.notes && <div className="text-[11px] text-slate-500 italic">Catatan: "{log.notes}"</div>}
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

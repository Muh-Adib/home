import React, { useState } from 'react';
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
    FileText
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface AttendanceRecord {
    id: number;
    user_id: number;
    date: string;
    shift_start_time: string;
    shift_end_time: string;
    check_in: string | null;
    check_out: string | null;
    work_hours: number;
    late_minutes: number;
    overtime_minutes: number;
    status: string;
    is_off_day: boolean;
    is_corrected: boolean;
    notes: string | null;
    user: {
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

interface AttendanceProps {
    staff: Array<{ id: number; name: string; role: string; fingerprint_id: string | null }>;
    attendances: AttendanceRecord[];
    filters: {
        month: number;
        year: number;
    };
}

export default function Attendance({ staff, attendances, filters }: AttendanceProps) {
    const [selectedMonth, setSelectedMonth] = useState(filters.month);
    const [selectedYear, setSelectedYear] = useState(filters.year);

    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [tempCheckIn, setTempCheckIn] = useState('');
    const [tempCheckOut, setTempCheckOut] = useState('');
    const [tempReason, setTempReason] = useState('');
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

    const handleMonthChange = (monthVal: number) => {
        setSelectedMonth(monthVal);
        router.get(route('admin.finance.payroll.attendance-review'), { month: monthVal, year: selectedYear }, { preserveState: false });
    };

    const handleYearChange = (yearVal: number) => {
        setSelectedYear(yearVal);
        router.get(route('admin.finance.payroll.attendance-review'), { month: selectedMonth, year: yearVal }, { preserveState: false });
    };

    const openCorrectionModal = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setTempCheckIn(record.check_in || '');
        setTempCheckOut(record.check_out || '');
        setTempReason('');
        setTempNotes('');
        setIsCorrectionModalOpen(true);
    };

    const openHistoryModal = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setIsHistoryModalOpen(true);
    };

    const handleSaveCorrection = () => {
        if (!selectedRecord) return;
        if (!tempReason) {
            toast.error('Alasan koreksi wajib diisi!');
            return;
        }

        setIsSubmitting(true);
        router.post(
            route('admin.finance.payroll.attendance-correction'),
            {
                attendance_id: selectedRecord.id,
                check_in: tempCheckIn || null,
                check_out: tempCheckOut || null,
                reason: tempReason,
                notes: tempNotes || null,
            },
            {
                onSuccess: () => {
                    toast.success('Koreksi absensi berhasil disimpan dengan audit trail.');
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'present':
                return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold">Hadir</Badge>;
            case 'standby':
                return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 font-bold">Standby Malam</Badge>;
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
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Review & Koreksi Absensi Staff" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href={route('admin.finance.payroll.index')} className="text-xs text-slate-500 font-bold hover:text-emerald-600 flex items-center gap-1 mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Payroll Dashboard
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-emerald-600" />
                            Review & Koreksi Absensi Staff
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Review detail log jam masuk, jam keluar, durasi kerja, keterlambatan, dan lakukan koreksi absensi HR dengan audit trail transparan.
                        </p>
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

                {/* Main Table */}
                <Card className="shadow-md">
                    <CardHeader className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-800">Tabel Rekapan Detail Kehadiran Staff</CardTitle>
                                <CardDescription className="text-xs">
                                    Menampilkan {attendances.length} catatan kehadiran staff pada periode {monthsName[selectedMonth - 1]} {selectedYear}.
                                </CardDescription>
                            </div>
                        </div>
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
                                            <TableCell className="text-xs font-mono">{row.shift_start_time} - {row.shift_end_time}</TableCell>
                                            <TableCell className="text-xs font-bold font-mono">
                                                {row.check_in || <span className="text-slate-300 font-normal">—</span>}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold font-mono">
                                                {row.check_out || <span className="text-slate-300 font-normal">—</span>}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold">{row.work_hours} jam</TableCell>
                                            <TableCell className="text-xs">
                                                {row.late_minutes > 0 ? (
                                                    <span className="text-red-600 font-bold">{row.late_minutes} menit</span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {row.overtime_minutes > 0 ? (
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
            </div>

            {/* Modal Koreksi Absensi */}
            <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-emerald-600" />
                            Koreksi Manual Absensi HR
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Lakukan koreksi jam masuk/keluar untuk {selectedRecord?.user?.name} pada tanggal {selectedRecord?.date}. Semuanya tersimpan dalam audit log.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Jam Masuk (HH:MM)</Label>
                                <Input 
                                    type="text" 
                                    placeholder="08:00" 
                                    value={tempCheckIn} 
                                    onChange={(e) => setTempCheckIn(e.target.value)} 
                                    className="h-9 font-mono font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Jam Keluar (HH:MM)</Label>
                                <Input 
                                    type="text" 
                                    placeholder="16:00" 
                                    value={tempCheckOut} 
                                    onChange={(e) => setTempCheckOut(e.target.value)} 
                                    className="h-9 font-mono font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Alasan Koreksi <span className="text-red-500">*</span></Label>
                            <Select value={tempReason} onValueChange={setTempReason}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="— Pilih Alasan Koreksi —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fingerprint Error / Mesin Rusak">Fingerprint Error / Mesin Rusak</SelectItem>
                                    <SelectItem value="Lupa Tap / Absen Manual">Lupa Tap / Absen Manual</SelectItem>
                                    <SelectItem value="Dinas Luar / Tugas Lapangan">Dinas Luar / Tugas Lapangan</SelectItem>
                                    <SelectItem value="Koreksi Jam Lembur">Koreksi Jam Lembur</SelectItem>
                                    <SelectItem value="Koreksi Shift">Koreksi Shift</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Catatan Tambahan</Label>
                            <Input 
                                type="text" 
                                placeholder="Misal: Disetujui oleh Property Manager" 
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

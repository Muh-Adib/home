import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Calendar,
    Sparkles,
    User,
    Plus,
    Edit2,
    Trash2,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    ShieldAlert
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StaffUser {
    id: number;
    name: string;
    gender: 'male' | 'female';
}

interface RoutineSchedule {
    id: number;
    date: string;
    user_id: number;
    task_name: string;
    points: number;
    is_completed: boolean;
    completed_at: string | null;
    user: StaffUser;
}

interface HousekeepingSchedulesProps extends PageProps {
    schedules: RoutineSchedule[];
    staff: StaffUser[];
    filters: {
        month: number;
        year: number;
    };
}

export default function HousekeepingSchedules({
    schedules,
    staff,
    filters,
}: HousekeepingSchedulesProps) {
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<RoutineSchedule | null>(null);

    const [monthFilter, setMonthFilter] = useState(filters.month.toString());
    const [yearFilter, setYearFilter] = useState(filters.year.toString());

    // Create Form
    const generateForm = useForm({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        task_name: 'laundry',
        points: 1.00,
        gender_target: 'all',
    });

    // Edit/Reassign Form
    const editForm = useForm({
        user_id: '',
        task_name: '',
        points: 1.00,
        is_completed: false,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Jadwal Rutin Housekeeping', href: '/admin/housekeeping-schedules' },
    ];

    const months = [
        { value: '1', label: 'Januari' },
        { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' },
        { value: '4', label: 'April' },
        { value: '5', label: 'Mei' },
        { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' },
        { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const years = Array.from({ length: 5 }, (_, i) => {
        const y = new Date().getFullYear() - 2 + i;
        return { value: y.toString(), label: y.toString() };
    });

    const handleFilterChange = (newMonth = monthFilter, newYear = yearFilter) => {
        router.get('/admin/housekeeping-schedules', {
            month: newMonth,
            year: newYear,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleGenerateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        generateForm.post('/admin/housekeeping-schedules/generate', {
            onSuccess: () => {
                setShowGenerateModal(false);
                generateForm.reset();
            },
        });
    };

    const handleEditOpen = (schedule: RoutineSchedule) => {
        setSelectedSchedule(schedule);
        editForm.setData({
            user_id: schedule.user_id.toString(),
            task_name: schedule.task_name,
            points: schedule.points,
            is_completed: schedule.is_completed,
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchedule) return;

        editForm.patch(`/admin/housekeeping-schedules/${selectedSchedule.id}`, {
            onSuccess: () => {
                setShowEditModal(false);
                setSelectedSchedule(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (scheduleId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus jadwal untuk hari ini?')) {
            router.delete(`/admin/housekeeping-schedules/${scheduleId}`, {
                preserveScroll: true,
            });
        }
    };

    // Night shift check helper
    const isNightShiftSelected =
        generateForm.data.task_name.toLowerCase().includes('jaga malam') ||
        generateForm.data.task_name.toLowerCase().includes('standby malam');

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Jadwal Rutin Housekeeping" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                            Jadwal Rutin Housekeeping
                        </h1>
                        <p className="text-sm text-slate-500">
                            Kelola penugasan rutin harian (1 staff per hari secara acak) dan monitor penyelesaian tugas.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setShowGenerateModal(true)}
                            className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md gap-1.5"
                        >
                            <Sparkles className="h-4 w-4" /> Acak & Generate Jadwal
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-none shadow-sm rounded-2xl bg-white/85 backdrop-blur-sm p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="w-48 space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulan</Label>
                            <Select
                                value={monthFilter}
                                onValueChange={(val) => {
                                    setMonthFilter(val);
                                    handleFilterChange(val, yearFilter);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Bulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-32 space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tahun</Label>
                            <Select
                                value={yearFilter}
                                onValueChange={(val) => {
                                    setYearFilter(val);
                                    handleFilterChange(monthFilter, val);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Tahun" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y.value} value={y.value}>
                                            {y.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                {/* Schedules Table */}
                <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Daftar Penugasan Harian
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Detail tugas rutin dan staff terpilih untuk bulan {months.find(m => m.value === monthFilter)?.label} {yearFilter}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {schedules.length === 0 ? (
                            <div className="text-center py-16">
                                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
                                <h3 className="text-sm font-bold text-slate-600">Belum Ada Jadwal</h3>
                                <p className="text-xs text-slate-400 mt-1">Gunakan tombol 'Acak & Generate Jadwal' untuk membuat jadwal harian otomatis.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-40 font-bold text-slate-600">Tanggal</TableHead>
                                        <TableHead className="font-bold text-slate-600">Staff Terpilih</TableHead>
                                        <TableHead className="font-bold text-slate-600">Jenis Tugas</TableHead>
                                        <TableHead className="w-24 font-bold text-slate-600 text-center">Poin</TableHead>
                                        <TableHead className="w-32 font-bold text-slate-600 text-center">Status</TableHead>
                                        <TableHead className="w-28 font-bold text-slate-600 text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schedules.map((schedule) => (
                                        <TableRow key={schedule.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-semibold text-slate-800 text-xs">
                                                {format(new Date(schedule.date), 'eeee, dd MMM yyyy', { locale: id })}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="rounded-lg text-[10px] font-bold">
                                                        {schedule.user.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                                                    </Badge>
                                                    <span className="font-bold text-slate-700">{schedule.user.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700 capitalize text-xs">
                                                {schedule.task_name}
                                            </TableCell>
                                            <TableCell className="font-extrabold text-slate-800 text-center text-xs">
                                                {schedule.points} Pts
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {schedule.is_completed ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold text-[10px]">
                                                        Selesai
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-50 font-bold text-[10px]">
                                                        Belum Selesai
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditOpen(schedule)}
                                                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(schedule.id)}
                                                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Generate Schedules Modal */}
                <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Acak & Generate Jadwal</DialogTitle>
                            <DialogDescription>
                                Masukkan rentang tanggal dan nama tugas rutin. Sistem akan mengacak pembagian staff (1 orang per hari).
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleGenerateSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Tanggal Mulai *</Label>
                                    <Input
                                        type="date"
                                        value={generateForm.data.start_date}
                                        onChange={(e) => generateForm.setData('start_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Tanggal Selesai *</Label>
                                    <Input
                                        type="date"
                                        value={generateForm.data.end_date}
                                        onChange={(e) => generateForm.setData('end_date', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Jenis Tugas *</Label>
                                <Input
                                    value={generateForm.data.task_name}
                                    onChange={(e) => generateForm.setData('task_name', e.target.value)}
                                    placeholder="Contoh: laundry, jaga malam, kebersihan kantor"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Poin Per Hari *</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={generateForm.data.points}
                                    onChange={(e) => generateForm.setData('points', parseFloat(e.target.value) || 0)}
                                    required
                                    min={0}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Target Acak Staff *</Label>
                                <Select
                                    value={generateForm.data.gender_target}
                                    onValueChange={(val) => generateForm.setData('gender_target', val)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Target Staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Staff (Laki-laki & Perempuan)</SelectItem>
                                        <SelectItem value="male">Staff Laki-laki Saja</SelectItem>
                                        <SelectItem value="female">Staff Perempuan Saja</SelectItem>
                                    </SelectContent>
                                </Select>
                                {generateForm.errors.gender_target && (
                                    <p className="text-xs text-red-500 font-bold">{generateForm.errors.gender_target}</p>
                                )}
                            </div>

                            {/* Gender constraint warning */}
                            {isNightShiftSelected ? (
                                <Alert className="bg-amber-50 border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <AlertTitle className="text-xs font-black text-amber-800">Pembatasan Gender Jaga Malam</AlertTitle>
                                        <AlertDescription className="text-[11px] text-amber-700 mt-0.5">
                                            Sesuai aturan perusahaan, tugas jaga malam/standby malam wajib dan hanya akan diacak untuk <strong>staff laki-laki</strong> (mengabaikan target acak terpilih).
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            ) : generateForm.data.gender_target === 'male' ? (
                                <Alert className="bg-blue-50 border-blue-200 p-3 rounded-xl flex items-start gap-2.5">
                                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <AlertTitle className="text-xs font-bold text-blue-800">Acak Laki-laki Saja</AlertTitle>
                                        <AlertDescription className="text-[11px] text-blue-600 mt-0.5">
                                            Jadwal rutin untuk rentang tanggal ini akan diacak hanya ke seluruh staff kebersihan <strong>laki-laki</strong>.
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            ) : generateForm.data.gender_target === 'female' ? (
                                <Alert className="bg-pink-50 border-pink-200 p-3 rounded-xl flex items-start gap-2.5">
                                    <AlertCircle className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
                                    <div>
                                        <AlertTitle className="text-xs font-bold text-pink-800">Acak Perempuan Saja</AlertTitle>
                                        <AlertDescription className="text-[11px] text-pink-600 mt-0.5">
                                            Jadwal rutin untuk rentang tanggal ini akan diacak hanya ke seluruh staff kebersihan <strong>perempuan</strong>.
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            ) : (
                                <Alert className="bg-slate-50 border-slate-200 p-3 rounded-xl flex items-start gap-2.5">
                                    <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <AlertTitle className="text-xs font-bold text-slate-800">Pembagian Acak Merata</AlertTitle>
                                        <AlertDescription className="text-[11px] text-slate-600 mt-0.5">
                                            Tugas ini akan diacak merata untuk seluruh staff kebersihan aktif (laki-laki & perempuan).
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            )}

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowGenerateModal(false);
                                        generateForm.reset();
                                    }}
                                    disabled={generateForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={generateForm.processing} className="font-bold">
                                    {generateForm.processing ? 'Mengacak...' : 'Generate Jadwal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit/Reassign Schedule Modal */}
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Ubah Penugasan Jadwal</DialogTitle>
                            <DialogDescription>
                                Reassign staff untuk tanggal ini atau perbarui informasi poin dan status pengerjaan.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedSchedule && (
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tanggal</Label>
                                    <p className="text-sm font-bold text-slate-800">
                                        {format(new Date(selectedSchedule.date), 'eeee, dd MMMM yyyy', { locale: id })}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Pilih Staff Pengganti *</Label>
                                    <Select
                                        value={editForm.data.user_id}
                                        onValueChange={(val) => editForm.setData('user_id', val)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Pilih Staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name} ({s.gender === 'male' ? 'Laki-laki' : 'Perempuan'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Nama Tugas *</Label>
                                    <Input
                                        value={editForm.data.task_name}
                                        onChange={(e) => editForm.setData('task_name', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Poin *</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={editForm.data.points}
                                        onChange={(e) => editForm.setData('points', parseFloat(e.target.value) || 0)}
                                        required
                                        min={0}
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="edit-is-completed"
                                        checked={editForm.data.is_completed}
                                        onChange={(e) => editForm.setData('is_completed', e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                                    />
                                    <Label htmlFor="edit-is-completed" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                        Sudah Selesai Dikerjakan
                                    </Label>
                                </div>

                                <DialogFooter className="pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedSchedule(null);
                                            editForm.reset();
                                        }}
                                        disabled={editForm.processing}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={editForm.processing} className="font-bold">
                                        Simpan Perubahan
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

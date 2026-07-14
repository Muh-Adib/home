import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Briefcase,
    Plus,
    Trash2,
    Calendar,
    Award,
    Users,
    ChevronRight,
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StaffUser {
    id: number;
    name: string;
}

interface CustomTaskMember {
    id: number;
    name: string;
    pivot: {
        points: string;
    };
}

interface CustomTask {
    id: number;
    title: string;
    tier: 'sss' | 'ss' | 's' | 'a' | 'b' | 'c' | 'd' | 'e';
    points: number;
    completed_at: string;
    created_at: string;
    creator: {
        id: number;
        name: string;
    };
    members: CustomTaskMember[];
}

interface Tier {
    value: string;
    label: string;
    points: number;
}

interface CustomTasksProps extends PageProps {
    tasks: CustomTask[];
    staff: StaffUser[];
    filters: {
        month: number;
        year: number;
    };
    tiers: Tier[];
}

export default function CustomTasks({
    tasks,
    staff,
    filters,
    tiers,
}: CustomTasksProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [monthFilter, setMonthFilter] = useState(filters.month.toString());
    const [yearFilter, setYearFilter] = useState(filters.year.toString());

    // Create Form
    const createForm = useForm({
        title: '',
        tier: 'c', // Default tier C (5 points)
        user_ids: [] as string[],
        completed_at: format(new Date(), 'yyyy-MM-dd'),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Tugas Khusus Housekeeping', href: '/admin/custom-tasks' },
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
        router.get('/admin/custom-tasks', {
            month: newMonth,
            year: newYear,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/custom-tasks', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleDelete = (taskId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus tugas khusus ini? Poin staff yang bersangkutan juga akan dihapus.')) {
            router.delete(`/admin/custom-tasks/${taskId}`, {
                preserveScroll: true,
            });
        }
    };

    // Calculate dynamic points split for preview
    const selectedTierPoints = tiers.find(t => t.value === createForm.data.tier)?.points || 0;
    const splitPoints = createForm.data.user_ids.length > 0 
        ? (selectedTierPoints / createForm.data.user_ids.length).toFixed(2)
        : '0.00';

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Tugas Khusus Housekeeping" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                            Tugas Khusus Housekeeping
                        </h1>
                        <p className="text-sm text-slate-500">
                            Catat tugas ad-hoc/khusus di luar jadwal rutin dan bagi poin berdasarkan tier kesulitan.
                        </p>
                    </div>

                    <div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md gap-1.5"
                        >
                            <Plus className="h-4 w-4" /> Input Tugas Khusus
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

                {/* Tasks List */}
                <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Daftar Tugas Khusus
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Rekam jejak tugas khusus dan pembagian poin staff bulan {months.find(m => m.value === monthFilter)?.label} {yearFilter}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {tasks.length === 0 ? (
                            <div className="text-center py-16">
                                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
                                <h3 className="text-sm font-bold text-slate-600">Belum Ada Tugas Khusus</h3>
                                <p className="text-xs text-slate-400 mt-1">Gunakan tombol 'Input Tugas Khusus' untuk menambahkan pencapaian staff.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-48 font-bold text-slate-600">Tanggal Input</TableHead>
                                        <TableHead className="font-bold text-slate-600">Tugas Khusus</TableHead>
                                        <TableHead className="w-28 font-bold text-slate-600 text-center">Tier (Total)</TableHead>
                                        <TableHead className="font-bold text-slate-600">Staff Terlibat (Bagi Rata)</TableHead>
                                        <TableHead className="w-20 font-bold text-slate-600 text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-semibold text-slate-800 text-xs">
                                                {format(new Date(task.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-bold text-slate-700">{task.title}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Dibuat oleh: {task.creator?.name || 'Sistem'}</div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs">
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-extrabold uppercase text-[10px]">
                                                    Tier {task.tier} ({task.points} Pts)
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {task.members.map((m) => (
                                                        <Badge key={m.id} variant="outline" className="text-[10px] font-semibold text-slate-600 border-slate-200">
                                                            {m.name} (+{parseFloat(m.pivot.points).toFixed(2)} Pts)
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(task.id)}
                                                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Input Custom Task Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Input Tugas Khusus</DialogTitle>
                            <DialogDescription>
                                Berikan tugas khusus, pilih tier poin kesulitan, dan centang staff yang ikut mengerjakan.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Nama Tugas Khusus *</Label>
                                <Input
                                    value={createForm.data.title}
                                    onChange={(e) => createForm.setData('title', e.target.value)}
                                    placeholder="Contoh: Membersihkan Gudang Utama, Memasang Dekorasi Event"
                                    required
                                />
                                {createForm.errors.title && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Tier Kesulitan / Poin *</Label>
                                <Select
                                    value={createForm.data.tier}
                                    onValueChange={(val) => createForm.setData('tier', val)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Tier Poin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiers.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.tier && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.tier}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Tanggal Selesai Tugas *</Label>
                                <Input
                                    type="date"
                                    value={createForm.data.completed_at}
                                    onChange={(e) => createForm.setData('completed_at', e.target.value)}
                                    required
                                />
                                {createForm.errors.completed_at && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.completed_at}</p>
                                )}
                            </div>

                            {/* Staff Checkbox Grid */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Pilih Staff Pelaksana *</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto border border-slate-100 p-3 bg-slate-50 rounded-xl">
                                    {staff.map((s) => {
                                        const isChecked = createForm.data.user_ids.includes(s.id.toString());
                                        return (
                                            <div key={s.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`staff-${s.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        const currentIds = [...createForm.data.user_ids];
                                                        if (checked) {
                                                            currentIds.push(s.id.toString());
                                                        } else {
                                                            const idx = currentIds.indexOf(s.id.toString());
                                                            if (idx > -1) currentIds.splice(idx, 1);
                                                        }
                                                        createForm.setData('user_ids', currentIds);
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`staff-${s.id}`}
                                                    className="text-xs font-medium text-slate-700 cursor-pointer select-none truncate"
                                                >
                                                    {s.name}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                                {createForm.errors.user_ids && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.user_ids}</p>
                                )}
                            </div>

                            {/* Dynamic Point Calculation Box */}
                            {createForm.data.user_ids.length > 0 && (
                                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex items-center justify-between text-xs text-blue-700">
                                    <div className="flex items-center gap-1.5">
                                        <Award className="h-4 w-4 text-blue-600" />
                                        <span>Total: <strong>{selectedTierPoints} Poin</strong></span>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-blue-300" />
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        <span>Masing-masing: <strong>{splitPoints} Pts</strong></span>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        createForm.reset();
                                    }}
                                    disabled={createForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={createForm.processing} className="font-bold">
                                    {createForm.processing ? 'Menyimpan...' : 'Simpan Tugas'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

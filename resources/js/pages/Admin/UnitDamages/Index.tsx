import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { type BreadcrumbItem, type PageProps } from '@/types';
import {
    Wrench,
    Plus,
    Building2,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Image as ImageIcon,
    ExternalLink,
    Filter,
    Trash2,
    Sparkles,
} from 'lucide-react';

interface UnitDamage {
    id: number;
    property_id: number;
    reported_by: number;
    assigned_to: number | null;
    title: string;
    description: string;
    photo_path: string | null;
    status: 'pending' | 'in_progress' | 'resolved';
    resolved_by: number | null;
    resolved_at: string | null;
    resolved_notes: string | null;
    created_at: string;
    updated_at: string;
    property: {
        id: number;
        name: string;
    };
    reporter: {
        id: number;
        name: string;
        role: string;
    };
    assignee?: {
        id: number;
        name: string;
        role: string;
    } | null;
    resolver?: {
        id: number;
        name: string;
    } | null;
    actions?: {
        id: number;
        user_id: number;
        action_details: string;
        points: number;
        user: {
            id: number;
            name: string;
            role: string;
        };
    }[];
}

interface Property {
    id: number;
    name: string;
}

interface Staff {
    id: number;
    name: string;
    role: string;
}

interface IndexProps {
    damages: {
        data: UnitDamage[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
        total: number;
    };
    properties: Property[];
    staff: Staff[];
    filters: {
        property_id: string;
        status: string;
    };
}

export default function UnitDamagesIndex({ damages, properties, staff, filters }: IndexProps) {
    const { auth } = usePage<PageProps>().props;
    const [propertyFilter, setPropertyFilter] = useState(filters.property_id);
    const [statusFilter, setStatusFilter] = useState(filters.status);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedDamage, setSelectedDamage] = useState<UnitDamage | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Form for reporting new damage
    const createForm = useForm({
        property_id: '',
        title: '',
        description: '',
        photo: null as File | null,
    });

    // Form for resolving damage
    const resolveForm = useForm({
        resolved_notes: '',
        actions: [] as { user_id: string; action_details: string; points: number }[],
    });

    // Form for assigning staff
    const assignForm = useForm({
        assigned_to: '',
    });

    const handleFilterChange = (newProperty = propertyFilter, newStatus = statusFilter) => {
        router.get('/admin/unit-damages', {
            property_id: newProperty,
            status: newStatus,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            createForm.setData('photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/unit-damages', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                setPhotoPreview(null);
            },
        });
    };

    const handleAssign = (damageId: number, staffId: string) => {
        router.patch(`/admin/unit-damages/${damageId}/assign`, {
            assigned_to: staffId,
        }, {
            preserveScroll: true,
        });
    };

    const handleSelfAssign = (damageId: number) => {
        router.patch(`/admin/unit-damages/${damageId}/assign`, {}, {
            preserveScroll: true,
        });
    };

    const handleResolveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDamage) {
            resolveForm.patch(`/admin/unit-damages/${selectedDamage.id}/resolve`, {
                onSuccess: () => {
                    setShowResolveModal(false);
                    setSelectedDamage(null);
                    resolveForm.reset();
                },
            });
        }
    };

    const handleDelete = (damageId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus laporan kerusakan ini?')) {
            router.delete(`/admin/unit-damages/${damageId}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: UnitDamage['status']) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 w-fit">
                        <Clock className="h-3 w-3" />
                        Pending
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 w-fit">
                        <Wrench className="h-3 w-3" />
                        Dalam Perbaikan
                    </Badge>
                );
            case 'resolved':
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Selesai
                    </Badge>
                );
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Laporan Kerusakan' },
    ];

    const canManageAll = ['super_admin', 'property_manager'].includes(auth.user?.role);
    const isHousekeeping = auth.user?.role === 'housekeeping';

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Kerusakan Unit" />

            <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Laporan Kerusakan Unit</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Catat kerusakan fasilitas unit, tugaskan staff perbaikan, dan pantau penyelesaian perbaikan.
                        </p>
                    </div>

                    <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto font-bold gap-2">
                        <Plus className="h-4 w-4" />
                        Laporkan Kerusakan
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                        <Filter className="h-4 w-4" />
                        <span>Filter:</span>
                    </div>

                    <div className="w-[200px]">
                        <Select
                            value={propertyFilter}
                            onValueChange={(val) => {
                                setPropertyFilter(val);
                                handleFilterChange(val, statusFilter);
                            }}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Pilih Properti" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Unit</SelectItem>
                                {properties.map((p) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[180px]">
                        <Select
                            value={statusFilter}
                            onValueChange={(val) => {
                                setStatusFilter(val);
                                handleFilterChange(propertyFilter, val);
                            }}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Pilih Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">Dalam Perbaikan</SelectItem>
                                <SelectItem value="resolved">Selesai</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Listing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {damages.data.length > 0 ? (
                        damages.data.map((damage) => (
                            <Card key={damage.id} className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                {/* Photo Header if present */}
                                {damage.photo_path ? (
                                    <div className="h-48 w-full relative overflow-hidden bg-slate-100 border-b">
                                        <img
                                            src={`/storage/${damage.photo_path}`}
                                            alt={damage.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(damage.status)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-24 w-full bg-slate-50 flex items-center justify-center border-b border-dashed text-slate-300">
                                        <ImageIcon className="h-8 w-8" />
                                        <span className="text-[10px] uppercase font-bold ml-1 tracking-wider">Tanpa Foto</span>
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(damage.status)}
                                        </div>
                                    </div>
                                )}

                                <CardHeader className="p-4 pb-2">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {damage.property.name}
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 line-clamp-1 mt-1">
                                        {damage.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 flex-1 space-y-4">
                                    <p className="text-xs text-slate-600 font-medium line-clamp-3">
                                        {damage.description}
                                    </p>

                                    <div className="space-y-2 border-t pt-3 border-slate-100 text-xs">
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="font-bold">Dilaporkan Oleh:</span>
                                            <span className="font-medium text-slate-700">{damage.reporter.name} ({damage.reporter.role})</span>
                                        </div>

                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="font-bold">Tanggal Lapor:</span>
                                            <span className="font-medium text-slate-700">
                                                {new Date(damage.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {/* Assignee Selection / Display */}
                                        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100/50">
                                            <span className="font-bold text-slate-500">Petugas Perbaikan:</span>
                                            {damage.assignee ? (
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        {damage.assignee.name}
                                                    </span>
                                                    {damage.status === 'in_progress' && (damage.assigned_to === auth.user?.id || canManageAll) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedDamage(damage);
                                                                resolveForm.setData({
                                                                    resolved_notes: '',
                                                                    actions: [
                                                                        {
                                                                            user_id: damage.assigned_to ? damage.assigned_to.toString() : (auth.user?.id ? auth.user.id.toString() : ''),
                                                                            action_details: '',
                                                                            points: 10,
                                                                        }
                                                                    ]
                                                                });
                                                                setShowResolveModal(true);
                                                            }}
                                                            className="h-7 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                        >
                                                            Tandai Selesai
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {canManageAll ? (
                                                        <Select
                                                            onValueChange={(val) => handleAssign(damage.id, val)}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue placeholder="Tugaskan Staff..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {staff.map((s) => (
                                                                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                                                                        {s.name} ({s.role === 'housekeeping' ? 'Cleaner' : s.role})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : isHousekeeping && damage.status === 'pending' ? (
                                                        <Button
                                                            onClick={() => handleSelfAssign(damage.id)}
                                                            className="w-full h-8 text-xs font-bold gap-1"
                                                        >
                                                            <Wrench className="h-3.5 w-3.5" />
                                                            Ambil Tugas Perbaikan
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Belum ditugaskan</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Resolution Notes & Actions */}
                                        {damage.status === 'resolved' && (
                                            <div className="space-y-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                                                        <span>Catatan Selesai</span>
                                                        <span>
                                                            {damage.resolved_at ? new Date(damage.resolved_at).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'short'
                                                            }) : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-emerald-700 font-medium">
                                                        {damage.resolved_notes || 'Selesai tanpa catatan.'}
                                                    </p>
                                                </div>

                                                {damage.actions && damage.actions.length > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Catatan Tindakan Staff ({damage.actions.length})</span>
                                                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                                                            {damage.actions.map((act) => (
                                                                <div key={act.id} className="text-[11px] bg-white border border-slate-100 p-2 rounded-lg flex justify-between items-start gap-2 shadow-sm">
                                                                    <div className="space-y-0.5">
                                                                        <span className="font-bold text-slate-800 block">{act.user?.name}</span>
                                                                        <span className="text-slate-500 font-medium text-[10px]">{act.action_details}</span>
                                                                    </div>
                                                                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none text-[10px] font-bold shrink-0">
                                                                        +{act.points} Pts
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {canManageAll && (
                                        <div className="flex justify-end pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(damage.id)}
                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Hapus Laporan
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 bg-white border border-dashed rounded-2xl shadow-sm">
                            <Wrench className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-2 text-sm font-semibold text-slate-700">Tidak ada laporan kerusakan</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Bersih! Seluruh unit properti beroperasi dengan normal tanpa kendala fasilitas.
                            </p>
                        </div>
                    )}
                </div>

                {/* Create Report Dialog */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Laporkan Kerusakan Unit</DialogTitle>
                            <DialogDescription>
                                Masukkan detail fasilitas yang rusak agar segera ditindaklanjuti.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Unit Properti *</Label>
                                <Select
                                    value={createForm.data.property_id}
                                    onValueChange={(val) => createForm.setData('property_id', val)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Properti" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map((p) => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.property_id && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.property_id}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Judul Kerusakan *</Label>
                                <Input
                                    value={createForm.data.title}
                                    onChange={(e) => createForm.setData('title', e.target.value)}
                                    placeholder="Contoh: AC Bocor Air / Engsel Pintu Patah"
                                />
                                {createForm.errors.title && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Deskripsi Masalah *</Label>
                                <Textarea
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    placeholder="Detail kerusakan, lokasi spesifik, atau gejala masalah..."
                                    rows={4}
                                />
                                {createForm.errors.description && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.description}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 font-medium">Unggah Foto Kerusakan (Opsional)</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="cursor-pointer text-xs"
                                />
                                {photoPreview && (
                                    <div className="mt-2 h-32 w-full rounded-lg overflow-hidden border">
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        createForm.reset();
                                        setPhotoPreview(null);
                                    }}
                                    disabled={createForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={createForm.processing} className="font-bold">
                                    {createForm.processing ? 'Menyimpan...' : 'Kirim Laporan'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Resolve Task Dialog */}
                <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Tandai Pekerjaan Selesai</DialogTitle>
                            <DialogDescription>
                                Berikan catatan perbaikan serta log tindakan kontribusi staff untuk kinerja mereka.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResolveSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Catatan Perbaikan / Ringkasan *</Label>
                                <Textarea
                                    value={resolveForm.data.resolved_notes}
                                    onChange={(e) => resolveForm.setData('resolved_notes', e.target.value)}
                                    placeholder="Tuliskan tindakan yang diambil (misalnya: 'Kabel kompresor disambung ulang, AC kembali dingin')..."
                                    rows={3}
                                    required
                                />
                                {resolveForm.errors.resolved_notes && (
                                    <p className="text-xs text-red-500 font-bold">{resolveForm.errors.resolved_notes}</p>
                                )}
                            </div>

                            {/* Actions and Points Section */}
                            <div className="space-y-3 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-black text-slate-800 uppercase tracking-wider">Tindakan & Point Staff</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs font-bold gap-1"
                                        onClick={() => {
                                            const currentActions = [...resolveForm.data.actions];
                                            currentActions.push({
                                                user_id: '',
                                                action_details: '',
                                                points: 10,
                                            });
                                            resolveForm.setData('actions', currentActions);
                                        }}
                                    >
                                        <Plus className="h-3 w-3" /> Tambah Staff
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                                    {resolveForm.data.actions.map((act, index) => (
                                        <div key={index} className="p-3 bg-slate-50 border rounded-xl space-y-2 relative">
                                            {resolveForm.data.actions.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    onClick={() => {
                                                        const currentActions = [...resolveForm.data.actions];
                                                        currentActions.splice(index, 1);
                                                        resolveForm.setData('actions', currentActions);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500">Staff Pelaksana *</Label>
                                                    <Select
                                                        value={act.user_id}
                                                        onValueChange={(val) => {
                                                            const currentActions = [...resolveForm.data.actions];
                                                            currentActions[index].user_id = val;
                                                            resolveForm.setData('actions', currentActions);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-white">
                                                            <SelectValue placeholder="Pilih Staff" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {staff.map((s) => (
                                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                                    {s.name} ({s.role})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500">Point Kinerja *</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs"
                                                        value={act.points}
                                                        onChange={(e) => {
                                                            const currentActions = [...resolveForm.data.actions];
                                                            currentActions[index].points = parseInt(e.target.value) || 0;
                                                            resolveForm.setData('actions', currentActions);
                                                        }}
                                                        min={0}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500">Detail Tindakan *</Label>
                                                <Input
                                                    className="h-8 text-xs bg-white"
                                                    placeholder="Tindakan spesifik (misal: membersihkan filter AC)"
                                                    value={act.action_details}
                                                    onChange={(e) => {
                                                        const currentActions = [...resolveForm.data.actions];
                                                        currentActions[index].action_details = e.target.value;
                                                        resolveForm.setData('actions', currentActions);
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {resolveForm.errors && Object.keys(resolveForm.errors).some(k => k.startsWith('actions')) && (
                                    <p className="text-xs text-red-500 font-bold">Harap lengkapi semua data tindakan staff pelaksana.</p>
                                )}
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowResolveModal(false);
                                        resolveForm.reset();
                                    }}
                                    disabled={resolveForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={resolveForm.processing} className="font-bold bg-emerald-600 hover:bg-emerald-700">
                                    {resolveForm.processing ? 'Memproses...' : 'Selesaikan Perbaikan'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

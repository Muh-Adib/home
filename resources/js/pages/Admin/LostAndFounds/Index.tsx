import React, { useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { apiGet } from '@/lib/api';
import {
    ClipboardList,
    Plus,
    Building2,
    Calendar,
    CheckCircle2,
    Search,
    Image as ImageIcon,
    Filter,
    Trash2,
    HelpCircle,
    UserCheck,
    Check,
} from 'lucide-react';

interface SuggestedBooking {
    id: number;
    booking_number: string;
    guest_name: string;
    check_in: string;
    check_out: string;
}

interface LostAndFoundItem {
    id: number;
    property_id: number;
    booking_id: number | null;
    item_name: string;
    description: string | null;
    photo_path: string | null;
    found_date: string;
    status: 'found' | 'claimed' | 'returned';
    claimed_by_name: string | null;
    claimed_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    property: {
        id: number;
        name: string;
    };
    booking?: {
        id: number;
        booking_number: string;
        guest_name: string;
        guest_phone?: string;
    } | null;
}

interface Property {
    id: number;
    name: string;
}

interface IndexProps {
    items: {
        data: LostAndFoundItem[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
        total: number;
    };
    properties: Property[];
    filters: {
        property_id: string;
        status: string;
    };
}

export default function LostAndFoundsIndex({ items, properties, filters }: IndexProps) {
    const { auth } = usePage<PageProps>().props;
    const [propertyFilter, setPropertyFilter] = useState(filters.property_id);
    const [statusFilter, setStatusFilter] = useState(filters.status);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LostAndFoundItem | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [suggestedBookings, setSuggestedBookings] = useState<SuggestedBooking[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Form for logging new lost item
    const createForm = useForm({
        property_id: '',
        booking_id: '',
        item_name: '',
        description: '',
        found_date: new Date().toISOString().split('T')[0],
        photo: null as File | null,
    });

    // Form for claiming item
    const claimForm = useForm({
        claimed_by_name: '',
        notes: '',
    });

    // Fetch suggested bookings when property_id or found_date changes
    useEffect(() => {
        if (createForm.data.property_id && createForm.data.found_date) {
            setLoadingSuggestions(true);
            apiGet<SuggestedBooking[]>('/admin/lost-and-founds/suggest-bookings', {
                property_id: createForm.data.property_id,
                found_date: createForm.data.found_date,
            })
                .then((data) => {
                    setSuggestedBookings(data);
                    // Pre-select the most recent check-out booking if available
                    if (data.length > 0) {
                        createForm.setData('booking_id', data[0].id.toString());
                    } else {
                        createForm.setData('booking_id', '');
                    }
                })
                .catch((err) => {
                    console.error('Failed to load booking suggestions:', err);
                })
                .finally(() => {
                    setLoadingSuggestions(false);
                });
        } else {
            setSuggestedBookings([]);
        }
    }, [createForm.data.property_id, createForm.data.found_date]);

    const handleFilterChange = (newProperty = propertyFilter, newStatus = statusFilter) => {
        router.get('/admin/lost-and-founds', {
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
        createForm.post('/admin/lost-and-founds', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                setPhotoPreview(null);
            },
        });
    };

    const handleClaimSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItem) {
            claimForm.patch(`/admin/lost-and-founds/${selectedItem.id}/claim`, {
                onSuccess: () => {
                    setShowClaimModal(false);
                    setSelectedItem(null);
                    claimForm.reset();
                },
            });
        }
    };

    const handleDelete = (itemId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus catatan barang tertinggal ini?')) {
            router.delete(`/admin/lost-and-founds/${itemId}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: LostAndFoundItem['status']) => {
        switch (status) {
            case 'found':
                return (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 w-fit">
                        <HelpCircle className="h-3 w-3" />
                        Ditemukan
                    </Badge>
                );
            case 'claimed':
            case 'returned':
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Sudah Diklaim
                    </Badge>
                );
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Barang Tertinggal' },
    ];

    const canManageAll = ['super_admin', 'property_manager'].includes(auth.user?.role);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Pencatatan Barang Tertinggal (Lost & Found)" />

            <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Barang Tertinggal (Lost & Found)</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Catat penemuan barang milik tamu, cocokkan otomatis dengan data check-out booking, dan kelola klaim pengembalian.
                        </p>
                    </div>

                    <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto font-bold gap-2">
                        <Plus className="h-4 w-4" />
                        Catat Barang Tertinggal
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
                                <SelectItem value="found">Ditemukan</SelectItem>
                                <SelectItem value="claimed">Sudah Diklaim</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Grid list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.data.length > 0 ? (
                        items.data.map((item) => (
                            <Card key={item.id} className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                {item.photo_path ? (
                                    <div className="h-48 w-full relative overflow-hidden bg-slate-100 border-b">
                                        <img
                                            src={`/storage/${item.photo_path}`}
                                            alt={item.item_name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(item.status)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-24 w-full bg-slate-50 flex items-center justify-center border-b border-dashed text-slate-300">
                                        <ImageIcon className="h-8 w-8" />
                                        <span className="text-[10px] uppercase font-bold ml-1 tracking-wider">Tanpa Foto</span>
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(item.status)}
                                        </div>
                                    </div>
                                )}

                                <CardHeader className="p-4 pb-2">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {item.property.name}
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 line-clamp-1 mt-1">
                                        {item.item_name}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 flex-1 space-y-4">
                                    <p className="text-xs text-slate-600 font-medium line-clamp-2">
                                        {item.description || 'Tidak ada deskripsi detail.'}
                                    </p>

                                    <div className="space-y-2 border-t pt-3 border-slate-100 text-xs">
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="font-bold">Tanggal Ditemukan:</span>
                                            <span className="font-medium text-slate-700">
                                                {new Date(item.found_date).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {/* Auto-matched Booking Details */}
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="font-bold">Kecocokan Booking:</span>
                                            {item.booking ? (
                                                <span className="font-semibold text-blue-600">
                                                    {item.booking.booking_number} ({item.booking.guest_name})
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Tidak dicocokkan</span>
                                            )}
                                        </div>

                                        {/* Claim info */}
                                        {item.status === 'claimed' && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 space-y-1 mt-2 text-xs">
                                                <div className="flex justify-between items-center text-emerald-800 font-bold uppercase tracking-wider text-[10px]">
                                                    <span>Diterima Oleh</span>
                                                    <span>
                                                        {item.claimed_at ? new Date(item.claimed_at).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        }) : ''}
                                                    </span>
                                                </div>
                                                <div className="font-semibold text-slate-800">
                                                    Penerima: {item.claimed_by_name}
                                                </div>
                                                <p className="text-slate-600 italic text-[11px]">
                                                    Catatan: {item.notes || '—'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                        {item.status === 'found' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setShowClaimModal(true);
                                                }}
                                                className="font-bold bg-emerald-600 hover:bg-emerald-700 h-8 gap-1.5"
                                            >
                                                <UserCheck className="h-4 w-4" />
                                                Klaim / Kembalikan
                                            </Button>
                                        ) : (
                                            <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                                <Check className="h-4 w-4" /> Selesai Dikembalikan
                                            </span>
                                        )}

                                        {canManageAll && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(item.id)}
                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 bg-white border border-dashed rounded-2xl shadow-sm">
                            <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-2 text-sm font-semibold text-slate-700">Tidak ada barang tertinggal</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Seluruh barang tamu aman dan terjaga setelah proses check-out.
                            </p>
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Catat Barang Tertinggal</DialogTitle>
                            <DialogDescription>
                                Input detail barang temuan beserta unit properti dan tanggal penemuannya.
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
                                <Label className="text-xs font-bold text-slate-700 font-medium">Tanggal Ditemukan *</Label>
                                <Input
                                    type="date"
                                    value={createForm.data.found_date}
                                    onChange={(e) => createForm.setData('found_date', e.target.value)}
                                />
                                {createForm.errors.found_date && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.found_date}</p>
                                )}
                            </div>

                            {/* Booking Auto-Matching recommendation list */}
                            {createForm.data.property_id && (
                                <div className="space-y-1.5 p-3 bg-slate-50 border rounded-lg">
                                    <Label className="text-xs font-bold text-slate-700 block">
                                        Kecocokan Tamu Booking (Auto-match)
                                    </Label>
                                    {loadingSuggestions ? (
                                        <span className="text-xs text-slate-400">Mencari kecocokan check-out...</span>
                                    ) : suggestedBookings.length > 0 ? (
                                        <div className="space-y-2 mt-1">
                                            <span className="text-[10px] text-emerald-600 font-bold block">
                                                ✓ Ditemukan {suggestedBookings.length} booking check-out berdekatan
                                            </span>
                                            <Select
                                                value={createForm.data.booking_id || 'none'}
                                                onValueChange={(val) => createForm.setData('booking_id', val === 'none' ? '' : val)}
                                            >
                                                <SelectTrigger className="w-full h-8 text-xs bg-white">
                                                    <SelectValue placeholder="Pilih Booking" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Jangan hubungkan dengan booking --</SelectItem>
                                                    {suggestedBookings.map((b) => (
                                                        <SelectItem key={b.id} value={b.id.toString()} className="text-xs">
                                                            {b.booking_number} ({b.guest_name}) - Out: {new Date(b.check_out).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'short'
                                                            })}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 italic">
                                            Tidak ditemukan booking check-out berdekatan di tanggal ini.
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Nama Barang *</Label>
                                <Input
                                    value={createForm.data.item_name}
                                    onChange={(e) => createForm.setData('item_name', e.target.value)}
                                    placeholder="Contoh: Kacamata Hitam Rayban / Charger iPhone"
                                />
                                {createForm.errors.item_name && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.item_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Deskripsi Barang & Lokasi Temuan</Label>
                                <Textarea
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    placeholder="Contoh: Ditemukan di laci meja nakas kamar sebelah kanan..."
                                    rows={3}
                                />
                                {createForm.errors.description && (
                                    <p className="text-xs text-red-500 font-bold">{createForm.errors.description}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 font-medium">Unggah Foto Barang (Opsional)</Label>
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
                                    {createForm.processing ? 'Menyimpan...' : 'Catat Barang'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Claim Modal */}
                <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">Klaim Pengembalian Barang</DialogTitle>
                            <DialogDescription>
                                Input data orang yang mengambil/menerima barang kembali.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleClaimSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Nama Penerima / Tamu Pengambil *</Label>
                                <Input
                                    value={claimForm.data.claimed_by_name}
                                    onChange={(e) => claimForm.setData('claimed_by_name', e.target.value)}
                                    placeholder="Tuliskan nama lengkap pengambil..."
                                    required
                                />
                                {claimForm.errors.claimed_by_name && (
                                    <p className="text-xs text-red-500 font-bold">{claimForm.errors.claimed_by_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Catatan Pengembalian (Opsional)</Label>
                                <Textarea
                                    value={claimForm.data.notes}
                                    onChange={(e) => claimForm.setData('notes', e.target.value)}
                                    placeholder="Contoh: Diambil sendiri oleh tamu / Dikirim via GoSend instan..."
                                    rows={3}
                                />
                                {claimForm.errors.notes && (
                                    <p className="text-xs text-red-500 font-bold">{claimForm.errors.notes}</p>
                                )}
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowClaimModal(false);
                                        claimForm.reset();
                                    }}
                                    disabled={claimForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={claimForm.processing} className="font-bold bg-emerald-600 hover:bg-emerald-700">
                                    {claimForm.processing ? 'Memproses...' : 'Konfirmasi Pengembalian'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

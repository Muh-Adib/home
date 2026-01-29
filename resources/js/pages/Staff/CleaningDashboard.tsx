import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle,
    Clock,
    MapPin,
    Users,
    Key,
    AlertTriangle,
    Calendar,
    User,
    Sparkles,
    RefreshCw,
    Plus,
    Trash2,
    Package
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface InventoryItem {
    id: number;
    name: string;
    unit: string;
}

interface StockUsageItem {
    item_id: number;
    quantity: number;
}

interface CleaningProperty {
    id: number;
    booking_number: string;
    property_name: string;
    property_address: string;
    guest_name: string;
    guest_count: number;
    check_out: string;
    current_keybox_code: string | null;
    next_checkin: {
        check_in: string;
        guest_name: string;
    } | null;
    priority: 'high' | 'medium' | 'low';
    stock_template: {
        item_id: number;
        item_name: string;
        unit: string;
        quantity: number;
    }[];
}

interface RecentlyCleaned {
    id: number;
    booking_number: string;
    property: {
        name: string;
        current_keybox_code: string;
        keybox_updated_at: string;
    };
    cleanedBy: {
        name: string;
    };
    cleaned_at: string;
}

interface CleaningStats {
    total_checkout_today: number;
    cleaned_today: number;
    pending_cleaning: number;
    high_priority: number;
}

interface CleaningDashboardProps extends PageProps {
    needsCleaning: CleaningProperty[];
    recentlyCleaned: RecentlyCleaned[];
    stats: CleaningStats;
    inventoryItems: InventoryItem[];
}

export default function CleaningDashboard({ needsCleaning, recentlyCleaned, stats, inventoryItems }: CleaningDashboardProps) {
    const [selectedProperty, setSelectedProperty] = useState<CleaningProperty | null>(null);
    const [showCleaningForm, setShowCleaningForm] = useState(false);

    // Form handling
    const { data, setData, patch, processing, errors, reset } = useForm({
        new_keybox_code: '',
        notes: '',
        stock_usage: [] as StockUsageItem[],
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Manajemen Kebersihan', href: '/staff/cleaning' },
    ];

    // Open form and pre-fill data
    const openCleaningForm = (property: CleaningProperty) => {
        setSelectedProperty(property);

        // Convert template to form data format
        const initialStockUsage = property.stock_template.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity
        }));

        setData({
            new_keybox_code: '',
            notes: '',
            stock_usage: initialStockUsage
        });

        setShowCleaningForm(true);
    };

    const closeCleaningForm = () => {
        setShowCleaningForm(false);
        setSelectedProperty(null);
        reset();
    };

    const submitCleaning = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProperty) return;

        patch(route('staff.cleaning.mark-cleaned', selectedProperty.id), {
            onSuccess: () => {
                closeCleaningForm();
            },
            preserveScroll: true,
        });
    };

    // Stock management functions
    const addStockItem = () => {
        // Find first item not already in usage list
        const unusedItem = inventoryItems.find(item =>
            !data.stock_usage.some(usage => usage.item_id === item.id)
        );

        if (unusedItem) {
            setData('stock_usage', [
                ...data.stock_usage,
                { item_id: unusedItem.id, quantity: 1 }
            ]);
        }
    };

    const removeStockItem = (index: number) => {
        const newStockUsage = [...data.stock_usage];
        newStockUsage.splice(index, 1);
        setData('stock_usage', newStockUsage);
    };

    const updateStockItem = (index: number, field: keyof StockUsageItem, value: number) => {
        const newStockUsage = [...data.stock_usage];
        newStockUsage[index] = { ...newStockUsage[index], [field]: value };
        setData('stock_usage', newStockUsage);
    };

    const getPriorityBadge = (priority: string) => {
        const variants = {
            high: 'destructive',
            medium: 'default',
            low: 'secondary'
        } as const;

        const labels = {
            high: 'Prioritas Tinggi',
            medium: 'Menengah',
            low: 'Rendah'
        } as const;

        return (
            <Badge variant={variants[priority as keyof typeof variants]}>
                {labels[priority as keyof typeof labels]}
            </Badge>
        );
    };

    const formatTime = (dateString: string) => {
        return format(new Date(dateString), 'HH:mm', { locale: id });
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Kebersihan" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Dashboard Kebersihan
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola jadwal pembersihan, stok, dan kode keybox
                        </p>
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Checkout Hari Ini
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-2xl font-bold">{stats.total_checkout_today}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Perlu Dibersihkan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-2xl font-bold">{stats.pending_cleaning}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Prioritas Tinggi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-2xl font-bold">{stats.high_priority}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Selesai Dibersihkan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-2xl font-bold">{stats.cleaned_today}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Properties Needing Cleaning */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Daftar Pembersihan ({needsCleaning.length})
                        </CardTitle>
                        <CardDescription>
                            Unit yang sudah checkout dan perlu dibersihkan/ready
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {needsCleaning.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold">Semua Bersih!</h3>
                                <p className="text-muted-foreground">Tidak ada unit yang perlu dibersihkan saat ini.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {needsCleaning.map((property) => (
                                    <div key={property.id} className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
                                        <div className={`h-1.5 w-full ${property.priority === 'high' ? 'bg-red-500' : property.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                        <div className="p-4 md:p-6">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-lg font-bold">{property.property_name}</h3>
                                                                {getPriorityBadge(property.priority)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <MapPin className="h-4 w-4" />
                                                                <span className="text-sm">{property.property_address}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                                        <div className="space-y-1">
                                                            <p className="text-muted-foreground text-xs uppercase tracking-wider">Tamu Checkout</p>
                                                            <div className="flex items-center gap-2 font-medium">
                                                                <User className="h-4 w-4" />
                                                                {property.guest_name}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                Checkout: {formatTime(property.check_out)}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <p className="text-muted-foreground text-xs uppercase tracking-wider">Info Unit</p>
                                                            <div className="flex items-center gap-2">
                                                                <Key className="h-4 w-4" />
                                                                Kode Lama: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{property.current_keybox_code}</code>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {property.next_checkin && (
                                                        <div className="mt-3 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />
                                                                <div className="text-sm">
                                                                    <p className="font-semibold text-blue-700 dark:text-blue-400">Tamu Berikutnya:</p>
                                                                    <p>{property.next_checkin.guest_name} • Check-in {formatTime(property.next_checkin.check_in)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[180px]">
                                                    <Button
                                                        onClick={() => openCleaningForm(property)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                        size="lg"
                                                    >
                                                        <Sparkles className="h-4 w-4 mr-2" />
                                                        Mulai Pembersihan
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recently Cleaned */}
                {recentlyCleaned.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Riwayat Pembersihan Hari Ini
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentlyCleaned.map((cleaned) => (
                                    <div key={cleaned.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="mb-2 sm:mb-0">
                                            <p className="font-bold text-lg">{cleaned.property.name}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                Dibersihkan oleh {cleaned.cleanedBy.name}
                                                <span className="mx-1">•</span>
                                                <Clock className="h-3 w-3" />
                                                Pukul {formatTime(cleaned.cleaned_at)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-sm justify-end">
                                                <span className="text-muted-foreground">Kode Keybox Baru:</span>
                                                <code className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded font-bold font-mono text-lg">
                                                    {cleaned.property.current_keybox_code}
                                                </code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Diupdate {formatTime(cleaned.property.keybox_updated_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cleaning Form Modal */}
                <Dialog open={showCleaningForm} onOpenChange={setShowCleaningForm}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Konfirmasi Unit Ready</DialogTitle>
                            <CardDescription>
                                Pastikan unit sudah bersih standar dan siap digunakan tamu.
                            </CardDescription>
                        </DialogHeader>

                        {selectedProperty && (
                            <form onSubmit={submitCleaning} className="space-y-6 mt-2">
                                {/* Property Info Summary */}
                                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                                    <p><strong>Property:</strong> {selectedProperty.property_name}</p>
                                    <p><strong>Kode Lama:</strong> {selectedProperty.current_keybox_code}</p>
                                </div>

                                <Separator />

                                {/* 1. Keybox Code */}
                                <div className="space-y-3">
                                    <Label htmlFor="new_keybox_code" className="text-base">
                                        1. Masukkan Kode Keybox Baru <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="new_keybox_code"
                                                type="text"
                                                maxLength={3}
                                                pattern="\d{3}"
                                                value={data.new_keybox_code}
                                                onChange={(e) => setData('new_keybox_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                placeholder="Contoh: 123"
                                                className={`pl-9 text-lg font-mono tracking-widest ${errors.new_keybox_code ? 'border-red-500' : ''}`}
                                                required
                                            />
                                        </div>
                                        <Button type="button" variant="outline" onClick={() => setData('new_keybox_code', Math.floor(100 + Math.random() * 900).toString())}>
                                            Acak
                                        </Button>
                                    </div>
                                    {errors.new_keybox_code && (
                                        <p className="text-sm text-red-500">{errors.new_keybox_code}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Wajib 3 digit angka. Kode ini akan ditampilkan ke tamu.
                                    </p>
                                </div>

                                <Separator />

                                {/* 2. Stock Usage */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            2. Pemakaian Stok / Amenities
                                        </Label>
                                        <Button type="button" size="sm" variant="secondary" onClick={addStockItem}>
                                            <Plus className="h-3 w-3 mr-1" /> Tambah Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                                        {data.stock_usage.length === 0 ? (
                                            <div className="text-center py-4 text-muted-foreground text-sm">
                                                Belum ada stok yang dicatat. Klik "Tambah Item" jika ada pemakaian.
                                            </div>
                                        ) : (
                                            data.stock_usage.map((usage, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <select
                                                        className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={usage.item_id}
                                                        onChange={(e) => updateStockItem(index, 'item_id', parseInt(e.target.value))}
                                                    >
                                                        <option value="">Pilih Item</option>
                                                        {inventoryItems.map(item => (
                                                            <option key={item.id} value={item.id}>
                                                                {item.name} ({item.unit})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-9"
                                                        value={usage.quantity}
                                                        min={0.1}
                                                        step={0.1}
                                                        onChange={(e) => updateStockItem(index, 'quantity', parseFloat(e.target.value))}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => removeStockItem(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        *Daftar terisi otomatis dari pembersihan terakhir. Sesuaikan jika berbeda.
                                    </p>
                                </div>

                                <Separator />

                                {/* 3. Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Contoh: Ada kerusakan kecil di handle pintu..."
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        onClick={closeCleaningForm}
                                        variant="outline"
                                        className="flex-1 h-11"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing || !data.new_keybox_code}
                                        className="flex-1 bg-green-600 hover:bg-green-700 h-11 text-base shadow-md"
                                    >
                                        {processing ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-5 w-5 mr-2" />
                                                Tandai Property Ready
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
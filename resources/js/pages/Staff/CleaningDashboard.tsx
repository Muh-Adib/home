import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    Layers,
    Tag,
    X,
    ClipboardList,
    AlertCircle,
    MessageSquare,
    Wrench,
    CheckCircle2,
    Award
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
    check_out_time: string;
    current_keybox_code: string | null;
    next_checkin: {
        check_in: string;
        check_in_time: string;
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
    cleanedBy?: {
        name: string;
    } | null;
    cleaned_by?: {
        name: string;
    } | null;
    cleaned_at: string;
}

interface CleaningStats {
    total_checkout_today: number;
    cleaned_today: number;
    pending_cleaning: number;
    high_priority: number;
}

interface MyLowStockItem {
    id: number;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
}

interface RoutineSchedule {
    id: number;
    date: string;
    task_name: string;
    points: string | number;
    is_completed: boolean;
    completed_at: string | null;
}

interface UnitDamage {
    id: number;
    uuid: string;
    title: string;
    description: string;
    photo_path: string | null;
    status: 'pending' | 'in_progress' | 'resolved';
    difficulty: 'easy' | 'medium' | 'hard';
    assigned_to: number | null;
    property?: {
        name: string;
    } | null;
    property_name?: string;
    property_address?: string;
    reporter: {
        name: string;
    };
    latest_booking?: {
        guest_name: string;
        guest_phone: string;
        property_name: string;
    } | null;
    actions: {
        user: { name: string };
        points: string | number;
    }[];
}

interface ActiveStaff {
    id: number;
    name: string;
}

interface PointsSummary {
    routine: number;
    checkout: number;
    damage: number;
    custom: number;
    sharing_pool: number;
    total: number;
}

interface CleaningDashboardProps extends PageProps {
    needsCleaning: CleaningProperty[];
    recentlyCleaned: RecentlyCleaned[];
    stats: CleaningStats;
    inventoryItems: InventoryItem[];
    properties?: { id: number; name: string }[];
    myLowStockItems?: MyLowStockItem[];
    
    // Points-system additions
    pointsSummary: PointsSummary;
    activeRoutineSchedules: RoutineSchedule[];
    availableDamages: UnitDamage[];
    myActiveDamages: UnitDamage[];
    activeStaff: ActiveStaff[];
}

export default function CleaningDashboard({
    needsCleaning,
    recentlyCleaned,
    stats,
    inventoryItems,
    properties = [],
    myLowStockItems = [],
    
    pointsSummary,
    activeRoutineSchedules = [],
    availableDamages = [],
    myActiveDamages = [],
    activeStaff = [],
}: CleaningDashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const [selectedProperty, setSelectedProperty] = useState<CleaningProperty | null>(null);
    const [showCleaningForm, setShowCleaningForm] = useState(false);

    // Shortuct Modal States
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [tempPropertyId, setTempPropertyId] = useState('');

    // Cleaning Form submission
    const { data: cleaningData, setData: setCleaningData, patch: patchCleaning, processing: cleaningProcessing, errors: cleaningErrors, reset: resetCleaning } = useForm({
        new_keybox_code: '',
        notes: '',
        stock_usage: [] as StockUsageItem[],
        cleaner_ids: [] as string[],
    });

    // Quick Usage Input Form
    const usageForm = useForm({
        inventory_item_id: '',
        usage_date: new Date().toISOString().slice(0, 10),
        notes: '',
        usages: [] as { property_id: string; quantity_used: string }[],
    });

    // Quick Purchase Input Form
    const purchaseForm = useForm({
        inventory_item_id: '',
        property_id: '',
        quantity: '',
        unit_cost: '',
        movement_date: new Date().toISOString().slice(0, 10),
        vendor_name: '',
        notes: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Cleaning & Inventory', href: '/staff/cleaning' },
    ];

    const openCleaningForm = (property: CleaningProperty) => {
        setSelectedProperty(property);
        const initialStockUsage = property.stock_template.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity
        }));

        setCleaningData({
            new_keybox_code: '',
            notes: '',
            stock_usage: initialStockUsage,
            cleaner_ids: [auth.user.id.toString()],
        });
        setShowCleaningForm(true);
    };

    const closeCleaningForm = () => {
        setShowCleaningForm(false);
        setSelectedProperty(null);
        resetCleaning();
    };

    const submitCleaning = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProperty) return;

        patchCleaning(route('staff.cleaning.mark-cleaned', selectedProperty.booking_number), {
            onSuccess: () => {
                closeCleaningForm();
            },
            preserveScroll: true,
        });
    };

    // Points-system additions
    const [activeTab, setActiveTab] = useState<'pembersihan' | 'jadwal' | 'kerusakan' | 'poin'>('pembersihan');
    const [selectedDamageToResolve, setSelectedDamageToResolve] = useState<UnitDamage | null>(null);
    const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null);

    const resolveDamageForm = useForm({
        completion_notes: '',
        resolved_photo: null as File | null,
        worker_ids: [] as string[],
    });

    const handleResolvePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            resolveDamageForm.setData('resolved_photo', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setResolvePhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openResolveModal = (damage: UnitDamage) => {
        setSelectedDamageToResolve(damage);
        resolveDamageForm.setData({
            completion_notes: '',
            resolved_photo: null,
            worker_ids: [auth.user.id.toString()],
        });
    };

    const submitResolveDamage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDamageToResolve) return;
        resolveDamageForm.post(route('staff.unit-damages.resolve', selectedDamageToResolve.uuid), {
            onSuccess: () => {
                setSelectedDamageToResolve(null);
                setResolvePhotoPreview(null);
                resolveDamageForm.reset();
            },
            preserveScroll: true,
        });
    };

    const handleClaimDamage = (damageUuid: string) => {
        if (confirm('Apakah Anda ingin mengambil tugas perbaikan kerusakan ini?')) {
            router.post(route('staff.unit-damages.claim', damageUuid), {}, {
                preserveScroll: true,
            });
        }
    };

    const handleCompleteRoutine = (scheduleId: number) => {
        if (confirm('Tandai jadwal rutin harian ini sebagai selesai?')) {
            router.post(route('staff.routine-schedules.complete', scheduleId), {}, {
                preserveScroll: true,
            });
        }
    };

    // Quick Usage Handlers
    const addPropertyRow = () => {
        if (!tempPropertyId) return;
        if (usageForm.data.usages.some(row => row.property_id === tempPropertyId)) return;
        usageForm.setData('usages', [...usageForm.data.usages, { property_id: tempPropertyId, quantity_used: '' }]);
        setTempPropertyId('');
    };

    const removePropertyRow = (index: number) => {
        const updated = [...usageForm.data.usages];
        updated.splice(index, 1);
        usageForm.setData('usages', updated);
    };

    const updatePropertyQty = (index: number, qty: string) => {
        const updated = [...usageForm.data.usages];
        updated[index].quantity_used = qty;
        usageForm.setData('usages', updated);
    };

    const availableProperties = properties?.filter(p =>
        !usageForm.data.usages.some(row => row.property_id === p.id?.toString())
    );

    const submitQuickUsage = (e: React.FormEvent) => {
        e.preventDefault();
        usageForm.post('/admin/inventory/usages', {
            onSuccess: () => {
                usageForm.reset();
                setTempPropertyId('');
                setShowUsageModal(false);
                router.reload();
            }
        });
    };

    // Quick Purchase Handler
    const submitQuickPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        purchaseForm.post('/admin/inventory/purchases', {
            onSuccess: () => {
                purchaseForm.reset();
                setShowPurchaseModal(false);
                router.reload();
            }
        });
    };

    const formatTime = (dateString: string) => {
        return format(new Date(dateString), 'HH:mm', { locale: id });
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Dashboard" />

            <div className="space-y-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                            Dashboard Kebersihan & Stok
                        </h1>
                        <p className="text-sm text-slate-500">
                            Kelola jadwal pembersihan harian, catat pemakaian, dan belanja logistik secara instan.
                        </p>
                    </div>

                    <Button
                        onClick={() => router.reload()}
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5 h-10 px-4 self-start sm:self-auto shadow-sm"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Data
                    </Button>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-100 mb-6 overflow-x-auto gap-2 scrollbar-none">
                    <button
                        onClick={() => setActiveTab('pembersihan')}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all relative shrink-0 ${
                            activeTab === 'pembersihan'
                                ? 'text-primary border-b-2 border-primary font-black'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Pembersihan & Stok
                    </button>
                    <button
                        onClick={() => setActiveTab('jadwal')}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all relative shrink-0 ${
                            activeTab === 'jadwal'
                                ? 'text-primary border-b-2 border-primary font-black'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Jadwal Rutin
                        {activeRoutineSchedules.filter(s => !s.is_completed).length > 0 && (
                            <Badge className="ml-1.5 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                {activeRoutineSchedules.filter(s => !s.is_completed).length}
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('kerusakan')}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all relative shrink-0 ${
                            activeTab === 'kerusakan'
                                ? 'text-primary border-b-2 border-primary font-black'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Laporan Masalah
                        {(availableDamages.filter(d => d.status === 'pending').length + myActiveDamages.length) > 0 && (
                            <Badge className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                {availableDamages.filter(d => d.status === 'pending').length + myActiveDamages.length}
                            </Badge>
                        )}
                    </button>
                    {/* HIDE FOR NOW
                    <button
                        onClick={() => setActiveTab('poin')}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all relative shrink-0 ${
                            activeTab === 'poin'
                                ? 'text-primary border-b-2 border-primary font-black'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Poin & Insentif
                    </button>
                    */}
                </div>

                {/* TAB 1: PEMBERSIHAN & STOK */}
                {activeTab === 'pembersihan' && (
                    <div className="space-y-6">
                        {/* PREMIUM INVENTORY SHORTCUTS PANEL */}
                        <Card className="border-none shadow-md bg-gradient-to-br from-primary/10 to-indigo-50/50 backdrop-blur-md rounded-2xl p-5 border border-primary/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] tracking-wider uppercase font-bold text-primary">Operasional Harian</span>
                                    <h3 className="text-base font-extrabold text-slate-800">Shortcut Pencatatan Logistik</h3>
                                    <p className="text-xs text-slate-500">Input cepat pemakaian harian villa dan belanja stok tanpa meninggalkan dashboard.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="button"
                                        onClick={() => setShowUsageModal(true)}
                                        className="bg-primary hover:bg-primary/95 text-white font-bold px-5 h-11 rounded-xl shadow-md shadow-primary/20 text-xs gap-1.5"
                                    >
                                        <ClipboardList className="h-4 w-4" /> Catat Pemakaian Barang
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setShowPurchaseModal(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 h-11 rounded-xl shadow-md shadow-emerald-600/20 text-xs gap-1.5"
                                    >
                                        <Coins className="h-4 w-4" /> Catat Belanja Stok
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* LOW STOCK ALERTS - PJ SPECIFIC */}
                        {myLowStockItems.length > 0 ? (
                            <Alert variant="destructive" className="border-red-200 bg-red-50/50 rounded-2xl p-5 shadow-sm">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <AlertTitle className="font-extrabold text-red-800 text-sm mb-1.5 flex items-center gap-1.5">
                                    Peringatan Reorder Stok Rendah (Tanggung Jawab Anda)
                                </AlertTitle>
                                <AlertDescription className="text-red-700 text-xs space-y-2.5">
                                    <p>Terdapat <strong>{myLowStockItems.length} barang</strong> di bawah minimum stock yang menugaskan Anda sebagai penanggung jawab:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                                        {myLowStockItems.map((it) => (
                                            <div key={it.id} className="bg-white/80 border border-red-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{it.name}</p>
                                                    <p className="text-[10px] text-slate-400">Min: {it.min_stock} {it.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="destructive" className="rounded-lg text-[10px] px-2 py-0.5 font-bold">
                                                        {it.current_stock} {it.unit}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert className="border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <AlertTitle className="font-bold text-emerald-800 text-xs">Stok Tanggung Jawab Anda Aman</AlertTitle>
                                    <AlertDescription className="text-emerald-700 text-[11px] mt-0.5">Semua barang inventaris yang Anda kelola dalam kondisi stok mencukupi.</AlertDescription>
                                </div>
                            </Alert>
                        )}

                        {/* COMPACT & FUNCTIONAL TASK SUMMARY ROW */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 backdrop-blur-sm p-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perlu Dibersihkan</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <span className="text-2xl font-black text-slate-800">{stats.pending_cleaning}</span>
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 backdrop-blur-sm p-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioritas Tinggi</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-2xl font-black text-red-600">{stats.high_priority}</span>
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 backdrop-blur-sm p-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai Hari Ini</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <span className="text-2xl font-black text-slate-800">{stats.cleaned_today}</span>
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 backdrop-blur-sm p-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Checkout</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    <span className="text-2xl font-black text-slate-800">{stats.total_checkout_today}</span>
                                </div>
                            </Card>
                        </div>

                        {/* Properties Needing Cleaning */}
                        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 font-bold">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Daftar Pembersihan Vila ({needsCleaning.length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Unit yang sudah checkout dan harus segera dibersihkan agar siap ditempati tamu berikutnya.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {needsCleaning.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3 stroke-[1.5]" />
                                        <h3 className="text-base font-bold text-slate-700">Semua Unit Bersih!</h3>
                                        <p className="text-xs text-slate-400 mt-1">Tidak ada unit yang perlu dibersihkan saat ini.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {needsCleaning.map((property) => (
                                            <div key={property.id} className="border border-slate-100 rounded-2xl bg-white/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                                <div className={`h-1.5 w-full ${property.priority === 'high' ? 'bg-red-500' : property.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                                <div className="p-4 md:p-6">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                                        <div className="space-y-3 flex-1">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <h3 className="text-base font-extrabold text-slate-800">{property.property_name}</h3>
                                                                    {property.priority === 'high' ? (
                                                                        <Badge className="bg-red-50 text-red-700 border-red-100 font-bold text-[10px] uppercase">Prioritas Tinggi</Badge>
                                                                    ) : property.priority === 'medium' ? (
                                                                        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-100 font-bold text-[10px] uppercase">Menengah</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase">Rendah</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                                    <MapPin className="h-4 w-4" />
                                                                    <span className="text-xs font-semibold">{property.property_address}</span>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-xs">
                                                                <div>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tamu Checkout</span>
                                                                    <span className="font-bold text-slate-700 truncate max-w-[120px] block">{property.guest_name} ({property.guest_count} Pax)</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jam Checkout</span>
                                                                    <span className="font-bold text-slate-700">{property.check_out_time} WIB</span>
                                                                </div>
                                                                {property.next_checkin && (
                                                                    <div className="col-span-2 sm:col-span-1">
                                                                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Next Check-In</span>
                                                                        <span className="font-bold text-red-600">
                                                                            {formatDate(property.next_checkin.check_in)} • {property.next_checkin.check_in_time} WIB ({property.next_checkin.guest_name})
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 shrink-0 md:w-48">
                                                            <Button
                                                                onClick={() => openCleaningForm(property)}
                                                                className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 rounded-xl shadow-md shadow-primary/10 gap-1.5 text-xs"
                                                            >
                                                                <CheckCircle className="h-4 w-4" /> Tandai Selesai
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

                        {/* Recently Cleaned List */}
                        {recentlyCleaned.length > 0 && (
                            <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <CardTitle className="flex items-center gap-2 text-slate-800 font-bold">
                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                        Riwayat Pembersihan Hari Ini
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <div className="space-y-3">
                                        {recentlyCleaned.map((cleaned) => (
                                            <div key={cleaned.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                                                <div className="mb-2 sm:mb-0">
                                                    <p className="font-extrabold text-slate-700 text-base">{cleaned.property.name}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                                                        <User className="h-3.5 w-3.5" />
                                                        Dibersihkan oleh {cleaned.cleanedBy?.name || cleaned.cleaned_by?.name || 'Staff'}
                                                        <span>•</span>
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Pukul {formatTime(cleaned.cleaned_at)}
                                                    </p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <div className="flex items-center gap-2 text-xs justify-start sm:justify-end font-semibold text-slate-500">
                                                        <span>Kode Keybox Baru:</span>
                                                        <code className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg font-bold font-mono text-base border border-yellow-200/50">
                                                            {cleaned.property.current_keybox_code}
                                                        </code>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Diupdate {formatTime(cleaned.property.keybox_updated_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* TAB 2: JADWAL RUTIN */}
                {activeTab === 'jadwal' && (
                    <div className="space-y-4">
                        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    Jadwal Rutin Saya
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Daftar penugasan laundry, kebersihan, atau standby malam yang didelegasikan untuk Anda hari ini dan kemarin.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {activeRoutineSchedules.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3 stroke-[1.5]" />
                                        <h3 className="text-sm font-bold text-slate-700">Bebas Tugas Hari Ini</h3>
                                        <p className="text-xs text-slate-400 mt-1">Anda tidak memiliki penugasan jadwal rutin aktif.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeRoutineSchedules.map((sched) => (
                                            <div key={sched.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors bg-white/50">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-slate-700 text-sm capitalize">
                                                            {sched.task_name}
                                                        </span>
                                                        <Badge className="bg-blue-50 text-blue-700 border-none text-[10px] font-extrabold">
                                                            +{sched.points} Poin
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                                        Untuk tanggal: {format(new Date(sched.date), 'eeee, dd MMM yyyy', { locale: id })}
                                                    </p>
                                                </div>
                                                <div className="mt-3 sm:mt-0 flex items-center gap-2">
                                                    {sched.is_completed ? (
                                                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                                                            <CheckCircle2 className="h-4 w-4" /> Selesai ({sched.completed_at ? formatTime(sched.completed_at) : ''})
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleCompleteRoutine(sched.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-xl shadow-sm"
                                                        >
                                                            Tandai Selesai
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 3: LAPORAN MASALAH */}
                {activeTab === 'kerusakan' && (
                    <div className="space-y-6">
                        {/* 1. MY ACTIVE TASKS */}
                        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                                    <Wrench className="h-5 w-5 text-indigo-500" />
                                    Tugas Perbaikan Aktif Saya ({myActiveDamages.length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Kerusakan yang sedang Anda tangani. Hubungi tamu terlebih dahulu dan upload foto bukti saat selesai.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {myActiveDamages.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
                                        <h3 className="text-sm font-bold text-slate-700">Tidak Ada Tugas Aktif</h3>
                                        <p className="text-xs text-slate-400 mt-1">Ambil tugas perbaikan dari daftar di bawah jika tersedia.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {myActiveDamages.map((dmg) => {
                                            // Prepare WhatsApp link
                                            const guestName = dmg.latest_booking?.guest_name || 'Tamu';
                                            const guestPhone = dmg.latest_booking?.guest_phone ? dmg.latest_booking.guest_phone.replace(/\D/g, '') : '';
                                            const propName = dmg.property_name || 'Homestay';
                                            const waMsg = `Halo ${guestName}, saya staff housekeeping homestay ${propName}. Saya akan kesana untuk menyelesaikan laporan kerusakan: ${dmg.title}. Mohon di tunggu.`;
                                            const waLink = guestPhone ? `https://wa.me/${guestPhone}?text=${encodeURIComponent(waMsg)}` : '#';

                                            return (
                                                <div key={dmg.id} className="border border-slate-100 rounded-2xl p-4 bg-white/50 space-y-4 shadow-sm flex flex-col justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-indigo-600 block">{dmg.property_name}</span>
                                                                <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{dmg.title}</h4>
                                                            </div>
                                                            <Badge variant="outline" className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded capitalize ${
                                                                dmg.difficulty === 'easy' ? 'text-green-700 bg-green-50/50 border-green-200' :
                                                                dmg.difficulty === 'medium' ? 'text-amber-700 bg-amber-50/50 border-amber-200' :
                                                                'text-red-700 bg-red-50/50 border-red-200'
                                                            }`}>
                                                                {dmg.difficulty === 'easy' ? '2 Pts' : dmg.difficulty === 'medium' ? '5 Pts' : '10 Pts'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium line-clamp-2">{dmg.description}</p>
                                                        
                                                        {dmg.latest_booking && (
                                                            <div className="bg-slate-100/50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                                                                <p className="text-slate-700"><strong className="text-slate-800">Tamu Menginap:</strong> {dmg.latest_booking.guest_name}</p>
                                                                {guestPhone && (
                                                                    <a 
                                                                        href={waLink} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline mt-1 bg-white px-2 py-1 rounded border"
                                                                    >
                                                                        <MessageSquare className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                                                                        Hubungi Tamu (wa.me)
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                                                        <Button
                                                            onClick={() => openResolveModal(dmg)}
                                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-xl shadow-sm"
                                                        >
                                                            Selesaikan Tugas
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. AVAILABLE CLAIMABLE TASKS */}
                        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Daftar Kerusakan Tersedia ({availableDamages.filter(d => d.status === 'pending').length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Laporan kerusakan pending yang bisa diambil oleh staff housekeeping secara sukarela.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {availableDamages.filter(d => d.status === 'pending').length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3 stroke-[1.5]" />
                                        <h3 className="text-sm font-bold text-slate-700">Semua Masalah Beres!</h3>
                                        <p className="text-xs text-slate-400 mt-1">Tidak ada laporan kerusakan pending yang memerlukan bantuan saat ini.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableDamages.filter(d => d.status === 'pending').map((dmg) => (
                                            <div key={dmg.id} className="border border-slate-100 rounded-2xl p-4 bg-white/50 space-y-4 shadow-sm flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{dmg.property_name}</span>
                                                            <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{dmg.title}</h4>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded capitalize ${
                                                            dmg.difficulty === 'easy' ? 'text-green-700 bg-green-50 border-green-200' :
                                                            dmg.difficulty === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                                            'text-red-700 bg-red-50 border-red-200'
                                                        }`}>
                                                            {dmg.difficulty === 'easy' ? 'Mudah (2 Pts)' :
                                                             dmg.difficulty === 'medium' ? 'Sedang (5 Pts)' :
                                                             'Sulit (10 Pts)'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{dmg.description}</p>
                                                    <p className="text-[10px] text-slate-400">Dilaporkan oleh: {dmg.reporter.name}</p>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <Button
                                                        onClick={() => handleClaimDamage(dmg.uuid)}
                                                        className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-9 text-xs rounded-xl"
                                                    >
                                                        Ambil Tugas Perbaikan
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 4: POIN & INSENTIF */}
                {false && activeTab === 'poin' && (
                    <div className="space-y-6">
                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 p-4 border">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poin Pembersihan Vila</div>
                                <div className="text-xl font-black text-slate-800 mt-1">
                                    {pointsSummary.checkout.toFixed(2)} Pts
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 p-4 border">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poin Jadwal Rutin</div>
                                <div className="text-xl font-black text-slate-800 mt-1">
                                    {pointsSummary.routine.toFixed(2)} Pts
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 p-4 border">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poin Perbaikan Kerusakan</div>
                                <div className="text-xl font-black text-slate-800 mt-1">
                                    {pointsSummary.damage.toFixed(2)} Pts
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-white/70 p-4 border">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poin Tugas Khusus</div>
                                <div className="text-xl font-black text-slate-800 mt-1">
                                    {pointsSummary.custom.toFixed(2)} Pts
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-blue-50/50 border border-blue-100 p-4">
                                <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Poin Sharing Pool (0.7%)</div>
                                <div className="text-xl font-black text-blue-800 mt-1">
                                    {pointsSummary.sharing_pool.toFixed(2)} Pts
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-50 p-4 border border-primary/10">
                                <div className="text-[10px] font-black text-primary uppercase tracking-wider">Total Poin Saya Bulan Ini</div>
                                <div className="text-xl font-black text-slate-800 mt-1 flex items-center gap-1.5">
                                    <Award className="h-5 w-5 text-primary animate-pulse" />
                                    {pointsSummary.total.toFixed(2)} Pts
                                </div>
                            </Card>
                        </div>

                        {/* Rules info */}
                        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden p-5 space-y-4">
                            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                <Sparkles className="h-4.5 w-4.5 text-primary" />
                                Informasi Nilai & Konversi Poin Gaji Anda
                            </h3>
                            <div className="text-xs text-slate-600 space-y-3 font-medium leading-relaxed">
                                <p>
                                    Bonus points bulanan Anda akan dikonversi menjadi insentif uang tunai yang langsung dicairkan bersamaan dengan Slip Gaji Anda di akhir bulan.
                                </p>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <strong className="text-slate-800 block text-[11px] uppercase tracking-wider">1. Pembagian Poin Rata</strong>
                                        <span>Untuk pembersihan homestay, perbaikan unit, dan tugas khusus, poin yang didapatkan dari tugas tersebut akan otomatis dibagi rata kepada seluruh staff kebersihan yang terdaftar menyelesaikan tugas tersebut secara real-time.</span>
                                    </div>
                                    <div className="space-y-1">
                                        <strong className="text-slate-800 block text-[11px] uppercase tracking-wider">2. Program Sharing Pool</strong>
                                        <span>Setiap akhir bulan, 0.7% dari Omset Bersih seluruh properti aktif (non-defisit) dikumpulkan ke dalam satu pool bonus, kemudian dicairkan secara proporsional kepada staff kebersihan berdasarkan poin yang mereka kumpulkan.</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 1. SHORTCUT: QUICK USAGE INPUT MODAL */}
                <Dialog open={showUsageModal} onOpenChange={setShowUsageModal}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-800">Catat Pemakaian Harian</DialogTitle>
                            <DialogDescription className="text-xs">Pilih barang dan laporkan jumlah pemakaian untuk properti.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitQuickUsage} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Pilih Barang</Label>
                                <select
                                    value={usageForm.data.inventory_item_id}
                                    onChange={(e) => usageForm.setData('inventory_item_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl h-10 text-xs px-3 outline-none"
                                    required
                                >
                                    <option value="">Pilih Item...</option>
                                    {inventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 font-bold">Pilih Tanggal</Label>
                                <Input
                                    type="date"
                                    value={usageForm.data.usage_date}
                                    onChange={(e) => usageForm.setData('usage_date', e.target.value)}
                                    className="rounded-xl bg-slate-50"
                                    required
                                />
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <Layers className="h-4 w-4 text-primary" /> Distribusi Properti / Unit
                                </Label>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <select
                                            value={tempPropertyId}
                                            onChange={(e) => setTempPropertyId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl h-9 text-xs px-2 outline-none"
                                        >
                                            <option value="">Pilih Properti...</option>
                                            {availableProperties.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button type="button" size="sm" onClick={addPropertyRow} className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold gap-1 text-xs border border-slate-205">
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {usageForm.data.usages.length > 0 ? (
                                    <div className="space-y-2 p-2 bg-slate-50/50 border border-slate-100 rounded-xl max-h-[160px] overflow-y-auto">
                                        {usageForm.data.usages.map((row, idx) => {
                                            const prop = properties.find(p => p.id?.toString() === row.property_id);
                                            return (
                                                <div key={row.property_id} className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <span className="text-xs font-semibold text-slate-700 truncate flex-1">{prop?.name}</span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Input
                                                            type="number"
                                                            placeholder="Qty"
                                                            min="0.0001"
                                                            step="any"
                                                            value={row.quantity_used}
                                                            onChange={(e) => updatePropertyQty(idx, e.target.value)}
                                                            className="h-8 w-20 text-xs rounded-lg text-center font-bold"
                                                            required
                                                        />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePropertyRow(idx)} className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                                        Tambahkan minimal 1 properti.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Keperluan / Catatan</Label>
                                <Input
                                    placeholder="Catatan opsional..."
                                    value={usageForm.data.notes}
                                    onChange={(e) => usageForm.setData('notes', e.target.value)}
                                    className="rounded-xl bg-slate-50"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowUsageModal(false)} className="rounded-xl">Batal</Button>
                                <Button type="submit" disabled={usageForm.processing || usageForm.data.usages.length === 0} className="rounded-xl bg-primary text-white font-bold shadow-md shadow-primary/20">Simpan Pemakaian</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 2. SHORTCUT: QUICK PURCHASE INPUT MODAL */}
                <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-800">Catat Belanja Stok Baru</DialogTitle>
                            <DialogDescription className="text-xs">Catat pembelian barang atau belanja supplies operasional.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitQuickPurchase} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Pilih Barang</Label>
                                <select
                                    value={purchaseForm.data.inventory_item_id}
                                    onChange={(e) => purchaseForm.setData('inventory_item_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl h-10 text-xs px-3 outline-none"
                                    required
                                >
                                    <option value="">Pilih Item...</option>
                                    {inventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 font-bold">Tujuan Lokasi</Label>
                                <select
                                    value={purchaseForm.data.property_id}
                                    onChange={(e) => purchaseForm.setData('property_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl h-10 text-xs px-3 outline-none"
                                >
                                    <option value="">Global / Gudang Umum</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Jumlah (Qty)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={purchaseForm.data.quantity}
                                        onChange={(e) => purchaseForm.setData('quantity', e.target.value)}
                                        className="rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Harga Satuan (Rp)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={purchaseForm.data.unit_cost}
                                        onChange={(e) => purchaseForm.setData('unit_cost', e.target.value)}
                                        className="rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Tanggal Belanja</Label>
                                <Input
                                    type="date"
                                    value={purchaseForm.data.movement_date}
                                    onChange={(e) => purchaseForm.setData('movement_date', e.target.value)}
                                    className="rounded-xl bg-slate-50"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Vendor / Toko</Label>
                                <Input
                                    placeholder="Contoh: Lotte Mart / Alfamart"
                                    value={purchaseForm.data.vendor_name}
                                    onChange={(e) => purchaseForm.setData('vendor_name', e.target.value)}
                                    className="rounded-xl bg-slate-50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Catatan Belanja</Label>
                                <Input
                                    placeholder="Keterangan..."
                                    value={purchaseForm.data.notes}
                                    onChange={(e) => purchaseForm.setData('notes', e.target.value)}
                                    className="rounded-xl bg-slate-50"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowPurchaseModal(false)} className="rounded-xl">Batal</Button>
                                <Button type="submit" disabled={purchaseForm.processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20">Simpan Belanja</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 3. CLEANING FORM MODAL */}
                <Dialog open={showCleaningForm} onOpenChange={setShowCleaningForm}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-800">Konfirmasi Unit Ready</DialogTitle>
                            <CardDescription className="text-xs">
                                Pastikan unit sudah bersih standar dan siap digunakan tamu.
                            </CardDescription>
                        </DialogHeader>

                        {selectedProperty && (
                            <form onSubmit={submitCleaning} className="space-y-5 mt-2">
                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs space-y-1.5">
                                    <p className="text-slate-600"><strong className="text-slate-800">Property:</strong> {selectedProperty.property_name}</p>
                                    <p className="text-slate-600"><strong className="text-slate-800">Kode Lama:</strong> {selectedProperty.current_keybox_code || '-'}</p>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-3">
                                    <Label htmlFor="new_keybox_code" className="text-sm font-bold text-slate-700">
                                        1. Masukkan Kode Keybox Baru <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="new_keybox_code"
                                                type="text"
                                                maxLength={3}
                                                pattern="\d{3}"
                                                value={cleaningData.new_keybox_code}
                                                onChange={(e) => setCleaningData('new_keybox_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                placeholder="Contoh: 123"
                                                className={`pl-9 text-lg font-bold font-mono tracking-widest rounded-xl h-10 ${cleaningErrors.new_keybox_code ? 'border-red-500' : 'border-slate-200'}`}
                                                required
                                            />
                                        </div>
                                        <Button type="button" variant="outline" onClick={() => setCleaningData('new_keybox_code', Math.floor(100 + Math.random() * 900).toString())} className="rounded-xl border-slate-200 h-10 px-4 font-semibold text-xs">
                                            Acak
                                        </Button>
                                    </div>
                                    {cleaningErrors.new_keybox_code && (
                                        <p className="text-xs text-red-500">{cleaningErrors.new_keybox_code}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                        Wajib 3 digit angka. Kode ini akan ditampilkan ke tamu di dashboard.
                                    </p>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            <Package className="h-4 w-4 text-primary" />
                                            2. Pemakaian Stok / Amenities
                                        </Label>
                                        <Button type="button" size="sm" variant="secondary" onClick={() => {
                                            const unusedItem = inventoryItems.find(item => !cleaningData.stock_usage.some(usage => usage.item_id === item.id));
                                            if (unusedItem) {
                                                setCleaningData('stock_usage', [...cleaningData.stock_usage, { item_id: unusedItem.id, quantity: 1 }]);
                                            }
                                        }} className="rounded-lg text-[10px] h-7 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold gap-0.5">
                                            <Plus className="h-3 w-3" /> Tambah Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2 border border-slate-100 rounded-xl p-3 overflow-y-auto bg-slate-50/50">
                                        {cleaningData.stock_usage.length === 0 ? (
                                            <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                                                Belum ada pemakaian dicatat. Klik "Tambah Item" jika ada pemakaian.
                                            </div>
                                        ) : (
                                            cleaningData.stock_usage.map((usage, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <select
                                                        className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs outline-none focus:border-primary"
                                                        value={usage.item_id}
                                                        onChange={(e) => {
                                                            const updated = [...cleaningData.stock_usage];
                                                            updated[index].item_id = parseInt(e.target.value);
                                                            setCleaningData('stock_usage', updated);
                                                        }}
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
                                                        className="w-20 h-9 rounded-lg text-center"
                                                        value={usage.quantity}
                                                        min={0.1}
                                                        step={0.1}
                                                        onChange={(e) => {
                                                            const updated = [...cleaningData.stock_usage];
                                                            updated[index].quantity = parseFloat(e.target.value);
                                                            setCleaningData('stock_usage', updated);
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        onClick={() => {
                                                            const updated = [...cleaningData.stock_usage];
                                                            updated.splice(index, 1);
                                                            setCleaningData('stock_usage', updated);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">
                                        *Daftar diisi otomatis dari standar kebutuhan pembersihan unit. Sesuaikan jika berbeda.
                                    </p>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-slate-700">
                                        3. Partner Kebersihan (Bagi Rata Poin)
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2 border border-slate-100 p-3 bg-slate-50/55 rounded-xl max-h-[140px] overflow-y-auto">
                                        {activeStaff.map((s) => {
                                            const isChecked = cleaningData.cleaner_ids.includes(s.id.toString());
                                            return (
                                                <div key={s.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`cleaner-${s.id}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            const currentIds = [...cleaningData.cleaner_ids];
                                                            if (checked) {
                                                                currentIds.push(s.id.toString());
                                                            } else {
                                                                const idx = currentIds.indexOf(s.id.toString());
                                                                if (idx > -1) currentIds.splice(idx, 1);
                                                            }
                                                            setCleaningData('cleaner_ids', currentIds);
                                                        }}
                                                    />
                                                    <label htmlFor={`cleaner-${s.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                                        {s.name}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        Pilih staff kebersihan yang bersama-sama mengerjakan unit ini. Poin cleaning properti ini akan dibagi rata.
                                    </p>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-bold text-slate-700">4. Catatan Tambahan (Opsional)</Label>
                                    <Textarea
                                        id="notes"
                                        value={cleaningData.notes}
                                        onChange={(e) => setCleaningData('notes', e.target.value)}
                                        placeholder="Contoh: Lampu kamar mandi mati, dll..."
                                        rows={2}
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <Button
                                        type="button"
                                        onClick={closeCleaningForm}
                                        variant="outline"
                                        className="flex-1 h-10 rounded-xl border-slate-200"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={cleaningProcessing || !cleaningData.new_keybox_code}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-md shadow-emerald-600/10"
                                    >
                                        {cleaningProcessing ? 'Menyimpan...' : 'Tandai Property Ready'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                {/* 2. TASK RESOLUTION: RESOLVE DAMAGE DIALOG */}
                <Dialog open={selectedDamageToResolve !== null} onOpenChange={(open) => { if (!open) setSelectedDamageToResolve(null); }}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-800">Selesaikan Laporan Kerusakan</DialogTitle>
                            <DialogDescription className="text-xs">
                                Upload bukti foto dan catat laporan penyelesaian masalah.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitResolveDamage} className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-indigo-600 block">{selectedDamageToResolve?.property_name || 'Homestay'}</span>
                                <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedDamageToResolve?.title}</h4>
                                <p className="text-xs text-slate-500">{selectedDamageToResolve?.description}</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Foto Bukti Perbaikan <span className="text-red-500">*</span></Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleResolvePhotoChange}
                                    className="rounded-xl bg-slate-50"
                                    required
                                />
                                {resolvePhotoPreview && (
                                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-h-[150px] flex items-center justify-center bg-slate-50">
                                        <img src={resolvePhotoPreview} alt="Preview" className="max-h-[150px] object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Catatan Penyelesaian <span className="text-red-500">*</span></Label>
                                <Textarea
                                    value={resolveDamageForm.data.completion_notes}
                                    onChange={(e) => resolveDamageForm.setData('completion_notes', e.target.value)}
                                    placeholder="Jelaskan perbaikan yang telah dilakukan..."
                                    className="rounded-xl border-slate-200"
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-700">
                                    Pilih Staff yang Mengerjakan (Bagi Rata Poin)
                                </Label>
                                <div className="grid grid-cols-2 gap-2 border border-slate-100 p-3 bg-slate-50/55 rounded-xl max-h-[140px] overflow-y-auto">
                                    {activeStaff.map((s) => {
                                        const isChecked = resolveDamageForm.data.worker_ids.includes(s.id.toString());
                                        return (
                                            <div key={s.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`resolve-worker-${s.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        const currentIds = [...resolveDamageForm.data.worker_ids];
                                                        if (checked) {
                                                            currentIds.push(s.id.toString());
                                                        } else {
                                                            const idx = currentIds.indexOf(s.id.toString());
                                                            if (idx > -1) currentIds.splice(idx, 1);
                                                        }
                                                        resolveDamageForm.setData('worker_ids', currentIds);
                                                    }}
                                                />
                                                <label htmlFor={`resolve-worker-${s.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                                    {s.name}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Pilih staff kebersihan yang bersama-sama menyelesaikan kerusakan ini. Poin perbaikan kerusakan ini akan dibagi rata.
                                </p>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedDamageToResolve(null)}
                                    className="rounded-xl border-slate-200"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={resolveDamageForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                                >
                                    {resolveDamageForm.processing ? 'Menyimpan...' : 'Selesaikan Tugas'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
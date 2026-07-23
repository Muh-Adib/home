import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, Link, router } from '@inertiajs/react';
import { CheckCircle2, XCircle, MoreVertical, Edit, Trash2, ArrowUpRight, ArrowDownRight, Minus, Search, ArrowUpDown, Calendar, HelpCircle, FileText, Plus, X, Layers, UserCheck, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

function rp(amount: number) {
  const val = Math.round(amount || 0);
  return 'Rp ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function Usages({ items, properties, usages, usageStats, filters }: any) {
    const [editItem, setEditItem] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search || '');
    const [sortDirection, setSortDirection] = useState(filters?.direction || 'desc');
    const [mounted, setMounted] = useState(false);
    const [tempPropertyId, setTempPropertyId] = useState('');

    // Date Filters
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters?.search || '')) {
                applyFilters(search, sortDirection);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [search]);

    const applyFilters = (currentSearch = search, direction = sortDirection, from = dateFrom, to = dateTo) => {
        router.get('/admin/inventory/usages', {
            search: currentSearch,
            direction,
            date_from: from,
            date_to: to
        }, { preserveState: true, replace: true });
    };

    const handleSort = (dir: string) => {
        setSortDirection(dir);
        applyFilters(search, dir);
    };

    const setMonthShortcut = (shortcut: 'this' | 'last' | 'all') => {
        if (shortcut === 'this') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setDateFrom(start);
            setDateTo(end);
            applyFilters(search, sortDirection, start, end);
        } else if (shortcut === 'last') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            setDateFrom(start);
            setDateTo(end);
            applyFilters(search, sortDirection, start, end);
        } else {
            setDateFrom('');
            setDateTo('');
            applyFilters(search, sortDirection, '', '');
        }
    };

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDateFrom, setExportDateFrom] = useState('');
    const [exportDateTo, setExportDateTo] = useState('');

    const setExportMonthShortcut = (shortcut: 'this' | 'last' | 'all') => {
        if (shortcut === 'this') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setExportDateFrom(start);
            setExportDateTo(end);
        } else if (shortcut === 'last') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            setExportDateFrom(start);
            setExportDateTo(end);
        } else {
            setExportDateFrom('');
            setExportDateTo('');
        }
    };

    const handleExportDownload = () => {
        let url = '/admin/inventory/usages/export';
        const params = [];
        if (exportDateFrom) params.push(`date_from=${exportDateFrom}`);
        if (exportDateTo) params.push(`date_to=${exportDateTo}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        window.location.href = url;
        setShowExportModal(false);
    };

    const { data, setData, post, put, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        inventory_item_id: '',
        property_id: '',
        usage_date: '',
        quantity_used: '',
        notes: '',
        usages: [] as { property_id: string; quantity_used: string }[],
    });

    useEffect(() => {
        setMounted(true);
        if (!data.usage_date) {
            setData('usage_date', new Date().toISOString().slice(0, 10));
        }
    }, []);

    const formatDate = (dateStr: string) => {
        if (!mounted || !dateStr) return '';
        return new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const addPropertyRow = () => {
        if (!tempPropertyId) return;
        if (data.usages.some(row => row.property_id === tempPropertyId)) return;
        setData('usages', [...data.usages, { property_id: tempPropertyId, quantity_used: '' }]);
        setTempPropertyId('');
    };

    const removePropertyRow = (index: number) => {
        const updated = [...data.usages];
        updated.splice(index, 1);
        setData('usages', updated);
    };

    const updatePropertyQty = (index: number, qty: string) => {
        const updated = [...data.usages];
        updated[index].quantity_used = qty;
        setData('usages', updated);
    };

    const availableProperties = [
        ...(data.usages.some(row => row.property_id === 'kitchen') ? [] : [{ id: 'kitchen', name: 'Scope Dapur' }]),
        ...(data.usages.some(row => row.property_id === 'laundry') ? [] : [{ id: 'laundry', name: 'Scope Laundry' }]),
        ...(data.usages.some(row => row.property_id === 'global' || row.property_id === '') ? [] : [{ id: 'global', name: 'Perusahaan (Global)' }]),
        ...(properties?.filter((p: any) => !data.usages.some(row => row.property_id === p.id?.toString())) || [])
    ];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editItem) {
            put(`/admin/inventory/usages/${editItem.id}`, {
                onSuccess: () => {
                    setEditItem(null);
                    reset();
                }
            });
        } else {
            post('/admin/inventory/usages', {
                onSuccess: () => {
                    reset('quantity_used', 'notes', 'usages');
                    setTempPropertyId('');
                }
            });
        }
    };

    const handleDelete = () => {
        if (deleteId) {
            destroy(`/admin/inventory/usages/${deleteId}`, {
                onSuccess: () => setDeleteId(null)
            });
        }
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setData({
            inventory_item_id: item.inventory_item_id?.toString() || '',
            property_id: item.property_id?.toString() || '',
            usage_date: item.usage_date.split('T')[0],
            quantity_used: String(item.quantity_used),
            notes: item.notes || '',
            usages: [],
        });
        clearErrors();
    };

    const closeEdit = () => {
        setEditItem(null);
        reset();
        clearErrors();
        setTempPropertyId('');
    };

    return (
        <AdminLayout title="Inventaris - Pemakaian Harian" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }, { title: 'Usage' }]}>
            
            {/* Usage Stats Section with Premium Design */}
            <div className="mb-8 max-w-7xl mx-auto">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                  <ArrowUpDown className="h-4 w-4 text-primary" /> Perbandingan Pemakaian (Bulan Ini vs Lalu)
                </h2>
                <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-slate-100 bg-white/40 backdrop-blur-sm">
                    <div className="flex w-max space-x-5 p-5">
                        {usageStats?.length > 0 ? (
                            usageStats.map((stat: any, idx: number) => (
                                <Card key={idx} className="w-[310px] shrink-0 border-none shadow-md rounded-2xl bg-white/90">
                                    <CardHeader className="pb-3 border-b border-slate-50">
                                        <CardTitle className="text-sm font-black text-slate-700 truncate">{stat.property_name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-3">
                                        {stat.stats.slice(0, 5).map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <div className="truncate max-w-[110px] font-medium text-slate-600" title={item.item_name}>{item.item_name}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-semibold">{item.last_qty} {item.unit}</span>
                                                    <span className="text-[10px] text-slate-400">→</span>
                                                    <span className="font-bold text-slate-700">{item.current_qty} {item.unit}</span>
                                                    {item.diff > 0 ? (
                                                        <Badge variant="outline" className="text-red-600 border-red-100 bg-red-50/50 px-1.5 py-0 h-5 font-bold text-[10px]">
                                                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                                            {item.percent_change}%
                                                        </Badge>
                                                    ) : item.diff < 0 ? (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50/50 px-1.5 py-0 h-5 font-bold text-[10px]">
                                                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                                                            {Math.abs(item.percent_change)}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-400 border-slate-100 bg-slate-50 px-1.5 py-0 h-5">
                                                            <Minus className="w-2.5 h-2.5" />
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {stat.stats.length > 5 && (
                                            <div className="text-[10px] text-center font-bold text-slate-400 pt-2 border-t border-slate-50">
                                                +{stat.stats.length - 5} item lainnya
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="p-4 text-xs font-semibold text-slate-400 flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Belum ada data pemakaian yang cukup untuk perbandingan.</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 max-w-7xl mx-auto">
                
                {/* Input Form Card */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                    <Card className="sticky top-4 border-none shadow-lg bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md rounded-2xl">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{editItem ? 'Edit Pemakaian' : 'Input Pemakaian Baru'}</CardTitle>
                                <CardDescription className="text-xs">Catat penggunaan barang inventaris.</CardDescription>
                              </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={submit}>
                                <div className="space-y-2">
                                    <Label htmlFor="item" className="text-sm font-semibold text-slate-700">Item</Label>
                                    <select
                                        id="item"
                                        value={data.inventory_item_id || ''}
                                        onChange={(e) => setData('inventory_item_id', e.target.value)}
                                        disabled={!!editItem}
                                        className={cn("w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-10 text-xs px-3 outline-none transition-all cursor-pointer appearance-none", errors.inventory_item_id && "border-red-500")}
                                    >
                                        <option value="">Pilih Item Barang...</option>
                                        {items?.map((it: any) => (
                                            <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                                        ))}
                                    </select>
                                    {errors.inventory_item_id && <p className="text-xs text-red-500">{errors.inventory_item_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date" className="text-sm font-semibold text-slate-700">Tanggal Pemakaian</Label>
                                    <div className="relative">
                                      <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                      <Input
                                          id="date"
                                          type="date"
                                          value={data.usage_date}
                                          onChange={(e) => setData('usage_date', e.target.value)}
                                          className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.usage_date && "border-red-500")}
                                      />
                                    </div>
                                    {errors.usage_date && <p className="text-xs text-red-500">{errors.usage_date}</p>}
                                </div>

                                {editItem ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="property" className="text-sm font-semibold text-slate-700">Properti Target</Label>
                                            <select
                                                id="property"
                                                value={data.property_id || ''}
                                                onChange={(e) => setData('property_id', e.target.value)}
                                                className={cn("w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-10 text-xs px-3 outline-none transition-all cursor-pointer appearance-none", errors.property_id && "border-red-500")}
                                            >
                                                <option value="">Perusahaan (Global)</option>
                                                {properties?.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            {errors.property_id && <p className="text-xs text-red-500">{errors.property_id}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="qty" className="text-sm font-semibold text-slate-700">Jumlah Digunakan</Label>
                                            <Input
                                                id="qty"
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                value={data.quantity_used}
                                                onChange={(e) => setData('quantity_used', e.target.value)}
                                                className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.quantity_used && "border-red-500")}
                                            />
                                            {errors.quantity_used && <p className="text-xs text-red-500">{errors.quantity_used}</p>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                            <Layers className="h-4 w-4 text-primary" /> Input Pemakaian Properti
                                        </Label>
                                        
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-slate-500">Pilih Properti / Target</Label>
                                                <select
                                                    value={tempPropertyId}
                                                    onChange={(e) => setTempPropertyId(e.target.value)}
                                                    className="w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-9 text-xs px-2 outline-none transition-all cursor-pointer appearance-none animate-none"
                                                >
                                                    <option value="">Pilih Target Pemakaian...</option>
                                                    {availableProperties?.map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <Button type="button" size="sm" onClick={addPropertyRow} className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold gap-1 text-xs border border-slate-205">
                                                <Plus className="h-3.5 w-3.5" /> Tambah
                                            </Button>
                                        </div>

                                        {data.usages.length > 0 ? (
                                            <div className="space-y-2 mt-2 p-2 bg-slate-50/50 border border-slate-100 rounded-xl max-h-[220px] overflow-y-auto">
                                                {data.usages.map((row, idx) => {
                                                    const prop = row.property_id === 'kitchen' ? { name: 'Scope Dapur' } : row.property_id === 'laundry' ? { name: 'Scope Laundry' } : row.property_id === 'global' || row.property_id === '' ? { name: 'Global' } : properties.find((p: any) => p.id?.toString() === row.property_id);
                                                    return (
                                                        <div key={row.property_id} className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                            <span className="text-xs font-semibold text-slate-700 truncate flex-1">{prop?.name || 'Global'}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Jumlah"
                                                                    min="0.0001"
                                                                    step="any"
                                                                    value={row.quantity_used}
                                                                    onChange={(e) => updatePropertyQty(idx, e.target.value)}
                                                                    className="h-8 w-20 text-xs rounded-lg text-center font-bold"
                                                                    required
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removePropertyRow(idx)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs flex flex-col items-center gap-1">
                                                <Layers className="h-6 w-6 stroke-[1.5]" />
                                                <span>Tambahkan properti untuk menginput jumlah.</span>
                                            </div>
                                        )}
                                        {errors.usages && <p className="text-xs text-red-500 mt-1">{errors.usages}</p>}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Catatan & Keperluan</Label>
                                    <Input id="notes" placeholder="Contoh: Pembersihan kamar mandi" value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all" />
                                    {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {editItem && (
                                        <Button type="button" variant="outline" onClick={closeEdit} className="flex-1 rounded-xl border-slate-200">Batal</Button>
                                    )}
                                    <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/10" disabled={processing || (!editItem && data.usages.length === 0)}>
                                        {editItem ? 'Simpan' : 'Simpan Data'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Data Section */}
                <div className="lg:col-span-2 order-2 lg:order-1">
                    <Card className="border-none shadow-lg bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-full">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-800">Riwayat Pemakaian</CardTitle>
                                    <CardDescription className="text-xs">Daftar pemakaian barang operasional di properti villa.</CardDescription>
                                </div>

                                {/* Export Action Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setExportDateFrom(dateFrom);
                                    setExportDateTo(dateTo);
                                    setShowExportModal(true);
                                  }}
                                  className="rounded-xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-semibold gap-1.5 h-9 px-3.5 shadow-sm"
                                >
                                  <FileSpreadsheet className="h-4 w-4" /> Export Excel
                                </Button>
                            </div>

                            {/* Date Filter & Shortcuts Panel */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100/50">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Dari Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="h-9 text-xs rounded-lg bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Sampai Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="h-9 text-xs rounded-lg bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-1 flex flex-col justify-end">
                                    <div className="flex gap-1.5">
                                        <Button type="button" size="sm" variant="secondary" onClick={() => setMonthShortcut('this')} className="h-9 flex-1 text-xs rounded-lg">Bulan Ini</Button>
                                        <Button type="button" size="sm" variant="secondary" onClick={() => setMonthShortcut('last')} className="h-9 flex-1 text-xs rounded-lg">Bulan Lalu</Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => setMonthShortcut('all')} className="h-9 flex-none px-2 rounded-lg text-red-500 hover:text-red-600">Reset</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 mt-1">
                                <div className="relative flex-1 w-full sm:w-[260px]">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Cari item..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-9 text-xs"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" onClick={() => applyFilters(search, sortDirection)} className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 h-9 px-3 text-xs gap-1">
                                        Apply Filter
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 w-9">
                                                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem onClick={() => handleSort('desc')} className="rounded-lg">
                                                Terbaru
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSort('asc')} className="rounded-lg">
                                                Terlama
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 flex-1 flex flex-col justify-between">

                            {/* Mobile Card-based View */}
                            <div className="block sm:hidden space-y-4 px-4 pb-4">
                                {usages?.data?.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">Tidak ada data pemakaian.</div>
                                ) : (
                                    usages?.data?.map((u: any) => (
                                        <div key={u.id} className="border border-slate-100 rounded-xl p-4 bg-white/50 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                                        <span>{u.item?.name}</span>
                                                        {u.item?.assigned_user && (
                                                            <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50/50 text-blue-700 border-blue-100/50 py-0 px-1 h-4">
                                                                PJ: {u.item.assigned_user.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1.5">
                                                        <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100/80 text-slate-600 border-none px-1.5 py-0 rounded-md">
                                                            {u.property?.name || 'Global'}
                                                        </Badge>
                                                        <span>{formatDate(u.usage_date)}</span>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 rounded-lg text-slate-500">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem onClick={() => openEdit(u)} className="rounded-lg">
                                                            <Edit className="w-4 h-4 mr-2 text-slate-600" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg" onClick={() => setDeleteId(u.id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-xs mt-3 pt-3 border-t border-slate-100">
                                                <div>
                                                    <div className="text-slate-400 font-medium">Jumlah</div>
                                                    <div className="font-semibold text-slate-700 mt-0.5">{Number(u.quantity_used)} {u.item?.unit}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 font-medium text-right font-medium">Estimasi Biaya</div>
                                                    <div className="font-bold text-right text-emerald-600 mt-0.5">{rp(Number(u.total_cost || u.quantity_used * (u.item?.selling_price || u.item?.average_unit_cost)))}</div>
                                                </div>
                                            </div>
                                            {u.notes && (
                                                <div className="text-[11px] bg-slate-50 p-2 rounded-lg italic text-slate-500 border border-slate-100">
                                                    "{u.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-100 hover:bg-transparent">
                                            <TableHead className="font-bold text-slate-700">Tanggal</TableHead>
                                            <TableHead className="font-bold text-slate-700">Item</TableHead>
                                            <TableHead className="font-bold text-slate-700">Property</TableHead>
                                            <TableHead className="font-bold text-slate-700">Jumlah</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Biaya</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usages?.data?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center h-32 text-slate-400">Tidak ada data pemakaian.</TableCell>
                                            </TableRow>
                                        ) : (
                                            usages?.data?.map((u: any) => (
                                                <TableRow key={u.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                                                    <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                                                        {formatDate(u.usage_date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                                            <span>{u.item?.name}</span>
                                                            {u.item?.assigned_user && (
                                                                <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50/50 text-blue-700 border-blue-100/50 py-0 px-1 h-4">
                                                                    PJ: {u.item.assigned_user.name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {u.notes && <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5" title={u.notes}>{u.notes}</div>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-sm font-medium">
                                                         {u.property?.name || <span className="text-indigo-600 font-semibold">Global</span>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-sm">
                                                        {Number(u.quantity_used)} <span className="text-slate-400 text-xs font-medium">{u.item?.unit}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-600 text-sm">
                                                        {rp(Number(u.total_cost))}
                                                    </TableCell>
                                                    <TableCell>
                                                        {u.expense ? (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 rounded-xl text-[11px] font-semibold">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Recorded
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 gap-1 rounded-xl text-[11px] font-semibold">
                                                                <XCircle className="w-3.5 h-3.5" /> Pending
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                                <DropdownMenuItem onClick={() => openEdit(u)} className="rounded-lg">
                                                                    <Edit className="w-4 h-4 mr-2 text-slate-600" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg" onClick={() => setDeleteId(u.id)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {usages?.total > 0 && (
                                <div className="flex items-center justify-between p-4 border-t border-slate-100 mt-4">
                                    <div className="text-xs font-semibold text-slate-500">
                                        Total: {usages?.total || 0} Data
                                    </div>
                                    <div className="flex gap-1.5">
                                        {usages?.links?.map((l: any, i: number) => (
                                            <Button
                                                key={i}
                                                variant={l.active ? "default" : "outline"}
                                                size="sm"
                                                disabled={!l.url}
                                                asChild={!!l.url}
                                                className={cn(
                                                    "rounded-xl h-8 px-3 text-xs font-medium transition-all",
                                                    !l.url && "opacity-40 pointer-events-none",
                                                    l.active && "shadow-md shadow-primary/10"
                                                )}
                                            >
                                                {l.url ? (
                                                    <Link href={l.url} dangerouslySetInnerHTML={{ __html: l.label }} />
                                                ) : (
                                                    <span dangerouslySetInnerHTML={{ __html: l.label }} />
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="rounded-2xl border-none shadow-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-slate-800 text-lg">Konfirmasi Hapus</DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm mt-1">
                            Apakah Anda yakin ingin menghapus data rekaman pemakaian barang ini?
                            <br /><br />
                            <span className="p-3 bg-red-50 text-red-700 rounded-xl text-xs block border border-red-100">
                                ⚠️ Stok barang yang terpotong dan laporan pengeluaran keuangan terikat akan dibersihkan/dihapus otomatis.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-3">
                        <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl border-slate-200">Batal</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Hapus</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Export Dialog */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-slate-800 text-lg">Ekspor Pemakaian</DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm mt-1">
                            Pilih rentang waktu data pemakaian yang ingin diekspor ke Excel.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-4 py-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Dari Tanggal</Label>
                                <Input
                                    type="date"
                                    value={exportDateFrom}
                                    onChange={(e) => setExportDateFrom(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Sampai Tanggal</Label>
                                <Input
                                    type="date"
                                    value={exportDateTo}
                                    onChange={(e) => setExportDateTo(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => setExportMonthShortcut('this')} className="flex-1 text-xs rounded-xl h-9">Bulan Ini</Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => setExportMonthShortcut('last')} className="flex-1 text-xs rounded-xl h-9">Bulan Lalu</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setExportMonthShortcut('all')} className="text-xs rounded-xl h-9 text-slate-500">Semua</Button>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExportModal(false)} className="rounded-xl border-slate-200">
                            Batal
                        </Button>
                        <Button onClick={handleExportDownload} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            Unduh Excel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

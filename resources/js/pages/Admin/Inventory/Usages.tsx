import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, Link, router } from '@inertiajs/react';
import { CheckCircle2, XCircle, MoreVertical, Edit, Trash2, ArrowUpRight, ArrowDownRight, Minus, Search, ArrowUpDown, Calendar, HelpCircle, FileText } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

function rp(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export default function Usages({ items, properties, usages, usageStats, filters }: any) {
    const [editItem, setEditItem] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search || '');
    const [sortDirection, setSortDirection] = useState(filters?.direction || 'desc');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters?.search || '')) {
                router.get('/admin/inventory/usages', { search, direction: sortDirection }, { preserveState: true, replace: true });
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSort = (dir: string) => {
        setSortDirection(dir);
        router.get('/admin/inventory/usages', { search, direction: dir }, { preserveState: true, replace: true });
    };

    const { data, setData, post, put, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        inventory_item_id: '',
        property_id: '',
        usage_date: new Date().toISOString().slice(0, 10),
        quantity_used: '',
        notes: '',
    });

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
                onSuccess: () => reset('quantity_used', 'notes')
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
            inventory_item_id: item.inventory_item_id,
            property_id: item.property_id,
            usage_date: item.usage_date.split('T')[0], // Ensure YYYY-MM-DD
            quantity_used: item.quantity_used,
            notes: item.notes || '',
        });
        clearErrors();
    };

    const closeEdit = () => {
        setEditItem(null);
        reset();
        clearErrors();
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
                                <CardDescription className="text-xs">Catat penggunaan barang inventaris di properti.</CardDescription>
                              </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={submit}>
                                <div className="space-y-2">
                                    <Label htmlFor="item" className="text-sm font-semibold text-slate-700">Item</Label>
                                    <Select
                                        value={data.inventory_item_id?.toString() || ''}
                                        onValueChange={(val) => setData('inventory_item_id', val)}
                                        disabled={!!editItem}
                                    >
                                        <SelectTrigger id="item" className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.inventory_item_id && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Item" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {items?.map((it: any) => (
                                                <SelectItem key={it.id} value={it.id?.toString()} className="rounded-lg">{it.name} ({it.unit})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.inventory_item_id && <p className="text-xs text-red-500">{errors.inventory_item_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="property" className="text-sm font-semibold text-slate-700">Properti</Label>
                                    <Select value={data.property_id?.toString() || ''} onValueChange={(val) => setData('property_id', val)}>
                                        <SelectTrigger id="property" className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.property_id && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Properti" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {properties?.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id?.toString()} className="rounded-lg">{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.property_id && <p className="text-xs text-red-500">{errors.property_id}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date" className="text-sm font-semibold text-slate-700">Tanggal</Label>
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
                                    <div className="space-y-2">
                                        <Label htmlFor="qty" className="text-sm font-semibold text-slate-700">Jumlah</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            step="1"
                                            placeholder="0"
                                            value={data.quantity_used}
                                            onChange={(e) => setData('quantity_used', e.target.value)}
                                            className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.quantity_used && "border-red-500")}
                                        />
                                        {errors.quantity_used && <p className="text-xs text-red-500">{errors.quantity_used}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Catatan & Keperluan</Label>
                                    <Input id="notes" placeholder="Contoh: Pembersihan kamar mandi" value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all" />
                                    {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {editItem && (
                                        <Button type="button" variant="outline" onClick={closeEdit} className="flex-1 rounded-xl border-slate-200">Batal</Button>
                                    )}
                                    <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/10" disabled={processing}>
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
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-800">Riwayat Pemakaian</CardTitle>
                                    <CardDescription className="text-xs">Daftar pemakaian barang operasional di properti villa.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-[220px]">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Cari item..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-10 text-sm"
                                        />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 hover:bg-slate-50 h-10 w-10">
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
                                                    <div className="font-bold text-slate-800 text-sm">{u.item?.name}</div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1.5">
                                                        <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100/80 text-slate-600 border-none px-1.5 py-0 rounded-md">{u.property?.name}</Badge>
                                                        <span suppressHydrationWarning>{new Date(u.usage_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                                                        {new Date(u.usage_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-slate-800 text-sm">{u.item?.name}</div>
                                                        {u.notes && <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5" title={u.notes}>{u.notes}</div>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-sm">{u.property?.name}</TableCell>
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
        </AdminLayout>
    );
}

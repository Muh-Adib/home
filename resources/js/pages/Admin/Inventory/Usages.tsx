import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, Link, router } from '@inertiajs/react';
import { Receipt, CheckCircle2, XCircle, MoreVertical, Edit, Trash2, ArrowUpRight, ArrowDownRight, Minus, Plus, Search, ArrowUpDown } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

function rp(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

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
        }, 3000);
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

            {/* Usage Stats Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Perbandingan Pemakaian (Bulan Ini vs Lalu)</h2>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <div className="flex w-max space-x-4 p-4">
                        {usageStats?.length > 0 ? (
                            usageStats.map((stat: any, idx: number) => (
                                <Card key={idx} className="w-[300px] shrink-0">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-bold">{stat.property_name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {stat.stats.slice(0, 5).map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm">
                                                <div className="truncate max-w-[120px]" title={item.item_name}>{item.item_name}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs">{item.last_qty} {item.unit}</span>
                                                    <span className="text-xs">→</span>
                                                    <span className="font-medium">{item.current_qty} {item.unit}</span>
                                                    {item.diff > 0 ? (
                                                        <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 px-1 py-0 h-5">
                                                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                                            {item.percent_change}%
                                                        </Badge>
                                                    ) : item.diff < 0 ? (
                                                        <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 px-1 py-0 h-5">
                                                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                                                            {Math.abs(item.percent_change)}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 px-1 py-0 h-5">
                                                            <Minus className="w-3 h-3" />
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {stat.stats.length > 5 && (
                                            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                                                +{stat.stats.length - 5} items lainnya
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="p-4 text-muted-foreground">Belum ada data pemakaian yang cukup untuk perbandingan.</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Input Form - Desktop: Right Side (or Left), Mobile: Top */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                    <Card className="sticky top-4">
                        <CardHeader>
                            <CardTitle>{editItem ? 'Edit Pemakaian' : 'Input Pemakaian Baru'}</CardTitle>
                            <CardDescription>Catat pengeluaran barang inventaris.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={submit}>
                                <div className="space-y-2">
                                    <Label htmlFor="item">Item</Label>
                                    <Select
                                        value={data.inventory_item_id?.toString()}
                                        onValueChange={(val) => setData('inventory_item_id', val)}
                                        disabled={!!editItem} // Disable item change on edit
                                    >
                                        <SelectTrigger id="item" className={cn(errors.inventory_item_id && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items?.map((it: any) => (
                                                <SelectItem key={it.id} value={it.id?.toString()}>{it.name} ({it.unit})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.inventory_item_id && <p className="text-xs text-red-500">{errors.inventory_item_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="property">Property</Label>
                                    <Select value={data.property_id?.toString()} onValueChange={(val) => setData('property_id', val)}>
                                        <SelectTrigger id="property" className={cn(errors.property_id && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Property" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties?.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id?.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.property_id && <p className="text-xs text-red-500">{errors.property_id}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Tanggal</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={data.usage_date}
                                            onChange={(e) => setData('usage_date', e.target.value)}
                                            className={cn(errors.usage_date && "border-red-500")}
                                        />
                                        {errors.usage_date && <p className="text-xs text-red-500">{errors.usage_date}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">Jumlah</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            step="1"
                                            placeholder="0"
                                            value={data.quantity_used}
                                            onChange={(e) => setData('quantity_used', e.target.value)}
                                            className={cn(errors.quantity_used && "border-red-500")}
                                        />
                                        {errors.quantity_used && <p className="text-xs text-red-500">{errors.quantity_used}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Catatan & Keperluan</Label>
                                    <Input id="notes" placeholder="Contoh: Pembersihan kamar mandi" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                                    {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1" disabled={processing}>
                                        {editItem ? 'Simpan' : 'Simpan Data'}
                                    </Button>
                                    {editItem && (
                                        <Button type="button" variant="outline" onClick={closeEdit}>Batal</Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Data - Desktop: Left Side (Col span 2), Mobile: Bottom */}
                <div className="lg:col-span-2 order-2 lg:order-1">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Riwayat Pemakaian</CardTitle>
                                <CardDescription>Daftar penggunaan barang di properti</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-[200px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari item..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <ArrowUpDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleSort('desc')}>
                                            Terbaru
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSort('asc')}>
                                            Terlama
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6">

                            {/* Mobile View: Cards */}
                            <div className="block sm:hidden space-y-4 px-4 pb-4">
                                {usages?.data?.map((u: any) => (
                                    <div key={u.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-base">{u.item?.name}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs font-normal">{u.property?.name}</Badge>
                                                    <span className="text-xs text-muted-foreground">{new Date(u.usage_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(u)}>
                                                        <Edit className="w-4 h-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeleteId(u.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                                            <div>
                                                <div className="text-muted-foreground text-xs">Jumlah</div>
                                                <div className="font-medium">{Number(u.quantity_used)} {u.item?.unit}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground text-xs text-right">Estimasi Biaya</div>
                                                <div className="font-medium text-right text-green-600">{rp(Number(u.total_cost || u.quantity_used * u.item?.average_unit_cost))}</div>
                                            </div>
                                        </div>
                                        {u.notes && (
                                            <div className="text-xs bg-muted/50 p-2 rounded italic text-muted-foreground">
                                                "{u.notes}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden sm:block overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Property</TableHead>
                                            <TableHead>Jumlah</TableHead>
                                            <TableHead className="text-right">Biaya</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usages?.data?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Tidak ada data pemakaian.</TableCell>
                                            </TableRow>
                                        ) : (
                                            usages?.data?.map((u: any) => (
                                                <TableRow key={u.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        {new Date(u.usage_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{u.item?.name}</div>
                                                        {u.notes && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{u.notes}</div>}
                                                    </TableCell>
                                                    <TableCell>{u.property?.name}</TableCell>
                                                    <TableCell>{Number(u.quantity_used)} <span className="text-muted-foreground text-xs">{u.item?.unit}</span></TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        {rp(Number(u.total_cost))}
                                                    </TableCell>
                                                    <TableCell>
                                                        {u.expense ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Recorded
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                                                                <XCircle className="w-3 h-3" /> Pending
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openEdit(u)}>
                                                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeleteId(u.id)}>
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
                            <div className="flex items-center justify-between p-4 border-t">
                                <div className="text-sm text-muted-foreground">
                                    All Records: {usages?.total || 0}
                                </div>
                                <div className="flex gap-1">
                                    {usages?.links?.map((l: any, i: number) => (
                                        <Button
                                            key={i}
                                            variant={l.active ? "default" : "outline"}
                                            size="sm"
                                            disabled={!l.url}
                                            asChild={!!l.url}
                                            className={cn(!l.url && "opacity-50 pointer-events-none")}
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

                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Hapus</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus data pemakaian ini? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

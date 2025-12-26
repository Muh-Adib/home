import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, ArrowUpRight, ArrowDownRight, Minus, Search, ArrowUpDown } from 'lucide-react';
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

function rp(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

export default function Purchases({ items, properties, purchases, filters }: any) {
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, setData, post, put, delete: destroy, processing, reset, errors, clearErrors } = useForm({
    inventory_item_id: '',
    property_id: '',
    quantity: '0',
    unit_cost: '0',
    movement_date: '', // Initialize empty to avoid hydration mismatch
    vendor_name: '',
    notes: '',
  });

  // Set default date on client side only
  useEffect(() => {
    if (!data.movement_date) {
      setData('movement_date', new Date().toISOString().slice(0, 10));
    }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      put(`/admin/inventory/purchases/${editItem.id}`, {
        onSuccess: () => {
          setEditItem(null);
          reset();
        }
      });
    } else {
      post('/admin/inventory/purchases', {
        onSuccess: () => reset('quantity', 'unit_cost', 'notes', 'vendor_name')
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      destroy(`/admin/inventory/purchases/${deleteId}`, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setData({
      inventory_item_id: item.inventory_item_id,
      property_id: item.property_id || '',
      movement_date: item.movement_date.split('T')[0],
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      vendor_name: item.vendor_name || '',
      notes: item.notes || '',
    });
    clearErrors();
  };

  const closeEdit = () => {
    setEditItem(null);
    reset();
    clearErrors();
  };

  const [search, setSearch] = useState(filters?.search || '');
  const [sortDirection, setSortDirection] = useState(filters?.direction || 'desc');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters?.search || '')) {
        router.get('/admin/inventory/purchases', { search, direction: sortDirection }, { preserveState: true, replace: true });
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (dir: string) => {
    setSortDirection(dir);
    router.get('/admin/inventory/purchases', { search, direction: dir }, { preserveState: true, replace: true });
  };


  return (
    <AdminLayout title="Inventaris - Pembelian Stok" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }, { title: 'Purchases' }]}>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>{editItem ? 'Edit Pembelian' : 'Input Pembelian'}</CardTitle>
              <CardDescription>Catat stok masuk atau pembelian barang.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="item">Item</Label>
                  <Select
                    value={data.inventory_item_id?.toString() || ''}
                    onValueChange={(val) => setData('inventory_item_id', val)}
                    disabled={!!editItem}
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
                  <Label htmlFor="property">Property (Opsional)</Label>
                  <Select value={data.property_id?.toString() || 'global'} onValueChange={(val) => setData('property_id', val === 'global' ? '' : val)}>
                    <SelectTrigger id="property">
                      <SelectValue placeholder="Global (Office/Gudang Utama)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (Office/Gudang Utama)</SelectItem>
                      {properties?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id?.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Kosongkan jika stok untuk gudang umum.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qty">Qty</Label>
                    <Input
                      id="qty"
                      type="number"
                      step="1"
                      value={data.quantity}
                      onChange={(e) => setData('quantity', e.target.value)}
                      className={cn(errors.quantity && "border-red-500")}
                    />
                    {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Harga/Unit</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="100"
                      value={data.unit_cost}
                      onChange={(e) => setData('unit_cost', e.target.value)}
                      className={cn(errors.unit_cost && "border-red-500")}
                    />
                    {errors.unit_cost && <p className="text-xs text-red-500">{errors.unit_cost}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={data.movement_date}
                    onChange={(e) => setData('movement_date', e.target.value)}
                    className={cn(errors.movement_date && "border-red-500")}
                  />
                  {errors.movement_date && <p className="text-xs text-red-500">{errors.movement_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor / Toko</Label>
                  <Input id="vendor" value={data.vendor_name} onChange={(e) => setData('vendor_name', e.target.value)} placeholder="Nama toko" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input id="notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={processing}>
                    {editItem ? 'Simpan' : 'Simpan Data'}
                  </Button>
                  {editItem && (
                    <Button type="button" variant="outline" onClick={closeEdit}>Batal</Button>
                  )}
                </div>
              </form >
            </CardContent >
          </Card >
        </div >

        {/* List Data */}
        < div className="lg:col-span-2 order-2 lg:order-1" >
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Riwayat Pembelian</CardTitle>
                <CardDescription>History stok masuk dan pembelian.</CardDescription>
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
              {/* Mobile View */}
              <div className="block sm:hidden space-y-4 px-4 pb-4">
                {purchases?.data?.map((m: any) => (
                  <div key={m.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-base">{m.item?.name}</div>
                        <div className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
                          {new Date(m.movement_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(m)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                      <div>
                        <div className="text-muted-foreground text-xs">Qty</div>
                        <div className="font-medium">{Number(m.quantity)} {m.item?.unit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs text-right">Total Biaya</div>
                        <div className="font-medium text-right text-green-600" suppressHydrationWarning>{rp(Number(m.total_cost))}</div>
                      </div>
                    </div>
                    {m.vendor_name && (
                      <div className="text-xs bg-muted/50 p-2 rounded text-muted-foreground flex items-center gap-2">
                        <span className="font-semibold">Vendor:</span> {m.vendor_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Harga/Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Tidak ada data pembelian.</TableCell>
                      </TableRow>
                    ) : (
                      purchases?.data?.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap" suppressHydrationWarning>
                            {new Date(m.movement_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{m.item?.name}</div>
                            {m.notes && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{m.notes}</div>}
                          </TableCell>
                          <TableCell>{Number(m.quantity)} <span className="text-muted-foreground text-xs">{m.item?.unit}</span></TableCell>
                          <TableCell suppressHydrationWarning>{rp(Number(m.unit_cost))}</TableCell>
                          <TableCell className="text-right font-medium text-green-600" suppressHydrationWarning>
                            {rp(Number(m.total_cost))}
                          </TableCell>
                          <TableCell>{m.vendor_name || '-'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(m)}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeleteId(m.id)}>
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
                  All Records: {purchases?.total || 0}
                </div>
                <div className="flex gap-1">
                  {purchases?.links?.map((l: any, i: number) => (
                    <Button
                      key={i}
                      variant={l.active ? "default" : "outline"}
                      size="sm"
                      disabled={!l.url}
                      asChild={!!l.url}
                      className={cn(!l.url && "opacity-50 pointer-events-none")}
                    >
                      {l.url ? (
                        <Link href={l.url}>
                          <span dangerouslySetInnerHTML={{ __html: l.label }} />
                        </Link>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: l.label }} />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </div >
      </div >

      {/* Delete Confirmation Dialog */}
      < Dialog open={!!deleteId
      } onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data pembelian ini? Stok akan dikembalikan jika memungkinkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </AdminLayout >
  );
}



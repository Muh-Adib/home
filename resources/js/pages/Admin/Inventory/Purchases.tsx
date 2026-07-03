import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, Link, router } from '@inertiajs/react';
import { CheckCircle2, XCircle, MoreVertical, Edit, Trash2, Search, ArrowUpDown, Calendar, HelpCircle, FileText, Plus, Coins, Tag, FileSpreadsheet, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';

function rp(amount: number) {
  const val = Math.round(amount || 0);
  return 'Rp ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function Purchases({ items, properties, purchases, filters }: any) {
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState(filters?.search || '');
  const [sortDirection, setSortDirection] = useState(filters?.direction || 'desc');
  const [mounted, setMounted] = useState(false);

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
    router.get('/admin/inventory/purchases', {
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
    let url = '/admin/inventory/purchases/export';
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
    quantity: '',
    unit_cost: '',
    movement_date: '',
    vendor_name: '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!data.movement_date) {
      setData('movement_date', new Date().toISOString().slice(0, 10));
    }
  }, []);

  const formatDate = (dateStr: string) => {
    if (!mounted || !dateStr) return '';
    return new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
  };

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
        onSuccess: () => {
          reset('quantity', 'unit_cost', 'notes', 'vendor_name');
        }
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
      inventory_item_id: item.inventory_item_id?.toString() || '',
      property_id: item.property_id?.toString() || '',
      movement_date: item.movement_date.split('T')[0],
      quantity: String(item.quantity),
      unit_cost: String(item.unit_cost),
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

  return (
    <AdminLayout title="Inventaris - Pembelian & Restock" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }, { title: 'Purchases' }]}>
      <div className="grid gap-6 lg:grid-cols-3 max-w-7xl mx-auto">
        
        {/* Input Form Card */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <Card className="sticky top-4 border-none shadow-lg bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">{editItem ? 'Edit Pembelian' : 'Input Pembelian Baru'}</CardTitle>
                  <CardDescription className="text-xs">Catat stok masuk atau belanja logistik.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="item" className="text-sm font-semibold text-slate-700">Item Barang</Label>
                  <select
                    id="item"
                    value={data.inventory_item_id || ''}
                    onChange={(e) => setData('inventory_item_id', e.target.value)}
                    disabled={!!editItem}
                    className={cn("w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-10 text-xs px-3 outline-none transition-all cursor-pointer appearance-none", errors.inventory_item_id && "border-red-500")}
                  >
                    <option value="">Pilih Item...</option>
                    {items?.map((it: any) => (
                      <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                    ))}
                  </select>
                  {errors.inventory_item_id && <p className="text-xs text-red-500">{errors.inventory_item_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property" className="text-sm font-semibold text-slate-700">Tujuan Lokasi Properti</Label>
                  <select
                    id="property"
                    value={data.property_id || ''}
                    onChange={(e) => setData('property_id', e.target.value)}
                    className="w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-10 text-xs px-3 outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Global / Gudang Umum</option>
                    {properties?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.property_id && <p className="text-xs text-red-500">{errors.property_id}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qty" className="text-sm font-semibold text-slate-700">Jumlah (Qty)</Label>
                    <Input
                      id="qty"
                      type="number"
                      step="any"
                      placeholder="0"
                      value={data.quantity}
                      onChange={(e) => setData('quantity', e.target.value)}
                      className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.quantity && "border-red-500")}
                      required
                    />
                    {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-semibold text-slate-700">Harga Satuan (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">Rp</span>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="0"
                        value={data.unit_cost}
                        onChange={(e) => setData('unit_cost', e.target.value)}
                        className={cn("pl-8 bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.unit_cost && "border-red-500")}
                        required
                      />
                    </div>
                    {errors.unit_cost && <p className="text-xs text-red-500">{errors.unit_cost}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-semibold text-slate-700">Tanggal Transaksi</Label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="date"
                      type="date"
                      value={data.movement_date}
                      onChange={(e) => setData('movement_date', e.target.value)}
                      className={cn("bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all", errors.movement_date && "border-red-500")}
                      required
                    />
                  </div>
                  {errors.movement_date && <p className="text-xs text-red-500">{errors.movement_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor" className="text-sm font-semibold text-slate-700">Nama Vendor</Label>
                  <Input id="vendor" placeholder="Contoh: Lotte Mart / Toko Kelontong" value={data.vendor_name} onChange={(e) => setData('vendor_name', e.target.value)} className="bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all" />
                  {errors.vendor_name && <p className="text-xs text-red-500">{errors.vendor_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Catatan Tambahan</Label>
                  <Input id="notes" placeholder="Catatan opsional..." value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="bg-white/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-all" />
                  {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                </div>

                <div className="flex gap-2 pt-2">
                  {editItem && (
                    <Button type="button" variant="outline" onClick={closeEdit} className="flex-1 rounded-xl border-slate-200">Batal</Button>
                  )}
                  <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/10" disabled={processing}>
                    {editItem ? 'Simpan' : 'Simpan Transaksi'}
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
                  <CardTitle className="text-lg font-bold text-slate-800">Riwayat Pembelian</CardTitle>
                  <CardDescription className="text-xs">Daftar rekaman stok masuk dan pembelian barang.</CardDescription>
                </div>
                
                {/* Export Action */}
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
                      <DropdownMenuItem onClick={() => handleSort('desc')} className="rounded-lg">Terbaru</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('asc')} className="rounded-lg">Terlama</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 flex-1 flex flex-col justify-between">
              
              {/* Mobile Card-based View */}
              <div className="block sm:hidden space-y-4 px-4 pb-4">
                {purchases?.data?.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">Tidak ada data pembelian.</div>
                ) : (
                  purchases?.data?.map((m: any) => (
                    <div key={m.id} className="border border-slate-100 rounded-xl p-4 bg-white/50 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{m.item?.name}</span>
                            {m.item?.assigned_user && (
                              <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50/50 text-blue-700 border-blue-100/50 py-0 px-1 h-4">
                                PJ: {m.item.assigned_user.name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {formatDate(m.movement_date)}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 rounded-lg text-slate-500">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => openEdit(m)} className="rounded-lg">
                              <Edit className="w-4 h-4 mr-2 text-slate-600" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg" onClick={() => setDeleteId(m.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs mt-3 pt-3 border-t border-slate-100">
                        <div>
                          <div className="text-slate-400 font-medium">Jumlah</div>
                          <div className="font-semibold text-slate-700 mt-0.5">{Number(m.quantity)} {m.item?.unit}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium text-right">Total Biaya</div>
                          <div className="font-bold text-right text-emerald-600 mt-0.5">{rp(Number(m.total_cost))}</div>
                        </div>
                      </div>
                      {m.vendor_name && (
                        <div className="text-[11px] bg-slate-50 p-2 rounded-lg text-slate-500 border border-slate-100 flex items-center gap-1.5">
                          <span className="font-bold">Vendor:</span> {m.vendor_name}
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
                      <TableHead className="font-bold text-slate-700">Qty</TableHead>
                      <TableHead className="font-bold text-slate-700">Harga/Unit</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Total</TableHead>
                      <TableHead className="font-bold text-slate-700">Vendor</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-32 text-slate-400">Tidak ada data pembelian.</TableCell>
                      </TableRow>
                    ) : (
                      purchases?.data?.map((m: any) => (
                        <TableRow key={m.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                          <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                            {formatDate(m.movement_date)}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{m.item?.name}</span>
                              {m.item?.assigned_user && (
                                <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50/50 text-blue-700 border-blue-100/50 py-0 px-1 h-4">
                                  PJ: {m.item.assigned_user.name}
                                </Badge>
                              )}
                            </div>
                            {m.notes && <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5" title={m.notes}>{m.notes}</div>}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {Number(m.quantity)} <span className="text-slate-400 text-xs font-medium">{m.item?.unit}</span>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">{rp(Number(m.unit_cost))}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 text-sm">
                            {rp(Number(m.total_cost))}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">{m.vendor_name || '-'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => openEdit(m)} className="rounded-lg">
                                  <Edit className="w-4 h-4 mr-2 text-slate-600" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg" onClick={() => setDeleteId(m.id)}>
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
              {purchases?.total > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100 mt-4">
                  <div className="text-xs font-semibold text-slate-500">
                    Total: {purchases?.total || 0} Data
                  </div>
                  <div className="flex gap-1.5">
                    {purchases?.links?.map((l: any, i: number) => (
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
              Apakah Anda yakin ingin menghapus data rekaman pembelian barang ini?
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
            <DialogTitle className="font-bold text-slate-800 text-lg">Ekspor Pembelian</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Pilih rentang waktu data pembelian yang ingin diekspor ke Excel.
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

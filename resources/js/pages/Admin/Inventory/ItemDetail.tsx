import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Calendar, User, Info, DollarSign, Layers, Tag, Eye } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface LedgerEntry {
  id: number;
  type: 'purchase' | 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  movement_date: string;
  notes: string | null;
  user_name: string;
  property_name: string;
}

interface ActivityLogEntry {
  id: number;
  user_name: string;
  activity_type: string;
  description: string;
  created_at: string;
}

interface ItemDetailProps {
  item: {
    id: number;
    name: string;
    sku: string;
    unit: string;
    category: string | null;
    min_stock: number;
    selling_price: number;
    current_stock: number;
    image_path: string | null;
    assigned_user_name: string | null;
  };
  ledger: LedgerEntry[];
  activityLogs: ActivityLogEntry[];
}

function formatRupiah(amount: number) {
  const val = Math.round(amount || 0);
  return 'Rp ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function ItemDetail({ item, ledger, activityLogs }: ItemDetailProps) {
  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-50">Pembelian</Badge>;
      case 'in':
        return <Badge className="bg-green-50 text-green-700 border border-green-100 hover:bg-green-50">Stok Masuk</Badge>;
      case 'out':
        return <Badge className="bg-red-50 text-red-700 border border-red-100 hover:bg-red-50">Pemakaian</Badge>;
      case 'adjustment':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-50">Penyesuaian</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getLogTypeBadge = (type: string) => {
    if (type.includes('create')) {
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-100">CREATE</Badge>;
    } else if (type.includes('update')) {
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-100">UPDATE</Badge>;
    } else {
      return <Badge className="bg-red-50 text-red-700 border border-red-100">DELETE</Badge>;
    }
  };

  return (
    <AdminLayout title="Detail Barang & Buku Besar" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }, { title: item.name }]}>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        
        {/* Back Button */}
        <div>
          <Button variant="ghost" asChild className="rounded-xl hover:bg-slate-100 text-slate-600 gap-1.5 -ml-2">
            <Link href="/admin/inventory/items">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
            </Link>
          </Button>
        </div>

        {/* Item Information Header Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-white/95 to-white/70 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image section */}
            <div className="relative w-full md:w-64 h-48 md:h-auto bg-slate-100 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-slate-150">
              {item.image_path ? (
                <img
                  src={`/storage/${item.image_path}`}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Package className="h-12 w-12 stroke-[1.2]" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">No Photo</span>
                </div>
              )}
            </div>

            {/* Parameter Details */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-100/80 text-slate-600 border-none px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                    {item.category || 'Tanpa Kategori'}
                  </Badge>
                  {item.current_stock < item.min_stock && (
                    <Badge variant="destructive" className="animate-pulse px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wide">
                      Stok Rendah / Reorder
                    </Badge>
                  )}
                </div>

                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{item.name}</h2>
                
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-400">SKU:</span>
                    <span className="font-mono font-bold text-slate-700">{item.sku || '-'}</span>
                  </div>
                  {item.assigned_user_name && (
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/50 border border-blue-100/40 px-3 py-1 rounded-xl">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold text-blue-500">PJ / Penanggung Jawab:</span>
                      <span className="font-bold">{item.assigned_user_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-5 bg-slate-100" />

              {/* Numbers grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Aktual</div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={cn(
                      "text-3xl font-black",
                      item.current_stock < item.min_stock ? "text-red-500" : "text-green-600"
                    )}>
                      {Number(item.current_stock)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Minimal</div>
                  <div className="text-lg font-bold text-slate-700 mt-2">
                    {Number(item.min_stock)} <span className="text-xs text-slate-500 font-semibold">{item.unit}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga Jual</div>
                  <div className="text-lg font-extrabold text-slate-700 mt-2">
                    {formatRupiah(item.selling_price)}
                  </div>
                </div>

                <div className="flex items-center">
                  <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 py-1.5 px-3 flex gap-1 rounded-xl text-xs">
                    <Info className="h-3.5 w-3.5 text-slate-400" /> PJ Label Internal
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Ledger & Activity Logs Section */}
        <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl p-6">
          <Tabs defaultValue="ledger" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="ledger" className="rounded-lg px-4 py-2 font-bold text-xs">
                Buku Besar (Stock Ledger)
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg px-4 py-2 font-bold text-xs">
                Log Audit / Riwayat Perubahan
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Ledger */}
            <TabsContent value="ledger" className="space-y-4 outline-none">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Aliran Keluar Masuk Stok</h3>
                  <p className="text-xs text-slate-500">Riwayat kronologis mutasi kuantitas item barang.</p>
                </div>
              </div>

              <div className="overflow-auto border border-slate-100 rounded-xl bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="font-bold text-slate-700">Tanggal</TableHead>
                      <TableHead className="font-bold text-slate-700">Tipe</TableHead>
                      <TableHead className="font-bold text-slate-700">Jumlah (Qty)</TableHead>
                      <TableHead className="font-bold text-slate-700">Harga Satuan</TableHead>
                      <TableHead className="font-bold text-slate-700">Total Biaya/Nilai</TableHead>
                      <TableHead className="font-bold text-slate-700">Lokasi Properti</TableHead>
                      <TableHead className="font-bold text-slate-700">Catatan</TableHead>
                      <TableHead className="font-bold text-slate-700">Oleh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                          Belum ada transaksi stok untuk item ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.map((m) => (
                        <TableRow key={m.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                            {new Date(m.movement_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{getMovementTypeBadge(m.type)}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-sm">
                            {m.type === 'out' ? '-' : '+'}{Number(m.quantity)} <span className="text-[10px] text-slate-400 font-semibold">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">{formatRupiah(m.unit_cost)}</TableCell>
                          <TableCell className="font-semibold text-slate-700 text-xs">{formatRupiah(m.total_cost)}</TableCell>
                          <TableCell className="text-slate-600 text-xs font-medium">{m.property_name}</TableCell>
                          <TableCell className="text-slate-500 text-xs max-w-[200px] truncate" title={m.notes || ''}>
                            {m.notes || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" /> {m.user_name}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 2: Audit Logs */}
            <TabsContent value="logs" className="space-y-4 outline-none">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Riwayat Audit Perubahan Administrasi</h3>
                  <p className="text-xs text-slate-500">Mencatat aktivitas tambah, edit parameter barang, dan hapus dari admin.</p>
                </div>
              </div>

              <div className="overflow-auto border border-slate-100 rounded-xl bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="font-bold text-slate-700">Waktu & Tanggal</TableHead>
                      <TableHead className="font-bold text-slate-700">Aktivitas</TableHead>
                      <TableHead className="font-bold text-slate-700">Pelaku (User)</TableHead>
                      <TableHead className="font-bold text-slate-700">Keterangan / Detil Perubahan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                          Belum ada riwayat aktivitas administrasi untuk item ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log) => (
                        <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                            {new Date(log.created_at).toLocaleString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>{getLogTypeBadge(log.activity_type)}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700 text-xs font-semibold">
                            {log.user_name}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs leading-relaxed font-sans pr-4">
                            {log.description}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

      </div>
    </AdminLayout>
  );
}

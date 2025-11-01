import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Link } from '@inertiajs/react';

function rp(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

export default function Purchases({ items, properties, purchases }: any) {
    const { data, setData, post, processing, reset } = useForm({
        inventory_item_id: '',
        property_id: '',
        quantity: '',
        unit_cost: '',
        movement_date: new Date().toISOString().slice(0,10),
        vendor_name: '', // tambahkan ini!
        notes: '',
      });
     

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/inventory/purchases', { onSuccess: () => reset('quantity','unit_cost','notes') });
  };

  return (
    <AdminLayout title="Inventaris - Pembelian Stok" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Operasional', href: '/admin/inventory/items' }, { title: 'Pembelian' }]}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Item</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={data.inventory_item_id} onChange={(e) => setData('inventory_item_id', e.target.value)}>
                  <option value="">Pilih Item</option>
                  {items?.map((it: any) => (<option key={it.id} value={it.id}>{it.name} ({it.unit})</option>))}
                </select>
              </div>
              <div>
                <Label>Property (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={data.property_id} onChange={(e) => setData('property_id', e.target.value)}>
                  <option value="">Global</option>
                  {properties?.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Qty</Label>
                  <Input type="number" value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} />
                </div>
                <div>
                  <Label>Harga/Unit</Label>
                  <Input type="number" value={data.unit_cost} onChange={(e) => setData('unit_cost', e.target.value)} />
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={data.movement_date} onChange={(e) => setData('movement_date', e.target.value)} />
                </div>
              </div>
              <div>
     <Label>Vendor Name (Supplier)</Label>
     <Input value={data.vendor_name} onChange={(e) => setData('vendor_name', e.target.value)} />
   </div>
              <div>
                <Label>Catatan</Label>
                <Input value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
              </div>
              <Button type="submit" disabled={processing}>Simpan</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Harga/Unit</th>
                    <th className="py-2 pr-0 text-right">Total</th>
                    <th className="py-2 pr-4">Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases?.data?.map((m: any) => (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 pr-4">{m.movement_date}</td>
                      <td className="py-2 pr-4">{m.item?.name}</td>
                      <td className="py-2 pr-4">{Number(m.quantity)}</td>
                      <td className="py-2 pr-4">{rp(Number(m.unit_cost))}</td>
                      <td className="py-2 pr-0 text-right font-medium">{rp(Number(m.total_cost))}</td>
                      <td className="py-2 pr-4">{m.vendor_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {purchases?.from || 0}-{purchases?.to || 0} dari {purchases?.total || 0}</div>
              <div className="flex gap-2">
                {purchases?.links?.map((l: any) => (
                  <Link key={l.label} href={l.url || '#'} className={`px-2 py-1 rounded ${l.active ? 'bg-accent' : 'hover:bg-accent/60'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}>{l.label.replace('&laquo;','«').replace('&raquo;','»')}</Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}



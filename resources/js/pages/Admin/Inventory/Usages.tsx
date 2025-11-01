import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Link } from '@inertiajs/react';

function rp(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

export default function Usages({ items, properties, usages }: any) {
  const { data, setData, post, processing, reset } = useForm({
    inventory_item_id: '',
    property_id: '',
    usage_date: new Date().toISOString().slice(0,10),
    quantity_used: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/inventory/usages', { onSuccess: () => reset('quantity_used','notes') });
  };

  return (
    <AdminLayout title="Inventaris - Pemakaian Harian" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Operasional', href: '/admin/inventory/items' }, { title: 'Pemakaian' }]}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input Pemakaian</CardTitle>
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
                <Label>Property</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={data.property_id} onChange={(e) => setData('property_id', e.target.value)}>
                  <option value="">Pilih Property</option>
                  {properties?.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={data.usage_date} onChange={(e) => setData('usage_date', e.target.value)} />
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input type="number" value={data.quantity_used} onChange={(e) => setData('quantity_used', e.target.value)} />
                </div>
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
            <CardTitle>Rekap Pemakaian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Property</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-0 text-right">Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {usages?.data?.map((u: any) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 pr-4">{u.usage_date}</td>
                      <td className="py-2 pr-4">{u.item?.name}</td>
                      <td className="py-2 pr-4">{u.property?.name}</td>
                      <td className="py-2 pr-4">{Number(u.quantity_used)}</td>
                      <td className="py-2 pr-0 text-right font-medium">{rp(Number(u.total_cost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {usages?.from || 0}-{usages?.to || 0} dari {usages?.total || 0}</div>
              <div className="flex gap-2">
                {usages?.links?.map((l: any) => (
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




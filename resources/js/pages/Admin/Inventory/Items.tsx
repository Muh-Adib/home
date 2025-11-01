import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Link } from '@inertiajs/react';

export default function Items({ items }: any) {
  const { data, setData, post, processing, reset } = useForm({
    name: '',
    sku: '',
    unit: 'pcs',
    min_stock: '',
    category: '',
    image: null as File | null,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) formData.append(k, v as any);
    });
    post('/admin/inventory/items', {
      data: formData,
      forceFormData: true,
      onSuccess: () => reset(),
    });
  };

  return (
    <AdminLayout title="Inventaris - Items" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Operasional', href: '/admin/inventory/items' }, { title: 'Items' }]}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Nama</Label>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>SKU</Label>
                  <Input value={data.sku} onChange={(e) => setData('sku', e.target.value)} />
                </div>
                <div>
                  <Label>Satuan</Label>
                  <Input value={data.unit} onChange={(e) => setData('unit', e.target.value)} />
                </div>
                <div>
                  <Label>Minimal Stok</Label>
                  <Input type="number" value={data.min_stock} onChange={(e) => setData('min_stock', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Kategori</Label>
                  <Input value={data.category} onChange={(e) => setData('category', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Foto Item</Label>
                <Input type="file" accept="image/*" onChange={(e) => setData('image', e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" disabled={processing}>Simpan</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Foto</th>
                    <th className="py-2 pr-4">Nama</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">Satuan</th>
                    <th className="py-2 pr-4">Min Stok</th>
                    <th className="py-2 pr-4">Stok</th>
                    <th className="py-2 pr-4">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.data?.map((it: any) => (
                    <tr key={it.id} className="border-b">
                      <td className="py-2 pr-4">
                        {it.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/storage/${it.image_path}`} alt={it.name} className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded" />
                        )}
                      </td>
                      <td className="py-2 pr-4">{it.name}</td>
                      <td className="py-2 pr-4">{it.sku || '-'}</td>
                      <td className="py-2 pr-4">{it.unit}</td>
                      <td className="py-2 pr-4">{Number(it.min_stock || 0)}</td>
                      <td className={`py-2 pr-4 ${it.is_below_min ? 'text-red-600 font-semibold' : ''}`}>{Number(it.current_stock || 0)}</td>
                      <td className="py-2 pr-4">{it.category || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {items?.from || 0}-{items?.to || 0} dari {items?.total || 0}</div>
              <div className="flex gap-2">
                {items?.links?.map((l: any) => (
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



import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useForm, usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';

interface IncomeForm {
  property_id?: number | null;
  booking_id?: number | null;
  source: string;
  description?: string;
  amount: number | string;
  income_date: string;
  wallet_id?: number | null;
  notes?: string;
  [key: string]: any;
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function Incomes({ incomes, properties, wallets }: any) {
  const page = usePage<PageProps>();
  const { data, setData, post, processing, reset } = useForm<IncomeForm>({
    property_id: null,
    booking_id: null,
    source: 'extra',
    description: '',
    amount: '',
    income_date: new Date().toISOString().slice(0, 10),
    wallet_id: null,
    notes: '',
  });

  const { data: filter, setData: setFilter, get } = useForm({
    q: '',
    from: '',
    to: '',
    source: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/incomes', {
      onSuccess: () => reset(),
      preserveScroll: true,
    });
  };

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filter.q) params.set('q', filter.q);
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if (filter.source) params.set('source', filter.source);
    get(`/admin/finance/incomes?${params.toString()}`, { preserveScroll: true, preserveState: true });
  };

  return (
    <AdminLayout title="Pendapatan" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Pendapatan' }]}>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Input Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Property (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={String(data.property_id ?? '')} onChange={(e) => setData('property_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Pilih Property —</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Sumber <span className="text-red-500">*</span></Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={data.source} onChange={(e) => setData('source', e.target.value)}>
                  <option value="booking">Booking</option>
                  <option value="extra">Extra</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <Label>Deskripsi (opsional)</Label>
                <Input value={data.description || ''} onChange={(e) => setData('description', e.target.value)} placeholder="Deskripsi pendapatan" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nominal <span className="text-red-500">*</span></Label>
                  <Input type="number" step="1" min="0" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required />
                </div>
                <div>
                  <Label>Tanggal <span className="text-red-500">*</span></Label>
                  <Input type="date" value={data.income_date} onChange={(e) => setData('income_date', e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Wallet (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={String(data.wallet_id ?? '')} onChange={(e) => setData('wallet_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Pilih Wallet —</option>
                  {wallets?.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Input value={data.notes || ''} onChange={(e) => setData('notes', e.target.value)} placeholder="Catatan tambahan" />
              </div>
              <Button type="submit" disabled={processing} className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={applyFilter}>
              <Input placeholder="Cari deskripsi" value={filter.q} onChange={(e) => setFilter('q', e.target.value)} />
              <Input type="date" value={filter.from} onChange={(e) => setFilter('from', e.target.value)} />
              <Input type="date" value={filter.to} onChange={(e) => setFilter('to', e.target.value)} />
              <Input placeholder="Sumber" value={filter.source} onChange={(e) => setFilter('source', e.target.value)} />
              <div className="md:col-span-4">
                <Button type="submit" variant="secondary">Filter</Button>
              </div>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">Sumber</th>
                    <th className="py-2 pr-4">Deskripsi</th>
                    <th className="py-2 pr-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes?.data?.map((row: any) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-4">{row.income_date}</td>
                      <td className="py-2 pr-4 uppercase">{row.source}</td>
                      <td className="py-2 pr-4">{row.description || '-'}</td>
                      <td className="py-2 pr-0 text-right font-medium">{formatRupiah(Number(row.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {incomes?.from || 0}-{incomes?.to || 0} dari {incomes?.total || 0}</div>
              <div className="flex gap-2">
                {incomes?.links?.map((l: any) => (
                  <Link key={l.label} href={l.url || '#'} className={`px-2 py-1 rounded ${l.active ? 'bg-accent' : 'hover:bg-accent/60'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}>{l.label.replace('&laquo;', '«').replace('&raquo;', '»')}</Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}



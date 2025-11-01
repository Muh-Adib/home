import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';

interface ExpenseForm {
  property_id: number | string | null;
  expense_category: string;
  expense_type: string;
  description?: string;
  amount: number | string;
  expense_date: string;
  vendor_name?: string;
  receipt_number?: string;
  payment_method?: string;
  notes?: string;
  wallet_id?: number | null;
  [key: string]: any;
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function Expenses({ expenses, expenseCategories, expenseTypes, properties, wallets, totalByProperty, totalGeneral, totalAll }: any) {
  const { data, setData, post, processing, reset } = useForm({
    property_id: '',
    expense_category: 'utilities',
    expense_type: 'fixed',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0,10),
    vendor_name: '',
    receipt_number: '',
    payment_method: '',
    notes: '',
    wallet_id: null,
  });

  const [viewMode, setViewMode] = useState<'all' | 'by_property' | 'general'>('all');

  const { data: filter, setData: setFilter, get } = useForm({
    q: '',
    from: '',
    to: '',
    type: '',
    category: '',
    property_id: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/expenses', {
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
    if (filter.type) params.set('type', filter.type);
    if (filter.category) params.set('category', filter.category);
    if (filter.property_id) params.set('property_id', filter.property_id);
    get(`/admin/finance/expenses?${params.toString()}`, { preserveScroll: true, preserveState: true });
  };

  // Group expenses by property
  const groupedExpenses = useMemo(() => {
    const grouped: Record<string | 'general', any[]> = {};
    
    expenses?.data?.forEach((expense: any) => {
      const key = expense.property_id ? `property_${expense.property_id}` : 'general';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(expense);
    });

    return grouped;
  }, [expenses]);

  // Filter expenses based on view mode
  const displayedExpenses = useMemo(() => {
    if (viewMode === 'all') {
      return expenses?.data || [];
    } else if (viewMode === 'general') {
      return groupedExpenses['general'] || [];
    } else {
      // by_property - show all except general
      const propertyExpenses: any[] = [];
      Object.keys(groupedExpenses).forEach(key => {
        if (key !== 'general') {
          propertyExpenses.push(...groupedExpenses[key]);
        }
      });
      return propertyExpenses;
    }
  }, [viewMode, expenses, groupedExpenses]);

  return (
    <AdminLayout title="Pengeluaran" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Pengeluaran' }] }>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Input Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Property</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={String(data.property_id ?? '')} onChange={(e) => {
                  const val = e.target.value;
                  setData('property_id' as any, val || null);
                }}>
                  <option value="">Pengeluaran Perusahaan (Global)</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Kategori</Label>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={data.expense_category} onChange={(e) => {
                  setData('expense_category', e.target.value);
                }}>
                    {Object.entries(expenseCategories || {}).map(([key, label]: any) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tipe</Label>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={data.expense_type} onChange={(e) => {
                  setData('expense_type', e.target.value);
                }}>
                    {Object.entries(expenseTypes || {}).map(([key, label]: any) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Deskripsi (opsional)</Label>
                <Input value={data.description || ''} onChange={(e) => {
                  setData('description', e.target.value);
                }} placeholder="Deskripsi pengeluaran" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nominal <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.01" min="0" value={data.amount} onChange={(e) => {
                    setData('amount', e.target.value);
                  }} required />
                </div>
                <div>
                  <Label>Tanggal <span className="text-red-500">*</span></Label>
                  <Input type="date" value={data.expense_date} onChange={(e) => {
                    setData('expense_date', e.target.value);
                  }} required />
                </div>
              </div>
              <div>
                <Label>Vendor/Nama Penjual (opsional)</Label>
                <Input value={data.vendor_name || ''} onChange={(e) => {
                  setData('vendor_name', e.target.value);
                }} placeholder="Nama vendor/penjual" />
              </div>
              <div>
                <Label>Nomor Nota/Struk (opsional)</Label>
                <Input value={data.receipt_number || ''} onChange={(e) => {
                  setData('receipt_number', e.target.value);
                }} placeholder="Nomor nota/struk" />
              </div>
              <div>
                <Label>Metode Pembayaran (opsional)</Label>
                <Input value={data.payment_method || ''} onChange={(e) => {
                  setData('payment_method', e.target.value);
                }} placeholder="Cash/Transfer/Kartu" />
              </div>
              <div>
                <Label>Wallet (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={String(data.wallet_id ?? '')} onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setData('wallet_id' as any, parseInt(val, 10));
                  } else {
                    setData('wallet_id' as any, null);
                  }
                }}>
                  <option value="">— Pilih Wallet —</option>
                  {wallets?.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Input value={data.notes || ''} onChange={(e) => {
                  setData('notes', e.target.value);
                }} placeholder="Catatan tambahan" />
              </div>
              <Button type="submit" disabled={processing} className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border rounded p-2 bg-muted/50">
                <div className="text-xs text-muted-foreground">Total Semua</div>
                <div className="text-lg font-semibold">{formatRupiah(totalAll || 0)}</div>
              </div>
              <div className="border rounded p-2 bg-muted/50">
                <div className="text-xs text-muted-foreground">Per Property</div>
                <div className="text-lg font-semibold">{formatRupiah((totalAll || 0) - (totalGeneral || 0))}</div>
              </div>
              <div className="border rounded p-2 bg-muted/50">
                <div className="text-xs text-muted-foreground">Perusahaan (Umum)</div>
                <div className="text-lg font-semibold">{formatRupiah(totalGeneral || 0)}</div>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex gap-2 mb-4 border-b">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_property')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'by_property' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Per Property
              </button>
              <button
                type="button"
                onClick={() => setViewMode('general')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Perusahaan (Umum)
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-6" onSubmit={applyFilter}>
              <Input placeholder="Cari deskripsi/vendor" value={filter.q} onChange={(e) => setFilter('q', e.target.value)} />
              <Input type="date" value={filter.from} onChange={(e) => setFilter('from', e.target.value)} placeholder="Dari" />
              <Input type="date" value={filter.to} onChange={(e) => setFilter('to', e.target.value)} placeholder="Sampai" />
              <select className="border rounded h-9 px-2 bg-background" value={filter.type} onChange={(e) => setFilter('type', e.target.value)}>
                <option value="">Semua Tipe</option>
                {Object.entries(expenseTypes || {}).map(([key, label]: any) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select className="border rounded h-9 px-2 bg-background" value={filter.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">Semua Kategori</option>
                {Object.entries(expenseCategories || {}).map(([key, label]: any) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select className="border rounded h-9 px-2 bg-background" value={filter.property_id} onChange={(e) => setFilter('property_id', e.target.value)}>
                <option value="">Semua Property</option>
                <option value="null">Perusahaan (Umum)</option>
                {properties?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="md:col-span-6">
                <Button type="submit" variant="secondary">Filter</Button>
              </div>
            </form>

            <div className="mt-4 overflow-x-auto">
              {viewMode === 'by_property' ? (
                // Grouped by property view
                <div className="space-y-4">
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').map((key) => {
                    const propertyId = key.replace('property_', '');
                    const property = properties?.find((p: any) => p.id === parseInt(propertyId));
                    const expensesList = groupedExpenses[key];
                    const total = expensesList?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

                    return (
                      <div key={key} className="border rounded p-3">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                          <h3 className="font-semibold">{property?.name || `Property ID: ${propertyId}`}</h3>
                          <span className="text-sm font-medium">{formatRupiah(total)}</span>
                        </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">Kategori</th>
                    <th className="py-2 pr-4">Tipe</th>
                    <th className="py-2 pr-4">Deskripsi</th>
                    <th className="py-2 pr-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                            {expensesList?.map((row: any) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-4">{row.expense_date}</td>
                      <td className="py-2 pr-4 uppercase">{row.expense_category}</td>
                      <td className="py-2 pr-4 capitalize">{row.expense_type}</td>
                      <td className="py-2 pr-4">{row.description || '-'}</td>
                      <td className="py-2 pr-0 text-right font-medium">{formatRupiah(Number(row.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                      </div>
                    );
                  })}
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').length === 0 && (
                    <div className="text-center text-muted-foreground py-8">Tidak ada data pengeluaran per property</div>
                  )}
                </div>
              ) : (
                // Regular table view
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Property</th>
                      <th className="py-2 pr-4">Tanggal</th>
                      <th className="py-2 pr-4">Kategori</th>
                      <th className="py-2 pr-4">Tipe</th>
                      <th className="py-2 pr-4">Deskripsi</th>
                      <th className="py-2 pr-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedExpenses?.map((row: any) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-2 pr-4">{row.property ? row.property.name : 'Perusahaan (Umum)'}</td>
                        <td className="py-2 pr-4">{row.expense_date}</td>
                        <td className="py-2 pr-4 uppercase">{row.expense_category}</td>
                        <td className="py-2 pr-4 capitalize">{row.expense_type}</td>
                        <td className="py-2 pr-4">{row.description || '-'}</td>
                        <td className="py-2 pr-0 text-right font-medium">{formatRupiah(Number(row.amount))}</td>
                      </tr>
                    ))}
                    {(!displayedExpenses || displayedExpenses.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Tidak ada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {expenses?.from || 0}-{expenses?.to || 0} dari {expenses?.total || 0}</div>
              <div className="flex gap-2">
                {expenses?.links?.map((l: any) => (
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



import { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Link, useForm } from '@inertiajs/react';
import { FileText, Link2, DollarSign, Wallet, Calendar, Download } from 'lucide-react';

interface IncomeForm {
  property_id?: number | string | null;
  booking_id?: number | string | null;
  source: string;
  description?: string;
  amount: number | string;
  income_date: string;
  wallet_id?: number | string | null;
  notes?: string;
  [key: string]: any;
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export default function Incomes({
  incomes,
  properties,
  wallets,
  totalByProperty,
  totalGeneral,
  totalAll,
  filters,
}: any) {
  const { data, setData, post, processing, errors, reset } = useForm<IncomeForm>({
    property_id: '',
    booking_id: '',
    source: 'extra',
    description: '',
    amount: '',
    income_date: new Date().toISOString().slice(0, 10),
    wallet_id: '',
    notes: '',
  });

  const initialViewMode = useMemo<'all' | 'by_property' | 'general'>(() => {
    if (filters?.property_id === 'null') return 'general';
    if (filters?.property_id) return 'by_property';
    return 'all';
  }, [filters?.property_id]);

  const [viewMode, setViewMode] = useState<'all' | 'by_property' | 'general'>(initialViewMode);

  const { data: filter, setData: setFilter, get } = useForm({
    q: filters?.q || '',
    from: filters?.from || '',
    to: filters?.to || '',
    source: filters?.source || '',
    property_id: filters?.property_id || '',
    wallet_id: filters?.wallet_id || '',
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
    if (filter.property_id) params.set('property_id', filter.property_id);
    if (filter.wallet_id) params.set('wallet_id', filter.wallet_id);
    get(`/admin/finance/incomes?${params.toString()}`, { preserveScroll: true, preserveState: true });
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filter.q) params.set('q', filter.q);
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if (filter.source) params.set('source', filter.source);
    if (filter.property_id) params.set('property_id', filter.property_id);
    if (filter.wallet_id) params.set('wallet_id', filter.wallet_id);
    window.open(`/admin/finance/incomes/export?${params.toString()}`, '_blank');
  };

  // Group incomes by property
  const groupedIncomes = useMemo(() => {
    const grouped: Record<string | 'general', any[]> = {};
    incomes?.data?.forEach((income: any) => {
      const key = income.property_id ? `property_${income.property_id}` : 'general';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(income);
    });
    return grouped;
  }, [incomes]);

  // Filter incomes based on view mode
  const displayedIncomes = useMemo(() => {
    if (viewMode === 'all') {
      return incomes?.data || [];
    } else if (viewMode === 'general') {
      return groupedIncomes['general'] || [];
    } else {
      const propertyIncomes: any[] = [];
      Object.keys(groupedIncomes).forEach(key => {
        if (key !== 'general') {
          propertyIncomes.push(...groupedIncomes[key]);
        }
      });
      return propertyIncomes;
    }
  }, [viewMode, incomes, groupedIncomes]);

  return (
    <AdminLayout title="Pendapatan" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Pendapatan' }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manajemen Pendapatan</h2>
            <p className="text-xs text-slate-500">Kelola catatan dan klasifikasi pemasukan keuangan Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Form Input */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Catat Pendapatan Baru
              </CardTitle>
              <CardDescription>Catat penerimaan kas manual atau pendapatan tambahan</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <Label>Property / Unit (opsional)</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={String(data.property_id ?? '')} 
                    onChange={(e) => setData('property_id', e.target.value || '')}
                  >
                    <option value="">— Pilih Property —</option>
                    {properties?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Sumber Pendapatan <span className="text-red-500">*</span></Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={data.source} 
                    onChange={(e) => setData('source', e.target.value)}
                  >
                    <option value="extra">Pendapatan Tambahan / Extra</option>
                    <option value="booking">Sewa / Booking</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <Label>Wallet / Rekening Penerima</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={String(data.wallet_id ?? '')} 
                    onChange={(e) => setData('wallet_id', e.target.value || '')}
                  >
                    <option value="">— Pilih Wallet —</option>
                    {wallets?.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>
                    ))}
                  </select>
                  {errors.wallet_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.wallet_id}</p>}
                </div>

                <div>
                  <Label>Deskripsi</Label>
                  <Input 
                    value={data.description || ''} 
                    onChange={(e) => setData('description', e.target.value)} 
                    placeholder="Detail pemasukan" 
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Nominal <span className="text-red-500">*</span></Label>
                    <CurrencyInput 
                      value={Number(data.amount) || 0} 
                      onChange={(val) => setData('amount', val)} 
                      required 
                    />
                  </div>
                  <div>
                    <Label>Tanggal <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      value={data.income_date} 
                      onChange={(e) => setData('income_date', e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <Label>Catatan Tambahan (opsional)</Label>
                  <Input 
                    value={data.notes || ''} 
                    onChange={(e) => setData('notes', e.target.value)} 
                    placeholder="Catatan tambahan" 
                  />
                </div>

                <Button type="submit" disabled={processing} className="w-full">
                  Simpan Pendapatan
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List Data */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Riwayat Pendapatan Riil
              </CardTitle>
              <CardDescription>Semua kas masuk yang tervalidasi dan terkonfirmasi</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summaries */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="border rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Semua</div>
                  <div className="text-sm md:text-base font-black text-emerald-600 mt-1">{formatRupiah(totalAll || 0)}</div>
                </div>
                <div className="border rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Per Unit</div>
                  <div className="text-sm md:text-base font-black text-slate-700 mt-1">{formatRupiah((totalAll || 0) - (totalGeneral || 0))}</div>
                </div>
                <div className="border rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Perusahaan</div>
                  <div className="text-sm md:text-base font-black text-slate-700 mt-1">{formatRupiah(totalGeneral || 0)}</div>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex gap-2 mb-4 border-b">
                {(['all', 'by_property', 'general'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize cursor-pointer ${
                      viewMode === mode ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'all' ? 'Semua' : mode === 'by_property' ? 'Per Unit' : 'Perusahaan'}
                  </button>
                ))}
              </div>

              {/* Filter Form */}
              <form className="grid gap-2.5 md:grid-cols-3 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100" onSubmit={applyFilter}>
                <div className="space-y-1">
                  <Label className="text-xs">Cari</Label>
                  <Input placeholder="Cari deskripsi..." value={filter.q} onChange={(e) => setFilter('q', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dari</Label>
                  <Input type="date" value={filter.from} onChange={(e) => setFilter('from', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sampai</Label>
                  <Input type="date" value={filter.to} onChange={(e) => setFilter('to', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Sumber</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={filter.source} 
                    onChange={(e) => setFilter('source', e.target.value)}
                  >
                    <option value="">Semua Sumber</option>
                    <option value="booking">Sewa / Booking</option>
                    <option value="extra">Pendapatan Tambahan / Extra</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Property</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={filter.property_id} 
                    onChange={(e) => setFilter('property_id', e.target.value)}
                  >
                    <option value="">Semua Property</option>
                    <option value="null">Perusahaan (Umum)</option>
                    {properties?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Rekening</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background text-sm" 
                    value={filter.wallet_id} 
                    onChange={(e) => setFilter('wallet_id', e.target.value)}
                  >
                    <option value="">Semua Rekening</option>
                    {wallets?.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 md:col-span-3 justify-end pt-2">
                  <Button type="submit" variant="secondary" className="h-9 font-bold px-4 cursor-pointer">Filter</Button>
                  <Button type="button" variant="ghost" className="h-9 px-4 cursor-pointer font-bold text-slate-500 hover:text-slate-800" onClick={() => {
                    setFilter({ q: '', from: '', to: '', source: '', property_id: '', wallet_id: '' });
                    get('/admin/finance/incomes');
                  }}>Reset</Button>
                </div>
              </form>

              {/* Desktop Table View */}
              <div className="mt-4 hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                {viewMode === 'by_property' ? (
                  <div className="space-y-6 p-4 bg-slate-50/20">
                    {Object.keys(groupedIncomes).filter(key => key !== 'general').map((key) => {
                      const propertyId = key.replace('property_', '');
                      const property = properties?.find((p: any) => p.id === parseInt(propertyId));
                      const incomesList = groupedIncomes[key];
                      const total = incomesList?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

                      return (
                        <div key={key} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                            <h3 className="font-bold text-sm text-slate-800">{property?.name || `Property ID: ${propertyId}`}</h3>
                            <span className="text-sm font-black text-emerald-600">{formatRupiah(total)}</span>
                          </div>
                          <table className="min-w-full text-xs border-collapse">
                            <thead>
                              <tr className="text-left border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                                <th className="py-2.5 px-3">Tanggal</th>
                                <th className="py-2.5 px-3">Sumber</th>
                                <th className="py-2.5 px-3">Deskripsi</th>
                                <th className="py-2.5 px-3">Rekening</th>
                                <th className="py-2.5 px-3">Pelacakan Data</th>
                                <th className="py-2.5 px-3 text-right">Nominal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {incomesList?.map((row: any) => (
                                <tr key={row.id} className="border-b border-slate-100/50 hover:bg-slate-200/10 transition-colors">
                                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium">{formatDate(row.income_date)}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                      row.source === 'booking' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {row.source}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-medium max-w-[200px] truncate" title={row.description}>{row.description || '-'}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-700">{row.wallet?.name || '-'}</td>
                                  <td className="py-2.5 px-3">
                                    {row.booking ? (
                                      <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-[11px]">
                                        <Link2 className="w-3 h-3" /> Booking #{row.booking.booking_number}
                                      </Link>
                                    ) : row.payment ? (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Pay: {row.payment.payment_number} ({row.payment.payment_method})
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium text-[10px]">Input Manual</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-emerald-600">{formatRupiah(Number(row.amount))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    {Object.keys(groupedIncomes).filter(key => key !== 'general').length === 0 && (
                      <div className="text-center text-slate-400 py-8 text-xs font-medium">Tidak ada data pendapatan per property</div>
                    )}
                  </div>
                ) : (
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Sumber</th>
                        <th className="py-3 px-4">Deskripsi</th>
                        <th className="py-3 px-4">Rekening</th>
                        <th className="py-3 px-4">Pelacakan Data</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedIncomes?.map((row: any, idx: number) => {
                        const rowEven = idx % 2 === 0;
                        return (
                          <tr key={row.id} className={`border-b border-slate-100/50 hover:bg-slate-200/20 transition-colors ${rowEven ? 'bg-transparent' : 'bg-slate-50/30'}`}>
                            <td className="py-3 px-4 whitespace-nowrap flex items-center gap-1.5 font-medium text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(row.income_date)}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700">{row.property ? row.property.name : 'Perusahaan (Umum)'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                row.source === 'booking' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {row.source}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate font-medium text-slate-600" title={row.description}>{row.description || '-'}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="flex items-center gap-1 font-bold text-slate-700">
                                <Wallet className="w-3 h-3 text-slate-400" />
                                {row.wallet?.name || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {row.booking ? (
                                <div className="flex flex-col gap-0.5">
                                  <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-[11px]">
                                    <Link2 className="w-3 h-3" /> Booking #{row.booking.booking_number}
                                  </Link>
                                  {row.payment && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Pay: {row.payment.payment_number} ({row.payment.payment_method})
                                    </span>
                                  )}
                                </div>
                              ) : row.payment ? (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Pay: {row.payment.payment_number} ({row.payment.payment_method})
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[10px]">Input Manual</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">{formatRupiah(Number(row.amount))}</td>
                          </tr>
                        );
                      })}
                      {(!displayedIncomes || displayedIncomes.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                            Tidak ada data pendapatan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile Card List View */}
              <div className="mt-4 block md:hidden space-y-3">
                {viewMode === 'by_property' ? (
                  Object.keys(groupedIncomes).filter(key => key !== 'general').map((key) => {
                    const propertyId = key.replace('property_', '');
                    const property = properties?.find((p: any) => p.id === parseInt(propertyId));
                    const incomesList = groupedIncomes[key];
                    const total = incomesList?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

                    return (
                      <div key={key} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 mb-3 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                          <span className="font-bold text-xs text-slate-800">{property?.name || `Property ID: ${propertyId}`}</span>
                          <span className="text-xs font-black text-emerald-600">{formatRupiah(total)}</span>
                        </div>
                        <div className="space-y-2 pt-1">
                          {incomesList?.map((row: any) => (
                            <div key={row.id} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(row.income_date)}
                                </div>
                                <div className="font-bold text-emerald-600 text-xs">{formatRupiah(Number(row.amount))}</div>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                <div>{row.description || '-'}</div>
                              </div>
                              <div className="flex items-center justify-between text-[9px] border-t pt-1.5 border-slate-100">
                                <span className="text-slate-500 font-medium">{row.wallet?.name || '—'}</span>
                                <span className="font-semibold text-slate-400 uppercase">{row.source}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  displayedIncomes?.map((row: any) => (
                    <div key={row.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(row.income_date)}
                          </div>
                          <div className="font-bold text-slate-800 text-sm">{row.property ? row.property.name : 'Perusahaan (Umum)'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-emerald-600 text-base">{formatRupiah(Number(row.amount))}</div>
                          <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[9px] font-extrabold uppercase ${
                            row.source === 'booking' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {row.source}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                        <div>Deskripsi: <span className="font-semibold text-slate-800">{row.description || '-'}</span></div>
                        {row.notes && <div>Catatan: <span className="font-medium text-slate-500 italic">{row.notes}</span></div>}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                          <Wallet className="h-3 w-3 text-slate-400" />
                          <span>{row.wallet?.name || '—'}</span>
                        </div>
                        <div>
                          {row.booking ? (
                            <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-bold">
                              <Link2 className="w-3 h-3" /> #{row.booking.booking_number}
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Input Manual</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {(!displayedIncomes || displayedIncomes.length === 0) && (
                  <div className="text-center text-slate-400 py-8 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Tidak ada data pendapatan
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 text-xs">
                <div>Menampilkan {incomes?.from || 0}-{incomes?.to || 0} dari {incomes?.total || 0}</div>
                <div className="flex gap-1">
                  {incomes?.links?.map((l: any) => (
                    <Link 
                      key={l.label} 
                      href={l.url || '#'} 
                      className={`px-2 py-1 rounded cursor-pointer ${l.active ? 'bg-primary text-white font-bold' : 'hover:bg-accent'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {l.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { Package, FileText, Image as ImageIcon, Eye, Upload, Percent, Link2 } from 'lucide-react';

interface ExpenseForm {
  property_id: number | string | null;
  expense_scope: string;
  expense_category: string;
  expense_type: string;
  description?: string;
  amount: number | string;
  expense_date: string;
  vendor_name?: string;
  receipt_number?: string;
  payment_method?: string;
  notes?: string;
  wallet_id?: number | string | null;
  receipt_image?: File | null;
  capital_split_investor_pct?: number | string | null;
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

export default function Expenses({
  expenses,
  expenseCategories,
  expenseTypes,
  expenseScopes,
  scopeCategories,
  properties,
  wallets,
  totalByProperty,
  totalGeneral,
  totalAll
}: any) {
  const { auth } = usePage<any>().props;
  const userRole = auth?.user?.role;

  const [selectedScope, setSelectedScope] = useState<string>('operational');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const { data, setData, post, processing, errors, reset } = useForm<ExpenseForm>({
    property_id: '',
    expense_scope: 'operational',
    expense_category: 'supplies_small',
    expense_type: 'variable',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    vendor_name: '',
    receipt_number: '',
    payment_method: 'cash',
    notes: '',
    wallet_id: '',
    receipt_image: null,
    capital_split_investor_pct: '',
  });

  const [viewMode, setViewMode] = useState<'all' | 'by_property' | 'general'>('all');

  const { data: filter, setData: setFilter, get } = useForm({
    q: '',
    from: '',
    to: '',
    type: '',
    category: '',
    scope: '',
    property_id: '',
    wallet_id: '',
    is_inventory: '',
  });

  const canEdit = (row: any) => {
    return ['super_admin', 'property_manager'].includes(userRole) && !row.is_linked;
  };

  const startEdit = (expense: any) => {
    setEditingId(expense.id);
    setSelectedScope(expense.expense_scope);
    setData({
      property_id: expense.property_id || '',
      expense_scope: expense.expense_scope,
      expense_category: expense.expense_category,
      expense_type: expense.expense_type,
      description: expense.description || '',
      amount: String(expense.amount),
      expense_date: expense.expense_date ? expense.expense_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      vendor_name: expense.vendor_name || '',
      receipt_number: expense.receipt_number || '',
      payment_method: expense.payment_method || 'cash',
      notes: expense.notes || '',
      wallet_id: expense.wallet_id || '',
      receipt_image: null,
      capital_split_investor_pct: expense.capital_split_investor_pct || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset();
    setSelectedScope('operational');
  };

  // Automatically update default category when scope changes
  useEffect(() => {
    if (editingId !== null) return;
    setData(prev => ({
      ...prev,
      expense_scope: selectedScope,
      expense_category: scopeCategories[selectedScope]?.[0] || 'other'
    }));
  }, [selectedScope, editingId]);

  // Find if currently selected property is partnership
  const selectedProperty = useMemo(() => {
    if (!data.property_id) return null;
    return properties?.find((p: any) => p.id === Number(data.property_id));
  }, [data.property_id, properties]);

  const showInvestorSplit = useMemo(() => {
    return selectedScope === 'capital' && selectedProperty?.ownership_model === 'partnership';
  }, [selectedScope, selectedProperty]);

  useEffect(() => {
    if (showInvestorSplit && selectedProperty) {
      setData('capital_split_investor_pct', selectedProperty.investor_split_pct);
    } else {
      setData('capital_split_investor_pct', '');
    }
  }, [showInvestorSplit, selectedProperty]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      post(`/admin/finance/expenses/${editingId}/update`, {
        onSuccess: () => {
          cancelEdit();
        },
        preserveScroll: true,
      });
    } else {
      post('/admin/finance/expenses', {
        onSuccess: () => {
          reset();
          setSelectedScope('operational');
        },
        preserveScroll: true,
      });
    }
  };

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filter.q) params.set('q', filter.q);
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if (filter.type) params.set('type', filter.type);
    if (filter.category) params.set('category', filter.category);
    if (filter.scope) params.set('scope', filter.scope);
    if (filter.property_id) params.set('property_id', filter.property_id);
    if (filter.wallet_id) params.set('wallet_id', filter.wallet_id);
    if (filter.is_inventory) params.set('is_inventory', filter.is_inventory);
    get(`/admin/finance/expenses?${params.toString()}`, { preserveScroll: true, preserveState: true });
  };

  const isFromInventory = (expense: any) => {
    return expense.payment_method === 'inventory_usage';
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
    <AdminLayout title="Pengeluaran" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Pengeluaran' }]}>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Form Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Catat Pengeluaran Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              {/* Scope Selector */}
              <div>
                <Label>Scope Pengeluaran <span className="text-red-500">*</span></Label>
                <select 
                  className="w-full border rounded h-9 px-2 bg-background font-medium" 
                  value={selectedScope} 
                  onChange={(e) => setSelectedScope(e.target.value)}
                  required
                >
                  {Object.entries(expenseScopes || {}).map(([key, label]: any) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Property Selector */}
              <div>
                <Label>Property / Unit</Label>
                <select 
                  className="w-full border rounded h-9 px-2 bg-background" 
                  value={String(data.property_id ?? '')} 
                  onChange={(e) => setData('property_id', e.target.value || null)}
                >
                  <option value="">Pengeluaran Perusahaan (Global)</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.ownership_model === 'partnership' ? 'Partnership' : 'Internal'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Category Selector */}
                <div>
                  <Label>Kategori</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background" 
                    value={data.expense_category} 
                    onChange={(e) => setData('expense_category', e.target.value)}
                  >
                    {(scopeCategories[selectedScope] || []).map((key: string) => (
                      <option key={key} value={key}>{expenseCategories[key] || key}</option>
                    ))}
                  </select>
                </div>
                {/* Type Selector */}
                <div>
                  <Label>Tipe</Label>
                  <select 
                    className="w-full border rounded h-9 px-2 bg-background" 
                    value={data.expense_type} 
                    onChange={(e) => setData('expense_type', e.target.value)}
                  >
                    {Object.entries(expenseTypes || {}).map(([key, label]: any) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wallet Selector (Sumber Dana) */}
              <div>
                <Label>Sumber Rekening (Wallet) <span className="text-red-500">*</span></Label>
                <select 
                  className="w-full border rounded h-9 px-2 bg-background border-primary/50" 
                  value={String(data.wallet_id ?? '')} 
                  onChange={(e) => setData('wallet_id', e.target.value || '')}
                  required
                >
                  <option value="">— Pilih Sumber Rekening —</option>
                  {wallets?.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
                  ))}
                </select>
                {errors.wallet_id && <span className="text-xs text-rose-500 mt-1 block">{errors.wallet_id}</span>}
              </div>

              {/* Splitting for Partnership Investor */}
              {showInvestorSplit && (
                <div className="bg-muted/40 p-2.5 rounded border border-dashed space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Percent className="w-3.5 h-3.5" /> Porsi Beban Modal Partnership
                  </div>
                  <div>
                    <Label className="text-xs">Persentase Ditanggung Investor (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={data.capital_split_investor_pct ?? ''} 
                      onChange={(e) => setData('capital_split_investor_pct', e.target.value)} 
                      placeholder="Contoh: 50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Sisanya ({100 - Number(data.capital_split_investor_pct || 0)}%) akan ditanggung oleh owner.
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <Label>Deskripsi / Detail Barang</Label>
                <Input 
                  value={data.description || ''} 
                  onChange={(e) => setData('description', e.target.value)} 
                  placeholder="Detail barang/jasa yang dibeli" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Amount */}
                <div>
                  <Label>Nominal <span className="text-red-500">*</span></Label>
                  <CurrencyInput 
                    value={Number(data.amount) || 0} 
                    onChange={(val) => setData('amount', val)} 
                    required 
                  />
                </div>
                {/* Date */}
                <div>
                  <Label>Tanggal <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={data.expense_date} 
                    onChange={(e) => setData('expense_date', e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Vendor */}
                <div>
                  <Label>Vendor/Toko</Label>
                  <Input 
                    value={data.vendor_name || ''} 
                    onChange={(e) => setData('vendor_name', e.target.value)} 
                    placeholder="Nama toko" 
                  />
                </div>
                {/* Receipt Number */}
                <div>
                  <Label>No. Nota</Label>
                  <Input 
                    value={data.receipt_number || ''} 
                    onChange={(e) => setData('receipt_number', e.target.value)} 
                    placeholder="No. struk" 
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Foto Nota / Bukti Struk</Label>
                <div className="mt-1 flex items-center justify-center border-2 border-dashed rounded-lg p-3 hover:bg-muted/40 cursor-pointer relative">
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setData('receipt_image', file);
                    }}
                  />
                  <div className="text-center space-y-1">
                    <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground block truncate">
                      {data.receipt_image ? data.receipt_image.name : 'Pilih Foto Struk'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Catatan Tambahan</Label>
                <Input 
                  value={data.notes || ''} 
                  onChange={(e) => setData('notes', e.target.value)} 
                  placeholder="Catatan tambahan" 
                />
              </div>

              {errors.error && <div className="text-xs text-rose-500 mt-1 font-medium">{errors.error}</div>}

              <Button type="submit" disabled={processing} className="w-full">Simpan Pengeluaran</Button>
            </form>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Riwayat Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summaries */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border rounded p-2.5 bg-muted/30">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Semua</div>
                <div className="text-lg font-bold">{formatRupiah(totalAll || 0)}</div>
              </div>
              <div className="border rounded p-2.5 bg-muted/30">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Per Property/Unit</div>
                <div className="text-lg font-bold">{formatRupiah((totalAll || 0) - (totalGeneral || 0))}</div>
              </div>
              <div className="border rounded p-2.5 bg-muted/30">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Perusahaan (Umum)</div>
                <div className="text-lg font-bold">{formatRupiah(totalGeneral || 0)}</div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mb-4 border-b">
              {(['all', 'by_property', 'general'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${
                    viewMode === mode ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'all' ? 'Semua' : mode === 'by_property' ? 'Per Unit' : 'Perusahaan'}
                </button>
              ))}
            </div>

            {/* Filter Form */}
            <form className="grid gap-2.5 md:grid-cols-4" onSubmit={applyFilter}>
              <Input placeholder="Cari deskripsi/vendor" value={filter.q} onChange={(e) => setFilter('q', e.target.value)} />
              <Input type="date" value={filter.from} onChange={(e) => setFilter('from', e.target.value)} />
              <Input type="date" value={filter.to} onChange={(e) => setFilter('to', e.target.value)} />
              <select className="border rounded h-9 px-2 bg-background text-sm" value={filter.scope} onChange={(e) => setFilter('scope', e.target.value)}>
                <option value="">Semua Scope</option>
                {Object.entries(expenseScopes || {}).map(([key, label]: any) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select className="border rounded h-9 px-2 bg-background text-sm" value={filter.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">Semua Kategori</option>
                {Object.entries(expenseCategories || {}).map(([key, label]: any) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select className="border rounded h-9 px-2 bg-background text-sm" value={filter.property_id} onChange={(e) => setFilter('property_id', e.target.value)}>
                <option value="">Semua Property</option>
                <option value="null">Perusahaan (Umum)</option>
                {properties?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select className="border rounded h-9 px-2 bg-background text-sm" value={filter.wallet_id} onChange={(e) => setFilter('wallet_id', e.target.value)}>
                <option value="">Semua Rekening</option>
                {wallets?.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary" className="h-9">Filter</Button>
                <Button
                  type="button"
                  variant={filter.is_inventory === 'true' ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter('is_inventory', filter.is_inventory === 'true' ? '' : 'true');
                    setTimeout(() => applyFilter(new Event('submit') as any), 0);
                  }}
                  className="gap-2 h-9 text-xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  {filter.is_inventory === 'true' ? 'Semua' : 'Inventory'}
                </Button>
              </div>
            </form>

            {/* List Table */}
            {/* Desktop Table View */}
            <div className="mt-4 hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
              {viewMode === 'by_property' ? (
                <div className="space-y-4">
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').map((key) => {
                    const propertyId = key.replace('property_', '');
                    const property = properties?.find((p: any) => p.id === parseInt(propertyId));
                    const expensesList = groupedExpenses[key];
                    const total = expensesList?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

                    return (
                      <div key={key} className="border border-slate-100 rounded-xl p-4 bg-white">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                          <h3 className="font-bold text-sm text-slate-800">{property?.name || `Property ID: ${propertyId}`}</h3>
                          <span className="text-sm font-black text-rose-600">{formatRupiah(total)}</span>
                        </div>
                        <table className="min-w-full text-xs border-collapse">
                          <thead>
                            <tr className="text-left border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                              <th className="py-2.5 px-3">Tanggal</th>
                              <th className="py-2.5 px-3">Scope</th>
                              <th className="py-2.5 px-3">Kategori</th>
                              <th className="py-2.5 px-3">Rekening</th>
                              <th className="py-2.5 px-3">Deskripsi</th>
                              <th className="py-2.5 px-3">Pelacakan Data</th>
                              <th className="py-2.5 px-3">Nota</th>
                              <th className="py-2.5 px-3 text-right">Nominal</th>
                              {['super_admin', 'property_manager'].includes(userRole) && <th className="py-2.5 px-3 text-center">Aksi</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {expensesList?.map((row: any) => (
                              <tr key={row.id} className="border-b border-slate-100/50 hover:bg-slate-200/10 transition-colors">
                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium">{formatDate(row.expense_date)}</td>
                                <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold uppercase">{expenseScopes[row.expense_scope] || row.expense_scope}</span></td>
                                <td className="py-2.5 px-3 capitalize font-medium text-slate-600">{expenseCategories[row.expense_category] || row.expense_category}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-700">{row.wallet?.name || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium max-w-[200px] truncate" title={row.description}>{row.description || '-'}</td>
                                <td className="py-2.5 px-3">
                                  {row.booking ? (
                                    <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-[11px]">
                                      <Link2 className="w-3 h-3" /> Booking #{row.booking.booking_number}
                                    </Link>
                                  ) : row.inventory_usage ? (
                                    <div className="flex flex-col text-[10px]">
                                      <span className="font-semibold text-blue-700 dark:text-blue-300">Inventory Usage</span>
                                      <span className="text-slate-400 font-medium">
                                        {row.inventory_usage.item?.name || 'Item'} ({Number(row.inventory_usage.quantity)} {row.inventory_usage.item?.unit || 'pcs'})
                                      </span>
                                    </div>
                                  ) : row.stock_movement ? (
                                    <div className="flex flex-col text-[10px]">
                                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">Purchase</span>
                                      <span className="text-slate-400 font-medium">
                                        {row.stock_movement.item?.name || 'Item'} ({Number(row.stock_movement.quantity)} {row.stock_movement.item?.unit || 'pcs'})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium text-[10px]">Input Manual</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {row.receipt_image ? (
                                    <a href={`/storage/${row.receipt_image}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold">
                                      <Eye className="w-3.5 h-3.5" /> Lihat
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-rose-600">{formatRupiah(Number(row.amount))}</td>
                                {['super_admin', 'property_manager'].includes(userRole) && (
                                  <td className="py-2.5 px-3 text-center">
                                    {canEdit(row) ? (
                                      <button 
                                        type="button"
                                        onClick={() => startEdit(row)} 
                                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline font-semibold"
                                      >
                                        Edit
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]" title="Pengeluaran terhubung tidak bisa diedit secara manual">Terhubung</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').length === 0 && (
                    <div className="text-center text-slate-400 py-8 text-xs font-medium">Tidak ada data pengeluaran per property</div>
                  )}
                </div>
              ) : (
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Property</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Rekening</th>
                      <th className="py-3 px-4">Deskripsi</th>
                      <th className="py-3 px-4">Pelacakan Data</th>
                      <th className="py-3 px-4">Nota</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      {['super_admin', 'property_manager'].includes(userRole) && <th className="py-3 px-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedExpenses?.map((row: any) => (
                      <tr key={row.id} className="border-b border-slate-100/50 hover:bg-slate-200/10 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-700">{row.property ? row.property.name : 'Perusahaan (Umum)'}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-medium">{formatDate(row.expense_date)}</td>
                        <td className="py-2.5 px-4"><span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold uppercase">{expenseScopes[row.expense_scope] || row.expense_scope}</span></td>
                        <td className="py-2.5 px-4 capitalize font-medium text-slate-600">{expenseCategories[row.expense_category] || row.expense_category}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-700">{row.wallet?.name || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-medium max-w-[200px] truncate" title={row.description}>{row.description || '-'}</td>
                        <td className="py-2.5 px-4">
                          {row.booking ? (
                            <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-[11px]">
                              <Link2 className="w-3 h-3" /> Booking #{row.booking.booking_number}
                            </Link>
                          ) : row.inventory_usage ? (
                            <div className="flex flex-col text-[10px]">
                              <span className="font-semibold text-blue-700 dark:text-blue-300">Inventory Usage</span>
                              <span className="text-slate-400 font-medium">
                                {row.inventory_usage.item?.name || 'Item'} ({Number(row.inventory_usage.quantity)} {row.inventory_usage.item?.unit || 'pcs'})
                              </span>
                            </div>
                          ) : row.stock_movement ? (
                            <div className="flex flex-col text-[10px]">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Purchase</span>
                              <span className="text-slate-400 font-medium">
                                {row.stock_movement.item?.name || 'Item'} ({Number(row.stock_movement.quantity)} {row.stock_movement.item?.unit || 'pcs'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Input Manual</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {row.receipt_image ? (
                            <a href={`/storage/${row.receipt_image}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold">
                              <Eye className="w-3.5 h-3.5" /> Lihat
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-rose-600">{formatRupiah(Number(row.amount))}</td>
                        {['super_admin', 'property_manager'].includes(userRole) && (
                          <td className="py-2.5 px-4 text-center">
                            {canEdit(row) ? (
                              <button 
                                type="button"
                                onClick={() => startEdit(row)} 
                                className="text-blue-600 hover:text-blue-800 font-bold hover:underline font-semibold"
                              >
                                Edit
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]" title="Pengeluaran terhubung tidak bisa diedit secara manual">Terhubung</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!displayedExpenses || displayedExpenses.length === 0) && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                          Tidak ada data pengeluaran
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden mt-4">
              {viewMode === 'by_property' ? (
                <div className="space-y-4">
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').map((key) => {
                    const propertyId = key.replace('property_', '');
                    const property = properties?.find((p: any) => p.id === parseInt(propertyId));
                    const expensesList = groupedExpenses[key];
                    const total = expensesList?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

                    return (
                      <div key={key} className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <h3 className="font-bold text-sm text-slate-800">{property?.name || `Property ID: ${propertyId}`}</h3>
                          <span className="text-sm font-black text-rose-600">{formatRupiah(total)}</span>
                        </div>

                        <div className="space-y-3">
                          {expensesList?.map((row: any) => (
                            <div key={row.id} className="bg-white border border-slate-200/60 rounded-xl p-3.5 space-y-3 shadow-sm relative">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-400 font-bold block">{formatDate(row.expense_date)}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-700 font-bold uppercase">{expenseScopes[row.expense_scope] || row.expense_scope}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-rose-600 text-sm block">{formatRupiah(Number(row.amount))}</span>
                                  <span className="text-[10px] text-slate-500 font-bold capitalize">{expenseCategories[row.expense_category] || row.expense_category}</span>
                                </div>
                              </div>

                              <div className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                                <div>Deskripsi: <span className="font-semibold text-slate-800">{row.description || '-'}</span></div>
                                {row.notes && <div>Catatan: <span className="font-medium text-slate-400 italic">{row.notes}</span></div>}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[10px] text-slate-500 font-semibold">
                                <div>Wallet: <span className="text-slate-700 font-bold">{row.wallet?.name || '-'}</span></div>
                                <div className="flex items-center gap-1.5">
                                  {canEdit(row) && (
                                    <button 
                                      type="button"
                                      onClick={() => startEdit(row)} 
                                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-bold font-semibold"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {row.receipt_image && (
                                    <a href={`/storage/${row.receipt_image}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                                      <Eye className="w-3 h-3" /> Nota
                                    </a>
                                  )}
                                  {row.booking ? (
                                    <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-bold">
                                      <Link2 className="w-3 h-3" /> #{row.booking.booking_number}
                                    </Link>
                                  ) : row.inventory_usage ? (
                                    <span className="text-blue-700 font-bold">Usage</span>
                                  ) : row.stock_movement ? (
                                    <span className="text-emerald-700 font-bold">Beli</span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">Manual</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(groupedExpenses).filter(key => key !== 'general').length === 0 && (
                    <div className="text-center text-slate-400 py-8 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Tidak ada data pengeluaran per property
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedExpenses?.map((row: any) => (
                    <div key={row.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-bold">{formatDate(row.expense_date)}</div>
                          <div className="font-bold text-slate-800 text-sm">{row.property ? row.property.name : 'Perusahaan (Umum)'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-rose-600 text-base">{formatRupiah(Number(row.amount))}</div>
                          <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[9px] bg-slate-100 text-slate-700 font-bold uppercase">{expenseScopes[row.expense_scope] || row.expense_scope}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                        <div>Deskripsi: <span className="font-semibold text-slate-800">{row.description || '-'}</span></div>
                        {row.notes && <div>Catatan: <span className="font-medium text-slate-400 italic">{row.notes}</span></div>}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 border-slate-100 text-[11px] text-slate-500 font-semibold">
                        <div>Wallet: <span className="text-slate-700 font-bold">{row.wallet?.name || '-'}</span></div>
                        <div className="flex items-center gap-2">
                          {canEdit(row) && (
                            <button 
                              type="button"
                              onClick={() => startEdit(row)} 
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-bold font-semibold"
                            >
                              Edit
                            </button>
                          )}
                          {row.receipt_image && (
                            <a href={`/storage/${row.receipt_image}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                              <Eye className="w-3.5 h-3.5" /> Nota
                            </a>
                          )}
                          {row.booking ? (
                            <Link href={`/admin/bookings?q=${row.booking.booking_number}`} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-bold">
                              <Link2 className="w-3 h-3" /> #{row.booking.booking_number}
                            </Link>
                          ) : row.inventory_usage ? (
                            <span className="text-blue-700 font-bold">Usage</span>
                          ) : row.stock_movement ? (
                            <span className="text-emerald-700 font-bold">Beli</span>
                          ) : (
                            <span className="text-slate-400 font-medium">Manual</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!displayedExpenses || displayedExpenses.length === 0) && (
                    <div className="text-center text-slate-400 py-8 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Tidak ada data pengeluaran
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 text-xs">
              <div>Menampilkan {expenses?.from || 0}-{expenses?.to || 0} dari {expenses?.total || 0}</div>
              <div className="flex gap-2">
                {expenses?.links?.map((l: any) => (
                  <Link key={l.label} href={l.url || '#'} className={`px-2 py-1 rounded ${l.active ? 'bg-accent font-bold' : 'hover:bg-accent/60'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}>{l.label.replace('&laquo;', '«').replace('&raquo;', '»')}</Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

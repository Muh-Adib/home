import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { RefreshCw, CheckCircle, AlertCircle, ArrowUpRight, ShieldAlert, Upload, FileSpreadsheet, HelpCircle, Lock, Key, ArrowDownRight, Search } from 'lucide-react';

interface Mutation {
  id: number;
  trx_at: string;
  amount: number | string;
  direction: string;
  sender_name?: string;
  description?: string;
  bank_account?: {
    label?: string;
    bank_name?: string;
    account_number?: string;
    wallet_id?: number | string;
  };
}

interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder?: string;
  account_name?: string;
  label?: string;
  wallet_id?: number;
}

interface PaymentOption {
  id: number;
  payment_number: string;
  amount: number | string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  booking?: {
    guest_name?: string;
    booking_code?: string;
    property?: {
      name?: string;
    };
  };
}

interface EStatementSyncProps {
  debitMutations?: Mutation[];
  kreditMutations?: Mutation[];
  recentPayments?: PaymentOption[];
  mutations?: Mutation[];
  properties: any[];
  wallets: any[];
  bankAccounts: BankAccount[];
  expenseScopes?: Record<string, string>;
  expenseCategories?: Record<string, string>;
  expenseTypes?: Record<string, string>;
  scopeCategories?: Record<string, string[]>;
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

export default function EStatementSync({ 
  debitMutations = [], 
  kreditMutations = [], 
  recentPayments = [], 
  mutations = [], 
  properties = [], 
  wallets = [], 
  bankAccounts = [],
  expenseScopes = {
    operational: 'Operasional Harian',
    unit: 'Per Unit (Kamar/Villa)',
    house: 'Rumah (Pusat/Pojok)',
    kitchen: 'Dapur',
    capital: 'Belanja Besar / CAPEX',
    prive: 'Prive (Penarikan Pribadi)',
  },
  expenseCategories = {
    supplies_small: 'Pengadaan Kecil (Galon, Tisu, dll)',
    fuel: 'BBM / Bensin',
    transportation: 'Transportasi',
    utilities: 'Utilitas (Listrik, Air, Internet)',
    waste: 'Kebersihan / Sampah',
    staff: 'SDM (Satpam/HK/FD)',
    maintenance: 'Pemeliharaan / Perbaikan',
    supplies: 'Perlengkapan Kamar',
    amenities: 'Amenities Tamu',
    kitchen_supplies: 'Perlengkapan Dapur',
    food_beverage: 'Bahan Makanan & Minuman',
    furniture: 'Perabotan (Kasur, Meja, dll)',
    renovation: 'Renovasi',
    equipment: 'Peralatan / Elektronik',
    prive: 'Penarikan Pribadi',
    marketing: 'Marketing',
    other: 'Lainnya',
  },
  expenseTypes = {
    fixed: 'Beban Fix',
    variable: 'Beban Variabel',
    additional: 'Beban Tambahan',
  },
  scopeCategories = {
    operational: ['supplies_small', 'fuel', 'transportation', 'utilities', 'waste', 'staff', 'other'],
    unit: ['maintenance', 'supplies', 'amenities', 'other'],
    house: ['maintenance', 'utilities', 'supplies', 'other'],
    kitchen: ['kitchen_supplies', 'food_beverage', 'other'],
    capital: ['furniture', 'renovation', 'equipment', 'other'],
    prive: ['prive'],
  }
}: EStatementSyncProps) {
  const activeDebitMutations = debitMutations.length > 0 ? debitMutations : mutations.filter(m => m.direction === 'debit');
  const activeKreditMutations = kreditMutations.length > 0 ? kreditMutations : mutations.filter(m => m.direction === 'kredit');

  const [activeTab, setActiveTab] = useState<'debit' | 'kredit'>('debit');
  const [selectedMutation, setSelectedMutation] = useState<Mutation | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Form for mapping debit mutation (Pengeluaran - Fully Aligned with Expenses.tsx)
  const debitForm = useForm({
    bank_mutation_id: '',
    property_id: '',
    expense_scope: 'operational',
    expense_category: 'supplies_small',
    expense_type: 'variable',
    description: '',
    vendor_name: '',
    receipt_number: '',
    wallet_id: '',
    receipt_image: null as File | null,
  });

  // Dynamic category update when scope changes
  useEffect(() => {
    const scope = debitForm.data.expense_scope;
    const availableCategories = scopeCategories[scope] || ['other'];
    if (!availableCategories.includes(debitForm.data.expense_category)) {
      debitForm.setData('expense_category', availableCategories[0] || 'other');
    }
  }, [debitForm.data.expense_scope]);

  // Form for mapping kredit mutation (Pendapatan/Payment)
  const kreditForm = useForm({
    bank_mutation_id: '',
    payment_id: '',
  });

  // Form for uploading e-statement file
  const uploadForm = useForm({
    bank_account_id: 'auto',
    file_password: '',
    statement_file: null as File | null,
  });

  const selectMutation = (m: Mutation) => {
    setSelectedMutation(m);
    if (m.direction === 'debit') {
      const scope = 'operational';
      const availableCategories = scopeCategories[scope] || ['other'];
      debitForm.setData({
        bank_mutation_id: String(m.id),
        property_id: '',
        expense_scope: scope,
        expense_category: availableCategories[0] || 'other',
        expense_type: 'variable',
        description: m.description || '',
        vendor_name: '',
        receipt_number: '',
        wallet_id: String(m.bank_account?.wallet_id || ''),
        receipt_image: null,
      });
    } else {
      kreditForm.setData({
        bank_mutation_id: String(m.id),
        payment_id: '',
      });
    }
  };

  const submitDebitMapping = (e: React.FormEvent) => {
    e.preventDefault();
    debitForm.post('/admin/finance/map-debit-mutation', {
      onSuccess: () => {
        setSelectedMutation(null);
        debitForm.reset();
      },
      preserveScroll: true,
    });
  };

  const submitKreditMapping = (e: React.FormEvent) => {
    e.preventDefault();
    kreditForm.post('/admin/finance/map-kredit-mutation', {
      onSuccess: () => {
        setSelectedMutation(null);
        kreditForm.reset();
      },
      preserveScroll: true,
    });
  };

  const submitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadForm.post('/admin/finance/import-statement', {
      onSuccess: () => {
        uploadForm.reset('statement_file', 'file_password');
      },
      preserveScroll: true,
    });
  };

  // Filter payments by search text
  const filteredPayments = recentPayments.filter(p => {
    if (!paymentSearch) return true;
    const q = paymentSearch.toLowerCase();
    const guest = (p.booking?.guest_name || '').toLowerCase();
    const code = (p.booking?.booking_code || '').toLowerCase();
    const num = (p.payment_number || '').toLowerCase();
    const prop = (p.booking?.property?.name || '').toLowerCase();
    return guest.includes(q) || code.includes(q) || num.includes(q) || prop.includes(q);
  });

  return (
    <AdminLayout 
      title="Rekonsiliasi E-Statement (Debit & Kredit)" 
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'E-Statement Sync' }
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">

        {/* Upload Card & Tutorial Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card Upload File */}
          <Card className="md:col-span-2 border-indigo-100 bg-indigo-50/20 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-indigo-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload File E-Statement (.xlsx / .csv)
              </CardTitle>
              <CardDescription className="text-xs text-indigo-700">
                Otomatis membaca nomor rekening, membuka proteksi kata sandi, dan membuat Kas/Wallet jika belum ada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Rekening Target</Label>
                    <select
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500"
                      value={uploadForm.data.bank_account_id}
                      onChange={(e) => uploadForm.setData('bank_account_id', e.target.value)}
                    >
                      <option value="auto">✨ Otomatis Deteksi dari File</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label || b.bank_name} ({b.account_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">File Statement (.xlsx / .csv)</Label>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => uploadForm.setData('statement_file', e.target.files?.[0] || null)}
                      className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" /> Kata Sandi File (Password)
                    </Label>
                    <Input
                      type="password"
                      placeholder="e.g. 27071990 (Jika ada)"
                      value={uploadForm.data.file_password}
                      onChange={(e) => uploadForm.setData('file_password', e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Password Error Alert Prompt */}
                {uploadForm.errors.file_password && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <Key className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadForm.errors.file_password}</span>
                  </div>
                )}
                {uploadForm.errors.statement_file && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-bold">
                    {uploadForm.errors.statement_file}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[11px] text-indigo-800 font-medium flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    <span>Aman diimpor berulang kali (Duplikat otomatis diabaikan)</span>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={uploadForm.processing || !uploadForm.data.statement_file}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    {uploadForm.processing ? 'Dekripsi & Mengimpor...' : 'Proses Upload File'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card Tutorial Bahasa Bayi */}
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Cara Pakai (Alur Rekonsiliasi)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-amber-900 font-medium">
              <p><strong>1. Tab Pengeluaran (Debit):</strong> Jodohkan transaksi uang keluar dengan pengeluaran unit properti (Scope, Kategori, Vendor, Struk).</p>
              <p><strong>2. Tab Pendapatan (Kredit):</strong> Jodohkan uang masuk dari bank dengan data Pembayaran Booking Tamu.</p>
              <p><strong>3. Kategori Konsisten:</strong> Form telah diselaraskan penuh dengan Modul Pengeluaran Manajerial.</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Switcher: Debit (Pengeluaran) vs Kredit (Pendapatan) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Button
            type="button"
            variant={activeTab === 'debit' ? 'default' : 'ghost'}
            onClick={() => { setActiveTab('debit'); setSelectedMutation(null); }}
            className={`text-xs font-bold gap-2 ${activeTab === 'debit' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'text-slate-600'}`}
          >
            <ArrowUpRight className="w-4 h-4" />
            💸 Pengeluaran / Debit ({activeDebitMutations.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'kredit' ? 'default' : 'ghost'}
            onClick={() => { setActiveTab('kredit'); setSelectedMutation(null); }}
            className={`text-xs font-bold gap-2 ${activeTab === 'kredit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            <ArrowDownRight className="w-4 h-4" />
            💰 Pendapatan / Kredit ({activeKreditMutations.length})
          </Button>
        </div>

        {/* Main Section: Mutation List & Mapping Form */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Side: Mutation List */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin-slow" />
                    {activeTab === 'debit' ? 'Mutasi Pengeluaran (Debit) Belum Dipetakan' : 'Mutasi Uang Masuk (Kredit) Belum Dipetakan'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activeTab === 'debit' 
                      ? 'Daftar pengeluaran bank statement yang belum dicatat sebagai pengeluaran properti'
                      : 'Daftar uang masuk bank statement yang belum dicocokkan dengan data pembayaran booking'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTab === 'debit' ? (
                  activeDebitMutations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">Semua mutasi pengeluaran telah dipetakan!</p>
                      <p className="text-xs text-slate-400">Tidak ada data debit pending.</p>
                    </div>
                  ) : (
                    activeDebitMutations.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => selectMutation(m)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          selectedMutation?.id === m.id
                            ? 'border-rose-600 bg-rose-50/40 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold uppercase px-1.5 py-0.5 rounded">
                              {m.bank_account?.label || m.bank_account?.bank_name || 'Bank'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatDate(m.trx_at)}
                            </span>
                          </div>
                          <div className="font-bold text-slate-800 text-sm">{m.description || 'Tanpa Keterangan'}</div>
                        </div>

                        <div className="text-right flex flex-col items-end justify-center">
                          <div className="text-base font-black text-rose-600">
                            - {formatRupiah(Number(m.amount))}
                          </div>
                          <span className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-0.5 mt-1">
                            Petakan Pengeluaran <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  activeKreditMutations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">Semua mutasi uang masuk telah dipetakan!</p>
                      <p className="text-xs text-slate-400">Tidak ada data kredit pending.</p>
                    </div>
                  ) : (
                    activeKreditMutations.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => selectMutation(m)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          selectedMutation?.id === m.id
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold uppercase px-1.5 py-0.5 rounded">
                              UANG MASUK
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold uppercase px-1.5 py-0.5 rounded">
                              {m.bank_account?.label || m.bank_account?.bank_name || 'Bank'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatDate(m.trx_at)}
                            </span>
                          </div>
                          <div className="font-bold text-slate-800 text-sm">{m.description || 'Tanpa Keterangan'}</div>
                        </div>

                        <div className="text-right flex flex-col items-end justify-center">
                          <div className="text-base font-black text-emerald-600">
                            + {formatRupiah(Number(m.amount))}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5 mt-1">
                            Cocokkan Pembayaran <ArrowDownRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Side: Mapping Form */}
          <Card className="h-fit sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                {activeTab === 'debit' ? 'Form Pemetaan Pengeluaran' : 'Form Pencocokan Pendapatan'}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeTab === 'debit' 
                  ? 'Hubungkan mutasi bank debit dengan Unit Properti & Kategori (Diselaraskan penuh dengan Sistem Pengeluaran)'
                  : 'Hubungkan mutasi bank kredit dengan Pembayaran Booking Tamu'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedMutation ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Pilih salah satu mutasi di sebelah kiri</p>
                  <p className="text-[11px] text-slate-400 mt-1">Untuk mulai memetakan transaksi.</p>
                </div>
              ) : selectedMutation.direction === 'debit' ? (
                /* Form Mapping Debit (Pengeluaran - Fully Aligned with Expenses.tsx) */
                <form onSubmit={submitDebitMapping} className="space-y-3">
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-rose-500">Mutasi Pengeluaran Dipilih</div>
                    <div className="text-sm font-bold text-slate-800 line-clamp-2">{selectedMutation.description}</div>
                    <div className="text-base font-black text-rose-600 mt-1">
                      - {formatRupiah(Number(selectedMutation.amount))}
                    </div>
                  </div>

                  {/* Scope Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Scope Pengeluaran <span className="text-red-500">*</span></Label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                      value={debitForm.data.expense_scope}
                      onChange={(e) => debitForm.setData('expense_scope', e.target.value)}
                      required
                    >
                      {Object.entries(expenseScopes).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Property Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Property / Unit Target</Label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium"
                      value={debitForm.data.property_id}
                      onChange={(e) => debitForm.setData('property_id', e.target.value)}
                    >
                      <option value="">Pengeluaran Perusahaan (Global)</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Category Selector (Dynamically Filtered by Scope) */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Kategori <span className="text-red-500">*</span></Label>
                      <select
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium"
                        value={debitForm.data.expense_category}
                        onChange={(e) => debitForm.setData('expense_category', e.target.value)}
                        required
                      >
                        {(scopeCategories[debitForm.data.expense_scope] || []).map((key) => (
                          <option key={key} value={key}>{expenseCategories[key] || key}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Selector */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Tipe Beban <span className="text-red-500">*</span></Label>
                      <select
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium"
                        value={debitForm.data.expense_type}
                        onChange={(e) => debitForm.setData('expense_type', e.target.value)}
                        required
                      >
                        {Object.entries(expenseTypes).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Wallet Selector (Sumber Dana) */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Sumber Rekening / Wallet <span className="text-red-500">*</span></Label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium border-indigo-200"
                      value={debitForm.data.wallet_id}
                      onChange={(e) => debitForm.setData('wallet_id', e.target.value)}
                      required
                    >
                      <option value="">-- Pilih Sumber Rekening --</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Deskripsi / Detail Barang <span className="text-red-500">*</span></Label>
                    <Input
                      className="text-xs"
                      placeholder="Catatan detail barang/jasa..."
                      value={debitForm.data.description}
                      onChange={(e) => debitForm.setData('description', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Vendor Name */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Vendor / Toko</Label>
                      <Input
                        className="text-xs"
                        placeholder="e.g. Toko Bangunan / PLN"
                        value={debitForm.data.vendor_name}
                        onChange={(e) => debitForm.setData('vendor_name', e.target.value)}
                      />
                    </div>
                    {/* Receipt Number */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">No. Struk / Nota</Label>
                      <Input
                        className="text-xs"
                        placeholder="e.g. INV-1092"
                        value={debitForm.data.receipt_number}
                        onChange={(e) => debitForm.setData('receipt_number', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Photo Receipt Upload */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Foto Nota / Bukti Struk</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100"
                      onChange={(e) => debitForm.setData('receipt_image', e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/3 text-xs"
                      onClick={() => setSelectedMutation(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={debitForm.processing}
                      className="w-2/3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                    >
                      {debitForm.processing ? 'Menyimpan...' : 'Simpan & Petakan'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Form Mapping Kredit (Pendapatan / Booking Payment) */
                <form onSubmit={submitKreditMapping} className="space-y-4">
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">Mutasi Uang Masuk Dipilih</div>
                    <div className="text-sm font-bold text-slate-800 line-clamp-2">{selectedMutation.description}</div>
                    <div className="text-base font-black text-emerald-600 mt-1">
                      + {formatRupiah(Number(selectedMutation.amount))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cari Pembayaran Booking</Label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        className="text-xs pl-8"
                        placeholder="Cari nama tamu, kode booking, nomor payment..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pilih Pembayaran Target</Label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                      value={kreditForm.data.payment_id}
                      onChange={(e) => kreditForm.setData('payment_id', e.target.value)}
                    >
                      <option value="">-- Pilih Pembayaran Target --</option>
                      {filteredPayments.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.payment_number} - {p.booking?.guest_name || 'Tamu'} ({p.booking?.property?.name || 'Unit'}) - {formatRupiah(Number(p.amount))} [{p.payment_status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/3 text-xs"
                      onClick={() => setSelectedMutation(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={kreditForm.processing || !kreditForm.data.payment_id}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      {kreditForm.processing ? 'Menyimpan...' : 'Jodohkan Pembayaran'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </AdminLayout>
  );
}

import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Coins, Scale, TrendingUp, Edit2, Trash2, Settings } from 'lucide-react';
import { useState, useMemo } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WalletForm {
  name: string;
  type: 'property_linked' | 'standalone_savings';
  property_id?: number | null;
  is_savings: boolean;
  auto_deduct_from_monthly_report: boolean;
  savings_monthly_amount?: number | string;
  target_amount?: number | string;
  target_date?: string;
  notes?: string;
  purpose: string;
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function Wallets({ wallets, properties, paymentMethods, walletCategories, walletPurposes }: any) {
  const { data, setData, post, processing, reset, errors } = useForm<WalletForm>({
    name: '',
    type: 'property_linked',
    property_id: null,
    is_savings: false,
    auto_deduct_from_monthly_report: false,
    savings_monthly_amount: '',
    target_amount: '',
    target_date: '',
    notes: '',
    purpose: 'general',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/wallets', {
      onSuccess: () => reset(),
    });
  };

  const totalBalanceAllWallets = useMemo(() => {
    return wallets?.reduce((sum: number, w: any) => sum + Number(w.balance), 0) || 0;
  }, [wallets]);

  return (
    <AdminLayout title="Rekening & Wallet" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Wallet' }]}>
      
      {/* Balance Overview Card */}
      <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Saldo Gabungan</span>
            <div className="text-3xl font-extrabold text-foreground">{formatRupiah(totalBalanceAllWallets)}</div>
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Coins className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>

      {/* Transfer Form */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Transfer Antar Wallet
          </CardTitle>
          <CardDescription>Pindahkan saldo secara real-time dari satu rekening ke rekening lain</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletTransferForm wallets={wallets} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Wallet Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Buat Wallet / Rekening Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Nama Rekening <span className="text-red-500">*</span></Label>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Contoh: Kas Kecil Operational" />
              </div>

              <div>
                <Label>Peruntukan (Purpose) <span className="text-red-500">*</span></Label>
                <select className="w-full border rounded h-9 px-2 bg-background text-sm" value={data.purpose} onChange={(e) => setData('purpose', e.target.value)}>
                  {Object.entries(walletPurposes || {}).map(([key, label]: any) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tipe</Label>
                <select className="w-full border rounded h-9 px-2 bg-background text-sm" value={data.type} onChange={(e) => setData('type', e.target.value as any)}>
                  <option value="property_linked">Terhubung ke Property</option>
                  <option value="standalone_savings">Tabungan (Mandiri)</option>
                </select>
              </div>
              
              <div>
                <Label>Property (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background text-sm" value={String(data.property_id ?? '')} onChange={(e) => setData('property_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">—</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_savings"
                  checked={data.is_savings}
                  onChange={(e) => setData('is_savings', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_savings" className="cursor-pointer text-xs">Ini adalah wallet tabungan</Label>
              </div>

              {data.is_savings && (
                <div className="bg-muted/40 p-2.5 rounded border border-dashed space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_deduct"
                      checked={data.auto_deduct_from_monthly_report}
                      onChange={(e) => setData('auto_deduct_from_monthly_report', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="auto_deduct" className="cursor-pointer text-xs">Auto deduct dari laporan bulanan</Label>
                  </div>
                  <div>
                    <Label className="text-xs">Saldo Tabungan Bulanan</Label>
                    <CurrencyInput value={Number(data.savings_monthly_amount) || 0} onChange={(val) => setData('savings_monthly_amount', val.toString())} placeholder="Jumlah tabungan bulanan" />
                  </div>
                  <div>
                    <Label className="text-xs">Target Jumlah</Label>
                    <CurrencyInput value={Number(data.target_amount) || 0} onChange={(val) => setData('target_amount', val.toString())} placeholder="Target jumlah tabungan" />
                  </div>
                  <div>
                    <Label className="text-xs">Target Tanggal</Label>
                    <Input type="date" value={data.target_date} onChange={(e) => setData('target_date', e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                  </div>
                </div>
              )}

              <div>
                <Label>Catatan</Label>
                <Input value={data.notes || ''} onChange={(e) => setData('notes', e.target.value)} placeholder="Catatan tambahan" />
              </div>

              <Button type="submit" disabled={processing} className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>

        {/* List Wallets */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider pl-1">Daftar Rekening Aktif</h3>
          <div className="space-y-4">
            {wallets?.map((w: any) => (
              <WalletCard 
                key={w.id} 
                wallet={w} 
                wallets={wallets} 
                paymentMethods={paymentMethods} 
                walletCategories={walletCategories} 
                walletPurposes={walletPurposes}
                properties={properties}
              />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function WalletTransferForm({ wallets }: { wallets: any[] }) {
  const { data, setData, post, processing, reset, errors } = useForm({
    from_wallet_id: '',
    to_wallet_id: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const fromWallet = wallets?.find((w: any) => w.id === Number(data.from_wallet_id));
  const toWallet = wallets?.find((w: any) => w.id === Number(data.to_wallet_id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/wallets/transfer', {
      onSuccess: () => reset(),
      preserveScroll: true,
    });
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Dari Wallet <span className="text-red-500">*</span></Label>
          <select
            className="w-full border rounded h-9 px-2 bg-background text-sm"
            value={data.from_wallet_id}
            onChange={(e) => setData('from_wallet_id', e.target.value)}
            required
          >
            <option value="">Pilih Sumber Dana</option>
            {wallets?.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatRupiah(w.balance)})
              </option>
            ))}
          </select>
          {errors.from_wallet_id && <p className="text-xs text-red-500 mt-1">{errors.from_wallet_id}</p>}
        </div>

        <div>
          <Label>Ke Wallet <span className="text-red-500">*</span></Label>
          <select
            className="w-full border rounded h-9 px-2 bg-background text-sm"
            value={data.to_wallet_id}
            onChange={(e) => setData('to_wallet_id', e.target.value)}
            required
          >
            <option value="">Pilih Rekening Tujuan</option>
            {wallets?.filter((w: any) => w.id !== Number(data.from_wallet_id)).map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatRupiah(w.balance)})
              </option>
            ))}
          </select>
          {errors.to_wallet_id && <p className="text-xs text-red-500 mt-1">{errors.to_wallet_id}</p>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Nominal <span className="text-red-500">*</span></Label>
          <CurrencyInput
            placeholder="0"
            value={Number(data.amount) || 0}
            onChange={(val) => setData('amount', val.toString())}
            required
          />
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
        </div>

        <div>
          <Label>Tanggal Transfer <span className="text-red-500">*</span></Label>
          <Input
            type="date"
            value={data.transaction_date}
            onChange={(e) => setData('transaction_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label>Keterangan / Alasan Transfer</Label>
        <Input
          placeholder="Isi kas harian / mutasi saldo..."
          value={data.description}
          onChange={(e) => setData('description', e.target.value)}
        />
      </div>

      {(errors as Record<string, string>).error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs font-semibold text-rose-700">
          {(errors as Record<string, string>).error}
        </div>
      )}

      <Button type="submit" disabled={processing} className="w-full">
        <ArrowLeftRight className="w-4 h-4 mr-2" />
        Kirim Transfer
      </Button>
    </form>
  );
}

function InlineTransactionForm({ walletId, walletCategories }: { walletId: number; walletCategories?: any }) {
  const [showForm, setShowForm] = useState(false);
  const { data, setData, post, processing, reset, errors } = useForm({
    direction: 'in' as 'in' | 'out',
    category: 'other',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/admin/finance/wallets/${walletId}/transactions`, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
      preserveScroll: true,
    });
  };

  if (!showForm) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs h-8 text-primary border-primary/20 hover:bg-primary/5 mt-2" 
        onClick={() => setShowForm(true)}
      >
        <TrendingUp className="w-3.5 h-3.5 mr-1" />
        Tambah Manual Transaksi
      </Button>
    );
  }

  return (
    <form className="mt-3 pt-3 border-t space-y-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200" onSubmit={submit}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Tambah Manual Transaksi
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowForm(false)}>Batal</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div>
          <Label className="text-[10px]">Tipe</Label>
          <select className="w-full border rounded h-8 px-2 bg-background text-xs" value={data.direction} onChange={(e) => setData('direction', e.target.value as any)} required>
            <option value="in">Masuk</option>
            <option value="out">Keluar</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Kategori</Label>
          <select className="w-full border rounded h-8 px-2 bg-background text-xs" value={data.category} onChange={(e) => setData('category', e.target.value)} required>
            {walletCategories && Object.entries(walletCategories).map(([key, label]: [string, any]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Nominal</Label>
          <CurrencyInput className="h-8 text-xs" placeholder="0" value={Number(data.amount) || 0} onChange={(val) => setData('amount', val.toString())} required />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-[10px]">Tanggal</Label>
          <Input className="h-8 text-xs" type="date" value={data.transaction_date} onChange={(e) => setData('transaction_date', e.target.value)} required />
        </div>
        <div>
          <Label className="text-[10px]">Keterangan</Label>
          <Input className="h-8 text-xs" placeholder="Keterangan transaksi" value={data.description} onChange={(e) => setData('description', e.target.value)} />
        </div>
      </div>
      {errors.amount && <p className="text-xs text-rose-500 font-semibold">{errors.amount}</p>}
      <Button type="submit" disabled={processing} variant="secondary" size="sm" className="w-full h-8 text-xs">
        {processing ? 'Menyimpan...' : 'Tambah Transaksi'}
      </Button>
    </form>
  );
}

function BalanceAdjustmentForm({ walletId }: { walletId: number }) {
  const [showForm, setShowForm] = useState(false);
  const { data, setData, post, processing, reset, errors } = useForm({
    new_balance: '',
    reason: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/admin/finance/wallets/${walletId}/adjust`, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
      preserveScroll: true,
    });
  };

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setShowForm(true)}>
        <Scale className="w-3.5 h-3.5 mr-1" />
        Sesuaikan Saldo
      </Button>
    );
  }

  return (
    <form className="mt-3 pt-3 border-t border-dashed space-y-2 bg-amber-50/50 p-2.5 rounded border border-amber-200" onSubmit={submit}>
      <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
        <Scale className="w-3.5 h-3.5" /> Penyesuaian Saldo (Opname Kas)
      </div>
      <div className="grid gap-2 grid-cols-2">
        <div>
          <Label className="text-[10px]">Saldo Baru Aktual</Label>
          <CurrencyInput className="h-8 text-xs border-amber-300 focus-visible:ring-amber-400" placeholder="Saldo aktual" value={Number(data.new_balance) || 0} onChange={(val) => setData('new_balance', val.toString())} required />
        </div>
        <div>
          <Label className="text-[10px]">Tanggal Penyesuaian</Label>
          <Input className="h-8 text-xs border-amber-300 focus-visible:ring-amber-400" type="date" value={data.transaction_date} onChange={(e) => setData('transaction_date', e.target.value)} required />
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Alasan Penyesuaian</Label>
        <Input className="h-8 text-xs border-amber-300 focus-visible:ring-amber-400" placeholder="Misal: Selisih kas fisik..." value={data.reason} onChange={(e) => setData('reason', e.target.value)} required />
      </div>
      {errors.new_balance && <p className="text-xs text-rose-500 font-semibold">{errors.new_balance}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={processing} variant="outline" size="sm" className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white hover:text-white border-transparent">
          {processing ? 'Menyimpan...' : 'Simpan Penyesuaian'}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>Batal</Button>
      </div>
    </form>
  );
}

function WalletCard({ wallet: w, wallets, paymentMethods, walletCategories, walletPurposes, properties }: any) {
  const hasTarget = w.target_amount && w.target_date;
  const progress = hasTarget ? ((Number(w.balance) / Number(w.target_amount)) * 100) : 0;
  const daysRemaining = hasTarget ? Math.ceil((new Date(w.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isTargetAchieved = hasTarget && Number(w.balance) >= Number(w.target_amount);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data, setData, put, processing, errors } = useForm({
    name: w.name || '',
    type: w.type || 'property_linked',
    property_id: w.property_id || null,
    is_savings: !!w.is_savings,
    auto_deduct_from_monthly_report: !!w.auto_deduct_from_monthly_report,
    savings_monthly_amount: w.savings_monthly_amount || '',
    target_amount: w.target_amount || '',
    target_date: w.target_date ? new Date(w.target_date).toISOString().slice(0, 10) : '',
    notes: w.notes || '',
    purpose: w.purpose || 'general',
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/admin/finance/wallets/${w.id}`, {
      onSuccess: () => setIsEditOpen(false),
      preserveScroll: true,
    });
  };

  const handleDelete = () => {
    if (confirm('Apakah Anda yakin ingin menghapus wallet ini?')) {
      router.delete(`/admin/finance/wallets/${w.id}`, {
        preserveScroll: true,
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              {w.name}
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                {walletPurposes[w.purpose] || w.purpose}
              </span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {w.property ? `Property: ${w.property.name}` : 'Rekening Perusahaan'}
            </CardDescription>
          </div>
          <div className="text-lg font-black text-primary">{formatRupiah(w.balance)}</div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Linked Bank Account info */}
        {w.bank_account && (
          <div className="bg-muted/40 p-2 rounded text-xs space-y-0.5">
            <div className="font-semibold">{w.bank_account.bank_name} — {w.bank_account.account_number}</div>
            <div className="text-muted-foreground">a.n. {w.bank_account.account_holder}</div>
          </div>
        )}

        {/* Target Progress */}
        {hasTarget && (
          <div className="p-2.5 bg-muted rounded space-y-1.5 text-xs">
            <div className="flex justify-between items-center font-medium">
              <span>Target Tabungan: {formatRupiah(w.target_amount)}</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${isTargetAchieved ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Kekurangan: {formatRupiah(Number(w.target_amount) - Number(w.balance))}</span>
              {daysRemaining !== null && (
                <span>{daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Target date telah lewat'}</span>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => window.open(`/admin/finance/wallets/${w.id}/report`, '_blank')}
            >
              Cetak Mutasi
            </Button>
            <BalanceAdjustmentForm walletId={w.id} />
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-blue-600 rounded-lg"
              onClick={() => setIsEditOpen(true)}
              title="Edit Wallet"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              onClick={handleDelete}
              title="Hapus Wallet"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Payment Methods Mapper */}
        <div className="space-y-1.5 pt-3 border-t">
          <Label className="text-xs font-medium text-muted-foreground">Channel Penerimaan Booking Terhubung</Label>
          <div className="space-y-2">
            {paymentMethods?.filter((m: any) => m.wallet_id === w.id).map((m: any) => (
              <PaymentMethodWalletMapper key={m.id} pm={m} wallets={wallets} />
            ))}
            <PaymentMethodWalletMapper pm={{ id: 0, name: 'Hubungkan metode baru…', wallet_id: w.id }} wallets={wallets} paymentMethods={paymentMethods} defaultWalletId={w.id} />
          </div>
        </div>

        {/* Inline Manual Transaction Form */}
        <InlineTransactionForm walletId={w.id} walletCategories={walletCategories} />
      </CardContent>

      {/* Edit Wallet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Settings className="w-5 h-5 text-blue-600" />
              Edit Pengaturan Wallet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah konfigurasi, peruntukan, atau target tabungan untuk **{w.name}**.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-3.5 text-xs mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-600">Nama Rekening *</Label>
              <Input 
                value={data.name} 
                onChange={(e) => setData('name', e.target.value)} 
                required 
                className="h-9 mt-1"
              />
              {errors.name && <p className="text-[10px] text-red-500 font-bold mt-0.5">{errors.name}</p>}
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-600">Peruntukan (Purpose) *</Label>
              <select 
                className="w-full border border-slate-200 rounded-lg h-9 px-2.5 bg-background text-xs mt-1" 
                value={data.purpose} 
                onChange={(e) => setData('purpose', e.target.value)}
              >
                {Object.entries(walletPurposes || {}).map(([key, label]: any) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-600">Tipe</Label>
                <select 
                  className="w-full border border-slate-200 rounded-lg h-9 px-2.5 bg-background text-xs mt-1" 
                  value={data.type} 
                  onChange={(e) => setData('type', e.target.value as any)}
                >
                  <option value="property_linked">Terhubung ke Property</option>
                  <option value="standalone_savings">Tabungan (Mandiri)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-600">Property (opsional)</Label>
                <select 
                  className="w-full border border-slate-200 rounded-lg h-9 px-2.5 bg-background text-xs mt-1" 
                  value={String(data.property_id ?? '')} 
                  onChange={(e) => setData('property_id', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">—</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id={`edit_is_savings_${w.id}`}
                checked={data.is_savings}
                onChange={(e) => setData('is_savings', e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor={`edit_is_savings_${w.id}`} className="cursor-pointer text-xs font-bold text-slate-600">Ini adalah wallet tabungan</Label>
            </div>

            {data.is_savings && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2.5 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`edit_auto_deduct_${w.id}`}
                    checked={data.auto_deduct_from_monthly_report}
                    onChange={(e) => setData('auto_deduct_from_monthly_report', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor={`edit_auto_deduct_${w.id}`} className="cursor-pointer text-[11px] font-semibold text-slate-600">Auto deduct dari laporan bulanan</Label>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-500">Saldo Tabungan Bulanan</Label>
                  <CurrencyInput 
                    value={Number(data.savings_monthly_amount) || 0} 
                    onChange={(val) => setData('savings_monthly_amount', val.toString())} 
                    placeholder="Jumlah tabungan bulanan" 
                    className="h-8 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-500">Target Jumlah</Label>
                  <CurrencyInput 
                    value={Number(data.target_amount) || 0} 
                    onChange={(val) => setData('target_amount', val.toString())} 
                    placeholder="Target jumlah tabungan" 
                    className="h-8 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-500">Target Tanggal</Label>
                  <Input 
                    type="date" 
                    value={data.target_date} 
                    onChange={(e) => setData('target_date', e.target.value)} 
                    className="h-8 mt-0.5"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-600">Catatan</Label>
              <Input 
                value={data.notes || ''} 
                onChange={(e) => setData('notes', e.target.value)} 
                placeholder="Catatan tambahan" 
                className="h-9 mt-1"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PaymentMethodWalletMapper({ pm, wallets, paymentMethods, defaultWalletId }: any) {
  const { data, setData, patch, processing } = useForm({
    wallet_id: defaultWalletId ?? (pm.wallet_id ?? ''),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pm.id) return;
    patch(`/admin/finance/payment-methods/${pm.id}/wallet`, { preserveScroll: true });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <select
        className="border rounded h-8 px-2 bg-background text-xs"
        value={String(data.wallet_id ?? '')}
        onChange={(e) => setData('wallet_id', e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">— Tidak Terhubung —</option>
        {wallets?.map((w: any) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      {pm.id ? (
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={processing}>Simpan</Button>
      ) : null}
    </form>
  );
}

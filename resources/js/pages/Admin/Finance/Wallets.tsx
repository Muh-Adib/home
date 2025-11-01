import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Link } from '@inertiajs/react';

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
}

export default function Wallets({ wallets, properties, paymentMethods }: any) {
  const { data, setData, post, processing, reset } = useForm<WalletForm>({
    name: '',
    type: 'property_linked',
    property_id: null,
    is_savings: false,
    auto_deduct_from_monthly_report: false,
    savings_monthly_amount: '',
    target_amount: '',
    target_date: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/wallets', {
      onSuccess: () => reset(),
    });
  };

  return (
    <AdminLayout title="Wallet" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Wallet' }]}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buat Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Nama <span className="text-red-500">*</span></Label>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Nama wallet" />
              </div>
              <div>
                <Label>Type</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={data.type} onChange={(e) => setData('type', e.target.value as any)}>
                  <option value="property_linked">Terhubung ke Property</option>
                  <option value="standalone_savings">Tabungan (Mandiri)</option>
                </select>
              </div>
              <div>
                <Label>Property (opsional)</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={String(data.property_id ?? '')} onChange={(e) => setData('property_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">—</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_savings"
                  checked={data.is_savings}
                  onChange={(e) => setData('is_savings', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_savings" className="cursor-pointer">Ini adalah wallet tabungan</Label>
              </div>
              {data.is_savings && (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_deduct"
                      checked={data.auto_deduct_from_monthly_report}
                      onChange={(e) => setData('auto_deduct_from_monthly_report', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="auto_deduct" className="cursor-pointer">Auto deduct dari laporan bulanan</Label>
                  </div>
                  <div>
                    <Label>Saldo Tabungan Bulanan (opsional)</Label>
                    <Input type="number" step="0.01" min="0" value={data.savings_monthly_amount} onChange={(e) => setData('savings_monthly_amount', e.target.value)} placeholder="Jumlah tabungan bulanan" />
                  </div>
                </>
              )}
              {data.is_savings && (
                <>
                  <div>
                    <Label>Target Jumlah (opsional)</Label>
                    <Input type="number" value={data.target_amount} onChange={(e) => setData('target_amount', e.target.value)} placeholder="Contoh: 10000000" />
                  </div>
                  <div>
                    <Label>Target Tanggal (opsional)</Label>
                    <Input type="date" value={data.target_date} onChange={(e) => setData('target_date', e.target.value)} min={new Date().toISOString().slice(0,10)} />
                  </div>
                </>
              )}
              <div>
                <Label>Catatan (opsional)</Label>
                <Input value={data.notes || ''} onChange={(e) => setData('notes', e.target.value)} placeholder="Catatan tambahan" />
              </div>
              <Button type="submit" disabled={processing} className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {wallets?.map((w: any) => (
                <WalletCard key={w.id} wallet={w} wallets={wallets} paymentMethods={paymentMethods} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function InlineTransactionForm({ walletId }: { walletId: number }) {
  const { data, setData, post, processing, reset } = useForm({
    direction: 'in' as 'in' | 'out',
    amount: '',
    transaction_date: new Date().toISOString().slice(0,10),
    description: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/admin/finance/wallets/${walletId}/transactions`, {
      onSuccess: () => reset(),
      preserveScroll: true,
    });
  };

  return (
    <form className="mt-3 grid gap-2 md:grid-cols-5" onSubmit={submit}>
      <div>
        <Label className="text-xs">Tipe</Label>
        <select className="w-full border rounded h-9 px-2 bg-background text-sm" value={data.direction} onChange={(e) => setData('direction', e.target.value as any)}>
          <option value="in">Masuk</option>
          <option value="out">Keluar</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Nominal</Label>
        <Input type="number" step="0.01" min="0" placeholder="0" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required />
      </div>
      <div>
        <Label className="text-xs">Tanggal</Label>
        <Input type="date" value={data.transaction_date} onChange={(e) => setData('transaction_date', e.target.value)} required />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Keterangan</Label>
        <Input placeholder="Deskripsi transaksi" value={data.description} onChange={(e) => setData('description', e.target.value)} />
      </div>
      <div className="md:col-span-5">
        <Button type="submit" disabled={processing} variant="secondary" size="sm">Tambah Transaksi</Button>
      </div>
    </form>
  );
}

function WalletCard({ wallet: w, wallets, paymentMethods }: any) {
  const hasTarget = w.target_amount && w.target_date;
  const progress = hasTarget ? ((Number(w.balance) / Number(w.target_amount)) * 100) : 0;
  const daysRemaining = hasTarget ? Math.ceil((new Date(w.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isTargetAchieved = hasTarget && Number(w.balance) >= Number(w.target_amount);

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium">{w.name}</div>
          <div className="text-muted-foreground">Saldo: Rp {Number(w.balance).toLocaleString('id-ID')}</div>
          {w.property && (
            <div className="text-muted-foreground text-xs">Property: {w.property.name}</div>
          )}
          {w.creator && (
            <div className="text-muted-foreground text-xs">Dibuat oleh: {w.creator.name}</div>
          )}
        </div>
        <div className="text-muted-foreground text-xs capitalize">{w.type.replace('_', ' ')}</div>
      </div>

      {/* Target Progress */}
      {hasTarget && (
        <div className="mb-3 p-2 bg-muted rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Target: Rp {Number(w.target_amount).toLocaleString('id-ID')}</span>
            <span className="text-sm">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${isTargetAchieved ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tersisa: Rp {(Number(w.target_amount) - Number(w.balance)).toLocaleString('id-ID')}</span>
            {daysRemaining !== null && (
              <span>{daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Target date telah lewat'}</span>
            )}
          </div>
        </div>
      )}

      {/* Print/Report Button */}
      <div className="mb-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open(`/admin/finance/wallets/${w.id}/report`, '_blank')}
        >
          Cetak Laporan
        </Button>
      </div>

      <div className="mt-3">
        <Label className="text-xs">Metode Pembayaran terhubung</Label>
        <div className="space-y-2 mt-1">
          {paymentMethods?.filter((m: any) => m.wallet_id === w.id).map((m: any) => (
            <PaymentMethodWalletMapper key={m.id} pm={m} wallets={wallets} />
          ))}
          <PaymentMethodWalletMapper pm={{ id: 0, name: 'Pilih metode…', wallet_id: w.id }} wallets={wallets} paymentMethods={paymentMethods} defaultWalletId={w.id} />
        </div>
      </div>
      <InlineTransactionForm walletId={w.id} />
    </div>
  );
}

function PaymentMethodWalletMapper({ pm, wallets, paymentMethods, defaultWalletId }: any) {
  const { data, setData, patch, processing } = useForm({
    wallet_id: defaultWalletId ?? (pm.wallet_id ?? ''),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pm.id) return; // placeholder
    patch(`/admin/finance/payment-methods/${pm.id}/wallet`, { preserveScroll: true });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <select
        className="border rounded h-8 px-2 bg-background"
        value={String(data.wallet_id ?? '')}
        onChange={(e) => setData('wallet_id', e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">— Tidak Terhubung —</option>
        {wallets?.map((w: any) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      {pm.id ? (
        <Button type="submit" size="sm" disabled={processing}>Simpan</Button>
      ) : null}
    </form>
  );
}



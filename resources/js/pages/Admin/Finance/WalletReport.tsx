import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function WalletReport({ wallet, transactions, totalIn, totalOut, netAmount, filterFrom, filterTo }: any) {
  const { data, setData, get } = useForm({
    from: filterFrom || '',
    to: filterTo || '',
  });

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (data.from) params.set('from', data.from);
    if (data.to) params.set('to', data.to);
    get(`/admin/finance/wallets/${wallet.id}/report?${params.toString()}`);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <AdminLayout title={`Laporan Wallet: ${wallet.name}`} breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan', href: '/admin/finance' }, { title: 'Wallet', href: '/admin/finance/wallets' }, { title: 'Laporan' }]}>
      <div className="space-y-6">
        {/* Filter & Print Controls */}
        <Card className="no-print">
          <CardContent className="pt-6">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={applyFilter}>
              <div>
                <Label>Dari Tanggal</Label>
                <Input type="date" value={data.from} onChange={(e) => setData('from', e.target.value)} />
              </div>
              <div>
                <Label>Sampai Tanggal</Label>
                <Input type="date" value={data.to} onChange={(e) => setData('to', e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" variant="secondary">Filter</Button>
                <Button type="button" onClick={printReport}>Cetak/Print</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Report Content */}
        <Card>
          <CardHeader>
            <CardTitle>Laporan Transaksi Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Wallet Info */}
            <div className="mb-6 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nama Wallet:</span>
                  <span className="ml-2 font-medium">{wallet.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipe:</span>
                  <span className="ml-2 font-medium capitalize">{wallet.type.replace('_', ' ')}</span>
                </div>
                {wallet.property && (
                  <div>
                    <span className="text-muted-foreground">Property:</span>
                    <span className="ml-2 font-medium">{wallet.property.name}</span>
                  </div>
                )}
                {wallet.creator && (
                  <div>
                    <span className="text-muted-foreground">Dibuat oleh:</span>
                    <span className="ml-2 font-medium">{wallet.creator.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Saldo Saat Ini:</span>
                  <span className="ml-2 font-semibold text-lg">{formatRupiah(Number(wallet.balance))}</span>
                </div>
                {wallet.has_target && (
                  <div>
                    <span className="text-muted-foreground">Target:</span>
                    <span className="ml-2 font-medium">{formatRupiah(Number(wallet.target_amount))} ({wallet.target_date})</span>
                    {wallet.progress_percentage !== undefined && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({wallet.progress_percentage.toFixed(1)}% tercapai)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded">
              <div>
                <div className="text-sm text-muted-foreground">Total Masuk</div>
                <div className="text-lg font-semibold text-green-600">{formatRupiah(totalIn || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Keluar</div>
                <div className="text-lg font-semibold text-red-600">{formatRupiah(totalOut || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Amount</div>
                <div className={`text-lg font-semibold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRupiah(netAmount || 0)}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">Tipe</th>
                    <th className="py-2 pr-4">Deskripsi</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4 text-right">Masuk</th>
                    <th className="py-2 pr-4 text-right">Keluar</th>
                    <th className="py-2 pr-4">Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.map((tx: any) => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-2 pr-4">{tx.transaction_date}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded text-xs ${tx.direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {tx.direction === 'in' ? 'MASUK' : 'KELUAR'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{tx.description || '-'}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {tx.reference_type}
                        {tx.reference_id && ` #${tx.reference_id}`}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {tx.direction === 'in' ? formatRupiah(Number(tx.amount)) : '-'}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {tx.direction === 'out' ? formatRupiah(Number(tx.amount)) : '-'}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {tx.creator?.name || '-'}
                      </td>
                    </tr>
                  ))}
                  {(!transactions || transactions.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Tidak ada transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-6 text-xs text-muted-foreground text-center">
              Laporan di-generate pada {new Date().toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none;
          }
        }
      `}</style>
    </AdminLayout>
  );
}


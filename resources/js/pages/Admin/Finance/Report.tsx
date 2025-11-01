import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function Report({
  startDate,
  endDate,
  selectedPropertyId,
  properties,
  totalIncome,
  totalExpense,
  netProfit,
  byProperty,
  expensesByCategory,
  incomesBySource,
  incomes,
  expenses,
}: any) {
  const { data, setData, get } = useForm({
    from: startDate,
    to: endDate,
    property_id: selectedPropertyId || '',
  });

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (data.from) params.set('from', data.from);
    if (data.to) params.set('to', data.to);
    if (data.property_id) params.set('property_id', data.property_id);
    get(`/admin/finance/report?${params.toString()}`, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const isProfit = netProfit >= 0;

  return (
    <AdminLayout
      title="Laporan Keuangan"
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'Laporan Keuangan' },
      ]}
    >
      {/* Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={applyFilter}>
            <div>
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={data.from}
                onChange={(e) => setData('from', e.target.value)}
              />
            </div>
            <div>
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={data.to}
                onChange={(e) => setData('to', e.target.value)}
              />
            </div>
            <div>
              <Label>Property</Label>
              <select
                className="w-full border rounded h-9 px-2 bg-background"
                value={data.property_id}
                onChange={(e) => setData('property_id', e.target.value)}
              >
                <option value="">Semua Property</option>
                <option value="null">Perusahaan (Global)</option>
                {properties?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pendapatan
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatRupiah(totalIncome)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pengeluaran
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Laba/Rugi Bersih
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isProfit ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatRupiah(netProfit)}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isProfit ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                <DollarSign
                  className={`h-6 w-6 ${
                    isProfit ? 'text-green-600' : 'text-red-600'
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Property Report */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Laporan Per Property</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Property</th>
                  <th className="py-2 pr-4 text-right">Pendapatan</th>
                  <th className="py-2 pr-4 text-right">Pengeluaran</th>
                  <th className="py-2 pr-0 text-right">Laba/Rugi</th>
                </tr>
              </thead>
              <tbody>
                {byProperty?.map((item: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium">
                      {item.property_name}
                    </td>
                    <td className="py-2 pr-4 text-right text-green-600">
                      {formatRupiah(item.total_income)}
                    </td>
                    <td className="py-2 pr-4 text-right text-red-600">
                      {formatRupiah(item.total_expense)}
                    </td>
                    <td
                      className={`py-2 pr-0 text-right font-medium ${
                        item.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatRupiah(item.net_profit)}
                    </td>
                  </tr>
                ))}
                {(!byProperty || byProperty.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 bg-muted/30">
                <tr>
                  <td className="py-3 pr-4 font-bold">Total</td>
                  <td className="py-3 pr-4 text-right font-bold text-green-600">
                    {formatRupiah(totalIncome)}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold text-red-600">
                    {formatRupiah(totalExpense)}
                  </td>
                  <td
                    className={`py-3 pr-0 text-right font-bold ${
                      isProfit ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatRupiah(netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Pengeluaran per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} transaksi
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatRupiah(item.total)}</p>
                </div>
              ))}
              {(!expensesByCategory || expensesByCategory.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Tidak ada data pengeluaran
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Incomes by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Pendapatan per Sumber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomesBySource?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {item.source || 'Lainnya'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} transaksi
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatRupiah(item.total)}</p>
                </div>
              ))}
              {(!incomesBySource || incomesBySource.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Tidak ada data pendapatan
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

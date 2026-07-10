import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, AlertTriangle, Landmark, Calendar, Percent, Users, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  byProperty,
  expensesByCategory,
  incomesBySource,
  groupOverhead,
  totalRentCost,
  totalInterestCost,
  netProfitOwner,
  totalInvestorShare,
  zakat,
  loanDisbursements,
  loanRepayments,
  outstandingLoans,
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

  return (
    <AdminLayout
      title="Laporan Keuangan & Bagi Hasil"
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'Laporan Keuangan' },
      ]}
    >
      {/* Filter Section */}
      <Card className="mb-6 border-neutral-200 dark:border-neutral-800 bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={applyFilter}>
            <div>
              <Label className="text-xs">Dari Tanggal</Label>
              <Input
                type="date"
                value={data.from}
                onChange={(e) => setData('from', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input
                type="date"
                value={data.to}
                onChange={(e) => setData('to', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Property</Label>
              <select
                className="w-full border rounded-lg h-9 px-2 bg-background text-sm"
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
              <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900">
                Filter Laporan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="border-green-100 dark:border-green-950/30 bg-green-50/20 dark:bg-green-950/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Total Pendapatan
                </p>
                <p className="text-2xl font-black text-green-600 mt-1">
                  {formatRupiah(totalIncome)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 dark:border-red-950/30 bg-red-50/20 dark:bg-red-950/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Total Pengeluaran
                </p>
                <p className="text-2xl font-black text-red-600 mt-1">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/20 dark:bg-indigo-950/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Laba Bersih Owner
                </p>
                <p className="text-2xl font-black text-indigo-600 mt-1">
                  {formatRupiah(netProfitOwner)}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Setelah overhead & interest
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-amber-950/30 bg-amber-50/20 dark:bg-amber-950/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Estimasi Zakat (2.5%)
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {formatRupiah(zakat)}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Dari Laba Bersih Owner
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Coins className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Casbon & Group Expenses summary */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Ringkasan Casbon Karyawan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Pencairan Casbon Baru</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatRupiah(loanDisbursements)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cicilan Diterima</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatRupiah(loanRepayments)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-medium text-neutral-600">Total Piutang Aktif</span>
              <span className="font-bold text-blue-600">{formatRupiah(outstandingLoans)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-500" />
              Overhead & Interest Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Overhead Group</span>
              <span className="font-semibold text-red-600">{formatRupiah(groupOverhead)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Bunga Cicilan Owner</span>
              <span className="font-semibold text-red-600">{formatRupiah(totalInterestCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-medium text-neutral-600">Total Bagi Hasil Investor</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatRupiah(totalInvestorShare)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Rerata Okupansi Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs flex flex-col justify-center">
            <p className="text-neutral-500">
              Setiap property ditargetkan minimal <strong className="text-neutral-900 dark:text-neutral-100">25 malam</strong> inap per bulan.
            </p>
            <p className="text-[11px] text-amber-600 italic">
              Peringatan "Low-Occupancy" akan muncul pada property dengan okupansi di bawah target.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Property Report */}
      <Card className="mb-6 border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <CardTitle>Rincian Keuangan Per Unit Property</CardTitle>
          <CardDescription>Bagi hasil dihitung dari laba operasional unit sebelum overhead grup.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b text-neutral-500">
                  <th className="py-3 pr-4 font-bold">Property & Model</th>
                  <th className="py-3 px-2 text-right">Pendapatan Netto</th>
                  <th className="py-3 px-2 text-right">Biaya Langsung</th>
                  <th className="py-3 px-2 text-right font-semibold">Laba Operasional</th>
                  <th className="py-3 px-2 text-right">Bagi Hasil Investor</th>
                  <th className="py-3 px-2 text-right">Porsi/Sewa Owner</th>
                  <th className="py-3 px-2 text-center">Nights (Okupansi)</th>
                  <th className="py-3 pl-4 text-right">BEP Progress (Est)</th>
                </tr>
              </thead>
              <tbody>
                {byProperty?.map((item: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.property_name}</p>
                      <Badge variant="outline" className="capitalize text-[9px] px-1 py-0 mt-0.5">
                        {item.ownership_model}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right text-green-600 font-medium">
                      {formatRupiah(item.total_income)}
                    </td>
                    <td className="py-3 px-2 text-right text-red-500">
                      {formatRupiah(item.total_expense)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {formatRupiah(item.laba_operasional)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-blue-600">
                      {item.ownership_model === 'partnership' ? formatRupiah(item.investor_share) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-indigo-600">
                      {formatRupiah(item.owner_share)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{item.booked_nights} malam</span>
                        <span className="text-[10px] text-neutral-400">({item.occupancy_rate}%)</span>
                        {item.low_occupancy_alert && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[8px] py-0 px-1 mt-0.5">
                            Low Occupancy
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {item.capital > 0 ? (
                        <div>
                          <div className="flex items-center justify-end gap-1 font-semibold text-neutral-900 dark:text-neutral-100">
                            <Percent className="w-3 h-3" />
                            {item.bep_percentage}%
                          </div>
                          <p className="text-[10px] text-neutral-500">
                            {item.remaining_months > 0 ? `Est. ${item.remaining_months} bulan` : 'BEP Lunas'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!byProperty || byProperty.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-500">
                      Tidak ada data unit untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expenses by Category */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md font-bold">
              <PieChart className="w-5 h-5 text-neutral-500" />
              Pengeluaran per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-dashed border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">{item.label}</p>
                    <p className="text-xs text-neutral-400">
                      {item.count} transaksi
                    </p>
                  </div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">{formatRupiah(item.total)}</p>
                </div>
              ))}
              {(!expensesByCategory || expensesByCategory.length === 0) && (
                <p className="text-center text-neutral-500 py-4 italic">
                  Tidak ada data pengeluaran
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Incomes by Source */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md font-bold">
              <PieChart className="w-5 h-5 text-neutral-500" />
              Pendapatan per Sumber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomesBySource?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-dashed border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
                      {item.source || 'Lainnya'}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {item.count} transaksi
                    </p>
                  </div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">{formatRupiah(item.total)}</p>
                </div>
              ))}
              {(!incomesBySource || incomesBySource.length === 0) && (
                <p className="text-center text-neutral-500 py-4 italic">
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

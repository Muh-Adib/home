import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, router } from '@inertiajs/react';
import { DollarSign, Wallet as WalletIcon, FileText, ArrowRight, TrendingUp, Users, Coins } from 'lucide-react';

interface FinanceIndexProps {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
  };
  wallets: any[];
  bankAccounts: any[];
  scopeBreakdown: Record<string, number>;
  expenseScopes: Record<string, string>;
  filters?: {
    month: number;
    year: number;
  };
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

const YEARS = [2024, 2025, 2026, 2027];

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function FinanceIndex({ summary, wallets, bankAccounts, scopeBreakdown, expenseScopes, filters }: FinanceIndexProps) {
  const selectedMonth = filters?.month ?? new Date().getMonth() + 1;
  const selectedYear = filters?.year ?? new Date().getFullYear();
  const monthName = MONTHS.find(m => m.value === selectedMonth)?.label ?? '';

  const handleFilterChange = (m: number, y: number) => {
    router.get('/admin/finance', { month: m, year: y }, { preserveState: true, replace: true });
  };

  return (
    <AdminLayout
      title="Dashboard Keuangan"
      breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan' }]}
    >
      {/* Month & Year Cutoff Selector */}
      <Card className="mb-6 border-slate-100 bg-slate-50/50 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Cutoff Filter Keuangan</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan total pendapatan dan pengeluaran akumulatif sebelum awal bulan terpilih (real berdasarkan tanggal transaksi).
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={selectedMonth} 
            onChange={(e) => handleFilterChange(Number(e.target.value), selectedYear)}
            className="border rounded-lg h-9 px-3 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => handleFilterChange(selectedMonth, Number(e.target.value))}
            className="border rounded-lg h-9 px-3 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-w-[90px]"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {formatRupiah(summary.totalIncome)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Akumulasi sebelum 1 {monthName} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/50 dark:bg-rose-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-900 dark:text-rose-100">
              {formatRupiah(summary.totalExpense)}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              Akumulasi sebelum 1 {monthName} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/50 dark:bg-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Laba Bersih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${summary.netProfit >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-rose-900'}`}>
              {formatRupiah(summary.netProfit)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Selisih laba s.d. awal {monthName} {selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saldo Rekening / Bank Accounts */}
      <h3 className="text-lg font-semibold mt-8 mb-4">Saldo & Akun Rekening</h3>
      <div className="grid gap-4 md:grid-cols-4">
        {bankAccounts.map((account) => {
          const wallet = wallets.find(w => w.id === account.wallet_id);
          const balance = wallet ? Number(wallet.balance) : 0;
          return (
            <Card key={account.id} className="relative overflow-hidden hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <CardHeader className="pb-2 pl-6">
                <CardTitle className="text-sm font-semibold truncate">{account.label || account.bank_name}</CardTitle>
                <CardDescription className="text-xs">{account.account_number} a.n. {account.account_holder}</CardDescription>
              </CardHeader>
              <CardContent className="pl-6">
                <div className="text-xl font-bold">{formatRupiah(balance)}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${account.can_receive_payments ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {account.can_receive_payments ? 'Penerima Pembayaran' : 'Khusus Pengeluaran'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Expense by Scope Breakdown */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Rincian Pengeluaran Berdasarkan Scope</CardTitle>
            <CardDescription>Beban pengeluaran tahun ini dikelompokkan berdasarkan area fungsional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(expenseScopes).map(([scope, label]) => {
                const total = scopeBreakdown[scope] ?? 0;
                const percent = summary.totalExpense > 0 ? (total / summary.totalExpense) * 100 : 0;
                return (
                  <div key={scope} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground font-mono">{formatRupiah(total)} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Menu / Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Akses Modul Keuangan</CardTitle>
            <CardDescription>Menu navigasi cepat ke seluruh pencatatan keuangan</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/admin/finance/e-statement-sync">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group border-indigo-200 bg-indigo-50/30">
                <span className="flex items-center gap-2 font-bold text-indigo-700">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Sync E-Statement (Upload/Map)
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/refunds">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-rose-500" />
                  Pengajuan Refund Tamu
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/unbilled-breakfasts">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Tagihan Sarapan Vendor
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/incomes">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Pendapatan Riil
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/expenses">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-500" />
                  Pengeluaran & Nota
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/wallets">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <WalletIcon className="w-4 h-4 text-blue-500" />
                  Manajemen Rekening (Wallet)
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/report">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Laporan Laba Rugi & BEP
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/payroll">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-violet-500" />
                  Payroll & Gaji Staff
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/admin/finance/loans">
              <Button variant="outline" className="w-full justify-between hover:bg-accent group">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500" />
                  Casbon & Pinjaman Staff
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

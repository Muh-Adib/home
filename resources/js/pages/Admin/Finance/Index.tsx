import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type PageProps } from '@/types';
import { usePage, Link } from '@inertiajs/react';
import { DollarSign, Wallet as WalletIcon, FileText } from 'lucide-react';

interface FinanceIndexProps {
  summary: {
    totalIncome: number;
    totalExpense: number;
  };
}

export default function FinanceIndex({ summary }: FinanceIndexProps) {
  const page = usePage<PageProps>();
  const { auth } = page.props;

  return (
    <AdminLayout title="Keuangan" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Keuangan' }] }>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Omzet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">Rp {summary.totalIncome.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">Rp {summary.totalExpense.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/admin/finance/incomes">
          <Card className="hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Pendapatan</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/finance/expenses">
          <Card className="hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Pengeluaran</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/finance/wallets">
          <Card className="hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><WalletIcon className="h-5 w-5" /> Wallet</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </AdminLayout>
  );
}




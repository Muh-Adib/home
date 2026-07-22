import React, { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, Link, router } from '@inertiajs/react';
import { FileText, Plus, CheckCircle2, Clock, Building2, Calendar, ArrowRight, DollarSign, Calculator, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function rp(val: number) {
  return `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`;
}

export default function MonthlySettlementsIndex({ settlements, properties, wallets, filters }: any) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const generateForm = useForm({
    property_id: properties?.[0]?.id || '',
    period_month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateForm.post('/admin/finance/settlements/generate', {
      onSuccess: () => {
        setShowGenerateModal(false);
      },
    });
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/admin/finance/settlements', {
      property_id: filters?.property_id || '',
      period_month: filters?.period_month || '',
    }, { preserveState: true });
  };

  return (
    <AdminLayout
      title="Laporan Pertanggungjawaban (Tutup Buku Akhir Bulan)"
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'Monthly Settlements' }
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Laporan Akhir Bulan & Tutup Buku
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Buat, edit, dan cetak Laporan Hasil Usaha Bulanan Per Properti (Omset, Ops Fee, Fix Cost, Var Cost, Bagi Hasil 60/40, & Zakat 2.5%).
            </p>
          </div>

          <Button
            onClick={() => setShowGenerateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 px-4 gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Laporan Bulan Baru
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="border-slate-100">
          <CardContent className="pt-4">
            <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 text-xs">
                <Label className="text-xs font-bold text-slate-600">Unit Properti</Label>
                <select
                  className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium min-w-[200px]"
                  value={filters?.property_id || ''}
                  onChange={(e) => router.get('/admin/finance/settlements', { ...filters, property_id: e.target.value }, { preserveState: true })}
                >
                  <option value="">Semua Properti Villa</option>
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <Label className="text-xs font-bold text-slate-600">Periode Bulan</Label>
                <Input
                  type="month"
                  className="text-xs h-9"
                  value={filters?.period_month || ''}
                  onChange={(e) => router.get('/admin/finance/settlements', { ...filters, period_month: e.target.value }, { preserveState: true })}
                />
              </div>

              <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs font-bold rounded-lg gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Settlement Cards / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settlements?.data?.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Belum Ada Laporan Akhir Bulan</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol "Buat Laporan Bulan Baru" untuk mengkompilasi omset & pengeluaran bulanan.</p>
            </div>
          ) : (
            settlements.data.map((s: any) => (
              <Card key={s.id} className="hover:shadow-md transition-all border-slate-100 overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-extrabold uppercase mb-1">
                        {s.property?.name}
                      </Badge>
                      <CardTitle className="text-base font-black text-slate-800">
                        {s.period_month}
                      </CardTitle>
                    </div>
                    {s.status === 'finalized' ? (
                      <Badge className="bg-emerald-500 text-white font-bold text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Tutup Buku
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-bold text-[10px] gap-1">
                        <Clock className="w-3 h-3" /> Draft (Bisa Edit)
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Omset</div>
                      <div className="font-black text-slate-800 text-sm">{rp(s.total_omset)}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Beban + Ops</div>
                      <div className="font-black text-rose-600 text-sm">{rp(s.total_expense_and_ops)}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Laba / Rugi Netto:</span>
                      <span className={s.net_profit_loss >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                        {rp(s.net_profit_loss)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Investor (60%):</span>
                      <span className="font-bold">{rp(s.investor_share_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Pengelola (40%):</span>
                      <span className="font-bold">{rp(s.management_share_amount)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button asChild size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9">
                      <Link href={`/admin/finance/settlements/${s.id}`}>
                        Buka Laporan Detailed <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Generate Settlement Modal */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Kompilasi Laporan Akhir Bulan
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sistem akan membaca omset booking dan pengeluaran bulan terpilih untuk unit properti.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGenerateSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Pilih Unit Properti Villa</Label>
                <select
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  value={generateForm.data.property_id}
                  onChange={(e) => generateForm.setData('property_id', e.target.value)}
                  required
                >
                  {properties?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Periode Bulan (Tahun-Bulan)</Label>
                <Input
                  type="month"
                  className="text-xs"
                  value={generateForm.data.period_month}
                  onChange={(e) => generateForm.setData('period_month', e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGenerateModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={generateForm.processing} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {generateForm.processing ? 'Mengompilasi...' : 'Kompilasi Data'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}

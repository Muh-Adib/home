import React, { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm, router, Link } from '@inertiajs/react';
import { Printer, Save, CheckCircle2, Lock, ArrowLeft, Plus, Trash2, HelpCircle, ShieldCheck, Wallet as WalletIcon, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatRupiah(val: number) {
  return `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`;
}

export default function MonthlySettlementShow({ settlement, wallets = [], canEdit, canFinalize }: any) {
  const [items, setItems] = useState<any[]>(settlement.items || []);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const editForm = useForm({
    ops_fee_per_night: settlement.ops_fee_per_night || 100000,
    investor_share_percent: settlement.investor_share_percent || 60,
    management_share_percent: settlement.management_share_percent || 40,
    zakat_percent: settlement.zakat_percent || 2.5,
    notes: settlement.notes || '',
    items: settlement.items || [],
  });

  const finalizeForm = useForm({
    target_wallet_id: wallets?.[0]?.id || '',
  });

  const omsetItems = items.filter((i) => i.type === 'omset');
  const fixCostItems = items.filter((i) => i.type === 'fix_cost');
  const addCostItems = items.filter((i) => i.type === 'add_cost');
  const varCostItems = items.filter((i) => i.type === 'var_cost');

  const totalOmset = omsetItems.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const totalFixCost = fixCostItems.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const totalAddCost = addCostItems.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const totalVarCost = varCostItems.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  const totalOpsFee = Number(settlement.occupancy_nights || 0) * Number(editForm.data.ops_fee_per_night || 100000);
  const totalExpenseAndOps = totalOpsFee + totalFixCost + totalAddCost + totalVarCost;
  const netProfitLoss = totalOmset - totalExpenseAndOps;

  const investorShareAmount = Math.round(netProfitLoss * (Number(editForm.data.investor_share_percent) / 100));
  const managementShareAmount = Math.round(netProfitLoss * (Number(editForm.data.management_share_percent) / 100));
  const zakatAmount = netProfitLoss > 0 ? Math.round(netProfitLoss * (Number(editForm.data.zakat_percent) / 100)) : 0;

  const handleAddItem = (type: 'omset' | 'fix_cost' | 'add_cost' | 'var_cost') => {
    const newItem = {
      id: `new_${Date.now()}`,
      type,
      date: new Date().toISOString().slice(0, 10),
      item_name: type === 'omset' ? 'Tamu Baru' : 'Pengeluaran Baru',
      amount: 0,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleSaveDraft = () => {
    router.put(`/admin/finance/settlements/${settlement.id}`, {
      ops_fee_per_night: editForm.data.ops_fee_per_night,
      investor_share_percent: editForm.data.investor_share_percent,
      management_share_percent: editForm.data.management_share_percent,
      zakat_percent: editForm.data.zakat_percent,
      notes: editForm.data.notes,
      items: items.map((it) => ({
        type: it.type,
        date: it.date,
        item_name: it.item_name,
        amount: it.amount,
        notes: it.notes,
      })),
    }, { preserveScroll: true });
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalizeForm.post(`/admin/finance/settlements/${settlement.id}/finalize`, {
      onSuccess: () => {
        setShowFinalizeModal(false);
      },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout
      title={`Laporan Akhir Bulan - ${settlement.property?.name} (${settlement.period_month})`}
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settlements', href: '/admin/finance/settlements' },
        { title: `${settlement.property?.name} (${settlement.period_month})` }
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        
        {/* Action Header (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/admin/finance/settlements">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-800">
                  Laporan Keuangan {settlement.property?.name} - Periode {settlement.period_month}
                </h1>
                {settlement.status === 'finalized' ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tutup Buku
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-bold text-xs">
                    Draft Editable
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
              <Printer className="w-4 h-4 text-slate-600" /> Cetak PDF / Print
            </Button>

            {canEdit && (
              <Button onClick={handleSaveDraft} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl gap-1">
                <Save className="w-4 h-4" /> Simpan Perubahan
              </Button>
            )}

            {canFinalize && (
              <Button onClick={() => setShowFinalizeModal(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1">
                <Lock className="w-4 h-4" /> Finalisasi & Tutup Buku
              </Button>
            )}
          </div>
        </div>

        {/* Printable Report Banner & Container */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
          
          {/* Header Banner (Matching PDF) */}
          <div className="bg-indigo-700 text-white text-center py-2 px-4 rounded-t-lg font-black text-xl uppercase tracking-widest mb-6 flex justify-between items-center">
            <span>HOM'S MANAGEMENT REPORT</span>
            <span>{settlement.period_month} - {settlement.property?.name}</span>
          </div>

          {/* 3-Column Layout mirroring KEU HOMSJOGJA 2026 - EMERALD_JUNI.pdf */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            
            {/* COLUMN 1: OMSET (Penjualan) - 4 cols */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-rose-100 text-rose-900 font-black text-center py-1.5 rounded-md uppercase tracking-wider text-xs border border-rose-200">
                OMSET (PENJUALAN)
              </div>

              <div className="overflow-x-auto border rounded-lg border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-[11px] font-bold text-slate-700">
                      <th className="p-1.5 w-8 text-center">NO</th>
                      <th className="p-1.5">NAMA TAMU / DETAIL</th>
                      <th className="p-1.5 text-right">HARGA</th>
                      {canEdit && <th className="p-1.5 w-6 print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {omsetItems.map((item, idx) => {
                      const realIndex = items.findIndex((it) => it === item);
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="p-1.5 text-center font-medium text-slate-500">{idx + 1}</td>
                          <td className="p-1.5">
                            {canEdit ? (
                              <Input
                                className="h-6 text-[11px] p-1 font-medium"
                                value={item.item_name}
                                onChange={(e) => handleUpdateItem(realIndex, 'item_name', e.target.value)}
                              />
                            ) : (
                              <span className="font-semibold text-slate-800">{item.item_name}</span>
                            )}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-800">
                            {canEdit ? (
                              <Input
                                type="number"
                                className="h-6 text-[11px] p-1 text-right font-bold w-24 ml-auto"
                                value={item.amount}
                                onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)}
                              />
                            ) : (
                              formatRupiah(Number(item.amount))
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-1 text-center print:hidden">
                              <button onClick={() => handleRemoveItem(realIndex)} className="text-rose-500 hover:text-rose-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50 border-t font-black text-rose-900">
                      <td colSpan={2} className="p-2 text-right">TOTAL OMSET:</td>
                      <td className="p-2 text-right">{formatRupiah(totalOmset)}</td>
                      {canEdit && <td className="print:hidden"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {canEdit && (
                <Button onClick={() => handleAddItem('omset')} size="sm" variant="outline" className="w-full text-[11px] h-7 gap-1 border-rose-200 text-rose-700 hover:bg-rose-50 print:hidden">
                  <Plus className="w-3 h-3" /> Tambah Baris Omset
                </Button>
              )}
            </div>

            {/* COLUMN 2: PENGELUARAN (Fix, Add, Var Cost) - 4 cols */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-800 text-white font-black text-center py-1.5 rounded-md uppercase tracking-wider text-xs">
                PENGELUARAN OPERASIONAL
              </div>

              {/* FIX COST */}
              <div className="space-y-1">
                <div className="font-bold text-[11px] text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded">FIX COST</div>
                <table className="w-full border-collapse border border-slate-200 text-[11px]">
                  <tbody>
                    {fixCostItems.map((item, idx) => {
                      const realIndex = items.findIndex((it) => it === item);
                      return (
                        <tr key={item.id || idx} className="border-b">
                          <td className="p-1 w-6 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-1">
                            {canEdit ? (
                              <Input className="h-6 text-[11px] p-1 font-medium" value={item.item_name} onChange={(e) => handleUpdateItem(realIndex, 'item_name', e.target.value)} />
                            ) : (
                              item.item_name
                            )}
                          </td>
                          <td className="p-1 text-right font-bold">
                            {canEdit ? (
                              <Input type="number" className="h-6 text-[11px] p-1 text-right font-bold w-20 ml-auto" value={item.amount} onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)} />
                            ) : (
                              formatRupiah(Number(item.amount))
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-1 w-5 text-center print:hidden">
                              <button onClick={() => handleRemoveItem(realIndex)} className="text-rose-500"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={2} className="p-1 text-right">Total Fix Cost:</td>
                      <td className="p-1 text-right font-bold">{formatRupiah(totalFixCost)}</td>
                    </tr>
                  </tfoot>
                </table>
                {canEdit && (
                  <Button onClick={() => handleAddItem('fix_cost')} size="sm" variant="ghost" className="w-full text-[10px] h-6 text-slate-600 print:hidden">
                    + Tambah Fix Cost
                  </Button>
                )}
              </div>

              {/* ADDITIONAL COST */}
              <div className="space-y-1">
                <div className="font-bold text-[11px] text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded">ADDITIONAL COST</div>
                <table className="w-full border-collapse border border-slate-200 text-[11px]">
                  <tbody>
                    {addCostItems.map((item, idx) => {
                      const realIndex = items.findIndex((it) => it === item);
                      return (
                        <tr key={item.id || idx} className="border-b">
                          <td className="p-1 w-6 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-1">
                            {canEdit ? (
                              <Input className="h-6 text-[11px] p-1 font-medium" value={item.item_name} onChange={(e) => handleUpdateItem(realIndex, 'item_name', e.target.value)} />
                            ) : (
                              item.item_name
                            )}
                          </td>
                          <td className="p-1 text-right font-bold">
                            {canEdit ? (
                              <Input type="number" className="h-6 text-[11px] p-1 text-right font-bold w-20 ml-auto" value={item.amount} onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)} />
                            ) : (
                              formatRupiah(Number(item.amount))
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-1 w-5 text-center print:hidden">
                              <button onClick={() => handleRemoveItem(realIndex)} className="text-rose-500"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={2} className="p-1 text-right">Total Additional Cost:</td>
                      <td className="p-1 text-right font-bold">{formatRupiah(totalAddCost)}</td>
                    </tr>
                  </tfoot>
                </table>
                {canEdit && (
                  <Button onClick={() => handleAddItem('add_cost')} size="sm" variant="ghost" className="w-full text-[10px] h-6 text-slate-600 print:hidden">
                    + Tambah Additional Cost
                  </Button>
                )}
              </div>

              {/* VARIABEL COST */}
              <div className="space-y-1">
                <div className="font-bold text-[11px] text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded">VARIABEL COST</div>
                <table className="w-full border-collapse border border-slate-200 text-[11px]">
                  <tbody>
                    {varCostItems.map((item, idx) => {
                      const realIndex = items.findIndex((it) => it === item);
                      return (
                        <tr key={item.id || idx} className="border-b">
                          <td className="p-1 w-6 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-1">
                            {canEdit ? (
                              <Input className="h-6 text-[11px] p-1 font-medium" value={item.item_name} onChange={(e) => handleUpdateItem(realIndex, 'item_name', e.target.value)} />
                            ) : (
                              item.item_name
                            )}
                          </td>
                          <td className="p-1 text-right font-bold">
                            {canEdit ? (
                              <Input type="number" className="h-6 text-[11px] p-1 text-right font-bold w-20 ml-auto" value={item.amount} onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)} />
                            ) : (
                              formatRupiah(Number(item.amount))
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-1 w-5 text-center print:hidden">
                              <button onClick={() => handleRemoveItem(realIndex)} className="text-rose-500"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={2} className="p-1 text-right">Total Variabel Cost:</td>
                      <td className="p-1 text-right font-bold">{formatRupiah(totalVarCost)}</td>
                    </tr>
                  </tfoot>
                </table>
                {canEdit && (
                  <Button onClick={() => handleAddItem('var_cost')} size="sm" variant="ghost" className="w-full text-[10px] h-6 text-slate-600 print:hidden">
                    + Tambah Variabel Cost
                  </Button>
                )}
              </div>
            </div>

            {/* COLUMN 3: REKAPAN & PEMBAGIAN HASIL - 4 cols */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-indigo-900 text-white font-black text-center py-1.5 rounded-md uppercase tracking-wider text-xs">
                REKAPAN HASIL USAMA
              </div>

              {/* Table Rekapan */}
              <div className="border rounded-lg border-slate-200 overflow-hidden space-y-0 text-xs">
                
                {/* Section PENJUALAN */}
                <div className="bg-indigo-50/50 p-2 border-b font-bold text-indigo-900 flex justify-between">
                  <span>PENJUALAN</span>
                  <span>HARGA</span>
                </div>
                <div className="p-2 space-y-1.5 border-b text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">1. OCCUPANCY (Malam)</span>
                    <span className="font-bold">{settlement.occupancy_nights} Malam</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">2. RESERVASI (Transaksi)</span>
                    <span className="font-bold">{settlement.reservation_count} Transaksi</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t font-bold">
                    <span>OMSET</span>
                    <span className="text-rose-600 font-black">{formatRupiah(totalOmset)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>OPS & PENANGANAN ({settlement.occupancy_nights} MALAM)</span>
                    <span className="font-bold text-slate-800">{formatRupiah(totalOpsFee)}</span>
                  </div>
                </div>

                {/* Section PENGELUARAN */}
                <div className="bg-slate-100 p-2 border-b font-bold text-slate-800">
                  PENGELUARAN
                </div>
                <div className="p-2 space-y-1.5 border-b text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">1. FIX COST</span>
                    <span className="font-bold">{formatRupiah(totalFixCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">2. ADD COST</span>
                    <span className="font-bold">{formatRupiah(totalAddCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">3. VAR COST</span>
                    <span className="font-bold">{formatRupiah(totalVarCost)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t font-bold text-rose-700 bg-rose-50/50 p-1 rounded">
                    <span>TOTAL PENGELUARAN & OPS</span>
                    <span className="font-black">{formatRupiah(totalExpenseAndOps)}</span>
                  </div>
                </div>

                {/* Section LABA RUGI */}
                <div className="p-2.5 bg-emerald-50 border-b flex justify-between items-center">
                  <span className="font-black text-xs text-emerald-900">LABA / RUGI NETTO</span>
                  <span className="font-black text-sm text-emerald-700">{formatRupiah(netProfitLoss)}</span>
                </div>

                {/* Section PEMBAGIAN HASIL */}
                <div className="bg-amber-500 text-white p-2 font-black text-center text-xs uppercase">
                  PEMBAGIAN HASIL (PROFIT SPLIT)
                </div>
                <div className="p-3 bg-amber-50/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">{editForm.data.investor_share_percent}% Investor:</span>
                    <span className="font-black text-amber-900">{formatRupiah(investorShareAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">{editForm.data.management_share_percent}% Pengelola:</span>
                    <span className="font-black text-amber-900">{formatRupiah(managementShareAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200/60 text-[11px]">
                    <span className="font-bold text-emerald-800">ZAKAT ({editForm.data.zakat_percent}% LABA):</span>
                    <span className="font-black text-emerald-800">{formatRupiah(zakatAmount)}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Signature & Pertanggungjawaban Footer (For Print/PDF) */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold text-slate-700">Dibuat Oleh (Finance)</p>
              <div className="h-16"></div>
              <p className="font-semibold text-slate-600">({settlement.created_by_user?.name || 'Finance Staff'})</p>
            </div>
            <div>
              <p className="font-bold text-slate-700">Diperiksa Oleh (Property Manager)</p>
              <div className="h-16"></div>
              <p className="font-semibold text-slate-600">(Property Manager)</p>
            </div>
            <div>
              <p className="font-bold text-slate-700">Disetujui Oleh (Super Admin)</p>
              <div className="h-16"></div>
              <p className="font-semibold text-slate-600">({settlement.finalized_by_user?.name || 'Super Admin'})</p>
            </div>
          </div>

        </div>

        {/* Finalize Modal (Tutup Buku) */}
        <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Finalisasi & Tutup Buku Akhir Bulan
              </DialogTitle>
              <DialogDescription className="text-xs">
                Tutup buku akan mengunci laporan ini dan secara otomatis memutasi saldo laba/rugi sebesar <strong>{formatRupiah(netProfitLoss)}</strong> ke rekening/wallet pilihan Anda.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFinalizeSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Pilih Wallet / Rekening Tujuan Mutasi</Label>
                <select
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  value={finalizeForm.data.target_wallet_id}
                  onChange={(e) => finalizeForm.setData('target_wallet_id', e.target.value)}
                  required
                >
                  {wallets?.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo Saat Ini: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Otomatisasi Mutasi Wallet
                </div>
                <p className="text-[11px] leading-relaxed">
                  Saldo wallet tujuan akan bertambah secara otomatis sebesar nominal laba bersih hasil usaha unit {settlement.property?.name}.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowFinalizeModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={finalizeForm.processing} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {finalizeForm.processing ? 'Memproses Tutup Buku...' : 'Konfirmasi Tutup Buku'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}

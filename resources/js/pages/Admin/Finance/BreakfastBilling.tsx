import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';
import { Calendar, Utensils, CheckSquare, Square, ChefHat, Wallet, FileText, ArrowRight } from 'lucide-react';

interface Breakfast {
  id: number;
  service_name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  vendor_unit_price: number | string;
  vendor_total_price: number | string;
  service_date: string;
  booking?: {
    booking_number: string;
    guest_name: string;
    property?: {
      name: string;
    };
  };
}

interface BreakfastBillingProps {
  breakfasts: Breakfast[];
  wallets: any[];
}

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export default function BreakfastBilling({ breakfasts, wallets }: BreakfastBillingProps) {
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  const { data, setData, post, processing, errors, reset } = useForm({
    booking_service_ids: [] as number[],
    vendor_name: '',
    wallet_id: '',
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === breakfasts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(breakfasts.map((b) => b.id));
    }
  };

  React.useEffect(() => {
    setData('booking_service_ids', selectedIds);
  }, [selectedIds]);

  const selectedBreakfasts = breakfasts.filter((b) => selectedIds.includes(b.id));
  const guestTotal = selectedBreakfasts.reduce((acc, curr) => acc + Number(curr.total_price), 0);
  const vendorTotal = selectedBreakfasts.reduce((acc, curr) => acc + Number(curr.vendor_total_price), 0);
  const companyMargin = guestTotal - vendorTotal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    post('/admin/finance/bill-breakfasts', {
      onSuccess: () => {
        setSelectedIds([]);
        reset();
      },
      preserveScroll: true,
    });
  };

  return (
    <AdminLayout 
      title="Tagihan Sarapan Vendor" 
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'Breakfast Billing' }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Breakfast List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-500" />
                  Daftar Porsi Sarapan Belum Ditagih Vendor
                </CardTitle>
                <CardDescription>
                  Porsi sarapan yang disediakan oleh vendor untuk tamu yang belum dibuatkan pengeluarannya
                </CardDescription>
              </div>
              {breakfasts.length > 0 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleAll}
                  className="text-xs font-bold"
                >
                  {selectedIds.length === breakfasts.length ? 'Unselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {breakfasts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Utensils className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">Semua sarapan vendor telah ditagih!</p>
                  <p className="text-xs text-slate-400">Tidak ada porsi sarapan gantung.</p>
                </div>
              ) : (
                breakfasts.map((b) => {
                  const isSelected = selectedIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => toggleSelect(b.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/30 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      <div>
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold uppercase px-1.5 py-0.5 rounded">
                            {b.booking?.property?.name || 'Unit'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(b.service_date)}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 text-xs md:text-sm">
                          {b.service_name} &bull; {b.quantity} porsi
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tamu: <span className="font-semibold text-slate-700">{b.booking?.guest_name}</span> (Booking #{b.booking?.booking_number})
                        </div>
                      </div>
                      <div className="text-right border-l pl-3 border-slate-100 min-w-[100px]">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Harga Vendor</div>
                        <div className="font-black text-slate-700 text-sm">{formatRupiah(Number(b.vendor_total_price))}</div>
                        <div className="text-[9px] text-emerald-600 font-medium mt-0.5">
                          Tamu Bayar: {formatRupiah(Number(b.total_price))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Billing Form */}
        <div className="md:col-span-1">
          {selectedIds.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/10 shadow-sm sticky top-6">
              <CardHeader className="border-b border-amber-100 bg-amber-50/20">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Buat Tagihan Vendor
                </CardTitle>
                <CardDescription className="text-xs">
                  Proses <strong>{selectedIds.length}</strong> item terpilih menjadi satu catatan pengeluaran
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="bg-white rounded-lg border border-amber-100 p-3.5 space-y-2.5 shadow-sm text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Total Tagihan Tamu:</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(guestTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Biaya Vendor (HPP):</span>
                    <span className="font-black text-rose-600">{formatRupiah(vendorTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 border-slate-100 text-slate-600 font-bold">
                    <span className="flex items-center gap-1">Net Margin Perusahaan:</span>
                    <span className="text-emerald-600 font-black text-sm">{formatRupiah(companyMargin)}</span>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-600">Nama Vendor Sarapan <span className="text-rose-500">*</span></Label>
                    <Input
                      value={data.vendor_name}
                      onChange={(e) => setData('vendor_name', e.target.value)}
                      placeholder="e.g. Warteg Bahari, Resto Central"
                      required
                    />
                    {errors.vendor_name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.vendor_name}</p>}
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-600">Sumber Kas Pembayaran <span className="text-rose-500">*</span></Label>
                    <select
                      className="w-full border rounded h-9 px-2 bg-background text-sm"
                      value={data.wallet_id}
                      onChange={(e) => setData('wallet_id', e.target.value)}
                      required
                    >
                      <option value="">— Pilih Wallet —</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>
                      ))}
                    </select>
                    {errors.wallet_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.wallet_id}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Proses Tagihan & Potong Kas <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center text-slate-400 sticky top-6">
              <Utensils className="w-10 h-10 text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-500">Pilih porsi sarapan</p>
              <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                Centang item sarapan yang telah disediakan untuk mulai membuat rekapan tagihan vendor.
              </p>
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-left text-[11px] text-indigo-900 border border-indigo-100 flex gap-2">
                <Wallet className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Sistem akan mencatat pengeluaran kategori <strong>Catering</strong> (Catering & F&B) sebesar HPP vendor.
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

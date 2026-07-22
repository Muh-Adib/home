import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useForm, router } from '@inertiajs/react';
import { Calendar, HelpCircle, AlertTriangle, ArrowLeftRight, Check, X, ShieldAlert, BadgeInfo } from 'lucide-react';

interface RefundRequest {
  id: number;
  payment_id: number;
  amount: number | string;
  reason?: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  requested_at: string;
  processed_at?: string;
  requester?: { name: string };
  processor?: { name: string };
  payment?: {
    payment_number: string;
    payment_method: string;
    booking?: {
      booking_number: string;
      guest_name: string;
      property?: { name: string };
    };
  };
}

interface Payment {
  id: number;
  payment_number: string;
  amount: number | string;
  booking?: {
    booking_number: string;
    guest_name: string;
    property?: { name: string };
  };
}

interface RefundsProps {
  refundRequests: {
    data: RefundRequest[];
    links: any[];
    from: number;
    to: number;
    total: number;
  };
  pendingPayments: Payment[];
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

export default function Refunds({ refundRequests = { data: [], links: [], from: 0, to: 0, total: 0 }, pendingPayments = [] }: RefundsProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    payment_id: '',
    amount: '',
    reason: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  const handleSelectPayment = (paymentId: string) => {
    setData('payment_id', paymentId);
    const p = (pendingPayments || []).find((x) => String(x.id) === paymentId);
    if (p) {
      setData((prev) => ({
        ...prev,
        payment_id: paymentId,
        amount: String(p.amount),
        reason: prev.reason || `Refund booking #${p.booking?.booking_number}`,
      }));
    }
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/finance/refunds', {
      onSuccess: () => reset(),
      preserveScroll: true,
    });
  };

  const handleApprove = (id: number) => {
    if (confirm('Apakah Anda yakin menyetujui pengembalian dana ini? Saldo Kas/Wallet akan berkurang.')) {
      post(`/admin/finance/refunds/${id}/approve`, {
        preserveScroll: true,
      });
    }
  };

  const handleReject = (id: number) => {
    const note = prompt('Masukkan alasan penolakan refund:');
    if (note === null) return;
    router.post(`/admin/finance/refunds/${id}/reject`, { rejection_note: note }, {
      preserveScroll: true,
    });
  };

  return (
    <AdminLayout 
      title="Pengajuan Refund Tamu" 
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Keuangan', href: '/admin/finance' },
        { title: 'Refund Requests' }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Request Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-rose-500" />
              Ajukan Pengembalian Dana
            </CardTitle>
            <CardDescription>Ajukan refund pembayaran tamu yang sudah terverifikasi sebelumnya</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-600">Pembayaran Terverifikasi <span className="text-rose-500">*</span></Label>
                <select
                  className="w-full border rounded h-9 px-2 bg-background text-sm"
                  value={data.payment_id}
                  onChange={(e) => handleSelectPayment(e.target.value)}
                  required
                >
                  <option value="">— Pilih Pembayaran —</option>
                  {(pendingPayments || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.payment_number} - {p.booking?.guest_name} ({formatRupiah(Number(p.amount))})
                    </option>
                  ))}
                </select>
                {errors.payment_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.payment_id}</p>}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-600">Nominal Refund <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  value={data.amount}
                  onChange={(e) => setData('amount', e.target.value)}
                  placeholder="Jumlah refund..."
                  required
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.amount}</p>}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <BadgeInfo className="w-3.5 h-3.5 text-slate-400" /> Rekening Tujuan Refund
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-600">Nama Bank <span className="text-rose-500">*</span></Label>
                    <Input
                      value={data.bank_name}
                      onChange={(e) => setData('bank_name', e.target.value)}
                      placeholder="e.g. BCA, Mandiri"
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-600">No. Rekening <span className="text-rose-500">*</span></Label>
                    <Input
                      value={data.account_number}
                      onChange={(e) => setData('account_number', e.target.value)}
                      placeholder="e.g. 12345678"
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Nama Pemegang Rekening <span className="text-rose-500">*</span></Label>
                  <Input
                    value={data.account_name}
                    onChange={(e) => setData('account_name', e.target.value)}
                    placeholder="Nama pemilik rekening..."
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-600">Alasan Refund <span className="text-rose-500">*</span></Label>
                <Input
                  value={data.reason}
                  onChange={(e) => setData('reason', e.target.value)}
                  placeholder="e.g. Pembatalan sepihak, overpayment..."
                  required
                />
                {errors.reason && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.reason}</p>}
              </div>

              <Button
                type="submit"
                disabled={processing}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Ajukan Refund
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: List of Requests */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Riwayat Pengajuan Refund
            </CardTitle>
            <CardDescription>Semua daftar pengajuan refund beserta status persetujuan saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(!refundRequests || !refundRequests.data || refundRequests.data.length === 0) ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">Belum ada pengajuan refund</p>
                  <p className="text-xs text-slate-400">Semua transaksi keuangan berjalan normal.</p>
                </div>
              ) : (
                refundRequests.data.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status === 'pending' ? 'Menunggu Approval' : r.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Diajukan: {formatDate(r.requested_at)}
                        </span>
                      </div>
                      
                      <div className="font-bold text-slate-800 text-sm">
                        {r.payment?.booking?.property?.name || 'Unit'} &bull; Guest: {r.payment?.booking?.guest_name}
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                        <div>Alasan: <span className="font-semibold text-slate-700">{r.reason || '-'}</span></div>
                        <div className="flex items-center gap-1.5">
                          <span>Tujuan:</span>
                          <span className="font-bold text-indigo-700">{r.bank_name} &bull; {r.account_number}</span>
                          <span className="text-slate-400">a/n</span>
                          <span className="font-semibold text-slate-700">{r.account_name}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                        <span>Diajukan oleh: <strong className="text-slate-600">{r.requester?.name || 'Sistem'}</strong></span>
                        {r.processor && (
                          <span>&bull; Diproses oleh: <strong className="text-slate-600">{r.processor.name}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex md:flex-col items-baseline md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 min-w-[120px]">
                      <div className="font-black text-rose-600 text-base">{formatRupiah(Number(r.amount))}</div>
                      
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5 mt-2 w-full md:w-auto">
                          <Button
                            onClick={() => handleReject(r.id)}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] border-rose-200 hover:bg-rose-50 text-rose-700 flex items-center gap-1 px-2.5"
                          >
                            <X className="w-3.5 h-3.5" /> Tolak
                          </Button>
                          <Button
                            onClick={() => handleApprove(r.id)}
                            size="sm"
                            className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 px-2.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Setujui
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between mt-4 text-xs">
              <div>Menampilkan {refundRequests.from || 0}-{refundRequests.to || 0} dari {refundRequests.total || 0}</div>
              <div className="flex gap-1">
                {refundRequests.links?.map((l: any) => (
                  <Link 
                    key={l.label} 
                    href={l.url || '#'} 
                    className={`px-2 py-1 rounded ${l.active ? 'bg-primary text-white font-bold' : 'hover:bg-accent'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {l.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

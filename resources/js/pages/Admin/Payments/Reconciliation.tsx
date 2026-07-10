import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router, usePage } from '@inertiajs/react';
import { Check, X, AlertCircle, ArrowRight, ArrowDownUp, RefreshCw, Landmark } from 'lucide-react';
import { useState } from 'react';

function formatRupiah(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function Reconciliation({ pendingPayments, unassignedMutations }: any) {
  const [processing, setProcessing] = useState<number | null>(null);

  const handleManualMatch = (paymentId: number, mutationId: number) => {
    setProcessing(paymentId);
    router.post(
      route('admin.payments.reconciliation.match'),
      { payment_id: paymentId, bank_mutation_id: mutationId },
      {
        onFinish: () => setProcessing(null),
      }
    );
  };

  const handleIgnoreMutation = (mutationId: number) => {
    if (confirm('Apakah Anda yakin ingin mengabaikan mutasi ini?')) {
      router.post(route('admin.payments.reconciliation.ignore-mutation', { id: mutationId }));
    }
  };

  return (
    <AdminLayout
      title="Rekonsiliasi Pembayaran Bank"
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/admin/payments' },
        { title: 'Reconciliation' },
      ]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Rekonsiliasi Pembayaran Bank
          </h1>
          <p className="text-sm text-neutral-500">
            Cocokkan pembayaran dari tamu dengan data mutasi bank menggunakan kode unik transfer.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Payments Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Klaim Pembayaran Menunggu Verifikasi</CardTitle>
                <CardDescription>Klaim pembayaran transfer manual yang diupload tamu.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">{pendingPayments?.length || 0} Menunggu</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPayments?.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            {payment.booking?.booking_number}
                          </span>
                          <Badge variant="outline">{payment.payment_type?.toUpperCase()}</Badge>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Tamu: {payment.booking?.guest_name} • Unit: {payment.booking?.property?.name}
                        </p>
                      </div>
                      <div className="text-right sm:text-right">
                        <p className="text-xs text-neutral-500">Jumlah Klaim</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatRupiah(payment.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-neutral-500">Kode Unik</p>
                        <p className="font-semibold text-amber-600">+{payment.unique_code}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Harus Ditransfer</p>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100">
                          {formatRupiah(payment.expected_amount)}
                        </p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-neutral-500">Tanggal Klaim</p>
                        <p className="text-neutral-700 dark:text-neutral-300">
                          {new Date(payment.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Candidate Mutations */}
                    <div className="mt-2 border-t pt-3 space-y-2">
                      <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                        <ArrowDownUp className="w-3 h-3 text-green-600" />
                        Rekomendasi Mutasi Cocok:
                      </p>
                      
                      {payment.candidates && payment.candidates.length > 0 ? (
                        payment.candidates.map((candidate: any) => (
                          <div
                            key={candidate.id}
                            className="p-3 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-green-800 dark:text-green-400">
                                {candidate.sender_name || 'PENGIRIM TIDAK DIKETAHUI'}
                              </p>
                              <p className="text-neutral-500 text-[10px]">
                                {candidate.description} • {new Date(candidate.trx_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 justify-between">
                              <span className="font-bold text-green-700 dark:text-green-300">
                                {formatRupiah(candidate.amount)}
                              </span>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-[11px]"
                                disabled={processing === payment.id}
                                onClick={() => handleManualMatch(payment.id, candidate.id)}
                              >
                                {processing === payment.id ? 'Memproses...' : 'Cocokkan'}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-400 italic">
                          Tidak ditemukan mutasi masuk dengan nominal cocok ({formatRupiah(payment.expected_amount)})
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {(!pendingPayments || pendingPayments.length === 0) && (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    Semua pembayaran tamu telah direkonsiliasi.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Mutations Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                Mutasi Kredit Belum Diklaim
              </CardTitle>
              <CardDescription>Uang masuk di bank yang belum/tidak memiliki klaim pembayaran tamu.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unassignedMutations?.map((mutation: any) => (
                  <div
                    key={mutation.id}
                    className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col gap-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {mutation.sender_name || 'PENGIRIM ANOMAL'}
                        </p>
                        <p className="text-neutral-500 text-[10px]">
                          Rek: {mutation.bank_account?.bank_name} • {mutation.bank_account?.account_number}
                        </p>
                      </div>
                      <Badge variant="outline">{new Date(mutation.trx_at).toLocaleDateString('id-ID')}</Badge>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 text-[11px] italic">
                      "{mutation.description}"
                    </p>
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-dashed">
                      <span className="font-bold text-neutral-950 dark:text-white">
                        {formatRupiah(mutation.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 h-6 px-2 text-[10px]"
                        onClick={() => handleIgnoreMutation(mutation.id)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Abaikan
                      </Button>
                    </div>
                  </div>
                ))}

                {(!unassignedMutations || unassignedMutations.length === 0) && (
                  <p className="text-center py-6 text-neutral-400 italic">
                    Tidak ada mutasi kredit baru.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

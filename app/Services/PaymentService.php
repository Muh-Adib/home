<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    /**
     * Proses penyimpanan pembayaran dari guest/user.
     * (Versi ringkas – logika detail tetap dapat dikembangkan)
     *
     * @throws \Exception
     */
    public function submitPayment(Booking $booking, array $data, $file, int $userId): Payment
    {
        return DB::transaction(function () use ($booking, $data, $file, $userId) {
            // Validasi amount melebihi pending
            $paidAmount    = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;
            if ($data['amount'] > $pendingAmount) {
                throw new \Exception('Payment amount exceeds pending amount');
            }

            // Upload bukti bayar
            $attachmentPath = $this->uploadPaymentProof($file);

            /** @var PaymentMethod $method */
            $method = PaymentMethod::findOrFail($data['payment_method_id']);

            // Tentukan tipe pembayaran
            $paymentType = $paidAmount === 0 ? 'dp' : 'remaining';

            // Simpan record
            $payment = $booking->payments()->create([
                'payment_method_id' => $method->id,
                'payment_number'   => Payment::generatePaymentNumber(),
                'amount'           => $data['amount'],
                'payment_type'     => $paymentType,
                'payment_method'   => $method->type,
                'payment_status'   => 'pending',
                'payment_date'     => now(),
                'attachment_path'  => $attachmentPath,
                'bank_name'        => $method->bank_name,
                'verification_notes'=> $data['notes'] ?? null,
                'processed_by'     => $userId,
            ]);

            // Tambah workflow jika relasi ada
            if (method_exists($booking, 'workflow')) {
                $booking->workflow()->create([
                    'step'         => 'payment_pending',
                    'status'       => 'pending',
                    'processed_by' => $userId,
                    'processed_at' => now(),
                    'notes'        => "Payment submitted: {$payment->payment_number}",
                ]);
            }

            return $payment;
        });
    }

    private function uploadPaymentProof($file): string
    {
        // Bisa dioptimalkan lebih lanjut (thumbnail, compress, dll)
        $filename = 'payments/' . uniqid('proof_') . '.' . $file->getClientOriginalExtension();
        $file->storeAs('public', $filename);
        return $filename;
    }
} 
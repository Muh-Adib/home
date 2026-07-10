<?php

namespace App\Services;

use App\Models\Income;
use App\Models\Payment;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Log;

class PaymentIncomeSyncService
{
    /**
     * Sinkronkan income saat payment status berubah menjadi verified.
     *
     * Skema income per malam:
     * - Income dibangun ulang dari scratch untuk seluruh booking setiap kali ada payment baru verified.
     * - Total verified payments dialokasikan ke malam-malam stay (dari booking_daily_revenue),
     *   dimulai dari hari pertama check-in ke hari-hari berikutnya.
     * - Jika DP (partial), hanya hari-hari awal yang terisi sesuai jumlah yang sudah dibayar.
     * - Jika ada payment tambahan, income di-rebuild ulang sehingga selalu akurat.
     */
    public function syncOnVerified(Payment $payment): bool
    {
        try {
            if (! $payment->booking) {
                return false;
            }

            $booking = $payment->booking->fresh(['dailyRevenues']);

            // Hapus income lama untuk seluruh booking ini (rebuild dari scratch)
            Income::where('booking_id', $booking->id)->delete();

            // Total seluruh payment verified untuk booking ini
            $totalVerified = (int) $booking->getTotalPaidAmount();
            if ($totalVerified <= 0) {
                return true;
            }

            $dailyRevenues = $booking->dailyRevenues->sortBy('tanggal');

            if ($dailyRevenues->isEmpty()) {
                // Fallback: tidak ada daily revenue, catat satu income di tanggal check-in
                Income::create([
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'source' => $this->determineSource($payment->payment_type),
                    'description' => $this->generateDescription($payment),
                    'amount' => $totalVerified,
                    'income_date' => $booking->check_in,
                    'notes' => "Booking {$booking->booking_number}",
                    'wallet_id' => $this->getWalletId($payment),
                    'created_by' => $payment->verified_by ?? $payment->processed_by ?? auth()->id(),
                ]);
            } else {
                // Alokasikan dari malam pertama ke malam terakhir
                $remaining = $totalVerified;

                foreach ($dailyRevenues as $daily) {
                    if ($remaining <= 0) {
                        break;
                    }

                    // Alokasikan maks sebesar tarif hari tersebut, atau sisa budget
                    $dayAmount = min((int) $daily->amount, $remaining);
                    $remaining -= $dayAmount;

                    Income::create([
                        'property_id' => $booking->property_id,
                        'booking_id' => $booking->id,
                        'payment_id' => $payment->id,
                        'source' => 'booking',
                        'description' => 'Pendapatan sewa - '.optional($booking->property)->name.' ('.$daily->tanggal->format('d M Y').')',
                        'amount' => $dayAmount,
                        'income_date' => $daily->tanggal->format('Y-m-d'),
                        'notes' => "Booking {$booking->booking_number}",
                        'wallet_id' => $this->getWalletId($payment),
                        'created_by' => $payment->verified_by ?? $payment->processed_by ?? auth()->id(),
                    ]);
                }
            }

            // Sinkronkan wallet jika ada
            $this->syncWallet($payment, 'verified');

            Log::info("Income synced (per-hari) for verified payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'booking_id' => $booking->id,
                'total_verified' => $totalVerified,
                'nights' => $dailyRevenues->count(),
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error("Failed to sync income for verified payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Sinkronkan saat payment status berubah menjadi refunded
     * Hapus income yang terkait dengan payment ini
     */
    public function syncOnRefunded(Payment $payment): bool
    {
        try {
            // Hapus income yang terkait dengan payment ini
            $deleted = $this->removeIncomeForPayment($payment);

            // Sinkronkan wallet untuk refund
            $this->syncWallet($payment, 'refunded');

            Log::info("Income removed for refunded payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'deleted_count' => $deleted,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error("Failed to sync income for refunded payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Sinkronkan saat payment status berubah menjadi failed, cancelled, atau pending
     * Hapus income yang terkait karena payment tidak verified
     */
    public function syncOnUnverified(Payment $payment): bool
    {
        try {
            // Hapus income yang terkait dengan payment ini
            $deleted = $this->removeIncomeForPayment($payment);

            // Handle wallet reversal jika perlu
            if ($payment->payment_status === 'failed' || $payment->payment_status === 'cancelled') {
                $this->syncWallet($payment, $payment->payment_status);
            }

            Log::info("Income removed for unverified payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'status' => $payment->payment_status,
                'deleted_count' => $deleted,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error("Failed to sync income for unverified payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Hapus income yang terkait dengan payment
     */
    private function removeIncomeForPayment(Payment $payment): int
    {
        return Income::where('payment_id', $payment->id)->delete();
    }

    /**
     * Tentukan source income berdasarkan payment type
     */
    private function determineSource(string $paymentType): string
    {
        return match ($paymentType) {
            'dp', 'remaining', 'full' => 'booking',
            'additional', 'penalty', 'damage', 'cleaning', 'extra_service' => $paymentType,
            default => 'booking'
        };
    }

    /**
     * Generate description untuk income
     */
    private function generateDescription(Payment $payment): string
    {
        if ($payment->description) {
            return $payment->description;
        }

        if ($payment->verification_notes) {
            return $payment->verification_notes;
        }

        $typeLabels = [
            'dp' => 'Down Payment',
            'remaining' => 'Remaining Payment',
            'full' => 'Full Payment',
            'additional' => 'Additional Charge',
            'penalty' => 'Penalty',
            'damage' => 'Damage Charge',
            'cleaning' => 'Cleaning Fee',
            'extra_service' => 'Extra Service',
        ];

        $typeLabel = $typeLabels[$payment->payment_type] ?? 'Payment';

        return "{$typeLabel} - {$payment->payment_number}";
    }

    /**
     * Get wallet ID dari payment method
     */
    private function getWalletId(Payment $payment): ?int
    {
        if (! $payment->paymentMethod || ! $payment->paymentMethod->wallet_id) {
            return null;
        }

        return $payment->paymentMethod->wallet_id;
    }

    /**
     * Sinkronkan wallet transaction
     */
    private function syncWallet(Payment $payment, string $status): void
    {
        $method = $payment->paymentMethod;
        if (! $method || ! $method->wallet_id) {
            return;
        }

        $wallet = Wallet::find($method->wallet_id);
        if (! $wallet) {
            return;
        }

        // Cek apakah sudah ada transaksi wallet untuk payment ini
        $existing = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('reference_type', 'payment')
            ->where('reference_id', $payment->id)
            ->first();

        if ($status === 'verified') {
            // Jika sudah ada transaksi masuk, skip
            if ($existing && $existing->direction === 'in') {
                return;
            }

            // Jika ada transaksi keluar (dari refund sebelumnya), hapus dulu
            if ($existing && $existing->direction === 'out') {
                $wallet->increment('balance', $existing->amount); // Kembalikan balance
                $existing->delete();
            }

            // Buat transaksi masuk
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'direction' => 'in',
                'amount' => $payment->amount,
                'transaction_date' => $payment->payment_date?->toDateString() ?? now()->toDateString(),
                'reference_type' => 'payment',
                'reference_id' => $payment->id,
                'description' => 'Payment verified: '.$payment->payment_number,
                'created_by' => auth()->id(),
            ]);

            $wallet->increment('balance', $payment->amount);
        } elseif (in_array($status, ['refunded', 'failed', 'cancelled'])) {
            // Jika ada transaksi masuk, buat transaksi keluar atau hapus
            if ($existing && $existing->direction === 'in') {
                if ($status === 'refunded') {
                    // Untuk refund, buat transaksi keluar
                    WalletTransaction::create([
                        'wallet_id' => $wallet->id,
                        'direction' => 'out',
                        'amount' => $payment->amount,
                        'transaction_date' => now()->toDateString(),
                        'reference_type' => 'payment',
                        'reference_id' => $payment->id,
                        'description' => 'Payment refunded: '.$payment->payment_number,
                        'created_by' => auth()->id(),
                    ]);
                    $wallet->decrement('balance', $payment->amount);
                } else {
                    // Untuk failed/cancelled, hapus transaksi masuk
                    $wallet->decrement('balance', $existing->amount);
                    $existing->delete();
                }
            }
        }
    }

    /**
     * Sinkronkan semua payment verified yang belum punya income
     * Useful untuk migration atau recovery
     */
    public function syncAllVerifiedPayments(): int
    {
        $payments = Payment::where('payment_status', 'verified')
            ->whereDoesntHave('income')
            ->with(['booking', 'paymentMethod'])
            ->get();

        $synced = 0;
        foreach ($payments as $payment) {
            if ($this->syncOnVerified($payment)) {
                $synced++;
            }
        }

        return $synced;
    }

    /**
     * Hapus income untuk payment yang tidak verified lagi
     */
    public function cleanupUnverifiedPayments(): int
    {
        $payments = Payment::whereIn('payment_status', ['pending', 'failed', 'cancelled', 'refunded'])
            ->whereHas('income')
            ->get();

        $cleaned = 0;
        foreach ($payments as $payment) {
            if ($payment->payment_status === 'refunded') {
                if ($this->syncOnRefunded($payment)) {
                    $cleaned++;
                }
            } else {
                if ($this->syncOnUnverified($payment)) {
                    $cleaned++;
                }
            }
        }

        return $cleaned;
    }
}

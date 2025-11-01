<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Income;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentIncomeSyncService
{
    /**
     * Sinkronkan income saat payment status berubah menjadi verified
     */
    public function syncOnVerified(Payment $payment): bool
    {
        try {
            if (!$payment->booking) {
                return false;
            }

            // Hapus income lama jika ada (jika sebelumnya status lain)
            $this->removeIncomeForPayment($payment);

            // Buat income baru untuk payment verified
            $income = Income::updateOrCreate(
                ['payment_id' => $payment->id],
                [
                    'property_id' => $payment->booking->property_id,
                    'booking_id' => $payment->booking_id,
                    'source' => $this->determineSource($payment->payment_type),
                    'description' => $this->generateDescription($payment),
                    'amount' => $payment->amount,
                    'income_date' => $payment->payment_date?->toDateString() ?? now()->toDateString(),
                    'notes' => $payment->reference_number ?? $payment->verification_notes,
                    'wallet_id' => $this->getWalletId($payment),
                    'created_by' => $payment->verified_by ?? $payment->processed_by ?? auth()->id(),
                ]
            );

            // Sinkronkan wallet jika ada
            $this->syncWallet($payment, 'verified');

            Log::info("Income synced for verified payment: {$payment->payment_number}", [
                'payment_id' => $payment->id,
                'income_id' => $income->id,
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
        return match($paymentType) {
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
        if (!$payment->paymentMethod || !$payment->paymentMethod->wallet_id) {
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
        if (!$method || !$method->wallet_id) {
            return;
        }

        $wallet = Wallet::find($method->wallet_id);
        if (!$wallet) {
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
                'description' => 'Payment verified: ' . $payment->payment_number,
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
                        'description' => 'Payment refunded: ' . $payment->payment_number,
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


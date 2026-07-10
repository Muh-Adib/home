<?php

namespace App\Services;

use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReconciliationService
{
    /**
     * Match a single bank mutation to pending payments.
     *
     * Logic:
     * - Candidate payments: status = 'menunggu', bank_account matches the mutation's bank_account,
     *   expected_amount = mutation amount, created within -14 to +1 days from mutation's transaction date.
     * - If exactly 1 candidate is found -> match, set payment status to 'cocok', mark booking as paid/confirmed.
     * - If 0 or >1 candidates -> leave unmatched for review.
     */
    public static function match(BankMutation $mutation): bool
    {
        if ($mutation->direction !== 'kredit' || $mutation->status !== 'baru') {
            return false;
        }

        // Find candidate payments
        $trxDate = Carbon::parse($mutation->trx_at);
        $dateStart = $trxDate->copy()->subDays(14)->startOfDay();
        $dateEnd = $trxDate->copy()->addDay()->endOfDay();

        $candidates = Payment::where('status', 'menunggu')
            ->where('expected_amount', $mutation->amount)
            ->whereBetween('created_at', [$dateStart, $dateEnd])
            ->whereHas('booking.property', function ($query) use ($mutation) {
                $query->where('bank_account_id', $mutation->bank_account_id);
            })
            ->get();

        if ($candidates->count() === 1) {
            $payment = $candidates->first();

            DB::beginTransaction();
            try {
                // Link payment and mutation
                $payment->update([
                    'status' => 'cocok',
                    'payment_status' => 'verified',
                    'matched_mutation_id' => $mutation->id,
                    'matched_at' => now(),
                    'verified_at' => now(),
                ]);

                $mutation->update([
                    'status' => 'cocok',
                    'matched_payment_id' => $payment->id,
                ]);

                // Update booking payment totals/status via centralized trait
                $booking = $payment->booking;
                if ($booking) {
                    $booking->updatePaymentStatus(save: true);

                    // Promote booking_status if fully paid or if still pending verification
                    if ($booking->remaining_amount <= 0 || $booking->booking_status === 'pending_verification') {
                        $booking->update(['booking_status' => 'confirmed']);
                    }

                    // Log workflow for payment verification
                    if (method_exists($booking, 'workflow')) {
                        $booking->workflow()->create([
                            'step' => 'payment_verified',
                            'status' => 'completed',
                            'processed_by' => null, // Automated by Moota/Reconciliation
                            'processed_at' => now(),
                            'notes' => 'Pembayaran sebesar Rp '.number_format($payment->amount, 0, ',', '.').' berhasil dicocokkan & diverifikasi otomatis via Moota.',
                        ]);
                    }
                }

                DB::commit();

                // Sync income per-hari setelah commit (based on booking_daily_revenue)
                app(PaymentIncomeSyncService::class)->syncOnVerified($payment->fresh(['booking.dailyRevenues']));

                return true;
            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('[ReconciliationService] Auto match error: '.$e->getMessage());
            }
        }

        return false;
    }

    /**
     * Generate unique payment code (1–999) scoped to the current month.
     *
     * Ensures expected_amount (amount + unique_code) is unique among payments
     * that are still pending (status = 'menunggu') on the given bank account
     * within the current calendar month.
     *
     * Returns 0 if no unique code can be found (all 999 slots taken this month).
     * Unique code is ONLY for bank-transfer payments (guest self-payment).
     * Admin manual payments should NOT use this.
     */
    public static function generateUniqueCode(int $bankAccountId, int $baseAmount): int
    {
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();

        for ($code = 1; $code <= 999; $code++) {
            $expectedAmount = $baseAmount + $code;

            $exists = Payment::where('status', 'menunggu')
                ->where('expected_amount', $expectedAmount)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->whereHas('booking.property', function ($query) use ($bankAccountId) {
                    $query->where('bank_account_id', $bankAccountId);
                })
                ->exists();

            if (! $exists) {
                return $code;
            }
        }

        // All 999 slots taken for this month — cannot assign unique code
        \Log::warning("[ReconciliationService] No unique code available for bank_account_id={$bankAccountId}, amount={$baseAmount} this month.");

        return 0;
    }
}

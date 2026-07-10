<?php

declare(strict_types=1);

namespace App\Actions\Payment;

use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentIncomeSyncService;
use Illuminate\Support\Facades\DB;

/**
 * VerifyPaymentAction - Centralized action for payment verification
 */
class VerifyPaymentAction
{
    public function __construct(
        private PaymentIncomeSyncService $incomeSyncService
    ) {}

    public function execute(Payment $payment, User $verifier, ?string $notes = null): bool
    {
        if ($payment->payment_status === 'verified') {
            return true;
        }

        return DB::transaction(function () use ($payment, $verifier, $notes) {
            $payment->update([
                'payment_status' => 'verified',
                'status' => 'cocok',
                'verified_by' => $verifier->id,
                'verified_at' => now(),
                'verification_notes' => $notes,
            ]);

            // Side Effect: Update booking payment status and amounts
            $booking = $payment->booking;
            $totalPaid = $booking->getTotalPaidAmount();
            $booking->dp_paid_amount = $totalPaid;
            $booking->remaining_amount = max(0, $booking->total_amount - $totalPaid);
            $booking->updatePaymentStatus();
            if (empty($booking->closed_by)) {
                $booking->closed_by = $verifier->id;
            }
            $booking->save();

            // Side Effect: Sync income
            $this->incomeSyncService->syncOnVerified($payment);

            return true;
        });
    }
}

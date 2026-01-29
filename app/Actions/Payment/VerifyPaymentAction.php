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
    ) {
    }

    /**
     * @param Payment $payment
     * @param User $verifier
     * @param string|null $notes
     * @return bool
     */
    public function execute(Payment $payment, User $verifier, ?string $notes = null): bool
    {
        if ($payment->payment_status === 'verified') {
            return true;
        }

        return DB::transaction(function () use ($payment, $verifier, $notes) {
            $payment->update([
                'payment_status' => 'verified',
                'verified_by' => $verifier->id,
                'verified_at' => now(),
                'verification_notes' => $notes,
            ]);

            // Side Effect: Update booking payment status
            $payment->booking->updatePaymentStatus();

            // Side Effect: Sync income
            $this->incomeSyncService->syncOnVerified($payment);

            return true;
        });
    }
}

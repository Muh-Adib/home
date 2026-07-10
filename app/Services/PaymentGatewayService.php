<?php

namespace App\Services;

use App\Events\PaymentCreated;
use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentGatewayService
{
    protected PaymentIncomeSyncService $incomeSyncService;

    public function __construct(
        PaymentIncomeSyncService $incomeSyncService
    ) {
        $this->incomeSyncService = $incomeSyncService;
    }

    /**
     * Initiate gateway payment (manual bank transfer with unique code reconciliation)
     *
     * @param  float  $amount  Base amount (before fee/unique code)
     * @param  string  $type  'dp' atau 'remaining'
     * @param  array  $options  Additional options (payment_method_id, expiry_hours, user_id, user, etc)
     *
     * @throws \Exception
     */
    public function initiateGatewayPayment(
        Booking $booking,
        float $amount,
        string $type = 'dp',
        array $options = []
    ): Payment {
        return DB::transaction(function () use ($booking, $amount, $type, $options) {
            // Generate payment token if not exists
            if (! $booking->payment_token) {
                $booking->generatePaymentToken();
            }

            // Retrieve linked bank account details of the property
            $bankAccount = $booking->property->bankAccount;
            if (! $bankAccount) {
                $bankAccount = BankAccount::first();
            }

            $bankAccountId = $bankAccount ? $bankAccount->id : 1;

            // Generate unique code for amount reconciliation
            $uniqueCode = ReconciliationService::generateUniqueCode($bankAccountId, $amount);
            $expectedAmount = $amount + $uniqueCode;

            // Expiry settings (max 2 hours, or check-in time minus 4 hours, whichever is earlier)
            $expiredAt = Carbon::now()->addHours(2);
            $checkInTimeStr = $booking->check_in.' '.($booking->check_in_time ?? '14:00:00');
            try {
                $checkInDateTime = Carbon::parse($checkInTimeStr);
                $limitCheckInMinus4Hours = $checkInDateTime->copy()->subHours(4);
                if ($limitCheckInMinus4Hours->isFuture()) {
                    if ($limitCheckInMinus4Hours->lessThan($expiredAt)) {
                        $expiredAt = $limitCheckInMinus4Hours;
                    }
                } else {
                    $minExpiry = Carbon::now()->addMinutes(30);
                    if ($checkInDateTime->isFuture() && $checkInDateTime->lessThan($minExpiry)) {
                        $expiredAt = $checkInDateTime;
                    } else {
                        $expiredAt = $minExpiry;
                    }
                }
            } catch (\Exception $e) {
                // Fallback to 2 hours
            }

            // Update booking payment token expiry time
            $booking->update([
                'payment_token_expires_at' => $expiredAt,
            ]);

            // Find bank transfer payment method
            $paymentMethodId = $options['payment_method_id'] ?? null;
            if (! $paymentMethodId) {
                $paymentMethod = PaymentMethod::where('type', 'bank_transfer')->active()->first()
                    ?? PaymentMethod::active()->first();
                $paymentMethodId = $paymentMethod ? $paymentMethod->id : null;
            }

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $paymentMethodId,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $expectedAmount,
                'payment_type' => $type,
                'payment_method' => 'bank_transfer',
                'payment_status' => 'pending',
                'status' => 'menunggu', // set status to menunggu for reconciliation
                'unique_code' => $uniqueCode,
                'expected_amount' => $expectedAmount,
                'ipaymu_payment_url' => $booking->getSecurePaymentUrl(),
                'ipaymu_expired_at' => $expiredAt,
                'processed_by' => $options['user_id'] ?? null,
                'description' => $options['description'] ?? "Pembayaran manual transfer bank untuk booking {$booking->booking_number}",
            ]);

            // Create workflow entry
            if (method_exists($booking, 'workflow')) {
                $booking->workflow()->create([
                    'step' => 'payment_pending',
                    'status' => 'in_progress',
                    'processed_by' => $options['user_id'] ?? null,
                    'processed_at' => now(),
                    'notes' => "Link pembayaran manual transfer bank diterbitkan: {$payment->payment_number} (Jumlah: Rp ".number_format($expectedAmount).') oleh '.($options['user']->name ?? 'System/Guest'),
                ]);
            }

            // Dispatch event
            event(new PaymentCreated($payment->load('booking.property'), $options['user'] ?? null));

            Log::info('Manual transfer payment initiated successfully', [
                'payment_id' => $payment->id,
                'payment_number' => $payment->payment_number,
                'booking_number' => $booking->booking_number,
                'expected_amount' => $expectedAmount,
                'unique_code' => $uniqueCode,
                'processed_by' => $options['user_id'] ?? null,
            ]);

            return $payment;
        });
    }
}

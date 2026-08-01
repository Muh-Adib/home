<?php

use App\Models\Payment;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix existing payments in database where amount was set to expected_amount (expected_amount - unique_code should be the base amount)
        Payment::where('unique_code', '>', 0)->chunk(100, function ($payments) {
            foreach ($payments as $payment) {
                if ($payment->amount == $payment->expected_amount) {
                    $payment->amount = $payment->expected_amount - $payment->unique_code;
                    $payment->save();

                    $booking = $payment->booking;
                    if ($booking) {
                        $booking->updatePaymentStatus(save: true);
                    }
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse base amount back to expected_amount if needed
        Payment::where('unique_code', '>', 0)->chunk(100, function ($payments) {
            foreach ($payments as $payment) {
                $payment->amount = $payment->expected_amount;
                $payment->save();

                $booking = $payment->booking;
                if ($booking) {
                    $booking->updatePaymentStatus(save: true);
                }
            }
        });
    }
};

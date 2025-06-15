<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;

class UpdatePaymentStructureSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        $this->command->info('Updating payment structure...');

        // 1. Update payment_type values from old to new format
        $this->updatePaymentTypes();

        // 2. Update payment_method_id for existing payments
        $this->updatePaymentMethodIds();

        // 3. Ensure payment_method enum is correctly set from payment_method_id
        $this->updatePaymentMethodEnum();

        $this->command->info('Payment structure updated successfully!');
    }

    private function updatePaymentTypes(): void
    {
        $this->command->info('Updating payment types...');

        DB::table('payments')
            ->where('payment_type', 'remaining_payment')
            ->update(['payment_type' => 'remaining']);

        DB::table('payments')
            ->where('payment_type', 'full_payment')
            ->update(['payment_type' => 'full']);

        $this->command->info('Payment types updated.');
    }

    private function updatePaymentMethodIds(): void
    {
        $this->command->info('Updating payment method IDs...');

        // Get payments without payment_method_id
        $paymentsWithoutMethodId = Payment::whereNull('payment_method_id')->get();

        foreach ($paymentsWithoutMethodId as $payment) {
            if ($payment->payment_method) {
                // Try to find matching payment method by type
                $paymentMethod = PaymentMethod::where('type', $payment->payment_method)->first();
                
                if (!$paymentMethod) {
                    // If not found by type, try to find by common mapping
                    $mapping = [
                        'bank_transfer' => 'bca',
                        'e_wallet' => 'ovo',
                        'cash' => 'cash',
                        'credit_card' => 'credit_card'
                    ];

                    if (isset($mapping[$payment->payment_method])) {
                        $paymentMethod = PaymentMethod::where('code', $mapping[$payment->payment_method])->first();
                    }
                }

                if ($paymentMethod) {
                    $payment->update(['payment_method_id' => $paymentMethod->id]);
                    $this->command->info("Updated payment {$payment->payment_number} with payment_method_id: {$paymentMethod->id}");
                } else {
                    $this->command->warn("Could not find payment method for payment {$payment->payment_number} with method: {$payment->payment_method}");
                }
            }
        }

        $this->command->info('Payment method IDs updated.');
    }

    private function updatePaymentMethodEnum(): void
    {
        $this->command->info('Updating payment method enum values...');

        // Update payment_method enum based on payment_method_id
        $payments = Payment::with('paymentMethod')->whereNotNull('payment_method_id')->get();

        foreach ($payments as $payment) {
            if ($payment->paymentMethod) {
                $payment->update(['payment_method' => $payment->paymentMethod->type]);
                $this->command->info("Updated payment {$payment->payment_number} method to: {$payment->paymentMethod->type}");
            }
        }

        $this->command->info('Payment method enum values updated.');
    }
}

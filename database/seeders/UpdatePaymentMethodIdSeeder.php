<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Payment;
use App\Models\PaymentMethod;

class UpdatePaymentMethodIdSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Mapping enum values to payment method codes
        $methodMapping = [
            'cash' => 'cash',
            'bank_transfer' => 'bca', // Default to BCA for bank transfers
            'e_wallet' => 'ovo', // Default to OVO for e-wallets
            'credit_card' => 'credit_card',
            'other' => null // Keep as null for other
        ];

        foreach ($methodMapping as $enumValue => $methodCode) {
            if (!$methodCode) continue;
            
            $paymentMethod = PaymentMethod::where('code', $methodCode)->first();
            
            if ($paymentMethod) {
                Payment::where('payment_method', $enumValue)
                    ->whereNull('payment_method_id')
                    ->update(['payment_method_id' => $paymentMethod->id]);
                    
                $this->command->info("Updated payments with method '{$enumValue}' to payment_method_id: {$paymentMethod->id}");
            }
        }
        
        $this->command->info('Payment method IDs updated successfully.');
    }
}

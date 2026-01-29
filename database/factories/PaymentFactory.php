<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Booking;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'payment_method_id' => PaymentMethod::factory(),
            'payment_method' => 'bank_transfer',
            'amount' => $this->faker->numberBetween(100000, 1000000),
            'payment_date' => now(),
            'payment_type' => 'dp',
            'payment_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => User::factory(),
        ];
    }
}

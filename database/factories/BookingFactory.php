<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $checkIn = $this->faker->dateTimeBetween('+1 week', '+1 month');
        $checkOut = (clone $checkIn)->modify('+' . $this->faker->numberBetween(2, 7) . ' days');
        $nights = $checkIn->diff($checkOut)->days;
        
        $guestMale = $this->faker->numberBetween(0, 3);
        $guestFemale = $this->faker->numberBetween(0, 3);
        $guestChildren = $this->faker->numberBetween(0, 2);
        $guestCount = $guestMale + $guestFemale + $guestChildren;
        
        $baseAmount = $this->faker->numberBetween(500000, 2000000);
        $extraBedAmount = $guestCount > 2 ? ($guestCount - 2) * 100000 : 0;
        $serviceAmount = $this->faker->numberBetween(50000, 200000);
        $totalAmount = $baseAmount + $extraBedAmount + $serviceAmount;
        
        return [
            'booking_number' => 'BKG' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'property_id' => Property::factory(),
            'guest_name' => $this->faker->name(),
            'guest_email' => $this->faker->unique()->safeEmail(),
            'guest_phone' => $this->faker->phoneNumber(),
            'guest_country' => $this->faker->randomElement(['Indonesia', 'Singapore', 'Malaysia', 'Thailand']),
            'guest_id_number' => $this->faker->optional()->numerify('ID########'),
            'guest_count' => $guestCount,
            'guest_male' => $guestMale,
            'guest_female' => $guestFemale,
            'guest_children' => $guestChildren,
            'relationship_type' => $this->faker->randomElement(['keluarga', 'teman', 'kolega', 'pasangan', 'campuran']),
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'nights' => $nights,
            'base_amount' => $baseAmount,
            'extra_bed_amount' => $extraBedAmount,
            'service_amount' => $serviceAmount,
            'total_amount' => $totalAmount,
            'dp_percentage' => $this->faker->randomElement([30, 50, 70]),
            'dp_amount' => $totalAmount * 0.3, // Default 30%
            'dp_paid_amount' => 0,
            'remaining_amount' => $totalAmount * 0.7,
            'payment_status' => $this->faker->randomElement(['dp_pending', 'dp_received', 'fully_paid', 'overdue', 'refunded']),
            'booking_status' => $this->faker->randomElement(['submitted', 'staff_review', 'approved', 'rejected', 'payment_pending', 'dp_received', 'payment_verified', 'confirmed', 'checked_in', 'checked_out', 'completed']),
            'verification_status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'dp_deadline' => (clone $checkIn)->modify('-3 days'),
            'special_requests' => $this->faker->optional()->sentence(),
            'internal_notes' => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * Indicate that the booking is pending verification.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_status' => 'submitted',
            'verification_status' => 'pending',
            'payment_status' => 'dp_pending',
        ]);
    }

    /**
     * Indicate that the booking is confirmed.
     */
    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_status' => 'confirmed',
            'verification_status' => 'approved',
            'payment_status' => 'fully_paid',
        ]);
    }

    /**
     * Indicate that the booking is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_status' => 'rejected',
            'verification_status' => 'rejected',
            'payment_status' => 'refunded',
        ]);
    }
}

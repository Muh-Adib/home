<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PropertySeasonalRate>
 */
class PropertySeasonalRateFactory extends Factory
{
    protected $model = PropertySeasonalRate::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'name' => $this->faker->words(3, true).' Rate',
            'start_date' => $this->faker->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
            'end_date' => $this->faker->dateTimeBetween('+1 month', '+2 months')->format('Y-m-d'),
            'rate_type' => $this->faker->randomElement(['percentage', 'fixed', 'multiplier']),
            'rate_value' => $this->faker->numberBetween(10, 200000), // can be percentage or fixed amount
            'extra_bed_rate' => $this->faker->numberBetween(50000, 150000),
            'min_stay_nights' => 1,
            'applies_to_weekends_only' => false,
            'is_active' => true,
            'priority' => $this->faker->numberBetween(1, 100),
            'description' => $this->faker->sentence(),
            'applicable_days' => null,
        ];
    }
}

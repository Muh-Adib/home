<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Property>
 */
class PropertyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->words(3, true) . ' ' . $this->faker->randomElement(['Villa', 'House', 'Homestay']);
        $baseRate = $this->faker->numberBetween(300000, 1500000);
        
        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => $this->faker->paragraphs(3, true),
            'address' => $this->faker->address(),
            'lat' => $this->faker->latitude(-10, 5),
            'lng' => $this->faker->longitude(95, 141),
            'capacity' => $this->faker->numberBetween(2, 6),
            'capacity_max' => $this->faker->numberBetween(6, 12),
            'bedroom_count' => $this->faker->numberBetween(1, 4),
            'bathroom_count' => $this->faker->numberBetween(1, 3),
            'base_rate' => $baseRate,
            'weekend_premium_percent' => $this->faker->numberBetween(10, 50),
            'cleaning_fee' => $this->faker->numberBetween(50000, 200000),
            'extra_bed_rate' => $this->faker->numberBetween(50000, 150000),
            'status' => $this->faker->randomElement(['active', 'inactive', 'maintenance']),
            'house_rules' => $this->faker->optional()->paragraphs(2, true),
            'check_in_time' => $this->faker->time('H:i', '16:00'),
            'check_out_time' => $this->faker->time('H:i', '12:00'),
            'min_stay_weekday' => $this->faker->numberBetween(1, 3),
            'min_stay_weekend' => $this->faker->numberBetween(2, 4),
            'min_stay_peak' => $this->faker->numberBetween(3, 7),
            'is_featured' => $this->faker->boolean(20),
            'sort_order' => $this->faker->numberBetween(1, 100),
            'seo_title' => $this->faker->optional()->sentence(),
            'seo_description' => $this->faker->optional()->sentence(),
            'owner_id' => User::factory(),
        ];
    }

    /**
     * Indicate that the property is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Indicate that the property is featured.
     */
    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
        ]);
    }
}

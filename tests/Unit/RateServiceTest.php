<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\RateService;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RateServiceTest extends TestCase
{
    use RefreshDatabase;

    private RateService $rateService;
    private Property $property;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->rateService = new RateService();
        
        // Create test property
        $this->property = Property::factory()->create([
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
            'cleaning_fee' => 100000,
            'extra_bed_rate' => 150000,
        ]);
    }

    /** @test */
    public function it_gets_seasonal_rates_for_property()
    {
        // Create seasonal rates
        PropertySeasonalRate::factory()->count(3)->create([
            'property_id' => $this->property->id,
        ]);

        // Create seasonal rate for different property (should not be included)
        $otherProperty = Property::factory()->create();
        PropertySeasonalRate::factory()->create([
            'property_id' => $otherProperty->id,
        ]);

        $seasonalRates = $this->rateService->getSeasonalRates($this->property);

        $this->assertCount(3, $seasonalRates);
        
        // Verify all rates belong to our property
        $seasonalRates->each(function ($rate) {
            $this->assertEquals($this->property->id, $rate->property_id);
        });
    }

    /** @test */
    public function it_creates_seasonal_rate_successfully()
    {
        $data = [
            'name' => 'High Season',
            'start_date' => '2024-12-01',
            'end_date' => '2024-12-31',
            'rate_type' => 'percentage',
            'rate_value' => 50,
            'min_stay_nights' => 3,
            'applies_to_weekends_only' => false,
            'is_active' => true,
        ];

        $seasonalRate = $this->rateService->createSeasonalRate($this->property, $data);

        $this->assertInstanceOf(PropertySeasonalRate::class, $seasonalRate);
        $this->assertEquals($this->property->id, $seasonalRate->property_id);
        $this->assertEquals($data['name'], $seasonalRate->name);
        $this->assertEquals($data['start_date'], $seasonalRate->start_date);
        $this->assertEquals($data['end_date'], $seasonalRate->end_date);
        $this->assertEquals($data['rate_type'], $seasonalRate->rate_type);
        $this->assertEquals($data['rate_value'], $seasonalRate->rate_value);
    }

    /** @test */
    public function it_prevents_overlapping_seasonal_rates()
    {
        // Create existing seasonal rate
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-12-01',
            'end_date' => '2024-12-31',
            'is_active' => true,
        ]);

        // Try to create overlapping rate
        $overlappingData = [
            'name' => 'Overlapping Season',
            'start_date' => '2024-12-15', // Overlaps with existing rate
            'end_date' => '2025-01-15',
            'rate_type' => 'percentage',
            'rate_value' => 30,
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Date range overlaps with existing seasonal rate');

        $this->rateService->createSeasonalRate($this->property, $overlappingData);
    }

    /** @test */
    public function it_allows_seasonal_rates_for_different_properties()
    {
        $otherProperty = Property::factory()->create();

        // Create seasonal rate for first property
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-12-01',
            'end_date' => '2024-12-31',
            'is_active' => true,
        ]);

        // Create overlapping seasonal rate for different property (should succeed)
        $data = [
            'name' => 'High Season Other Property',
            'start_date' => '2024-12-01', // Same dates but different property
            'end_date' => '2024-12-31',
            'rate_type' => 'percentage',
            'rate_value' => 40,
        ];

        $seasonalRate = $this->rateService->createSeasonalRate($otherProperty, $data);

        $this->assertInstanceOf(PropertySeasonalRate::class, $seasonalRate);
        $this->assertEquals($otherProperty->id, $seasonalRate->property_id);
    }

    /** @test */
    public function it_updates_seasonal_rate_successfully()
    {
        $seasonalRate = PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'name' => 'Original Name',
            'rate_value' => 30,
        ]);

        $updateData = [
            'name' => 'Updated Season Name',
            'start_date' => $seasonalRate->start_date,
            'end_date' => $seasonalRate->end_date,
            'rate_type' => 'percentage',
            'rate_value' => 50, // Updated value
            'min_stay_nights' => 5,
            'applies_to_weekends_only' => true,
            'is_active' => true,
        ];

        $updatedRate = $this->rateService->updateSeasonalRate($seasonalRate, $updateData);

        $this->assertEquals($updateData['name'], $updatedRate->name);
        $this->assertEquals($updateData['rate_value'], $updatedRate->rate_value);
        $this->assertEquals($updateData['min_stay_nights'], $updatedRate->min_stay_nights);
        $this->assertTrue($updatedRate->applies_to_weekends_only);
    }

    /** @test */
    public function it_prevents_overlapping_when_updating_seasonal_rates()
    {
        // Create two non-overlapping seasonal rates
        $rate1 = PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31',
            'is_active' => true,
        ]);

        $rate2 = PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-03-01',
            'end_date' => '2024-03-31',
            'is_active' => true,
        ]);

        // Try to update rate1 to overlap with rate2
        $updateData = [
            'name' => 'Updated Rate',
            'start_date' => '2024-02-15',
            'end_date' => '2024-03-15', // Would overlap with rate2
            'rate_type' => 'percentage',
            'rate_value' => 40,
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Date range overlaps with existing seasonal rate');

        $this->rateService->updateSeasonalRate($rate1, $updateData);
    }

    /** @test */
    public function it_deletes_seasonal_rate_successfully()
    {
        $seasonalRate = PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
        ]);

        $rateId = $seasonalRate->id;

        $result = $this->rateService->deleteSeasonalRate($seasonalRate);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('property_seasonal_rates', ['id' => $rateId]);
    }

    /** @test */
    public function it_updates_base_rate()
    {
        $newBaseRate = 600000.00;

        $updatedProperty = $this->rateService->updateBaseRate($this->property, $newBaseRate);

        $this->assertEquals($newBaseRate, $updatedProperty->base_rate);
        $this->assertDatabaseHas('properties', [
            'id' => $this->property->id,
            'base_rate' => $newBaseRate,
        ]);
    }

    /** @test */
    public function it_updates_weekend_premium()
    {
        $newWeekendPremium = 30.0;

        $updatedProperty = $this->rateService->updateWeekendPremium($this->property, $newWeekendPremium);

        $this->assertEquals($newWeekendPremium, $updatedProperty->weekend_premium_percent);
        $this->assertDatabaseHas('properties', [
            'id' => $this->property->id,
            'weekend_premium_percent' => $newWeekendPremium,
        ]);
    }

    /** @test */
    public function it_updates_extra_bed_rate()
    {
        $newExtraBedRate = 200000.00;

        $updatedProperty = $this->rateService->updateExtraBedRate($this->property, $newExtraBedRate);

        $this->assertEquals($newExtraBedRate, $updatedProperty->extra_bed_rate);
        $this->assertDatabaseHas('properties', [
            'id' => $this->property->id,
            'extra_bed_rate' => $newExtraBedRate,
        ]);
    }

    /** @test */
    public function it_updates_cleaning_fee()
    {
        $newCleaningFee = 150000.00;

        $updatedProperty = $this->rateService->updateCleaningFee($this->property, $newCleaningFee);

        $this->assertEquals($newCleaningFee, $updatedProperty->cleaning_fee);
        $this->assertDatabaseHas('properties', [
            'id' => $this->property->id,
            'cleaning_fee' => $newCleaningFee,
        ]);
    }

    /** @test */
    public function it_gets_effective_rates_for_date_range()
    {
        // Create seasonal rate that covers part of our date range
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-01-15',
            'end_date' => '2024-01-20',
            'is_active' => true,
        ]);

        $startDate = '2024-01-10';
        $endDate = '2024-01-25';

        $effectiveRates = $this->rateService->getEffectiveRates($this->property, $startDate, $endDate);

        $this->assertIsArray($effectiveRates);
        
        // Should have rates for the seasonal period
        $this->assertArrayHasKey('2024-01-15', $effectiveRates);
        $this->assertArrayHasKey('2024-01-16', $effectiveRates);
        $this->assertArrayHasKey('2024-01-19', $effectiveRates);
        
        // Should not have rates outside the seasonal period
        $this->assertArrayNotHasKey('2024-01-10', $effectiveRates);
        $this->assertArrayNotHasKey('2024-01-25', $effectiveRates);
    }

    /** @test */
    public function it_generates_rate_calendar()
    {
        // Create seasonal rate
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-01-15',
            'end_date' => '2024-01-20',
            'rate_type' => 'percentage',
            'rate_value' => 50,
            'is_active' => true,
        ]);

        $startMonth = '2024-01';
        $monthsCount = 2;

        $calendar = $this->rateService->getRateCalendar($this->property, $startMonth, $monthsCount);

        $this->assertEquals($this->property->id, $calendar['property_id']);
        $this->assertArrayHasKey('period', $calendar);
        $this->assertArrayHasKey('calendar', $calendar);
        $this->assertArrayHasKey('base_rates', $calendar);
        
        $this->assertCount($monthsCount, $calendar['calendar']);
        
        // Check base rates section
        $baseRates = $calendar['base_rates'];
        $this->assertEquals($this->property->base_rate, $baseRates['base_rate']);
        $this->assertEquals($this->property->weekend_premium_percent, $baseRates['weekend_premium_percent']);
        $this->assertEquals($this->property->extra_bed_rate, $baseRates['extra_bed_rate']);
        $this->assertEquals($this->property->cleaning_fee, $baseRates['cleaning_fee']);
        
        // Check first month structure
        $firstMonth = $calendar['calendar'][0];
        $this->assertArrayHasKey('year', $firstMonth);
        $this->assertArrayHasKey('month', $firstMonth);
        $this->assertArrayHasKey('month_name', $firstMonth);
        $this->assertArrayHasKey('days', $firstMonth);
        
        // Check day structure
        $dayWithSeasonalRate = collect($firstMonth['days'])->firstWhere('date', '2024-01-15');
        $this->assertNotNull($dayWithSeasonalRate);
        $this->assertNotNull($dayWithSeasonalRate['seasonal_rate']);
        $this->assertEquals(50, $dayWithSeasonalRate['seasonal_rate']['value']);
        
        // Check weekend detection
        $weekendDay = collect($firstMonth['days'])->firstWhere('is_weekend', true);
        $this->assertNotNull($weekendDay);
        $this->assertEquals($this->property->weekend_premium_percent, $weekendDay['weekend_premium']);
    }

    /** @test */
    public function it_performs_bulk_rate_updates_successfully()
    {
        $updates = [
            [
                'type' => 'base_rate',
                'value' => 550000,
            ],
            [
                'type' => 'weekend_premium',
                'value' => 25,
            ],
            [
                'type' => 'seasonal_rate',
                'data' => [
                    'name' => 'New High Season',
                    'start_date' => '2024-07-01',
                    'end_date' => '2024-07-31',
                    'rate_type' => 'percentage',
                    'rate_value' => 40,
                ]
            ]
        ];

        $results = $this->rateService->bulkUpdateRates($this->property, $updates);

        $this->assertCount(3, $results);
        
        // Check all operations succeeded
        foreach ($results as $result) {
            $this->assertTrue($result['success']);
        }
        
        // Verify database updates
        $this->property->refresh();
        $this->assertEquals(550000, $this->property->base_rate);
        $this->assertEquals(25, $this->property->weekend_premium_percent);
        
        // Verify seasonal rate was created
        $this->assertDatabaseHas('property_seasonal_rates', [
            'property_id' => $this->property->id,
            'name' => 'New High Season',
        ]);
    }

    /** @test */
    public function it_handles_bulk_update_failures_gracefully()
    {
        // Create existing seasonal rate to cause overlap
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'start_date' => '2024-07-01',
            'end_date' => '2024-07-31',
            'is_active' => true,
        ]);

        $updates = [
            [
                'type' => 'base_rate',
                'value' => 550000, // This should succeed
            ],
            [
                'type' => 'seasonal_rate',
                'data' => [
                    'name' => 'Overlapping Season',
                    'start_date' => '2024-07-15', // This should fail (overlap)
                    'end_date' => '2024-08-15',
                    'rate_type' => 'percentage',
                    'rate_value' => 40,
                ]
            ],
            [
                'type' => 'unknown_type', // This should fail
                'value' => 123,
            ]
        ];

        $results = $this->rateService->bulkUpdateRates($this->property, $updates);

        $this->assertCount(3, $results);
        
        // First update should succeed
        $this->assertTrue($results[0]['success']);
        $this->assertEquals('base_rate', $results[0]['type']);
        
        // Second update should fail due to overlap
        $this->assertFalse($results[1]['success']);
        $this->assertEquals('seasonal_rate', $results[1]['type']);
        $this->assertArrayHasKey('error', $results[1]);
        
        // Third update should fail due to unknown type
        $this->assertFalse($results[2]['success']);
        $this->assertEquals('unknown_type', $results[2]['type']);
        $this->assertArrayHasKey('error', $results[2]);
        
        // Verify the successful update was applied
        $this->property->refresh();
        $this->assertEquals(550000, $this->property->base_rate);
    }

    /** @test */
    public function it_allows_updating_existing_seasonal_rate_in_bulk_updates()
    {
        // Create existing seasonal rate
        $existingRate = PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'name' => 'Original Season',
            'rate_value' => 30,
        ]);

        $updates = [
            [
                'type' => 'seasonal_rate',
                'id' => $existingRate->id, // Include ID to update existing
                'data' => [
                    'name' => 'Updated Season Name',
                    'start_date' => $existingRate->start_date,
                    'end_date' => $existingRate->end_date,
                    'rate_type' => 'percentage',
                    'rate_value' => 60, // New value
                ]
            ]
        ];

        $results = $this->rateService->bulkUpdateRates($this->property, $updates);

        $this->assertTrue($results[0]['success']);
        
        // Verify the rate was updated, not created new
        $updatedRate = PropertySeasonalRate::find($existingRate->id);
        $this->assertEquals('Updated Season Name', $updatedRate->name);
        $this->assertEquals(60, $updatedRate->rate_value);
        
        // Verify no new rate was created
        $totalRates = PropertySeasonalRate::where('property_id', $this->property->id)->count();
        $this->assertEquals(1, $totalRates);
    }
}
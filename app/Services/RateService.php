<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * RateService - Service untuk menangani manajemen tarif
 * 
 * Service ini menangani:
 * - CRUD operations untuk seasonal rates
 * - Base rate management
 * - Rate validation
 * - Rate history
 * 
 * TIDAK menangani kalkulasi tarif (itu di RateCalculationService)
 */
class RateService
{
    /**
     * Get all seasonal rates for a property
     */
    public function getSeasonalRates(Property $property): Collection
    {
        return PropertySeasonalRate::where('property_id', $property->id)
            ->orderBy('start_date')
            ->get();
    }

    /**
     * Create a new seasonal rate
     */
    public function createSeasonalRate(Property $property, array $data): PropertySeasonalRate
    {
        // Validate dates don't overlap with existing rates
        $this->validateSeasonalRateOverlap($property, $data['start_date'], $data['end_date']);

        return PropertySeasonalRate::create([
            'property_id' => $property->id,
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'rate_type' => $data['rate_type'], // 'fixed', 'percentage'
            'rate_value' => $data['rate_value'],
            'min_stay_nights' => $data['min_stay_nights'] ?? null,
            'applies_to_weekends_only' => $data['applies_to_weekends_only'] ?? false,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    /**
     * Update a seasonal rate
     */
    public function updateSeasonalRate(PropertySeasonalRate $seasonalRate, array $data): PropertySeasonalRate
    {
        // Validate dates don't overlap with other existing rates (excluding this one)
        $this->validateSeasonalRateOverlap(
            $seasonalRate->property,
            $data['start_date'],
            $data['end_date'],
            $seasonalRate->id
        );

        $seasonalRate->update([
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'rate_type' => $data['rate_type'],
            'rate_value' => $data['rate_value'],
            'min_stay_nights' => $data['min_stay_nights'] ?? null,
            'applies_to_weekends_only' => $data['applies_to_weekends_only'] ?? false,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return $seasonalRate->fresh();
    }

    /**
     * Delete a seasonal rate
     */
    public function deleteSeasonalRate(PropertySeasonalRate $seasonalRate): bool
    {
        return $seasonalRate->delete();
    }

    /**
     * Update base rate for property
     */
    public function updateBaseRate(Property $property, float $newBaseRate): Property
    {
        $property->update(['base_rate' => $newBaseRate]);
        return $property->fresh();
    }

    /**
     * Update weekend premium percentage
     */
    public function updateWeekendPremium(Property $property, float $weekendPremiumPercent): Property
    {
        $property->update(['weekend_premium_percent' => $weekendPremiumPercent]);
        return $property->fresh();
    }

    /**
     * Update extra bed rate
     */
    public function updateExtraBedRate(Property $property, float $extraBedRate): Property
    {
        $property->update(['extra_bed_rate' => $extraBedRate]);
        return $property->fresh();
    }

    /**
     * Update cleaning fee
     */
    public function updateCleaningFee(Property $property, float $cleaningFee): Property
    {
        $property->update(['cleaning_fee' => $cleaningFee]);
        return $property->fresh();
    }

    /**
     * Get effective rates for a date range
     */
    public function getEffectiveRates(Property $property, string $startDate, string $endDate): array
    {
        return PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id,
            Carbon::parse($startDate),
            Carbon::parse($endDate)
        );
    }

    /**
     * Get rate calendar for admin view
     */
    public function getRateCalendar(Property $property, string $startMonth, int $monthsCount = 6): array
    {
        $startDate = Carbon::createFromFormat('Y-m', $startMonth)->startOfMonth();
        $endDate = $startDate->copy()->addMonths($monthsCount)->endOfMonth();
        
        $effectiveRates = $this->getEffectiveRates(
            $property,
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );
        
        $calendar = [];
        $currentMonth = $startDate->copy();
        
        for ($i = 0; $i < $monthsCount; $i++) {
            $monthData = [
                'year' => $currentMonth->year,
                'month' => $currentMonth->month,
                'month_name' => $currentMonth->format('F Y'),
                'days' => []
            ];
            
            $daysInMonth = $currentMonth->daysInMonth;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $date = $currentMonth->copy()->day($day);
                $dateString = $date->format('Y-m-d');
                $seasonalRate = $effectiveRates[$dateString] ?? null;
                
                $monthData['days'][] = [
                    'date' => $dateString,
                    'day' => $day,
                    'base_rate' => $property->base_rate,
                    'seasonal_rate' => $seasonalRate ? [
                        'name' => $seasonalRate->name,
                        'type' => $seasonalRate->rate_type,
                        'value' => $seasonalRate->rate_value,
                        'calculated_rate' => $seasonalRate->calculateRate($property->base_rate)
                    ] : null,
                    'is_weekend' => $date->isWeekend(),
                    'weekend_premium' => $date->isWeekend() ? $property->weekend_premium_percent : 0,
                ];
            }
            
            $calendar[] = $monthData;
            $currentMonth->addMonth();
        }
        
        return [
            'property_id' => $property->id,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'calendar' => $calendar,
            'base_rates' => [
                'base_rate' => $property->base_rate,
                'weekend_premium_percent' => $property->weekend_premium_percent,
                'extra_bed_rate' => $property->extra_bed_rate,
                'cleaning_fee' => $property->cleaning_fee,
            ]
        ];
    }

    /**
     * Validate that seasonal rate doesn't overlap with existing rates
     */
    private function validateSeasonalRateOverlap(Property $property, string $startDate, string $endDate, ?int $excludeId = null): void
    {
        $query = PropertySeasonalRate::where('property_id', $property->id)
            ->where('is_active', true)
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where('start_date', '<', $endDate)
                  ->where('end_date', '>', $startDate);
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $overlapping = $query->first();

        if ($overlapping) {
            throw new \InvalidArgumentException(
                "Date range overlaps with existing seasonal rate: {$overlapping->name} ({$overlapping->start_date} to {$overlapping->end_date})"
            );
        }
    }

    /**
     * Bulk update rates
     */
    public function bulkUpdateRates(Property $property, array $updates): array
    {
        $results = [];

        foreach ($updates as $update) {
            try {
                switch ($update['type']) {
                    case 'base_rate':
                        $this->updateBaseRate($property, $update['value']);
                        $results[] = ['type' => 'base_rate', 'success' => true];
                        break;
                    
                    case 'weekend_premium':
                        $this->updateWeekendPremium($property, $update['value']);
                        $results[] = ['type' => 'weekend_premium', 'success' => true];
                        break;
                    
                    case 'seasonal_rate':
                        if (isset($update['id'])) {
                            $seasonalRate = PropertySeasonalRate::findOrFail($update['id']);
                            $this->updateSeasonalRate($seasonalRate, $update['data']);
                        } else {
                            $this->createSeasonalRate($property, $update['data']);
                        }
                        $results[] = ['type' => 'seasonal_rate', 'success' => true];
                        break;
                        
                    default:
                        $results[] = ['type' => $update['type'], 'success' => false, 'error' => 'Unknown update type'];
                }
            } catch (\Exception $e) {
                $results[] = ['type' => $update['type'], 'success' => false, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }
}
<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Property;
use App\Models\PropertyHousekeepingAllocation;
use App\Models\User;
use App\Services\Payroll\Dtos\PropertyNightOverlapDto;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class HousekeepingNorthBonusCalculatorService
{
    /**
     * Calculate HK Utara percentage-based bonuses for eligible HK staff.
     *
     * @param  Collection<int, PropertyNightOverlapDto>  $propertyOverlapDtos
     * @param  Collection<int, User>  $activeHkStaff
     * @return array<int, array> keyed by user_id
     */
    public function calculate(Collection $propertyOverlapDtos, Collection $activeHkStaff): array
    {
        $northPropertyDtos = $propertyOverlapDtos->filter(fn (PropertyNightOverlapDto $dto) => strtolower($dto->location) === 'utara');

        // Initialize results for active HK staff
        $results = [];
        foreach ($activeHkStaff as $staff) {
            $results[$staff->id] = [
                'user_id' => $staff->id,
                'name' => $staff->name,
                'role' => $staff->role,
                'hk_north_bonus' => 0.0,
                'details' => [
                    'property_allocations' => [],
                ],
            ];
        }

        if ($northPropertyDtos->isEmpty()) {
            return $results;
        }

        $northPropertyIds = $northPropertyDtos->pluck('propertyId')->toArray();

        // Load allocations for all Utara properties
        $allocationsGrouped = PropertyHousekeepingAllocation::with('property:id,name')
            ->whereIn('property_id', $northPropertyIds)
            ->get()
            ->groupBy('property_id');

        // Validate 100% total allocation per property that has allocations configured
        foreach ($allocationsGrouped as $propertyId => $allocations) {
            $sumPct = (float) $allocations->sum('percentage');
            if ($allocations->isNotEmpty() && abs($sumPct - 100.0) > 0.01) {
                $propertyName = $allocations->first()->property->name ?? "Property #{$propertyId}";
                throw new InvalidArgumentException("Total alokasi persentase Housekeeping untuk properti {$propertyName} (Utara) harus 100% (saat ini: {$sumPct}%).");
            }
        }

        // Calculate bonuses per property for each allocated staff member
        foreach ($northPropertyDtos as $dto) {
            $allocations = $allocationsGrouped->get($dto->propertyId, collect());
            $propertyHkFund = $dto->totalHkFund;

            if ($propertyHkFund <= 0 || $allocations->isEmpty()) {
                continue;
            }

            foreach ($allocations as $alloc) {
                $userId = $alloc->user_id;
                $pct = (float) $alloc->percentage;

                if ($pct <= 0) {
                    continue;
                }

                $staffShare = $propertyHkFund * ($pct / 100.0);

                if (! isset($results[$userId])) {
                    // Create entry if HK staff is allocated
                    $staffUser = User::find($userId);
                    $results[$userId] = [
                        'user_id' => $userId,
                        'name' => $staffUser?->name ?? "Staff #{$userId}",
                        'role' => $staffUser?->role ?? 'housekeeping',
                        'hk_north_bonus' => 0.0,
                        'details' => [
                            'property_allocations' => [],
                        ],
                    ];
                }

                $results[$userId]['hk_north_bonus'] += $staffShare;
                $results[$userId]['details']['property_allocations'][] = [
                    'property_id' => $dto->propertyId,
                    'property_name' => $dto->propertyName,
                    'property_hk_fund' => $propertyHkFund,
                    'percentage' => $pct,
                    'bonus_share' => $staffShare,
                ];
            }
        }

        return $results;
    }
}

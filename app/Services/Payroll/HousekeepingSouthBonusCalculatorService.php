<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\BookingCleaner;
use App\Models\CustomTaskMember;
use App\Models\HousekeepingSchedule;
use App\Models\InventoryUsage;
use App\Models\UnitDamageAction;
use App\Models\User;
use App\Services\Payroll\Dtos\PropertyNightOverlapDto;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HousekeepingSouthBonusCalculatorService
{
    /**
     * Calculate HK Selatan pool point bonuses for eligible HK staff.
     *
     * @param  Collection<int, PropertyNightOverlapDto>  $propertyOverlapDtos
     * @param  Collection<int, User>  $activeHkStaff
     * @return array<int, array> keyed by user_id
     */
    public function calculate(
        Collection $propertyOverlapDtos,
        Collection $activeHkStaff,
        int $month,
        int $year
    ): array {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        // 1. Calculate Total Fund for HK Selatan Properties
        $southPropertyDtos = $propertyOverlapDtos->filter(fn (PropertyNightOverlapDto $dto) => strtolower($dto->location) === 'selatan');
        $totalSouthFund = $southPropertyDtos->sum(fn (PropertyNightOverlapDto $dto) => $dto->totalHkFund);
        $southPropertyIds = $southPropertyDtos->pluck('propertyId')->toArray();

        // Initialize point tracking for active HK staff
        $staffPointsMap = [];
        foreach ($activeHkStaff as $staff) {
            $staffPointsMap[$staff->id] = [
                'user_id' => $staff->id,
                'name' => $staff->name,
                'routine_points' => 0.0,
                'cleaning_points' => 0.0,
                'damage_points' => 0.0,
                'custom_task_points' => 0.0,
                'inventory_points' => 0.0,
                'total_points' => 0.0,
            ];
        }

        // 2. Collect Points for HK Staff in target month
        if (! empty($activeHkStaff)) {
            $staffIds = $activeHkStaff->pluck('id')->toArray();

            // A. Routine Schedules Points
            $routineRecords = HousekeepingSchedule::whereIn('user_id', $staffIds)
                ->where('is_completed', true)
                ->whereBetween('completed_at', [$startDate, $endDate])
                ->get(['user_id', 'points']);

            foreach ($routineRecords as $r) {
                if (isset($staffPointsMap[$r->user_id])) {
                    $staffPointsMap[$r->user_id]['routine_points'] += (float) $r->points;
                }
            }

            // B. Cleaning Points (Filtered by Selatan properties & cleaned_at in target month)
            if (! empty($southPropertyIds)) {
                $cleanerRecords = BookingCleaner::whereIn('user_id', $staffIds)
                    ->whereHas('booking', function ($q) use ($startDate, $endDate, $southPropertyIds) {
                        $q->whereIn('property_id', $southPropertyIds)
                            ->where('is_cleaned', true)
                            ->whereBetween('cleaned_at', [$startDate, $endDate]);
                    })
                    ->get(['user_id', 'points']);

                foreach ($cleanerRecords as $c) {
                    if (isset($staffPointsMap[$c->user_id])) {
                        $staffPointsMap[$c->user_id]['cleaning_points'] += (float) $c->points;
                    }
                }
            }

            // C. Unit Damage Action Points (Filtered by target month)
            $damageRecords = UnitDamageAction::whereIn('user_id', $staffIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get(['user_id', 'points']);

            foreach ($damageRecords as $d) {
                if (isset($staffPointsMap[$d->user_id])) {
                    $staffPointsMap[$d->user_id]['damage_points'] += (float) $d->points;
                }
            }

            // D. Custom Task Points (Filtered by completion in target month)
            $customRecords = CustomTaskMember::whereIn('user_id', $staffIds)
                ->whereHas('customTask', function ($q) use ($startDate, $endDate) {
                    $q->whereNotNull('completed_at')
                        ->whereBetween('completed_at', [$startDate, $endDate]);
                })
                ->get(['user_id', 'points']);

            foreach ($customRecords as $ct) {
                if (isset($staffPointsMap[$ct->user_id])) {
                    $staffPointsMap[$ct->user_id]['custom_task_points'] += (float) $ct->points;
                }
            }

            // E. Inventory Usage Points (1 point per log entry in target month)
            $inventoryRecords = InventoryUsage::whereIn('created_by', $staffIds)
                ->whereBetween('usage_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->selectRaw('created_by, COUNT(*) as count')
                ->groupBy('created_by')
                ->pluck('count', 'created_by');

            foreach ($inventoryRecords as $uId => $cnt) {
                if (isset($staffPointsMap[$uId])) {
                    $staffPointsMap[$uId]['inventory_points'] += (float) $cnt;
                }
            }

            // Calculate total points per staff
            foreach ($staffPointsMap as $uId => &$pts) {
                $pts['total_points'] = $pts['routine_points'] + $pts['cleaning_points'] + $pts['damage_points'] + $pts['custom_task_points'] + $pts['inventory_points'];
            }
        }

        // 3. Calculate Total South Pool Points & Point Value
        $totalPoolPoints = array_sum(array_column($staffPointsMap, 'total_points'));
        $pointValue = $totalPoolPoints > 0 ? ($totalSouthFund / $totalPoolPoints) : 0.0;

        // 4. Calculate Final Bonus per Staff
        $results = [];
        foreach ($activeHkStaff as $staff) {
            $ptsDetails = $staffPointsMap[$staff->id] ?? [
                'user_id' => $staff->id,
                'name' => $staff->name,
                'routine_points' => 0.0,
                'cleaning_points' => 0.0,
                'damage_points' => 0.0,
                'custom_task_points' => 0.0,
                'inventory_points' => 0.0,
                'total_points' => 0.0,
            ];

            $totalPts = $ptsDetails['total_points'];
            $hkBonus = $totalPts * $pointValue;

            $results[$staff->id] = [
                'user_id' => $staff->id,
                'name' => $staff->name,
                'role' => $staff->role,
                'total_points' => $totalPts,
                'point_value' => $pointValue,
                'hk_south_bonus' => $hkBonus,
                'details' => array_merge($ptsDetails, [
                    'total_south_fund' => $totalSouthFund,
                    'total_pool_points' => $totalPoolPoints,
                    'point_value' => $pointValue,
                ]),
            ];
        }

        return $results;
    }
}

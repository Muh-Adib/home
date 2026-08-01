<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\User;
use App\Services\Payroll\Dtos\PropertyNightOverlapDto;
use Illuminate\Support\Collection;

class FrontOfficeBonusCalculatorService
{
    /**
     * Calculate Front Office bonuses for active FO staff.
     *
     * @param  Collection<int, PropertyNightOverlapDto>  $propertyOverlapDtos
     * @param  Collection<int, User>  $activeFoStaff
     * @return array<int, array> keyed by user_id
     */
    public function calculate(Collection $propertyOverlapDtos, Collection $activeFoStaff, float $bonusBookingFo = 3000): array
    {
        // 1. Calculate Total Shared FO Night Fund across ALL properties (Utara + Selatan)
        $totalFoNightFund = $propertyOverlapDtos->sum(fn (PropertyNightOverlapDto $dto) => $dto->foNightFund);

        $foStaffCount = $activeFoStaff->count();
        $sharedNightBonusPerStaff = $foStaffCount > 0 ? ($totalFoNightFund / $foStaffCount) : 0.0;

        // Initialize results for all active FO staff
        $results = [];
        foreach ($activeFoStaff as $staff) {
            $results[$staff->id] = [
                'user_id' => $staff->id,
                'name' => $staff->name,
                'role' => $staff->role,
                'personal_booking_bonus' => 0.0,
                'shared_night_bonus' => $sharedNightBonusPerStaff,
                'total_bonus' => $sharedNightBonusPerStaff,
                'details' => [
                    'input_count' => 0,
                    'input_bonus' => 0.0,
                    'followup_count' => 0,
                    'followup_bonus' => 0.0,
                    'solo_count' => 0,
                    'solo_bonus' => 0.0,
                    'total_fo_night_fund' => $totalFoNightFund,
                    'fo_staff_count' => $foStaffCount,
                    'shared_night_bonus_per_staff' => $sharedNightBonusPerStaff,
                ],
            ];
        }

        // 2. Calculate Personal Booking Bonus per FO Staff across ALL properties
        foreach ($propertyOverlapDtos as $dto) {
            foreach ($dto->bookingsBreakdown as $b) {
                // Only bookings starting in target month qualify for booking count bonus
                if (empty($b['is_starting_in_month'])) {
                    continue;
                }

                $inputBy = $b['created_by'] ? (int) $b['created_by'] : null;
                $followUpBy = $b['followed_up_by'] ? (int) $b['followed_up_by'] : null;

                if ($inputBy === null && $followUpBy === null) {
                    continue;
                }

                if ($inputBy !== null && ($followUpBy === null || $inputBy === $followUpBy)) {
                    // Case A: Single FO staff (or same staff) gets 100% of bonus_booking_fo
                    if (isset($results[$inputBy])) {
                        $results[$inputBy]['personal_booking_bonus'] += $bonusBookingFo;
                        $results[$inputBy]['details']['solo_count']++;
                        $results[$inputBy]['details']['solo_bonus'] += $bonusBookingFo;
                    }
                } elseif ($followUpBy !== null && $inputBy === null) {
                    // Single FO staff on follow-up gets 100%
                    if (isset($results[$followUpBy])) {
                        $results[$followUpBy]['personal_booking_bonus'] += $bonusBookingFo;
                        $results[$followUpBy]['details']['solo_count']++;
                        $results[$followUpBy]['details']['solo_bonus'] += $bonusBookingFo;
                    }
                } else {
                    // Case B: Different input_by and followup_by -> 50-50 split
                    $halfBonus = $bonusBookingFo * 0.5;

                    if ($inputBy !== null && isset($results[$inputBy])) {
                        $results[$inputBy]['personal_booking_bonus'] += $halfBonus;
                        $results[$inputBy]['details']['input_count']++;
                        $results[$inputBy]['details']['input_bonus'] += $halfBonus;
                    }

                    if ($followUpBy !== null && isset($results[$followUpBy])) {
                        $results[$followUpBy]['personal_booking_bonus'] += $halfBonus;
                        $results[$followUpBy]['details']['followup_count']++;
                        $results[$followUpBy]['details']['followup_bonus'] += $halfBonus;
                    }
                }
            }
        }

        // Recalculate total_bonus for each staff
        foreach ($results as $userId => &$data) {
            $data['total_bonus'] = $data['personal_booking_bonus'] + $data['shared_night_bonus'];
        }

        return $results;
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\StaffPerformanceBonus;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StaffBonusAggregatorService
{
    public function __construct(
        protected NightOverlapCalculatorService $nightOverlapCalculator,
        protected FrontOfficeBonusCalculatorService $foCalculator,
        protected HousekeepingSouthBonusCalculatorService $hkSouthCalculator,
        protected HousekeepingNorthBonusCalculatorService $hkNorthCalculator
    ) {}

    /**
     * Calculate and optionally save performance bonuses for all active staff in a target month/year.
     */
    public function calculateAndSaveBonuses(
        int $month,
        int $year,
        array $rates = [],
        bool $finalize = true,
        ?User $finalizer = null
    ): array {
        return DB::transaction(function () use ($month, $year, $rates, $finalize, $finalizer) {
            // Load and persist rate settings (use new location-specific keys)
            $rates = array_merge([
                'bonus_booking_fo' => (float) SystemSetting::get('bonus_booking_fo', 3000),
                'bonus_night_fo' => (float) SystemSetting::get('bonus_night_fo', 1000),
                // South HK rates (point-based pool)
                'bonus_booking_hk_selatan' => (float) SystemSetting::get('bonus_booking_hk_selatan', SystemSetting::get('bonus_booking_hk', 3000)),
                'bonus_night_hk_selatan' => (float) SystemSetting::get('bonus_night_hk_selatan', SystemSetting::get('bonus_night_hk', 5000)),
                // North HK rates (percentage-allocation)
                'bonus_booking_hk_utara' => (float) SystemSetting::get('bonus_booking_hk_utara', SystemSetting::get('bonus_booking_hk', 3000)),
                'bonus_night_hk_utara' => (float) SystemSetting::get('bonus_night_hk_utara', SystemSetting::get('bonus_night_hk', 5000)),
            ], $rates);

            SystemSetting::setMany($rates, 'payroll_rates');

            // 1. Calculate property night overlaps
            $propertyOverlapDtos = $this->nightOverlapCalculator->calculateAllProperties($month, $year, $rates);

            // 2. Fetch Active, Non-Deleted Staff (include hk_location for routing)
            $staff = User::query()
                ->where('role', '!=', 'guest')
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->get(['id', 'name', 'role', 'status', 'hk_location']);

            $foStaff = $staff->where('role', 'front_desk');
            $hkStaff = $staff->where('role', 'housekeeping');

            // Route HK staff by hk_location: null defaults to 'selatan'
            $hkSouthStaff = $hkStaff->filter(fn ($u) => ($u->hk_location ?? 'selatan') === 'selatan');
            $hkNorthStaff = $hkStaff->filter(fn ($u) => $u->hk_location === 'utara');

            // 3. Compute FO & HK Bonuses
            $foBonusResults = $this->foCalculator->calculate($propertyOverlapDtos, $foStaff, (float) $rates['bonus_booking_fo']);
            $hkSouthBonusResults = $this->hkSouthCalculator->calculate($propertyOverlapDtos, $hkSouthStaff, $month, $year);
            $hkNorthBonusResults = $this->hkNorthCalculator->calculate($propertyOverlapDtos, $hkNorthStaff);

            $results = [];

            foreach ($staff as $s) {
                $hkBonus = 0.0;
                $fdFirstNightBonus = 0.0;
                $fdNextNightsShare = 0.0;
                $kpiBonus = 0.0;
                $details = [
                    'rates' => $rates,
                ];

                if ($s->role === 'front_desk') {
                    $foData = $foBonusResults[$s->id] ?? null;
                    if ($foData) {
                        $fdFirstNightBonus = (float) ($foData['personal_booking_bonus'] ?? 0.0);
                        $fdNextNightsShare = (float) ($foData['shared_night_bonus'] ?? 0.0);
                        $details['front_office'] = $foData['details'] ?? [];
                    }
                } elseif ($s->role === 'housekeeping') {
                    $hkLocation = $s->hk_location ?? 'selatan';

                    if ($hkLocation === 'utara') {
                        $northData = $hkNorthBonusResults[$s->id] ?? null;
                        $hkBonus = (float) ($northData['hk_north_bonus'] ?? 0.0);
                        $details['housekeeping_north'] = $northData['details'] ?? [];
                        $details['hk_zone'] = 'utara';
                    } else {
                        $southData = $hkSouthBonusResults[$s->id] ?? null;
                        $hkBonus = (float) ($southData['hk_south_bonus'] ?? 0.0);
                        $details['housekeeping_south'] = $southData['details'] ?? [];
                        $details['hk_zone'] = 'selatan';
                    }
                }

                $totalBonus = $hkBonus + $fdFirstNightBonus + $fdNextNightsShare + $kpiBonus;

                $record = StaffPerformanceBonus::updateOrCreate(
                    [
                        'user_id' => $s->id,
                        'month' => $month,
                        'year' => $year,
                    ],
                    [
                        'role' => $s->role,
                        'housekeeping_bonus' => $hkBonus,
                        'frontdesk_first_night_bonus' => $fdFirstNightBonus,
                        'frontdesk_next_nights_bonus_share' => $fdNextNightsShare,
                        'kpi_performance_bonus' => $kpiBonus,
                        'total_bonus' => $totalBonus,
                        'details' => $details,
                        'status' => $finalize ? 'finalized' : 'draft',
                        'finalized_at' => $finalize ? now() : null,
                        'finalized_by' => $finalize ? $finalizer?->id : null,
                    ]
                );

                $results[$s->id] = $record;
            }

            return $results;
        });
    }

    /**
     * Get bonus records for a given month and year (finalized or all).
     */
    public function getBonusesForMonth(int $month, int $year, bool $onlyFinalized = false): array
    {
        $query = StaffPerformanceBonus::where('month', $month)
            ->where('year', $year);

        if ($onlyFinalized) {
            $query->where('status', 'finalized');
        }

        return $query->get()
            ->keyBy('user_id')
            ->all();
    }
}

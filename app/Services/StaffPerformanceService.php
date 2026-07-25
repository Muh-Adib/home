<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\StaffPerformanceBonus;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;

class StaffPerformanceService
{
    public function __construct(
        protected HousekeepingPointService $pointService
    ) {}

    /**
     * Calculate and finalize monthly performance bonuses for eligible roles (Housekeeping & Front Office).
     */
    public function calculateAndSaveMonthlyBonuses(int $month, int $year, array $rates = [], bool $finalize = true, ?User $finalizer = null): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        // Default rates (fallback to SystemSetting if not explicitly passed)
        $followUpRate = (float) ($rates['follow_up_rate'] ?? SystemSetting::get('follow_up_rate', 1000));
        $creationRate = (float) ($rates['creation_rate'] ?? SystemSetting::get('creation_rate', 1000));
        $nextNightRate = (float) ($rates['next_night_rate'] ?? SystemSetting::get('next_night_rate', 1000));

        $hkBonusMode = (string) ($rates['housekeeping_bonus_mode'] ?? SystemSetting::get('housekeeping_bonus_mode', 'rate_per_point'));
        $housekeepingRatePerPoint = (float) ($rates['housekeeping_rate_per_point'] ?? SystemSetting::get('housekeeping_rate_per_point', 2000));
        $housekeepingFixedPool = (float) ($rates['housekeeping_fixed_pool'] ?? SystemSetting::get('housekeeping_fixed_pool', 1500000));
        $housekeepingPoolPercentage = (float) ($rates['housekeeping_pool_percentage'] ?? SystemSetting::get('housekeeping_pool_percentage', 5.0));
        $housekeepingMaxCap = (float) ($rates['housekeeping_max_cap'] ?? SystemSetting::get('housekeeping_max_cap', 1500000));

        // Persist rates to SystemSetting
        SystemSetting::setMany([
            'follow_up_rate' => $followUpRate,
            'creation_rate' => $creationRate,
            'next_night_rate' => $nextNightRate,
            'housekeeping_bonus_mode' => $hkBonusMode,
            'housekeeping_rate_per_point' => $housekeepingRatePerPoint,
            'housekeeping_fixed_pool' => $housekeepingFixedPool,
            'housekeeping_pool_percentage' => $housekeepingPoolPercentage,
            'housekeeping_max_cap' => $housekeepingMaxCap,
        ], 'payroll_rates');

        // Fetch active/eligible staff
        $staff = User::withTrashed()
            ->where('role', '!=', 'guest')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where('created_at', '<=', $endDate)
                    ->where(function ($sub) use ($startDate) {
                        $sub->whereNull('deleted_at')
                            ->orWhere('deleted_at', '>=', $startDate);
                    });
            })
            ->get();

        $frontdesks = $staff->where('role', 'front_desk');
        $frontdeskCount = $frontdesks->count();

        // A. FO Creation (Input Data): Bookings created by user whose first night (check_in) is in that month
        $creationsCounts = Booking::selectRaw('created_by, COUNT(*) as count')
            ->whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('booking_status', '!=', 'cancelled')
            ->whereNotNull('created_by')
            ->groupBy('created_by')
            ->pluck('count', 'created_by');

        // B. FO Follow-up: Bookings followed up by user in that month
        $followUpsCounts = Booking::selectRaw('followed_up_by, COUNT(*) as count')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('followed_up_by')
            ->groupBy('followed_up_by')
            ->pluck('count', 'followed_up_by');

        // C. FO Extra Night Pool: Total reservation stay nights - total bookings starting in that month
        $monthBookings = Booking::whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('booking_status', '!=', 'cancelled')
            ->get(['id', 'check_in', 'check_out']);

        $totalBookingsCount = $monthBookings->count();
        $totalReservationNights = 0;

        foreach ($monthBookings as $booking) {
            $nights = $booking->check_in && $booking->check_out
                ? (int) Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out))
                : 1;
            $totalReservationNights += max(1, $nights);
        }

        $extraNights = max(0, $totalReservationNights - $totalBookingsCount);
        $totalNextNightsPool = $extraNights * $nextNightRate;
        $sharedNextNightsBonus = $frontdeskCount > 0 ? ($totalNextNightsPool / $frontdeskCount) : 0.0;

        // D. Calculate HK Pool Rate based on Mode
        $hkStaffUsers = $staff->where('role', 'housekeeping');
        $totalHkPointsCollected = 0.0;
        $hkPointsDetailsMap = [];

        foreach ($hkStaffUsers as $hkUser) {
            $pts = $this->pointService->getMonthlyPointsDetails($hkUser->id, $month, $year);
            $hkPointsDetailsMap[$hkUser->id] = $pts;
            $totalHkPointsCollected += $pts['total'];
        }

        $effectivePointRate = 0.0;
        if ($hkBonusMode === 'rate_per_point') {
            $effectivePointRate = $housekeepingRatePerPoint;
        } elseif ($hkBonusMode === 'fixed_pool') {
            $effectivePointRate = $totalHkPointsCollected > 0 ? ($housekeepingFixedPool / $totalHkPointsCollected) : 0.0;
        } elseif ($hkBonusMode === 'profit_sharing') {
            $poolData = $this->pointService->getMonthlyPool($month, $year, $housekeepingPoolPercentage);
            $effectivePointRate = $poolData['point_rate'];
        } else {
            $effectivePointRate = $housekeepingRatePerPoint;
        }

        $results = [];

        foreach ($staff as $s) {
            $hkBonus = 0.0;
            $fdFirstNightBonus = 0.0; // Input data (creation) bonus
            $fdNextNightsShare = 0.0; // Shared extra nights pool
            $kpiBonus = 0.0;          // Follow-up bonus
            $details = [];

            // STRICT ROLE ISOLATION: Only housekeeping & front_desk receive bonuses
            if ($s->role === 'housekeeping') {
                $pointsBreakdown = $hkPointsDetailsMap[$s->id] ?? $this->pointService->getMonthlyPointsDetails($s->id, $month, $year);

                if ($pointsBreakdown['total'] > 0) {
                    $rawHkBonus = $pointsBreakdown['total'] * $effectivePointRate;
                    $hkBonus = $housekeepingMaxCap > 0 ? min($rawHkBonus, $housekeepingMaxCap) : $rawHkBonus;
                } else {
                    $hkBonus = 0.0;
                }

                $details['housekeeping_points'] = $pointsBreakdown;
                $details['point_rate'] = $effectivePointRate;
                $details['bonus_mode'] = $hkBonusMode;
                $details['max_cap'] = $housekeepingMaxCap;
            } elseif ($s->role === 'front_desk') {
                $creationsCount = (int) $creationsCounts->get($s->id, 0);
                $followUpsCount = (int) $followUpsCounts->get($s->id, 0);

                // Creation Bonus (Gaji/Bonus Input Data)
                $fdFirstNightBonus = $creationsCount * $creationRate;
                // Shared Extra Nights Pool Bonus
                $fdNextNightsShare = (float) $sharedNextNightsBonus;
                // Follow-up Bonus
                $kpiBonus = $followUpsCount * $followUpRate;

                $details['front_office'] = [
                    'creations_count' => $creationsCount,
                    'creation_rate' => $creationRate,
                    'follow_ups_count' => $followUpsCount,
                    'follow_up_rate' => $followUpRate,
                    'total_reservation_nights' => $totalReservationNights,
                    'total_bookings_count' => $totalBookingsCount,
                    'extra_nights' => $extraNights,
                    'next_night_rate' => $nextNightRate,
                    'total_next_nights_pool' => $totalNextNightsPool,
                    'shared_next_nights_bonus' => $sharedNextNightsBonus,
                ];
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

            $results[] = $record;
        }

        return $results;
    }

    /**
     * Get finalized bonus records for a given month and year.
     */
    public function getFinalizedBonusesForMonth(int $month, int $year): array
    {
        return StaffPerformanceBonus::where('month', $month)
            ->where('year', $year)
            ->where('status', 'finalized')
            ->get()
            ->keyBy('user_id')
            ->all();
    }
}

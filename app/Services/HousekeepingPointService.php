<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingCleaner;
use App\Models\BookingDailyRevenue;
use App\Models\CustomTaskMember;
use App\Models\HousekeepingSchedule;
use App\Models\Income;
use App\Models\InventoryUsage;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\StaffPayroll;
use App\Models\UnitDamageAction;
use App\Models\User;
use Carbon\Carbon;

class HousekeepingPointService
{
    /**
     * Get detailed points breakdown for a user in a specific month and year.
     */
    public function getMonthlyPointsDetails(int $userId, int $month, int $year): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        // 1. Routine Schedules Points
        $routinePoints = (float) HousekeepingSchedule::where('user_id', $userId)
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->sum('points');

        // 2. Cleaning Booking Points
        $cleaningPoints = (float) BookingCleaner::where('user_id', $userId)
            ->whereHas('booking', function ($q) {
                $q->where('is_cleaned', true);
            })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('points');

        // 3. Unit Damage Points
        $damagePoints = (float) UnitDamageAction::where('user_id', $userId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('points');

        // 4. Custom Task Points
        $customPoints = (float) CustomTaskMember::where('user_id', $userId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('points');

        // 5. Inventory Usage Points (1.0 point per inventory usage entry logged by staff)
        $inventoryPoints = (float) InventoryUsage::where('created_by', $userId)
            ->whereBetween('usage_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->count();

        $totalPoints = $routinePoints + $cleaningPoints + $damagePoints + $customPoints + $inventoryPoints;

        return [
            'routine' => $routinePoints,
            'cleaning' => $cleaningPoints,
            'damage' => $damagePoints,
            'custom' => $customPoints,
            'inventory' => $inventoryPoints,
            'total' => $totalPoints,
        ];
    }

    /**
     * Calculate monthly sharing pool metrics for all properties.
     */
    public function getMonthlyPool(int $month, int $year, ?float $poolPercentage = null): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        $properties = Property::active()->get();
        $eligibleTurnover = 0.0;
        $propertyDetails = [];

        foreach ($properties as $property) {
            // A. Calculate Monthly Revenue
            // Lodging revenue
            $monthlyDailyRevenue = (float) BookingDailyRevenue::where('property_id', $property->id)
                ->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
                ->confirmedBookings()
                ->sum('amount');

            // Other incomes
            $monthlyOtherIncome = (float) Income::where('property_id', $property->id)
                ->whereBetween('income_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('source', '!=', 'booking')
                ->sum('amount');

            $monthlyRevenue = $monthlyDailyRevenue + $monthlyOtherIncome;

            // B. Calculate Monthly Expenses
            $monthlyOperatingExpenses = (float) PropertyExpense::where('property_id', $property->id)
                ->whereBetween('expense_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', '!=', 'rejected')
                ->sum('amount');

            // Fixed Cost for the month
            $monthlyFixedCost = 0.0;
            if ($property->ownership_model === 'rented') {
                $monthlyFixedCost = (float) $property->monthly_rent_cost;
            } elseif ($property->ownership_model === 'owned') {
                $monthlyFixedCost = (float) $property->mortgage_interest_monthly;
            }

            $monthlyExpenses = $monthlyOperatingExpenses + $monthlyFixedCost;
            $monthlyNetProfit = $monthlyRevenue - $monthlyExpenses;

            // C. Calculate Cumulative Profit All-Time (up to the end of the month)
            $allTimeIncome = (float) Income::where('property_id', $property->id)
                ->where('income_date', '<=', $endDate->toDateString())
                ->sum('amount');

            $allTimeExpense = (float) PropertyExpense::where('property_id', $property->id)
                ->where('expense_date', '<=', $endDate->toDateString())
                ->where('status', '!=', 'rejected')
                ->sum('amount');

            // Find number of months since start date to the end of the target month
            $firstTxDate = Income::where('property_id', $property->id)->min('income_date')
                ?? optional($property->created_at)->toDateString()
                ?? now()->toDateString();

            $monthsSinceStart = max(1, round(Carbon::parse($firstTxDate)->diffInMonths($endDate)));

            $allTimeFixed = 0.0;
            if ($property->ownership_model === 'rented') {
                $allTimeFixed = (float) ($property->monthly_rent_cost * $monthsSinceStart);
            } elseif ($property->ownership_model === 'owned') {
                $allTimeFixed = (float) ($property->mortgage_interest_monthly * $monthsSinceStart);
            }

            $cumulativeProfit = $allTimeIncome - $allTimeExpense - $allTimeFixed;
            $totalCapital = (float) ($property->initial_build_capital + $property->lease_capital);

            // D. Deficit check
            $isDeficit = ($monthlyNetProfit <= 0) || ($cumulativeProfit < $totalCapital);

            if (! $isDeficit) {
                $eligibleTurnover += $monthlyRevenue;
            }

            $propertyDetails[] = [
                'id' => $property->id,
                'name' => $property->name,
                'monthly_revenue' => $monthlyRevenue,
                'monthly_net_profit' => $monthlyNetProfit,
                'cumulative_profit' => $cumulativeProfit,
                'total_capital' => $totalCapital,
                'is_deficit' => $isDeficit,
            ];
        }

        // Calculate company net profit
        $totalIncome = (float) Income::whereBetween('income_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('amount');

        $totalExpense = (float) PropertyExpense::whereBetween('expense_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'approved')
            ->sum('amount');

        // Sum salaries to subtract if not already in PropertyExpense
        $payrollSalaries = (float) StaffPayroll::where('month', $month)->where('year', $year)->sum('total_salary');
        if ($payrollSalaries <= 0) {
            $payrollSalaries = (float) User::where('role', '!=', 'guest')->sum('base_salary');
        }

        $salaryExpenseInDb = (float) PropertyExpense::whereBetween('expense_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'approved')
            ->where(function ($q) {
                $q->where('expense_category', 'salary')
                    ->orWhere('expense_category', 'staff');
            })
            ->sum('amount');

        $unrecordedSalaries = max(0.0, $payrollSalaries - $salaryExpenseInDb);
        $netCompanyProfit = max(0.0, $totalIncome - $totalExpense - $unrecordedSalaries);

        // E. Total Pool (default 5% of net profit, configurable)
        $percentage = $poolPercentage ?? 5.0;
        $totalPool = $netCompanyProfit * ($percentage / 100.0);

        // F. Calculate total housekeeping points collected in the month
        $housekeepingUsers = User::where('role', 'housekeeping')->active()->get();
        $totalPoints = 0.0;
        $staffBreakdown = [];

        foreach ($housekeepingUsers as $user) {
            $details = $this->getMonthlyPointsDetails($user->id, $month, $year);
            $totalPoints += $details['total'];
            $staffBreakdown[$user->id] = $details;
        }

        // G. Calculate point rate
        $pointRate = $totalPoints > 0 ? ($totalPool / $totalPoints) : 0.0;

        return [
            'eligible_turnover' => $eligibleTurnover,
            'total_pool' => $totalPool,
            'total_points' => $totalPoints,
            'point_rate' => $pointRate,
            'property_details' => $propertyDetails,
            'staff_breakdown' => $staffBreakdown,
        ];
    }

    /**
     * Calculate individual housekeeping bonus share.
     */
    public function calculateHousekeepingBonus(int $userId, int $month, int $year, ?float $poolPercentage = null): float
    {
        $details = $this->getMonthlyPointsDetails($userId, $month, $year);
        $poolData = $this->getMonthlyPool($month, $year, $poolPercentage);

        return $details['total'] * $poolData['point_rate'];
    }
}

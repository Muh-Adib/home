<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\FinancialReport;
use App\Models\Income;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use Carbon\Carbon;

class PropertyFinancialReportService
{
    /**
     * Record a new property expense
     */
    public function recordExpense(array $data): PropertyExpense
    {
        $propertyId = $data['property_id'] ?? null;
        if (! $propertyId && ! empty($data['property_slug'])) {
            $property = Property::where('slug', $data['property_slug'])->firstOrFail();
            $propertyId = $property->id;
        }

        $recordedBy = $data['recorded_by'] ?? (User::where('role', 'super_admin')->first()?->id ?? 1);

        return PropertyExpense::create([
            'property_id' => $propertyId,
            'expense_category' => $data['expense_category'] ?? 'other',
            'expense_scope' => $data['expense_scope'] ?? 'operational',
            'description' => $data['description'],
            'amount' => (float) $data['amount'],
            'expense_date' => $data['expense_date'] ?? now()->toDateString(),
            'vendor' => $data['vendor'] ?? null,
            'receipt_path' => $data['receipt_path'] ?? null,
            'is_recurring' => $data['is_recurring'] ?? false,
            'recurring_frequency' => $data['recurring_frequency'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => 'approved',
            'recorded_by' => $recordedBy,
            'approved_by' => $recordedBy,
            'approved_at' => now(),
        ]);
    }

    /**
     * Generate & Calculate financial report per property according to ownership schema for any period
     */
    public function generateMonthlyReport(
        ?int $month = null,
        ?int $year = null,
        ?int $propertyId = null,
        bool $saveToDatabase = true,
        ?int $generatedBy = null,
        ?string $from = null,
        ?string $to = null
    ): array {
        $now = now();
        $month = $month ?: (int) $now->format('m');
        $year = $year ?: (int) $now->format('Y');

        if ($from && $to) {
            $startDate = Carbon::parse($from)->toDateString();
            $endDate = Carbon::parse($to)->toDateString();
            $daysInMonth = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
        } else {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();
            $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;
        }

        $monthFactor = max(0.1, round($daysInMonth / 30.0, 4));

        $propertiesQuery = Property::query();
        if ($propertyId) {
            $propertiesQuery->where('id', $propertyId);
        }
        $properties = $propertiesQuery->orderBy('name')->get();

        $superAdminId = $generatedBy ?: (User::where('role', 'super_admin')->first()?->id ?? 1);

        $reportResults = [];
        $totalAllPropertiesIncome = 0;
        $totalAllPropertiesExpense = 0;
        $totalAllPropertiesNetProfit = 0;
        $totalAllOwnerShare = 0;
        $totalAllInvestorShare = 0;

        foreach ($properties as $property) {
            // 1. Calculate Income (Room & Other)
            $incomes = Income::where('property_id', $property->id)
                ->whereBetween('income_date', [$startDate, $endDate])
                ->get();

            $grossRoomIncome = 0;
            $netRoomIncome = 0;
            $otherIncome = 0;

            foreach ($incomes as $inc) {
                if ($inc->booking_id && $inc->booking && $inc->source === 'booking') {
                    $commPct = $inc->booking->commission_pct ?? ($inc->booking->source === 'ota' ? 15.00 : 0.00);
                    $grossRoomIncome += $inc->amount;
                    $netRoomIncome += $inc->amount * (1 - ($commPct / 100.0));
                } else {
                    $otherIncome += $inc->amount;
                }
            }

            // Fallback to bookings if income records not present
            if ($grossRoomIncome == 0) {
                $bookingsInMonth = Booking::where('property_id', $property->id)
                    ->whereBetween('check_in', [$startDate, $endDate])
                    ->where('booking_status', '!=', 'cancelled')
                    ->get();

                foreach ($bookingsInMonth as $b) {
                    $commPct = $b->commission_pct ?? ($b->source === 'ota' ? 15.00 : 0.00);
                    $grossRoomIncome += $b->total_amount;
                    $netRoomIncome += $b->total_amount * (1 - ($commPct / 100.0));
                }
            }

            $totalIncome = $netRoomIncome + $otherIncome;

            // 2. Calculate Expenses
            $expenses = PropertyExpense::where('property_id', $property->id)
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->where('status', 'approved')
                ->get();

            $operationalExpenses = $expenses->whereNotIn('expense_scope', ['capital', 'prive'])->sum('amount');
            $capexExpenses = $expenses->where('expense_scope', 'capital')->sum('amount');
            $priveExpenses = $expenses->where('expense_scope', 'prive')->sum('amount');
            $totalExpenses = $operationalExpenses + $capexExpenses + $priveExpenses;

            // 3. Operational Profit
            $labaOperasional = $totalIncome - $operationalExpenses;

            // 4. Split according to Ownership Model Schema
            $investorShare = 0;
            $ownerShare = 0;
            $rentCost = 0;
            $interestCost = 0;

            if ($property->ownership_model === 'partnership') {
                $investorPct = $property->investor_split_pct ?? 50;
                $ownerPct = $property->owner_split_pct ?? 50;

                $investorCapex = $expenses->where('expense_scope', 'capital')->sum(function ($exp) use ($investorPct) {
                    $pct = $exp->capital_split_investor_pct ?? $investorPct;

                    return $exp->amount * ($pct / 100.0);
                });

                $ownerCapex = $expenses->where('expense_scope', 'capital')->sum(function ($exp) use ($ownerPct) {
                    $pct = isset($exp->capital_split_investor_pct) ? (100 - $exp->capital_split_investor_pct) : $ownerPct;

                    return $exp->amount * ($pct / 100.0);
                });

                $investorShare = ($labaOperasional * ($investorPct / 100.0)) - $investorCapex;
                $ownerShare = ($labaOperasional * ($ownerPct / 100.0)) - $ownerCapex - $priveExpenses;
            } elseif ($property->ownership_model === 'rented') {
                $rentCost = ($property->monthly_rent_cost ?? 0) * $monthFactor;
                $ownerShare = $labaOperasional - $rentCost - $capexExpenses - $priveExpenses;
                $investorShare = 0;
            } else { // owned
                $interestCost = ($property->mortgage_interest_monthly ?? 0) * $monthFactor;
                $ownerShare = $labaOperasional - $interestCost - $capexExpenses - $priveExpenses;
                $investorShare = 0;
            }

            $netProfit = $totalIncome - $totalExpenses - $rentCost - $interestCost;

            // 5. Occupancy and Booking Statistics
            $bookingsForStats = Booking::where('property_id', $property->id)
                ->where('check_in', '<', $endDate)
                ->where('check_out', '>', $startDate)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                ->get();

            $bookedNights = 0;
            $startCarbon = Carbon::parse($startDate);
            $endCarbon = Carbon::parse($endDate);

            foreach ($bookingsForStats as $b) {
                $cIn = Carbon::parse($b->check_in);
                $cOut = Carbon::parse($b->check_out);
                $oStart = $cIn->max($startCarbon);
                $oEnd = $cOut->min($endCarbon);
                if ($oStart->lt($oEnd)) {
                    $bookedNights += $oStart->diffInDays($oEnd);
                }
            }

            $occupancyRate = $daysInMonth > 0 ? round(($bookedNights / $daysInMonth) * 100, 2) : 0;
            $adr = $bookedNights > 0 ? round($grossRoomIncome / $bookedNights, 2) : 0;
            $revpar = $daysInMonth > 0 ? round($grossRoomIncome / $daysInMonth, 2) : 0;

            $singleReport = [
                'property_id' => $property->id,
                'property_name' => $property->name,
                'property_slug' => $property->slug,
                'ownership_model' => $property->ownership_model,
                'owner_split_pct' => $property->owner_split_pct,
                'investor_split_pct' => $property->investor_split_pct,

                'gross_room_income' => $grossRoomIncome,
                'net_room_income' => $netRoomIncome,
                'other_income' => $otherIncome,
                'total_income' => $totalIncome,

                'operational_expenses' => $operationalExpenses,
                'capex_expenses' => $capexExpenses,
                'prive_expenses' => $priveExpenses,
                'total_expenses' => $totalExpenses,

                'laba_operasional' => $labaOperasional,
                'rent_cost' => $rentCost,
                'interest_cost' => $interestCost,

                'owner_share' => $ownerShare,
                'investor_share' => $investorShare,
                'net_profit' => $netProfit,

                'booked_nights' => $bookedNights,
                'occupancy_rate' => $occupancyRate,
                'adr' => $adr,
                'revpar' => $revpar,
                'booking_count' => $bookingsForStats->count(),
            ];

            // Save or update FinancialReport database record if requested
            if ($saveToDatabase) {
                FinancialReport::updateOrCreate(
                    [
                        'property_id' => $property->id,
                        'report_period' => sprintf('%04d-%02d', $year, $month),
                        'report_type' => 'monthly',
                    ],
                    [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'total_revenue' => $totalIncome,
                        'total_expenses' => $totalExpenses,
                        'net_profit' => $netProfit,
                        'occupancy_rate' => $occupancyRate,
                        'adr' => $adr,
                        'revpar' => $revpar,
                        'booking_count' => $bookingsForStats->count(),
                        'guest_count' => $bookingsForStats->sum('guest_count'),
                        'report_data' => $singleReport,
                        'generated_by' => $superAdminId,
                        'generated_at' => now(),
                    ]
                );
            }

            $reportResults[] = $singleReport;

            $totalAllPropertiesIncome += $totalIncome;
            $totalAllPropertiesExpense += $totalExpenses;
            $totalAllPropertiesNetProfit += $netProfit;
            $totalAllOwnerShare += $ownerShare;
            $totalAllInvestorShare += $investorShare;
        }

        return [
            'period' => [
                'month' => $month,
                'year' => $year,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $daysInMonth,
            ],
            'summary' => [
                'total_properties' => count($reportResults),
                'total_income' => $totalAllPropertiesIncome,
                'total_expenses' => $totalAllPropertiesExpense,
                'net_profit' => $totalAllPropertiesNetProfit,
                'owner_share' => $totalAllOwnerShare,
                'investor_share' => $totalAllInvestorShare,
            ],
            'properties' => $reportResults,
        ];
    }
}

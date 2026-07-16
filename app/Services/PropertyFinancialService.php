<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Income;
use App\Models\Property;
use App\Models\PropertyExpense;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PropertyFinancialService
{
    /**
     * Get all financial data for the dashboard.
     *
     * @return array{
     *   period: array{from: string, to: string, label: string},
     *   kpi: array{revenue: float, expense: float, net_profit: float, roi: float},
     *   bep: array{total_capital: int, cumulative_profit: float, bep_pct: float, remaining_months: float, avg_monthly_profit: float, months_since_start: int},
     *   monthly_trend: list<array{month: string, revenue: float, expense: float, profit: float, occupancy: float, bookings: int}>,
     *   expense_breakdown: list<array{category: string, label: string, amount: float, pct: float}>,
     *   revenue_breakdown: list<array{source: string, label: string, amount: float, pct: float}>,
     *   booking_sources: list<array{source: string, count: int, revenue: float}>,
     *   owner_split: array{owner_pct: float, investor_pct: float, owner_amount: float, investor_amount: float}|null,
     *   top_bookings: list<array>,
     *   occupancy_summary: array{rate_pct: float, booked_nights: int, available_nights: int},
     * }
     */
    public function getFinancialData(Property $property, string $period = '12m'): array
    {
        [$from, $to, $label] = $this->resolvePeriod($period);

        $revenue = $this->calcRevenue($property, $from, $to);
        $expenses = $this->calcExpenses($property, $from, $to);
        $netProfit = $revenue - $expenses;

        $bep = $this->calcBep($property);
        $roi = $bep['total_capital'] > 0
            ? round(($bep['cumulative_profit'] / $bep['total_capital']) * 100, 2)
            : 0;

        return [
            'period' => ['from' => $from, 'to' => $to, 'label' => $label],
            'kpi' => [
                'revenue' => (float) $revenue,
                'expense' => (float) $expenses,
                'net_profit' => (float) $netProfit,
                'roi' => $roi,
            ],
            'bep' => $bep,
            'monthly_trend' => $this->buildMonthlyTrend($property, $from, $to),
            'expense_breakdown' => $this->buildExpenseBreakdown($property, $from, $to),
            'revenue_breakdown' => $this->buildRevenueBreakdown($property, $from, $to),
            'booking_sources' => $this->buildBookingSources($property, $from, $to),
            'owner_split' => $this->calcOwnerSplit($property, $netProfit),
            'top_bookings' => $this->topBookings($property, $from, $to),
            'occupancy_summary' => $this->calcOccupancy($property, $from, $to),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Period Resolution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return array{0: string, 1: string, 2: string}
     */
    private function resolvePeriod(string $period): array
    {
        $now = Carbon::now();

        return match ($period) {
            '1m' => [$now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString(), 'Bulan Ini'],
            '3m' => [$now->copy()->subMonths(3)->startOfMonth()->toDateString(), $now->toDateString(), '3 Bulan Terakhir'],
            '6m' => [$now->copy()->subMonths(6)->startOfMonth()->toDateString(), $now->toDateString(), '6 Bulan Terakhir'],
            'ytd' => [$now->copy()->startOfYear()->toDateString(), $now->toDateString(), 'Tahun Ini (YTD)'],
            'all_time' => ['2000-01-01', $now->toDateString(), 'Semua Waktu'],
            default => [$now->copy()->subMonths(12)->startOfMonth()->toDateString(), $now->toDateString(), '12 Bulan Terakhir'],
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Revenue & Expense Aggregation
    // ─────────────────────────────────────────────────────────────────────────

    private function calcRevenue(Property $property, string $from, string $to): float
    {
        // Lodging & extra beds revenue strictly by nightly breakdown
        $dailyRevenue = (float) BookingDailyRevenue::where('property_id', $property->id)
            ->whereBetween('tanggal', [$from, $to])
            ->confirmedBookings()
            ->sum('amount');

        // Other non-booking incomes (e.g. laundry, catering, other sources not tied to daily lodging)
        $otherIncome = (float) Income::where('property_id', $property->id)
            ->whereBetween('income_date', [$from, $to])
            ->where('source', '!=', 'booking')
            ->sum('amount');

        return $dailyRevenue + $otherIncome;
    }

    private function calcExpenses(Property $property, string $from, string $to): float
    {
        $operatingExpenses = (float) PropertyExpense::where('property_id', $property->id)
            ->whereBetween('expense_date', [$from, $to])
            ->sum('amount');

        // Add fixed monthly costs (rent / mortgage interest) for the period
        $fixedCosts = $this->calcFixedCostsForPeriod($property, $from, $to);

        return $operatingExpenses + $fixedCosts;
    }

    private function calcFixedCostsForPeriod(Property $property, string $from, string $to): float
    {
        $months = max(1, Carbon::parse($from)->floatDiffInMonths(Carbon::parse($to)));

        return match ($property->ownership_model) {
            'rented' => (float) ($property->monthly_rent_cost * $months),
            'owned' => (float) ($property->mortgage_interest_monthly * $months),
            'partnership' => 0.0,
            default => 0.0,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BEP Calculation (all-time)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return array{total_capital: int, cumulative_profit: float, bep_pct: float, avg_monthly_profit: float, remaining_months: float, months_since_start: int, all_time_income: float, all_time_expense: float, ownership_model: string}
     */
    private function calcBep(Property $property): array
    {
        $allTimeIncome = (float) Income::where('property_id', $property->id)->sum('amount');
        $allTimeExpense = (float) PropertyExpense::where('property_id', $property->id)->sum('amount');

        $firstTxDate = Income::where('property_id', $property->id)->min('income_date')
            ?? optional($property->created_at)->toDateString()
            ?? now()->toDateString();
        $monthsSinceStart = max(1, round(Carbon::parse($firstTxDate)->diffInMonths(now())));

        // Running fixed cost all-time
        $allTimeFixed = match ($property->ownership_model) {
            'rented' => (float) ($property->monthly_rent_cost * $monthsSinceStart),
            'owned' => (float) ($property->mortgage_interest_monthly * $monthsSinceStart),
            default => 0.0,
        };

        $cumulativeProfit = $allTimeIncome - $allTimeExpense - $allTimeFixed;
        $capital = (int) ($property->initial_build_capital + $property->lease_capital);
        $bepPct = $capital > 0 ? round(($cumulativeProfit / $capital) * 100, 2) : 0;
        $avgMonthly = $monthsSinceStart > 0 ? round($cumulativeProfit / $monthsSinceStart, 0) : 0;
        $remainingMonths = ($avgMonthly > 0 && $cumulativeProfit < $capital)
            ? round(($capital - $cumulativeProfit) / $avgMonthly, 1)
            : 0;

        return [
            'total_capital' => $capital,
            'initial_build_capital' => (int) $property->initial_build_capital,
            'lease_capital' => (int) $property->lease_capital,
            'cumulative_profit' => (float) $cumulativeProfit,
            'bep_pct' => $bepPct,
            'avg_monthly_profit' => (float) $avgMonthly,
            'remaining_months' => $remainingMonths,
            'months_since_start' => (int) $monthsSinceStart,
            'all_time_income' => $allTimeIncome,
            'all_time_expense' => $allTimeExpense,
            'ownership_model' => $property->ownership_model ?? 'rented',
            'monthly_rent_cost' => (int) $property->monthly_rent_cost,
            'mortgage_interest_monthly' => (int) $property->mortgage_interest_monthly,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DB-Agnostic Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Return the correct SQL expression for grouping dates by month (YYYY-MM),
     * compatible with both MySQL/MariaDB and SQLite.
     */
    private function dateGroupExpr(string $column): string
    {
        $driver = \DB::getDriverName();

        return $driver === 'sqlite'
            ? "strftime('%Y-%m', {$column})"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Monthly Trend (revenue, expense, profit, occupancy, bookings)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return list<array{month: string, month_label: string, revenue: float, expense: float, profit: float, occupancy: float, bookings: int}>
     */
    private function buildMonthlyTrend(Property $property, string $from, string $to): array
    {
        $start = Carbon::parse($from)->startOfMonth();
        $end = Carbon::parse($to)->endOfMonth();

        // Pre-fetch daily revenues night-by-night
        $ymExprDaily = $this->dateGroupExpr('tanggal');
        $dailyRevenues = BookingDailyRevenue::where('property_id', $property->id)
            ->whereBetween('tanggal', [$start, $end])
            ->confirmedBookings()
            ->selectRaw("{$ymExprDaily} as ym, SUM(amount) as total")
            ->groupBy('ym')
            ->pluck('total', 'ym');

        // Pre-fetch other non-booking incomes
        $ymExprIncome = $this->dateGroupExpr('income_date');
        $otherIncomes = Income::where('property_id', $property->id)
            ->whereBetween('income_date', [$start, $end])
            ->where('source', '!=', 'booking')
            ->selectRaw("{$ymExprIncome} as ym, SUM(amount) as total")
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $ymExprExpense = $this->dateGroupExpr('expense_date');
        $expenses = PropertyExpense::where('property_id', $property->id)
            ->whereBetween('expense_date', [$start, $end])
            ->selectRaw("{$ymExprExpense} as ym, SUM(amount) as total")
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $ymExprBooking = $this->dateGroupExpr('check_in');
        $bookings = Booking::where('property_id', $property->id)
            ->confirmedBookings()
            ->whereBetween('check_in', [$start, $end])
            ->selectRaw("{$ymExprBooking} as ym, COUNT(*) as count, SUM(nights) as total_nights")
            ->groupBy('ym')
            ->get()
            ->keyBy('ym');

        $trend = [];
        $current = $start->copy();

        while ($current->lte($end)) {
            $ym = $current->format('Y-m');
            $daysInMonth = $current->daysInMonth;

            $revenue = (float) (($dailyRevenues[$ym] ?? 0) + ($otherIncomes[$ym] ?? 0));
            $opExpense = (float) ($expenses[$ym] ?? 0);
            $fixedExpense = $this->calcFixedCostsForPeriod($property, $current->startOfMonth()->toDateString(), $current->endOfMonth()->toDateString());
            $expense = $opExpense + $fixedExpense;
            $bookedNights = (int) ($bookings[$ym]?->total_nights ?? 0);
            $occupancy = $daysInMonth > 0 ? round(($bookedNights / $daysInMonth) * 100, 1) : 0;

            $trend[] = [
                'month' => $ym,
                'month_label' => $current->format('M Y'),
                'revenue' => $revenue,
                'expense' => $expense,
                'profit' => $revenue - $expense,
                'occupancy' => $occupancy,
                'bookings' => (int) ($bookings[$ym]?->count ?? 0),
            ];

            $current->addMonth()->startOfMonth();
        }

        return $trend;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Expense Breakdown by Category
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return list<array{category: string, label: string, amount: float, pct: float}>
     */
    private function buildExpenseBreakdown(Property $property, string $from, string $to): array
    {
        $rows = PropertyExpense::where('property_id', $property->id)
            ->whereBetween('expense_date', [$from, $to])
            ->selectRaw('expense_category, SUM(amount) as total')
            ->groupBy('expense_category')
            ->orderByDesc('total')
            ->get();

        $total = $rows->sum('total');

        $labels = [
            'maintenance' => 'Pemeliharaan',
            'utilities' => 'Utilitas',
            'supplies' => 'Perlengkapan',
            'marketing' => 'Marketing',
            'insurance' => 'Asuransi',
            'taxes' => 'Pajak',
            'professional_services' => 'Jasa Profesional',
            'other' => 'Lainnya',
        ];

        return $rows->map(fn ($r) => [
            'category' => $r->expense_category,
            'label' => $labels[$r->expense_category] ?? ucfirst($r->expense_category),
            'amount' => (float) $r->total,
            'pct' => $total > 0 ? round(($r->total / $total) * 100, 1) : 0,
        ])->values()->all();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Revenue Breakdown by Source
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return list<array{source: string, label: string, amount: float, pct: float}>
     */
    private function buildRevenueBreakdown(Property $property, string $from, string $to): array
    {
        // Lodging & extra beds revenue strictly by nightly breakdown
        $dailyRevenue = (float) BookingDailyRevenue::where('property_id', $property->id)
            ->whereBetween('tanggal', [$from, $to])
            ->confirmedBookings()
            ->sum('amount');

        // Other sources
        $otherRows = Income::where('property_id', $property->id)
            ->whereBetween('income_date', [$from, $to])
            ->where('source', '!=', 'booking')
            ->selectRaw('source, SUM(amount) as total')
            ->groupBy('source')
            ->get();

        $rows = collect([
            (object) ['source' => 'booking', 'total' => $dailyRevenue],
        ]);

        foreach ($otherRows as $row) {
            $rows->push($row);
        }

        $rows = $rows->sortByDesc('total');
        $total = $rows->sum('total');

        $labels = [
            'booking' => 'Booking Langsung',
            'extra_service' => 'Layanan Tambahan',
            'laundry' => 'Laundry',
            'catering' => 'Catering',
            'other' => 'Lainnya',
        ];

        return $rows->map(fn ($r) => [
            'source' => $r->source,
            'label' => $labels[$r->source] ?? ucfirst(str_replace('_', ' ', $r->source ?? 'other')),
            'amount' => (float) $r->total,
            'pct' => $total > 0 ? round(($r->total / $total) * 100, 1) : 0,
        ])->values()->all();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Booking Source Analysis
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return list<array{source: string, label: string, count: int, revenue: float, pct_count: float}>
     */
    private function buildBookingSources(Property $property, string $from, string $to): array
    {
        $rows = Booking::where('property_id', $property->id)
            ->confirmedBookings()
            ->whereBetween('check_in', [$from, $to])
            ->selectRaw('COALESCE(source, "direct") as source, COUNT(*) as count, SUM(total_amount) as revenue')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get();

        $totalCount = $rows->sum('count');

        $labels = [
            'direct' => 'Direct',
            'airbnb' => 'Airbnb',
            'booking_com' => 'Booking.com',
            'traveloka' => 'Traveloka',
            'whatsapp' => 'WhatsApp',
            'website' => 'Website',
            'other' => 'Lainnya',
        ];

        return $rows->map(fn ($r) => [
            'source' => $r->source,
            'label' => $labels[$r->source] ?? ucfirst($r->source),
            'count' => (int) $r->count,
            'revenue' => (float) $r->revenue,
            'pct_count' => $totalCount > 0 ? round(($r->count / $totalCount) * 100, 1) : 0,
        ])->values()->all();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Owner / Investor Split
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return array{owner_pct: float, investor_pct: float, owner_amount: float, investor_amount: float}|null
     */
    private function calcOwnerSplit(Property $property, float $netProfit): ?array
    {
        if ($property->ownership_model !== 'partnership') {
            return null;
        }

        $ownerPct = (float) ($property->owner_split_pct ?? 100);
        $investorPct = (float) ($property->investor_split_pct ?? 0);
        $ownerAmt = round($netProfit * ($ownerPct / 100), 0);
        $investorAmt = round($netProfit * ($investorPct / 100), 0);

        return [
            'owner_pct' => $ownerPct,
            'investor_pct' => $investorPct,
            'owner_amount' => (float) $ownerAmt,
            'investor_amount' => (float) $investorAmt,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Top Bookings
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return list<array>
     */
    private function topBookings(Property $property, string $from, string $to): array
    {
        return Booking::where('property_id', $property->id)
            ->confirmedBookings()
            ->whereBetween('check_in', [$from, $to])
            ->orderByDesc('total_amount')
            ->limit(10)
            ->get(['booking_number', 'guest_name', 'check_in', 'check_out', 'nights', 'total_amount', 'payment_status', 'booking_status', 'source'])
            ->map(fn ($b) => [
                'booking_number' => $b->booking_number,
                'guest_name' => $b->guest_name,
                'check_in' => $b->check_in instanceof \DateTimeInterface ? $b->check_in->format('Y-m-d') : $b->check_in,
                'check_out' => $b->check_out instanceof \DateTimeInterface ? $b->check_out->format('Y-m-d') : $b->check_out,
                'nights' => (int) $b->nights,
                'total_amount' => (float) $b->total_amount,
                'payment_status' => $b->payment_status,
                'booking_status' => $b->booking_status,
                'source' => $b->source,
            ])
            ->values()
            ->all();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Occupancy Summary
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return array{rate_pct: float, booked_nights: int, available_nights: int}
     */
    private function calcOccupancy(Property $property, string $from, string $to): array
    {
        $start = Carbon::parse($from);
        $end = Carbon::parse($to);
        $availableNights = (int) $start->diffInDays($end);

        $bookedNights = (int) Booking::where('property_id', $property->id)
            ->confirmedBookings()
            ->whereBetween('check_in', [$from, $to])
            ->sum('nights');

        $rate = $availableNights > 0 ? round(($bookedNights / $availableNights) * 100, 1) : 0;

        return [
            'rate_pct' => $rate,
            'booked_nights' => $bookedNights,
            'available_nights' => $availableNights,
        ];
    }
}

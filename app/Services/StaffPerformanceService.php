<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Services\Payroll\StaffBonusAggregatorService;

class StaffPerformanceService
{
    public function __construct(
        protected StaffBonusAggregatorService $bonusAggregator
    ) {}

    /**
     * Calculate and finalize monthly performance bonuses for eligible roles (Housekeeping & Front Office).
     */
    public function calculateAndSaveMonthlyBonuses(int $month, int $year, array $rates = [], bool $finalize = true, ?User $finalizer = null): array
    {
        return $this->bonusAggregator->calculateAndSaveBonuses($month, $year, $rates, $finalize, $finalizer);
    }

    /**
     * Get finalized bonus records for a given month and year.
     */
    public function getFinalizedBonusesForMonth(int $month, int $year): array
    {
        return $this->bonusAggregator->getBonusesForMonth($month, $year, true);
    }

    /**
     * Get all bonus records for a given month and year (finalized or draft).
     */
    public function getBonusesForMonth(int $month, int $year): array
    {
        return $this->bonusAggregator->getBonusesForMonth($month, $year, false);
    }
}

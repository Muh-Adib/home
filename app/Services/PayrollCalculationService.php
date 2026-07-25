<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use App\Models\PropertyExpense;
use App\Models\StaffPayroll;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollCalculationService
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected StaffPerformanceService $performanceService,
        protected WalletService $walletService
    ) {}

    /**
     * Calculate dynamic payroll rows for all active staff in a target month/year.
     */
    public function calculateDynamicPayroll(int $month, int $year, array $rates = []): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();
        $daysInMonth = $endDate->day;

        $lateDeductionRate = (float) ($rates['late_deduction_rate'] ?? 20000);
        $standbyRate = (float) ($rates['standby_rate'] ?? 50000);
        $overtimeRate = (float) ($rates['overtime_rate'] ?? 25000);
        $absentDeductionRate = (float) ($rates['absent_deduction_rate'] ?? 100000);
        $sickDeductionRate = (float) ($rates['sick_deduction_rate'] ?? 50000);
        $permissionDeductionRate = (float) ($rates['permission_deduction_rate'] ?? 75000);

        $defaultSalaries = [
            'super_admin' => 5000000.0,
            'property_manager' => 4500000.0,
            'finance' => 4000000.0,
            'front_desk' => 3000000.0,
            'housekeeping' => 2500000.0,
        ];

        // Fetch staff
        $staff = User::withTrashed()
            ->where('role', '!=', 'guest')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where('created_at', '<=', $endDate)
                    ->where(function ($sub) use ($startDate) {
                        $sub->whereNull('deleted_at')
                            ->orWhere('deleted_at', '>=', $startDate);
                    });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'status', 'fingerprint_id', 'shift_start_time', 'shift_end_time', 'base_salary', 'created_at', 'deleted_at']);

        // Fetch finalized performance bonuses
        $finalizedBonuses = $this->performanceService->getFinalizedBonusesForMonth($month, $year);

        // Fetch stored active payrolls
        $activePayrolls = StaffPayroll::where('month', $month)
            ->where('year', $year)
            ->where('is_active', true)
            ->get()
            ->keyBy('user_id');

        $payrolls = [];

        foreach ($staff as $s) {
            $existing = $activePayrolls->get($s->id);

            // Active employment days & proration
            $activeDays = 0;
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $dateCarbon = Carbon::create($year, $month, $d);
                if ($dateCarbon->lt(Carbon::parse($s->created_at)->startOfDay())) {
                    continue;
                }
                if ($s->deleted_at && $dateCarbon->gt(Carbon::parse($s->deleted_at)->endOfDay())) {
                    continue;
                }
                if ($dateCarbon->dayOfWeek !== Carbon::SUNDAY) {
                    $activeDays++;
                }
            }

            $prorationFactor = min(1.0, $activeDays / 26.0);
            $originalBaseSalary = (float) ($s->base_salary > 0 ? $s->base_salary : ($defaultSalaries[$s->role] ?? 2000000.0));
            $baseSalary = round($originalBaseSalary * $prorationFactor);

            // Attendance metrics
            $attSummary = $this->attendanceService->getMonthlyAttendanceSummary($s->id, $month, $year);

            // Bonus metrics from Staff Performance module
            $bonusRecord = $finalizedBonuses[$s->id] ?? null;
            $hkBonus = (float) ($bonusRecord?->housekeeping_bonus ?? 0.0);
            $fdFirstNightBonus = (float) ($bonusRecord?->frontdesk_first_night_bonus ?? 0.0);
            $fdNextNightsShare = (float) ($bonusRecord?->frontdesk_next_nights_bonus_share ?? 0.0);
            $performanceBonus = (float) ($bonusRecord?->kpi_performance_bonus ?? 0.0);

            // Deductions & Allowances
            $lateHours = (float) $attSummary['late_hours'];
            $overtimeHours = (float) $attSummary['overtime_hours'];
            $standbyNights = (int) $attSummary['standby_nights'];
            $absentDays = (int) $attSummary['absent_days'];
            $sickDays = (int) $attSummary['sick_days'];
            $permissionDays = (int) $attSummary['permission_days'];

            $lateDeduction = $lateHours * $lateDeductionRate;
            $absentDeduction = $absentDays * $absentDeductionRate;
            $sickDeduction = $sickDays * $sickDeductionRate;
            $permissionDeduction = $permissionDays * $permissionDeductionRate;
            $overtimeBonus = $overtimeHours * $overtimeRate;
            $standbyBonus = $standbyNights * $standbyRate;

            // Custom manual adjustments
            $customAllowance = (float) ($existing?->custom_allowance ?? 0.0);
            $customDeduction = (float) ($existing?->custom_deduction ?? 0.0);
            $customAllowanceReason = $existing?->custom_allowance_reason ?? '';
            $customDeductionReason = $existing?->custom_deduction_reason ?? '';

            // Casbon loans
            $activeLoans = EmployeeLoan::where('employee_id', $s->id)->where('status', 'active')->get();
            $outstandingLoans = 0.0;
            $loansDetails = [];

            foreach ($activeLoans as $loan) {
                $repaid = $loan->payments()->sum('amount');
                $rem = max(0.0, (float) $loan->amount - (float) $repaid);
                $outstandingLoans += $rem;
                $loansDetails[] = [
                    'id' => $loan->id,
                    'amount' => (float) $loan->amount,
                    'disbursed_at' => $loan->disbursed_at->toDateString(),
                    'outstanding' => $rem,
                    'notes' => $loan->notes,
                ];
            }

            $suggestedLoanDeduction = min($outstandingLoans, $baseSalary * 0.2);

            if ($existing) {
                $payrolls[] = [
                    'id' => $existing->id,
                    'user_id' => $s->id,
                    'name' => $s->name,
                    'role' => $s->role,
                    'fingerprint_id' => $s->fingerprint_id,
                    'version' => $existing->version,
                    'batch_id' => $existing->batch_id,
                    'base_salary' => (float) $existing->base_salary,
                    'attendance_days' => $existing->attendance_days,
                    'absent_days' => $existing->absent_days,
                    'sick_days' => $existing->sick_days,
                    'sick_deduction' => (float) $existing->sick_deduction,
                    'permission_days' => $existing->permission_days,
                    'permission_deduction' => (float) $existing->permission_deduction,
                    'absent_deduction' => (float) $existing->absent_deduction,
                    'late_days' => $existing->late_days,
                    'late_hours' => (float) $existing->late_hours,
                    'standby_nights' => $existing->standby_nights,
                    'late_deduction' => (float) $existing->late_deduction,
                    'loan_deduction' => (float) $existing->loan_deduction,
                    'housekeeping_bonus' => (float) $existing->housekeeping_bonus,
                    'standby_bonus' => (float) $existing->standby_bonus,
                    'frontdesk_first_night_bonus' => (float) $existing->frontdesk_first_night_bonus,
                    'frontdesk_next_nights_bonus_share' => (float) $existing->frontdesk_next_nights_bonus_share,
                    'performance_bonus' => (float) $existing->performance_bonus,
                    'custom_allowance' => $customAllowance,
                    'custom_deduction' => $customDeduction,
                    'custom_allowance_reason' => $customAllowanceReason,
                    'custom_deduction_reason' => $customDeductionReason,
                    'overtime_hours' => (float) $existing->overtime_hours,
                    'overtime_bonus' => (float) $existing->overtime_bonus,
                    'holiday_days' => $existing->holiday_days,
                    'total_salary' => (float) $existing->total_salary,
                    'status' => $existing->status,
                    'paid_at' => $existing->paid_at ? $existing->paid_at->toIso8601String() : null,
                    'approved_at' => $existing->approved_at ? $existing->approved_at->toIso8601String() : null,
                    'notes' => $existing->notes,
                    'outstanding_loans' => $outstandingLoans,
                    'stored' => true,
                    'expense_id' => $existing->expense_id,
                    'original_base_salary' => $originalBaseSalary,
                    'prorated' => $prorationFactor < 1.0,
                    'active_employment_days' => $activeDays,
                    'bonus_finalized' => (bool) $bonusRecord,
                    'kpi_details' => $existing->kpi_details ?? ($bonusRecord?->details['kpi'] ?? []),
                    'points_details' => $existing->points_details ?? ($bonusRecord?->details['housekeeping_points'] ?? []),
                    'loans_details' => $existing->loans_details ?? $loansDetails,
                    'attendance_summary' => $existing->attendance_summary ?? $attSummary,
                ];
            } else {
                $totalBonuses = $hkBonus + $standbyBonus + $fdFirstNightBonus + $fdNextNightsShare + $performanceBonus + $overtimeBonus + $customAllowance;
                $totalDeductions = $lateDeduction + $suggestedLoanDeduction + $sickDeduction + $permissionDeduction + $absentDeduction + $customDeduction;
                $totalSalary = max(0.0, $baseSalary + $totalBonuses - $totalDeductions);

                $payrolls[] = [
                    'id' => null,
                    'user_id' => $s->id,
                    'name' => $s->name,
                    'role' => $s->role,
                    'fingerprint_id' => $s->fingerprint_id,
                    'version' => 1,
                    'batch_id' => null,
                    'base_salary' => $baseSalary,
                    'attendance_days' => $attSummary['present_days'],
                    'absent_days' => $absentDays,
                    'sick_days' => $sickDays,
                    'sick_deduction' => $sickDeduction,
                    'permission_days' => $permissionDays,
                    'permission_deduction' => $permissionDeduction,
                    'absent_deduction' => $absentDeduction,
                    'late_days' => $attSummary['late_days'],
                    'late_hours' => $lateHours,
                    'standby_nights' => $standbyNights,
                    'late_deduction' => $lateDeduction,
                    'loan_deduction' => $suggestedLoanDeduction,
                    'housekeeping_bonus' => $hkBonus,
                    'standby_bonus' => $standbyBonus,
                    'frontdesk_first_night_bonus' => $fdFirstNightBonus,
                    'frontdesk_next_nights_bonus_share' => $fdNextNightsShare,
                    'performance_bonus' => $performanceBonus,
                    'custom_allowance' => $customAllowance,
                    'custom_deduction' => $customDeduction,
                    'custom_allowance_reason' => $customAllowanceReason,
                    'custom_deduction_reason' => $customDeductionReason,
                    'overtime_hours' => $overtimeHours,
                    'overtime_bonus' => $overtimeBonus,
                    'holiday_days' => $attSummary['holiday_days'],
                    'total_salary' => $totalSalary,
                    'status' => 'draft',
                    'paid_at' => null,
                    'approved_at' => null,
                    'notes' => '',
                    'outstanding_loans' => $outstandingLoans,
                    'stored' => false,
                    'expense_id' => null,
                    'original_base_salary' => $originalBaseSalary,
                    'prorated' => $prorationFactor < 1.0,
                    'active_employment_days' => $activeDays,
                    'bonus_finalized' => (bool) $bonusRecord,
                    'kpi_details' => $bonusRecord?->details['kpi'] ?? [],
                    'points_details' => $bonusRecord?->details['housekeeping_points'] ?? [],
                    'loans_details' => $loansDetails,
                    'attendance_summary' => $attSummary,
                ];
            }
        }

        return $payrolls;
    }

    /**
     * Store or Regenerate Payroll records with Snapshot Versioning.
     */
    public function storePayrollBatch(int $month, int $year, array $payrollsData, ?int $walletId, User $creator, bool $replaceExisting = false): string
    {
        $batchId = (string) Str::uuid();

        DB::transaction(function () use ($month, $year, $payrollsData, $creator, $replaceExisting, $batchId) {
            // Find current max version
            $maxVersion = (int) StaffPayroll::where('month', $month)->where('year', $year)->max('version') ?: 0;
            $newVersion = $replaceExisting ? ($maxVersion + 1) : max(1, $maxVersion);

            if ($replaceExisting && $maxVersion > 0) {
                // Archive previous active version
                StaffPayroll::where('month', $month)
                    ->where('year', $year)
                    ->where('is_active', true)
                    ->update([
                        'is_active' => false,
                        'status' => 'archived',
                    ]);
            }

            foreach ($payrollsData as $row) {
                $base = (float) $row['base_salary'];
                $totalSalary = (float) $row['total_salary'];
                $loanDeduction = (float) $row['loan_deduction'];
                $customAllowance = (float) ($row['custom_allowance'] ?? 0);
                $customDeduction = (float) ($row['custom_deduction'] ?? 0);

                $allowanceDetails = [
                    'housekeeping_bonus' => (float) ($row['housekeeping_bonus'] ?? 0),
                    'standby_bonus' => (float) ($row['standby_bonus'] ?? 0),
                    'frontdesk_first_night_bonus' => (float) ($row['frontdesk_first_night_bonus'] ?? 0),
                    'frontdesk_next_nights_bonus_share' => (float) ($row['frontdesk_next_nights_bonus_share'] ?? 0),
                    'performance_bonus' => (float) ($row['performance_bonus'] ?? 0),
                    'overtime_bonus' => (float) ($row['overtime_bonus'] ?? 0),
                    'custom_allowance' => $customAllowance,
                    'custom_allowance_reason' => $row['custom_allowance_reason'] ?? '',
                ];

                $deductionDetails = [
                    'late_deduction' => (float) ($row['late_deduction'] ?? 0),
                    'loan_deduction' => $loanDeduction,
                    'sick_deduction' => (float) ($row['sick_deduction'] ?? 0),
                    'permission_deduction' => (float) ($row['permission_deduction'] ?? 0),
                    'absent_deduction' => (float) ($row['absent_deduction'] ?? 0),
                    'custom_deduction' => $customDeduction,
                    'custom_deduction_reason' => $row['custom_deduction_reason'] ?? '',
                ];

                $status = $row['status'] ?? 'generated';
                if ($status === 'draft') {
                    $status = 'generated';
                }

                StaffPayroll::create([
                    'user_id' => $row['user_id'],
                    'month' => $month,
                    'year' => $year,
                    'batch_id' => $batchId,
                    'version' => $newVersion,
                    'is_active' => true,
                    'base_salary' => $base,
                    'attendance_days' => $row['attendance_days'],
                    'absent_days' => $row['absent_days'],
                    'sick_days' => $row['sick_days'],
                    'sick_deduction' => $row['sick_deduction'],
                    'permission_days' => $row['permission_days'],
                    'permission_deduction' => $row['permission_deduction'],
                    'absent_deduction' => $row['absent_deduction'],
                    'late_days' => $row['late_days'],
                    'late_hours' => $row['late_hours'],
                    'standby_nights' => $row['standby_nights'],
                    'late_deduction' => $row['late_deduction'],
                    'loan_deduction' => $loanDeduction,
                    'housekeeping_bonus' => $row['housekeeping_bonus'],
                    'standby_bonus' => $row['standby_bonus'],
                    'frontdesk_first_night_bonus' => $row['frontdesk_first_night_bonus'],
                    'frontdesk_next_nights_bonus_share' => $row['frontdesk_next_nights_bonus_share'],
                    'performance_bonus' => $row['performance_bonus'] ?? 0,
                    'custom_allowance' => $customAllowance,
                    'custom_deduction' => $customDeduction,
                    'custom_allowance_reason' => $row['custom_allowance_reason'] ?? null,
                    'custom_deduction_reason' => $row['custom_deduction_reason'] ?? null,
                    'overtime_hours' => $row['overtime_hours'],
                    'overtime_bonus' => $row['overtime_bonus'],
                    'holiday_days' => $row['holiday_days'],
                    'total_salary' => $totalSalary,
                    'status' => $status,
                    'notes' => $row['notes'] ?? null,
                    'created_by' => $creator->id,
                    'kpi_details' => $row['kpi_details'] ?? null,
                    'points_details' => $row['points_details'] ?? null,
                    'loans_details' => $row['loans_details'] ?? null,
                    'attendance_summary' => $row['attendance_summary'] ?? null,
                    'allowance_details' => $allowanceDetails,
                    'deduction_details' => $deductionDetails,
                ]);
            }
        });

        return $batchId;
    }

    /**
     * Approve active payroll batch for a month/year.
     */
    public function approvePayrollBatch(int $month, int $year, User $approver): bool
    {
        return (bool) StaffPayroll::where('month', $month)
            ->where('year', $year)
            ->where('is_active', true)
            ->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $approver->id,
            ]);
    }

    /**
     * Mark active payroll batch as Paid, record loan payments, and issue Wallet PropertyExpense.
     */
    public function payPayrollBatch(int $month, int $year, int $walletId, User $payer): bool
    {
        return DB::transaction(function () use ($month, $year, $walletId, $payer) {
            $activePayrolls = StaffPayroll::where('month', $month)
                ->where('year', $year)
                ->where('is_active', true)
                ->get();

            if ($activePayrolls->isEmpty()) {
                return false;
            }

            foreach ($activePayrolls as $payroll) {
                if ($payroll->status === 'paid') {
                    continue; // Skip already paid
                }

                $loanDeduction = (float) $payroll->loan_deduction;
                $totalSalary = (float) $payroll->total_salary;

                // 1. Process Loan Repayments
                if ($loanDeduction > 0) {
                    $loans = EmployeeLoan::where('employee_id', $payroll->user_id)
                        ->where('status', 'active')
                        ->orderBy('disbursed_at', 'asc')
                        ->get();

                    $remainingDeduction = $loanDeduction;

                    foreach ($loans as $loan) {
                        if ($remainingDeduction <= 0) {
                            break;
                        }

                        $repaid = $loan->payments()->sum('amount');
                        $outstanding = max(0.0, (float) $loan->amount - (float) $repaid);

                        if ($outstanding > 0) {
                            $paymentAmount = min($outstanding, $remainingDeduction);

                            EmployeeLoanPayment::create([
                                'employee_loan_id' => $loan->id,
                                'amount' => $paymentAmount,
                                'paid_at' => now(),
                                'notes' => "Dipotong otomatis dari gaji versi {$payroll->version} bulan {$month}/{$year}",
                                'created_by' => $payer->id,
                            ]);

                            if (($repaid + $paymentAmount) >= $loan->amount) {
                                $loan->update(['status' => 'paid']);
                            }

                            $remainingDeduction -= $paymentAmount;
                        }
                    }
                }

                // 2. Create PropertyExpense & WalletTransaction
                $empUser = $payroll->user;
                $expense = PropertyExpense::create([
                    'property_id' => null,
                    'expense_scope' => 'operational',
                    'expense_category' => 'salary',
                    'expense_type' => 'fixed',
                    'description' => "Gaji Karyawan: {$empUser?->name} - Periode {$month}/{$year} (v{$payroll->version})",
                    'amount' => $totalSalary,
                    'expense_date' => now()->toDateString(),
                    'payment_method' => 'cash',
                    'wallet_id' => $walletId,
                    'status' => 'approved',
                    'recorded_by' => $payer->id,
                    'approved_by' => $payer->id,
                ]);

                WalletTransaction::create([
                    'wallet_id' => $walletId,
                    'direction' => 'out',
                    'amount' => $totalSalary,
                    'category' => 'expense',
                    'transaction_date' => now()->toDateString(),
                    'description' => "Bayar Gaji: {$empUser?->name} - Periode {$month}/{$year} (v{$payroll->version})",
                    'reference_type' => PropertyExpense::class,
                    'reference_id' => $expense->id,
                ]);

                $payroll->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'expense_id' => $expense->id,
                ]);
            }

            // Recalculate wallet balance
            $this->walletService->recalculateBalance($walletId);

            return true;
        });
    }
}

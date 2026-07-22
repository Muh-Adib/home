<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use App\Models\PropertyExpense;
use App\Models\StaffPayroll;
use App\Models\StaffShift;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\HousekeepingPointService;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class PayrollController extends Controller
{
    /**
     * Display payroll list & calculation dashboard
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        // 1. Get staff list (non-guests) active in this period (including soft deleted)
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
            ->get(['id', 'name', 'role', 'status', 'fingerprint_id', 'shift_start_time', 'shift_end_time', 'base_salary', 'holiday_quota', 'created_at', 'deleted_at']);

        // 2. Fetch existing stored payrolls
        $storedPayrolls = StaffPayroll::where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('user_id');

        // Rates (configurable from query parameters, with standard defaults)
        $firstNightRate = (float) $request->input('first_night_rate', 15000);
        $nextNightRate = (float) $request->input('next_night_rate', 5000);
        $housekeepingRatePerPoint = (float) $request->input('housekeeping_rate_per_point', 1000);
        $lateDeductionRate = (float) $request->input('late_deduction_rate', 20000); // late per hour
        $standbyRate = (float) $request->input('standby_rate', 50000);
        $overtimeRate = (float) $request->input('overtime_rate', 25000); // overtime per hour
        $absentDeductionRate = (float) $request->input('absent_deduction_rate', 100000); // absent per day
        $sickDeductionRate = (float) $request->input('sick_deduction_rate', 50000); // sick per day
        $permissionDeductionRate = (float) $request->input('permission_deduction_rate', 75000); // permission per day

        // Performance KPI rates
        $followUpRate = (float) $request->input('follow_up_rate', 5000);
        $creationRate = (float) $request->input('creation_rate', 5000);
        $closingRate = (float) $request->input('closing_rate', 15000);
        $checkInRate = (float) $request->input('check_in_rate', 10000);
        $commissionPercent = (float) $request->input('commission_percent', 0.5);
        $housekeepingPoolPercentage = (float) $request->input('housekeeping_pool_percentage', 5.0);

        // Default base salaries based on roles (if not set in user profile)
        $defaultSalaries = [
            'super_admin' => 5000000.0,
            'property_manager' => 4500000.0,
            'finance' => 4000000.0,
            'front_desk' => 3000000.0,
            'housekeeping' => 2500000.0,
        ];

        // 3. Compute dynamic live bonuses for Frontdesk in the selected month
        $frontdesks = $staff->where('role', 'front_desk');
        $frontdeskCount = $frontdesks->count();

        // Get confirmed bookings closed or created in this period
        $bookings = Booking::whereBetween('created_at', [$startDate, $endDate])
            ->where('booking_status', '!=', 'cancelled')
            ->get(['id', 'booking_number', 'check_in', 'check_out', 'closed_by', 'created_by']);

        $firstNightBonuses = [];
        $firstNightCounts = [];
        $totalNextNightsPool = 0;
        $totalNextNightsCount = 0;

        foreach ($bookings as $booking) {
            $nights = $booking->check_in && $booking->check_out
                ? (int) Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out))
                : 1;

            if ($nights < 1) {
                $nights = 1;
            }

            // Combine closing and input
            $closerId = $booking->closed_by ?? $booking->created_by;

            if ($closerId) {
                if (! isset($firstNightBonuses[$closerId])) {
                    $firstNightBonuses[$closerId] = 0;
                    $firstNightCounts[$closerId] = 0;
                }
                $firstNightBonuses[$closerId] += $firstNightRate;
                $firstNightCounts[$closerId] += 1;
            }

            if ($nights > 1) {
                $totalNextNightsPool += ($nights - 1) * $nextNightRate;
                $totalNextNightsCount += ($nights - 1);
            }
        }

        $sharedNextNightsBonus = $frontdeskCount > 0 ? ($totalNextNightsPool / $frontdeskCount) : 0;

        // Fetch KPI counts in bulk for this month
        $followUpsCounts = Booking::selectRaw('followed_up_by, COUNT(*) as count')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('followed_up_by')
            ->groupBy('followed_up_by')
            ->pluck('count', 'followed_up_by');

        $creationsCounts = Booking::selectRaw('created_by, COUNT(*) as count')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('created_by')
            ->groupBy('created_by')
            ->pluck('count', 'created_by');

        $closingsCounts = Booking::selectRaw('closed_by, COUNT(*) as count')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('closed_by')
            ->groupBy('closed_by')
            ->pluck('count', 'closed_by');

        $checkInsCounts = Booking::selectRaw('checked_in_by, COUNT(*) as count')
            ->whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
            ->whereNotNull('checked_in_by')
            ->groupBy('checked_in_by')
            ->pluck('count', 'checked_in_by');

        $dealsValues = Booking::selectRaw('closed_by, SUM(total_amount) as total')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('closed_by')
            ->groupBy('closed_by')
            ->pluck('total', 'closed_by');

        // Fetch daily custom shifts for all users for this month
        $shifts = StaffShift::whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->groupBy('user_id');

        // Fetch wallets for payroll source payment selection
        $wallets = Wallet::orderBy('name')->get(['id', 'name', 'balance']);

        // 4. Build payroll calculation data
        $payrolls = [];

        foreach ($staff as $s) {
            $existing = $storedPayrolls->get($s->id);

            // Housekeeping points & bonus using the new point system
            $pointService = app(HousekeepingPointService::class);
            $poolData = $pointService->getMonthlyPool($month, $year, $housekeepingPoolPercentage);
            $pointRate = $poolData['point_rate'];

            $pointsBreakdown = $pointService->getMonthlyPointsDetails($s->id, $month, $year);
            $resolvedPoints = $pointsBreakdown['total'];

            if ($s->role === 'housekeeping') {
                $housekeepingBonus = $resolvedPoints * $pointRate;
            } else {
                $housekeepingBonus = $resolvedPoints * $housekeepingRatePerPoint;
            }

            // Frontdesk specific bonuses
            $fdFirstNightBonus = $s->role === 'front_desk' ? ($firstNightBonuses[$s->id] ?? 0.0) : 0.0;
            $fdNextNightsShare = $s->role === 'front_desk' ? $sharedNextNightsBonus : 0.0;

            // Performance KPI calculation
            $followUps = $followUpsCounts->get($s->id, 0);
            $creations = $creationsCounts->get($s->id, 0);
            $closings = $closingsCounts->get($s->id, 0);
            $checkIns = $checkInsCounts->get($s->id, 0);
            $dealsValue = (float) $dealsValues->get($s->id, 0.0);

            $performanceBonus = 0.0;
            if (in_array($s->role, ['front_desk', 'property_manager', 'super_admin'])) {
                $performanceBonus = ($followUps * $followUpRate) +
                                     ($creations * $creationRate) +
                                     ($closings * $closingRate) +
                                     ($checkIns * $checkInRate) +
                                     ($dealsValue * $commissionPercent / 100.0);
            }

            $kpiDetails = [
                'follow_ups' => $followUps,
                'creations' => $creations,
                'closings' => $closings,
                'check_ins' => $checkIns,
                'deals_value' => $dealsValue,
                'rates' => [
                    'follow_up_rate' => $followUpRate,
                    'creation_rate' => $creationRate,
                    'closing_rate' => $closingRate,
                    'check_in_rate' => $checkInRate,
                    'commission_percent' => $commissionPercent,
                ],
            ];

            // Housekeeping points details
            $pointsDetails = [
                'routine' => $pointsBreakdown['routine'],
                'cleaning' => $pointsBreakdown['cleaning'],
                'damage' => $pointsBreakdown['damage'],
                'custom' => $pointsBreakdown['custom'],
                'total' => $pointsBreakdown['total'],
                'point_rate' => $pointRate,
            ];

            // Casbon (active outstanding loans)
            $activeLoans = EmployeeLoan::where('employee_id', $s->id)
                ->where('status', 'active')
                ->get();

            $outstandingLoanAmount = 0.0;
            foreach ($activeLoans as $loan) {
                $repaid = $loan->payments()->sum('amount');
                $outstandingLoanAmount += max(0.0, (float) $loan->amount - (float) $repaid);
            }

            $loansDetails = $activeLoans->map(function ($loan) {
                $repaid = $loan->payments()->sum('amount');

                return [
                    'id' => $loan->id,
                    'amount' => (float) $loan->amount,
                    'disbursed_at' => $loan->disbursed_at->toDateString(),
                    'outstanding' => max(0.0, (float) $loan->amount - (float) $repaid),
                    'notes' => $loan->notes,
                ];
            })->all();

            // Calculate active employment days and proration factor in the current month (mid-month joiners/leavers)
            $daysInMonth = Carbon::create($year, $month, 1)->endOfMonth()->day;
            $activeEmploymentDays = 0;
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $dateCarbon = Carbon::create($year, $month, $d);
                if ($dateCarbon->lt(Carbon::parse($s->created_at)->startOfDay())) {
                    continue;
                }
                if ($s->deleted_at && $dateCarbon->gt(Carbon::parse($s->deleted_at)->endOfDay())) {
                    continue;
                }
                if ($dateCarbon->dayOfWeek !== Carbon::SUNDAY) {
                    $activeEmploymentDays++;
                }
            }

            $prorationFactor = min(1.0, $activeEmploymentDays / 26.0);

            // Default values
            $originalBaseSalary = (float) ($s->base_salary > 0 ? $s->base_salary : ($defaultSalaries[$s->role] ?? 2000000.0));
            $baseSalary = (float) round($originalBaseSalary * $prorationFactor);
            $holidayQuota = $s->holiday_quota !== null ? $s->holiday_quota : 4;

            // If a stored payroll exists, use those values
            if ($existing) {
                $payrolls[] = [
                    'id' => $existing->id,
                    'user_id' => $s->id,
                    'name' => $s->name,
                    'role' => $s->role,
                    'fingerprint_id' => $s->fingerprint_id,
                    'shift_start_time' => $s->shift_start_time,
                    'shift_end_time' => $s->shift_end_time,
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
                    'performance_bonus' => (float) ($existing->performance_bonus ?? $performanceBonus),
                    'overtime_hours' => (float) $existing->overtime_hours,
                    'overtime_bonus' => (float) $existing->overtime_bonus,
                    'holiday_days' => $existing->holiday_days,
                    'total_salary' => (float) $existing->total_salary,
                    'status' => $existing->status,
                    'paid_at' => $existing->paid_at ? $existing->paid_at->toIso8601String() : null,
                    'notes' => $existing->notes,
                    'outstanding_loans' => $outstandingLoanAmount,
                    'stored' => true,
                    'holiday_quota' => $holidayQuota,
                    'expense_id' => $existing->expense_id,
                    'original_base_salary' => $originalBaseSalary,
                    'prorated' => $prorationFactor < 1.0,
                    'active_employment_days' => $activeEmploymentDays,
                    'hk_points' => (float) $resolvedPoints,
                    'first_nights_count' => $s->role === 'front_desk' ? ($firstNightCounts[$s->id] ?? 0) : 0,
                    'next_nights_pool_count' => $totalNextNightsCount,
                    'frontdesk_count' => $frontdeskCount,
                    'kpi_details' => $existing->kpi_details ?? $kpiDetails,
                    'points_details' => $existing->points_details ?? $pointsDetails,
                    'loans_details' => $existing->loans_details ?? $loansDetails,
                ];
            } else {
                // Compute live values
                $attendanceDays = min(26, $activeEmploymentDays);
                $absentDays = 0;
                $sickDays = 0;
                $sickDeduction = 0.0;
                $permissionDays = 0;
                $permissionDeduction = 0.0;
                $absentDeduction = 0.0;
                $lateDays = 0;
                $lateHours = 0.0;
                $standbyNights = 0;
                $lateDeduction = 0.0;
                $standbyBonus = 0.0;
                $overtimeHours = 0.0;
                $overtimeBonus = 0.0;
                $holidayDays = 0;

                $suggestedLoanDeduction = min($outstandingLoanAmount, $baseSalary * 0.2);

                $totalSalary = max(0.0, $baseSalary + $housekeepingBonus + $standbyBonus + $fdFirstNightBonus + $fdNextNightsShare + $performanceBonus + $overtimeBonus - $lateDeduction - $suggestedLoanDeduction);

                $payrolls[] = [
                    'id' => null,
                    'user_id' => $s->id,
                    'name' => $s->name,
                    'role' => $s->role,
                    'fingerprint_id' => $s->fingerprint_id,
                    'shift_start_time' => $s->shift_start_time,
                    'shift_end_time' => $s->shift_end_time,
                    'base_salary' => $baseSalary,
                    'attendance_days' => $attendanceDays,
                    'absent_days' => $absentDays,
                    'sick_days' => $sickDays,
                    'sick_deduction' => $sickDeduction,
                    'permission_days' => $permissionDays,
                    'permission_deduction' => $permissionDeduction,
                    'absent_deduction' => $absentDeduction,
                    'late_days' => $lateDays,
                    'late_hours' => $lateHours,
                    'standby_nights' => $standbyNights,
                    'late_deduction' => $lateDeduction,
                    'loan_deduction' => $suggestedLoanDeduction,
                    'housekeeping_bonus' => $housekeepingBonus,
                    'standby_bonus' => $standbyBonus,
                    'frontdesk_first_night_bonus' => $fdFirstNightBonus,
                    'frontdesk_next_nights_bonus_share' => $fdNextNightsShare,
                    'performance_bonus' => $performanceBonus,
                    'overtime_hours' => $overtimeHours,
                    'overtime_bonus' => $overtimeBonus,
                    'holiday_days' => $holidayDays,
                    'total_salary' => $totalSalary,
                    'status' => 'pending',
                    'paid_at' => null,
                    'notes' => '',
                    'outstanding_loans' => $outstandingLoanAmount,
                    'stored' => false,
                    'holiday_quota' => $holidayQuota,
                    'expense_id' => null,
                    'original_base_salary' => $originalBaseSalary,
                    'prorated' => $prorationFactor < 1.0,
                    'active_employment_days' => $activeEmploymentDays,
                    'hk_points' => (float) $resolvedPoints,
                    'first_nights_count' => $s->role === 'front_desk' ? ($firstNightCounts[$s->id] ?? 0) : 0,
                    'next_nights_pool_count' => $totalNextNightsCount,
                    'frontdesk_count' => $frontdeskCount,
                    'kpi_details' => $kpiDetails,
                    'points_details' => $pointsDetails,
                    'loans_details' => $loansDetails,
                ];
            }
        }

        // Get pool data again to pass to frontend
        $pointService = app(HousekeepingPointService::class);
        $poolData = $pointService->getMonthlyPool($month, $year, $housekeepingPoolPercentage);

        // Fetch shift details in monthly calendar format
        $userShifts = [];
        foreach ($staff as $s) {
            $userShifts[$s->id] = $shifts->get($s->id, collect())->map(function ($sh) {
                return [
                    'date' => $sh->date->toDateString(),
                    'shift_start_time' => $sh->shift_start_time,
                    'shift_end_time' => $sh->shift_end_time,
                    'is_off_day' => (bool) $sh->is_off_day,
                ];
            })->values()->all();
        }

        return Inertia::render('Admin/Finance/Payroll', [
            'payrolls' => $payrolls,
            'wallets' => $wallets,
            'userShifts' => $userShifts,
            'poolData' => [
                'eligible_turnover' => $poolData['eligible_turnover'],
                'total_pool' => $poolData['total_pool'],
                'total_points' => $poolData['total_points'],
                'point_rate' => $poolData['point_rate'],
            ],
            'filters' => [
                'month' => $month,
                'year' => $year,
                'first_night_rate' => $firstNightRate,
                'next_night_rate' => $nextNightRate,
                'housekeeping_rate_per_point' => $housekeepingRatePerPoint,
                'late_deduction_rate' => $lateDeductionRate,
                'standby_rate' => $standbyRate,
                'overtime_rate' => $overtimeRate,
                'absent_deduction_rate' => $absentDeductionRate,
                'sick_deduction_rate' => $sickDeductionRate,
                'permission_deduction_rate' => $permissionDeductionRate,
                'follow_up_rate' => $followUpRate,
                'creation_rate' => $creationRate,
                'closing_rate' => $closingRate,
                'check_in_rate' => $checkInRate,
                'commission_percent' => $commissionPercent,
                'housekeeping_pool_percentage' => $housekeepingPoolPercentage,
            ],
        ]);
    }

    /**
     * Update employee shift and wage settings
     */
    public function updateUserSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'fingerprint_id' => 'nullable|string|unique:users,fingerprint_id,'.$request->input('user_id'),
            'shift_start_time' => 'required|string',
            'shift_end_time' => 'required|string',
            'base_salary' => 'required|numeric|min:0',
            'holiday_quota' => 'required|integer|min:0',
        ]);

        $u = User::findOrFail($validated['user_id']);
        $u->update([
            'fingerprint_id' => $validated['fingerprint_id'],
            'shift_start_time' => $validated['shift_start_time'],
            'shift_end_time' => $validated['shift_end_time'],
            'base_salary' => $validated['base_salary'],
            'holiday_quota' => $validated['holiday_quota'],
        ]);

        return redirect()->back()->with('success', 'Pengaturan shift & gaji staff berhasil diperbarui.');
    }

    /**
     * Store employee daily shifts (calendar)
     */
    public function storeShifts(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'shifts' => 'required|array',
            'shifts.*.date' => 'required|date',
            'shifts.*.shift_start_time' => 'required|string',
            'shifts.*.shift_end_time' => 'required|string',
            'shifts.*.is_off_day' => 'required|boolean',
        ]);

        foreach ($validated['shifts'] as $shiftData) {
            StaffShift::updateOrCreate(
                [
                    'user_id' => $validated['user_id'],
                    'date' => $shiftData['date'],
                ],
                [
                    'shift_start_time' => $shiftData['shift_start_time'],
                    'shift_end_time' => $shiftData['shift_end_time'],
                    'is_off_day' => $shiftData['is_off_day'],
                ]
            );
        }

        return redirect()->back()->with('success', 'Jadwal shift harian staff berhasil disimpan.');
    }

    /**
     * Upload & Parse Fingerprint Attendance XLS/XLSX or CSV
     */
    public function uploadAttendance(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
            'month' => 'required|integer',
            'year' => 'required|integer',
            'late_deduction_rate' => 'required|numeric',
            'overtime_rate' => 'required|numeric',
            'standby_rate' => 'required|numeric',
        ]);

        $month = (int) $request->input('month');
        $year = (int) $request->input('year');
        $lateRate = (float) $request->input('late_deduction_rate');
        $overtimeRate = (float) $request->input('overtime_rate');
        $standbyRate = (float) $request->input('standby_rate');

        $file = $request->file('file');
        $filePath = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension());

        $attendanceSummary = [];

        if (in_array($extension, ['xls', 'xlsx'])) {
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                $spreadsheet = $reader->load($filePath);

                // Parse all sheets starting from sheet index 2
                for ($sheetIdx = 2; $sheetIdx < $spreadsheet->getSheetCount(); $sheetIdx++) {
                    $sheet = $spreadsheet->getSheet($sheetIdx);
                    $highestRow = $sheet->getHighestRow();
                    $highestColumn = $sheet->getHighestColumn();
                    $highestColIdx = Coordinate::columnIndexFromString($highestColumn);

                    // Scan horizontally for employee cards (step of 15 columns)
                    for ($colStart = 1; $colStart < $highestColIdx; $colStart += 15) {
                        $name = $sheet->getCellByColumnAndRow($colStart + 9, 4)->getValue();
                        $fingerprintId = $sheet->getCellByColumnAndRow($colStart + 9, 5)->getValue();

                        if (! $name && ! $fingerprintId) {
                            continue;
                        }

                        $name = trim((string) $name);
                        $fingerprintId = trim((string) $fingerprintId);

                        // Find user in DB to get their custom shift settings
                        $matchedUser = User::where('fingerprint_id', $fingerprintId)
                            ->orWhere('name', 'like', "%{$name}%")
                            ->first();

                        $role = $matchedUser ? $matchedUser->role : 'housekeeping';

                        $presentDays = 0;
                        $absentDays = 0;
                        $standbyCount = 0;
                        $holidayCount = 0;
                        $totalLateMinutes = 0;
                        $totalOvertimeMinutes = 0;
                        $daysLogs = [];

                        // Loop through calendar rows 13 to 43 (31 days)
                        for ($row = 13; $row <= 43; $row++) {
                            $dayLabel = $sheet->getCellByColumnAndRow($colStart, $row)->getValue();
                            if (! $dayLabel) {
                                continue;
                            }

                            // Calculate date for row
                            $day = $row - 12;
                            if ($day > Carbon::create($year, $month, 1)->endOfMonth()->day) {
                                continue;
                            }
                            $dateCarbon = Carbon::create($year, $month, $day);
                            $dateStr = $dateCarbon->toDateString();

                            // Skip checking if employee hasn't joined yet or has resigned/left
                            if ($matchedUser) {
                                if ($dateCarbon->lt(Carbon::parse($matchedUser->created_at)->startOfDay())) {
                                    continue;
                                }
                                if ($matchedUser->deleted_at && $dateCarbon->gt(Carbon::parse($matchedUser->deleted_at)->endOfDay())) {
                                    continue;
                                }
                            }

                            // Find shift for this user and date
                            $customShift = $matchedUser
                                ? StaffShift::where('user_id', $matchedUser->id)->where('date', $dateStr)->first()
                                : null;

                            $isOffDay = false;
                            $shiftStart = '08:00';
                            $shiftEnd = '16:00';

                            if ($customShift) {
                                $isOffDay = (bool) $customShift->is_off_day;
                                $shiftStart = $customShift->shift_start_time ?: '08:00';
                                $shiftEnd = $customShift->shift_end_time ?: '16:00';
                            } else {
                                if ($matchedUser) {
                                    $shiftStart = $matchedUser->shift_start_time ?: '08:00';
                                    $shiftEnd = $matchedUser->shift_end_time ?: '16:00';
                                }
                                // Fallback weekend as off day
                                $dayOfWeek = Carbon::create($year, $month, $day)->dayOfWeek;
                                if ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY) {
                                    $isOffDay = true;
                                }
                            }

                            $inPagi = $sheet->getCellByColumnAndRow($colStart + 1, $row)->getValue();
                            $outPagi = $sheet->getCellByColumnAndRow($colStart + 3, $row)->getValue();
                            $inSiang = $sheet->getCellByColumnAndRow($colStart + 6, $row)->getValue();
                            $outSiang = $sheet->getCellByColumnAndRow($colStart + 8, $row)->getValue();

                            $checkIn = $inPagi ?: $inSiang;
                            $checkOut = $outSiang ?: $outPagi;

                            $dayLateMinutes = 0;
                            $dayOvertimeMinutes = 0;

                            if ($checkIn || $checkOut) {
                                if ($isOffDay) {
                                    $holidayCount++;
                                } else {
                                    $presentDays++;
                                }

                                if ($checkIn) {
                                    $timeParts = explode(':', (string) $checkIn);
                                    if (count($timeParts) >= 2) {
                                        $hour = (int) $timeParts[0];
                                        $minute = (int) $timeParts[1];

                                        // Standby check (Housekeeping check-in after 17:00 / 5 PM)
                                        if ($role === 'housekeeping' && $hour >= 17) {
                                            $standbyCount++;
                                            if (! $isOffDay) {
                                                $presentDays--;
                                            }
                                        } else {
                                            // Regular lateness check
                                            $shiftParts = explode(':', $shiftStart);
                                            $shiftHour = count($shiftParts) >= 1 ? (int) $shiftParts[0] : 8;
                                            $shiftMinute = count($shiftParts) >= 2 ? (int) $shiftParts[1] : 0;

                                            $checkInTotal = $hour * 60 + $minute;
                                            $shiftTotal = $shiftHour * 60 + $shiftMinute;

                                            if ($checkInTotal > $shiftTotal) {
                                                $dayLateMinutes = $checkInTotal - $shiftTotal;
                                                $totalLateMinutes += $dayLateMinutes;
                                            }
                                        }
                                    }
                                }

                                if ($checkOut) {
                                    $timeParts = explode(':', (string) $checkOut);
                                    if (count($timeParts) >= 2) {
                                        $hour = (int) $timeParts[0];
                                        $minute = (int) $timeParts[1];

                                        // Overtime check
                                        $shiftEndParts = explode(':', $shiftEnd);
                                        $shiftEndHour = count($shiftEndParts) >= 1 ? (int) $shiftEndParts[0] : 16;
                                        $shiftEndMinute = count($shiftEndParts) >= 2 ? (int) $shiftEndParts[1] : 0;

                                        $checkOutTotal = $hour * 60 + $minute;
                                        $shiftEndTotal = $shiftEndHour * 60 + $shiftEndMinute;

                                        if ($checkOutTotal > $shiftEndTotal) {
                                            $dayOvertimeMinutes = $checkOutTotal - $shiftEndTotal;
                                            $totalOvertimeMinutes += $dayOvertimeMinutes;
                                        }
                                    }
                                }
                            } else {
                                if ($isOffDay) {
                                    $holidayCount++;
                                } else {
                                    $absentDays++;
                                }
                            }

                            $daysLogs[] = [
                                'day' => $day,
                                'date' => $dateStr,
                                'check_in' => $checkIn ?: '—',
                                'check_out' => $checkOut ?: '—',
                                'is_off_day' => $isOffDay,
                                'shift_start' => $shiftStart,
                                'shift_end' => $shiftEnd,
                                'late_hours' => round($dayLateMinutes / 60, 2),
                                'overtime_hours' => round($dayOvertimeMinutes / 60, 2),
                            ];
                        }

                        $lateHoursCalculated = round($totalLateMinutes / 60, 2);
                        $overtimeHoursCalculated = round($totalOvertimeMinutes / 60, 2);

                        $attendanceSummary[] = [
                            'name' => $name,
                            'fingerprint_id' => $fingerprintId,
                            'present_days' => $presentDays,
                            'late_days' => (int) ceil($lateHoursCalculated / 8), // rough days late
                            'late_hours' => $lateHoursCalculated,
                            'absent_days' => $absentDays,
                            'standby_nights' => $standbyCount,
                            'holiday_days' => $holidayCount,
                            'days_logs' => $daysLogs,
                        ];
                    }
                }
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error parsing Excel file: '.$e->getMessage(),
                ], 500);
            }
        } else {
            // Text/CSV Parsing (simplified fallback)
            try {
                $rows = [];
                if (($handle = fopen($filePath, 'r')) !== false) {
                    $header = fgetcsv($handle, 1000, ',');
                    $header = array_map(function ($h) {
                        return trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h));
                    }, $header);

                    while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                        if (count($header) === count($data)) {
                            $rows[] = array_combine($header, $data);
                        }
                    }
                    fclose($handle);
                }

                foreach ($rows as $row) {
                    $nameKey = null;
                    $lateKey = null;
                    $absentKey = null;
                    $presentKey = null;

                    foreach ($row as $key => $val) {
                        $cleanKey = strtolower($key);
                        if (str_contains($cleanKey, 'nama') || str_contains($cleanKey, 'name') || str_contains($cleanKey, 'employee')) {
                            $nameKey = $key;
                        } elseif (str_contains($cleanKey, 'lambat') || str_contains($cleanKey, 'late') || str_contains($cleanKey, 'terlambat')) {
                            $lateKey = $key;
                        } elseif (str_contains($cleanKey, 'alpa') || str_contains($cleanKey, 'absen') || str_contains($cleanKey, 'absent') || str_contains($cleanKey, 'bolos')) {
                            $absentKey = $key;
                        } elseif (str_contains($cleanKey, 'hadir') || str_contains($cleanKey, 'days') || str_contains($cleanKey, 'present') || str_contains($cleanKey, 'kerja')) {
                            $presentKey = $key;
                        }
                    }

                    if ($nameKey) {
                        $name = trim($row[$nameKey]);
                        $attendanceSummary[] = [
                            'name' => $name,
                            'fingerprint_id' => '',
                            'present_days' => $presentKey ? (int) $row[$presentKey] : 26,
                            'late_days' => $lateKey ? (int) ($row[$lateKey] / 8) : 0,
                            'late_hours' => $lateKey ? (float) $row[$lateKey] : 0,
                            'absent_days' => $absentKey ? (int) $row[$absentKey] : 0,
                            'standby_nights' => 0,
                            'holiday_days' => 4,
                        ];
                    }
                }
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error parsing CSV file: '.$e->getMessage(),
                ], 500);
            }
        }

        return response()->json([
            'success' => true,
            'summary' => $attendanceSummary,
        ]);
    }

    /**
     * Store or Update Payroll Records
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'month' => 'required|integer',
            'year' => 'required|integer',
            'wallet_id' => 'nullable|exists:wallets,id', // wallet used to pay
            'payrolls' => 'required|array',
            'payrolls.*.user_id' => 'required|exists:users,id',
            'payrolls.*.base_salary' => 'required|numeric',
            'payrolls.*.attendance_days' => 'required|integer',
            'payrolls.*.absent_days' => 'required|integer',
            'payrolls.*.sick_days' => 'required|integer',
            'payrolls.*.sick_deduction' => 'required|numeric',
            'payrolls.*.permission_days' => 'required|integer',
            'payrolls.*.permission_deduction' => 'required|numeric',
            'payrolls.*.absent_deduction' => 'required|numeric',
            'payrolls.*.late_days' => 'required|integer',
            'payrolls.*.late_hours' => 'required|numeric',
            'payrolls.*.standby_nights' => 'required|integer',
            'payrolls.*.late_deduction' => 'required|numeric',
            'payrolls.*.loan_deduction' => 'required|numeric',
            'payrolls.*.housekeeping_bonus' => 'required|numeric',
            'payrolls.*.standby_bonus' => 'required|numeric',
            'payrolls.*.frontdesk_first_night_bonus' => 'required|numeric',
            'payrolls.*.frontdesk_next_nights_bonus_share' => 'required|numeric',
            'payrolls.*.overtime_hours' => 'required|numeric',
            'payrolls.*.overtime_bonus' => 'required|numeric',
            'payrolls.*.holiday_days' => 'required|integer',
            'payrolls.*.total_salary' => 'required|numeric',
            'payrolls.*.status' => 'required|string|in:pending,paid',
            'payrolls.*.notes' => 'nullable|string',
            'payrolls.*.performance_bonus' => 'nullable|numeric',
            'payrolls.*.kpi_details' => 'nullable|array',
            'payrolls.*.points_details' => 'nullable|array',
            'payrolls.*.loans_details' => 'nullable|array',
        ]);

        $month = $validated['month'];
        $year = $validated['year'];
        $walletId = $validated['wallet_id'] ?? null;

        DB::transaction(function () use ($validated, $month, $year, $user, $walletId) {
            foreach ($validated['payrolls'] as $payrollData) {
                $existing = StaffPayroll::where('user_id', $payrollData['user_id'])
                    ->where('month', $month)
                    ->where('year', $year)
                    ->first();

                $loanDeduction = (float) $payrollData['loan_deduction'];
                $totalSalary = (float) $payrollData['total_salary'];
                $expenseId = $existing?->expense_id;

                if ($payrollData['status'] === 'paid' && (! $existing || $existing->status !== 'paid')) {
                    // Record loan payment if any loan deduction
                    if ($loanDeduction > 0) {
                        $loans = EmployeeLoan::where('employee_id', $payrollData['user_id'])
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
                                    'notes' => "Dipotong otomatis dari gaji bulan {$month}/{$year}",
                                    'created_by' => $user->id,
                                ]);

                                if (($repaid + $paymentAmount) >= $loan->amount) {
                                    $loan->update(['status' => 'paid']);
                                }

                                $remainingDeduction -= $paymentAmount;
                            }
                        }
                    }

                    // Create PropertyExpense to track in monthly reports
                    if ($walletId) {
                        $empUser = User::find($payrollData['user_id']);
                        $expense = PropertyExpense::create([
                            'property_id' => null, // General company expense
                            'expense_scope' => 'operational',
                            'expense_category' => 'salary',
                            'expense_type' => 'fixed',
                            'description' => "Gaji Karyawan: {$empUser->name} - Periode {$month}/{$year}",
                            'amount' => $totalSalary,
                            'expense_date' => now()->toDateString(),
                            'payment_method' => 'cash',
                            'wallet_id' => $walletId,
                            'status' => 'approved',
                            'recorded_by' => $user->id,
                            'approved_by' => $user->id,
                        ]);

                        $expenseId = $expense->id;

                        // Create WalletTransaction
                        WalletTransaction::create([
                            'wallet_id' => $walletId,
                            'direction' => 'out',
                            'amount' => $totalSalary,
                            'category' => 'expense',
                            'transaction_date' => now()->toDateString(),
                            'description' => "Bayar Gaji: {$empUser->name} - Periode {$month}/{$year}",
                            'reference_type' => PropertyExpense::class,
                            'reference_id' => $expenseId,
                        ]);

                        // Recalculate wallet balance
                        app(WalletService::class)->recalculateBalance($walletId);
                    }
                }

                StaffPayroll::updateOrCreate(
                    [
                        'user_id' => $payrollData['user_id'],
                        'month' => $month,
                        'year' => $year,
                    ],
                    [
                        'base_salary' => $payrollData['base_salary'],
                        'attendance_days' => $payrollData['attendance_days'],
                        'absent_days' => $payrollData['absent_days'],
                        'sick_days' => $payrollData['sick_days'],
                        'sick_deduction' => $payrollData['sick_deduction'],
                        'permission_days' => $payrollData['permission_days'],
                        'permission_deduction' => $payrollData['permission_deduction'],
                        'absent_deduction' => $payrollData['absent_deduction'],
                        'late_days' => $payrollData['late_days'],
                        'late_hours' => $payrollData['late_hours'],
                        'standby_nights' => $payrollData['standby_nights'],
                        'late_deduction' => $payrollData['late_deduction'],
                        'loan_deduction' => $payrollData['loan_deduction'],
                        'housekeeping_bonus' => $payrollData['housekeeping_bonus'],
                        'standby_bonus' => $payrollData['standby_bonus'],
                        'frontdesk_first_night_bonus' => $payrollData['frontdesk_first_night_bonus'],
                        'frontdesk_next_nights_bonus_share' => $payrollData['frontdesk_next_nights_bonus_share'],
                        'performance_bonus' => $payrollData['performance_bonus'] ?? 0.0,
                        'overtime_hours' => $payrollData['overtime_hours'],
                        'overtime_bonus' => $payrollData['overtime_bonus'],
                        'holiday_days' => $payrollData['holiday_days'],
                        'total_salary' => $payrollData['total_salary'],
                        'status' => $payrollData['status'],
                        'paid_at' => $payrollData['status'] === 'paid' ? now() : null,
                        'notes' => $payrollData['notes'],
                        'created_by' => $user->id,
                        'expense_id' => $expenseId,
                        'kpi_details' => $payrollData['kpi_details'] ?? null,
                        'points_details' => $payrollData['points_details'] ?? null,
                        'loans_details' => $payrollData['loans_details'] ?? null,
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Data payroll berhasil disimpan.');
    }
}

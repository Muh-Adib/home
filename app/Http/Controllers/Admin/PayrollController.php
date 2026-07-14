<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use App\Models\StaffPayroll;
use App\Models\User;
use App\Services\HousekeepingPointService;
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

        // 1. Get staff list (non-guests)
        $staff = User::where('role', '!=', 'guest')
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'status', 'fingerprint_id', 'shift_start_time', 'shift_end_time']);

        // 2. Fetch existing stored payrolls
        $storedPayrolls = StaffPayroll::where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('user_id');

        // Rates (configurable from query parameters, with standard defaults)
        $firstNightRate = (float) $request->input('first_night_rate', 15000);
        $nextNightRate = (float) $request->input('next_night_rate', 5000);
        $housekeepingRatePerPoint = (float) $request->input('housekeeping_rate_per_point', 1000);
        $lateDeductionRate = (float) $request->input('late_deduction_rate', 20000);
        $standbyRate = (float) $request->input('standby_rate', 50000);

        // Default base salaries based on roles
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
        $totalNextNightsPool = 0;

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
                }
                $firstNightBonuses[$closerId] += $firstNightRate;
            }

            if ($nights > 1) {
                $totalNextNightsPool += ($nights - 1) * $nextNightRate;
            }
        }

        $sharedNextNightsBonus = $frontdeskCount > 0 ? ($totalNextNightsPool / $frontdeskCount) : 0;

        // 4. Build payroll calculation data
        $payrolls = [];

        foreach ($staff as $s) {
            $existing = $storedPayrolls->get($s->id);

            // Housekeeping points & bonus using the new point system
            $pointService = app(HousekeepingPointService::class);
            $poolData = $pointService->getMonthlyPool($month, $year);
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

            // Casbon (active outstanding loans)
            $activeLoans = EmployeeLoan::where('employee_id', $s->id)
                ->where('status', 'active')
                ->get();

            $outstandingLoanAmount = 0.0;
            foreach ($activeLoans as $loan) {
                $repaid = $loan->payments()->sum('amount');
                $outstandingLoanAmount += max(0.0, (float) $loan->amount - (float) $repaid);
            }

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
                    'late_days' => $existing->late_days,
                    'standby_nights' => $existing->standby_nights,
                    'late_deduction' => (float) $existing->late_deduction,
                    'loan_deduction' => (float) $existing->loan_deduction,
                    'housekeeping_bonus' => (float) $existing->housekeeping_bonus,
                    'standby_bonus' => (float) $existing->standby_bonus,
                    'frontdesk_first_night_bonus' => (float) $existing->frontdesk_first_night_bonus,
                    'frontdesk_next_nights_bonus_share' => (float) $existing->frontdesk_next_nights_bonus_share,
                    'total_salary' => (float) $existing->total_salary,
                    'status' => $existing->status,
                    'paid_at' => $existing->paid_at ? $existing->paid_at->toIso8601String() : null,
                    'notes' => $existing->notes,
                    'outstanding_loans' => $outstandingLoanAmount,
                    'stored' => true,
                ];
            } else {
                // Compute live values
                $baseSalary = $defaultSalaries[$s->role] ?? 2000000.0;

                $attendanceDays = 26; // Default standard working days
                $absentDays = 0;
                $lateDays = 0;
                $standbyNights = 0;
                $lateDeduction = 0.0;
                $standbyBonus = 0.0;

                $suggestedLoanDeduction = min($outstandingLoanAmount, $baseSalary * 0.2);

                $totalSalary = max(0.0, $baseSalary + $housekeepingBonus + $standbyBonus + $fdFirstNightBonus + $fdNextNightsShare - $lateDeduction - $suggestedLoanDeduction);

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
                    'late_days' => $lateDays,
                    'standby_nights' => $standbyNights,
                    'late_deduction' => $lateDeduction,
                    'loan_deduction' => $suggestedLoanDeduction,
                    'housekeeping_bonus' => $housekeepingBonus,
                    'standby_bonus' => $standbyBonus,
                    'frontdesk_first_night_bonus' => $fdFirstNightBonus,
                    'frontdesk_next_nights_bonus_share' => $fdNextNightsShare,
                    'total_salary' => $totalSalary,
                    'status' => 'pending',
                    'paid_at' => null,
                    'notes' => '',
                    'outstanding_loans' => $outstandingLoanAmount,
                    'stored' => false,
                ];
            }
        }

        // Get pool data again to pass to frontend
        $pointService = app(HousekeepingPointService::class);
        $poolData = $pointService->getMonthlyPool($month, $year);

        return Inertia::render('Admin/Finance/Payroll', [
            'payrolls' => $payrolls,
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
            ],
        ]);
    }

    /**
     * Update employee shift settings
     */
    public function updateUserSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'fingerprint_id' => 'nullable|string|unique:users,fingerprint_id,'.$request->input('user_id'),
            'shift_start_time' => 'required|string',
            'shift_end_time' => 'required|string',
        ]);

        $u = User::findOrFail($validated['user_id']);
        $u->update([
            'fingerprint_id' => $validated['fingerprint_id'],
            'shift_start_time' => $validated['shift_start_time'],
            'shift_end_time' => $validated['shift_end_time'],
        ]);

        return redirect()->back()->with('success', 'Pengaturan shift staff berhasil diperbarui.');
    }

    /**
     * Upload & Parse Fingerprint Attendance XLS/XLSX or CSV
     */
    public function uploadAttendance(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
        ]);

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

                        $shiftStart = $matchedUser ? $matchedUser->shift_start_time : '08:00';
                        $role = $matchedUser ? $matchedUser->role : 'housekeeping';

                        $presentDays = 0;
                        $absentDays = 0;
                        $lateCount = 0;
                        $standbyCount = 0;

                        // Loop through calendar rows 13 to 43 (31 days)
                        for ($row = 13; $row <= 43; $row++) {
                            $dayLabel = $sheet->getCellByColumnAndRow($colStart, $row)->getValue();
                            if (! $dayLabel) {
                                continue;
                            }

                            $inPagi = $sheet->getCellByColumnAndRow($colStart + 1, $row)->getValue();
                            $outPagi = $sheet->getCellByColumnAndRow($colStart + 3, $row)->getValue();
                            $inSiang = $sheet->getCellByColumnAndRow($colStart + 6, $row)->getValue();
                            $outSiang = $sheet->getCellByColumnAndRow($colStart + 8, $row)->getValue();

                            $checkIn = $inPagi ?: $inSiang;
                            $checkOut = $outSiang ?: $outPagi;

                            if ($checkIn || $checkOut) {
                                $presentDays++;

                                if ($checkIn) {
                                    $timeParts = explode(':', (string) $checkIn);
                                    if (count($timeParts) >= 2) {
                                        $hour = (int) $timeParts[0];
                                        $minute = (int) $timeParts[1];

                                        // Standby check (Housekeeping check-in after 17:00 / 5 PM)
                                        if ($role === 'housekeeping' && $hour >= 17) {
                                            $standbyCount++;
                                            // Standby shifts are outside regular attendance
                                            $presentDays--;
                                        } else {
                                            // Regular lateness check
                                            $shiftParts = explode(':', $shiftStart);
                                            $shiftHour = count($shiftParts) >= 1 ? (int) $shiftParts[0] : 8;
                                            $shiftMinute = count($shiftParts) >= 2 ? (int) $shiftParts[1] : 0;

                                            $checkInTotal = $hour * 60 + $minute;
                                            $shiftTotal = $shiftHour * 60 + $shiftMinute;

                                            if ($checkInTotal > $shiftTotal) {
                                                $lateCount++;
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Absent check (exclude weekend rest days "Sab" & "Min")
                                $dayStr = strtolower((string) $dayLabel);
                                if (! str_contains($dayStr, 'sab') && ! str_contains($dayStr, 'min')) {
                                    $absentDays++;
                                }
                            }
                        }

                        $attendanceSummary[] = [
                            'name' => $name,
                            'fingerprint_id' => $fingerprintId,
                            'present_days' => $presentDays,
                            'late_days' => $lateCount,
                            'absent_days' => $absentDays,
                            'standby_nights' => $standbyCount,
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
                            'late_days' => $lateKey ? (int) $row[$lateKey] : 0,
                            'absent_days' => $absentKey ? (int) $row[$absentKey] : 0,
                            'standby_nights' => 0,
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
            'payrolls' => 'required|array',
            'payrolls.*.user_id' => 'required|exists:users,id',
            'payrolls.*.base_salary' => 'required|numeric',
            'payrolls.*.attendance_days' => 'required|integer',
            'payrolls.*.absent_days' => 'required|integer',
            'payrolls.*.late_days' => 'required|integer',
            'payrolls.*.standby_nights' => 'required|integer',
            'payrolls.*.late_deduction' => 'required|numeric',
            'payrolls.*.loan_deduction' => 'required|numeric',
            'payrolls.*.housekeeping_bonus' => 'required|numeric',
            'payrolls.*.standby_bonus' => 'required|numeric',
            'payrolls.*.frontdesk_first_night_bonus' => 'required|numeric',
            'payrolls.*.frontdesk_next_nights_bonus_share' => 'required|numeric',
            'payrolls.*.total_salary' => 'required|numeric',
            'payrolls.*.status' => 'required|string|in:pending,paid',
            'payrolls.*.notes' => 'nullable|string',
        ]);

        $month = $validated['month'];
        $year = $validated['year'];

        DB::transaction(function () use ($validated, $month, $year, $user) {
            foreach ($validated['payrolls'] as $payrollData) {
                $existing = StaffPayroll::where('user_id', $payrollData['user_id'])
                    ->where('month', $month)
                    ->where('year', $year)
                    ->first();

                $loanDeduction = (float) $payrollData['loan_deduction'];

                if ($payrollData['status'] === 'paid' && (! $existing || $existing->status !== 'paid')) {
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
                                    'payment_method' => 'salary_deduction',
                                    'notes' => "Dipotong otomatis dari gaji bulan {$month}/{$year}",
                                ]);

                                if (($repaid + $paymentAmount) >= $loan->amount) {
                                    $loan->update(['status' => 'paid']);
                                }

                                $remainingDeduction -= $paymentAmount;
                            }
                        }
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
                        'late_days' => $payrollData['late_days'],
                        'standby_nights' => $payrollData['standby_nights'],
                        'late_deduction' => $payrollData['late_deduction'],
                        'loan_deduction' => $payrollData['loan_deduction'],
                        'housekeeping_bonus' => $payrollData['housekeeping_bonus'],
                        'standby_bonus' => $payrollData['standby_bonus'],
                        'frontdesk_first_night_bonus' => $payrollData['frontdesk_first_night_bonus'],
                        'frontdesk_next_nights_bonus_share' => $payrollData['frontdesk_next_nights_bonus_share'],
                        'total_salary' => $payrollData['total_salary'],
                        'status' => $payrollData['status'],
                        'paid_at' => $payrollData['status'] === 'paid' ? now() : null,
                        'notes' => $payrollData['notes'],
                        'created_by' => $user->id,
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Data payroll berhasil disimpan.');
    }
}

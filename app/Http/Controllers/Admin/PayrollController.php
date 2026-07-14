<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use App\Models\StaffPayroll;
use App\Models\UnitDamageAction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

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
            ->get(['id', 'name', 'role', 'status']);

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

            // Combine closing and input (use closed_by if set, fallback to created_by)
            $closerId = $booking->closed_by ?? $booking->created_by;

            if ($closerId) {
                // First night bonus goes directly to closer
                if (! isset($firstNightBonuses[$closerId])) {
                    $firstNightBonuses[$closerId] = 0;
                }
                $firstNightBonuses[$closerId] += $firstNightRate;
            }

            // Remaining nights go to the shared pool
            if ($nights > 1) {
                $totalNextNightsPool += ($nights - 1) * $nextNightRate;
            }
        }

        // Shared pool split equally
        $sharedNextNightsBonus = $frontdeskCount > 0 ? ($totalNextNightsPool / $frontdeskCount) : 0;

        // 4. Build payroll calculation data
        $payrolls = [];

        foreach ($staff as $s) {
            $existing = $storedPayrolls->get($s->id);

            // Housekeeping points
            $resolvedPoints = (int) UnitDamageAction::where('user_id', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('points');
            $housekeepingBonus = $resolvedPoints * $housekeepingRatePerPoint;

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
                    'base_salary' => (float) $existing->base_salary,
                    'attendance_days' => $existing->attendance_days,
                    'absent_days' => $existing->absent_days,
                    'late_days' => $existing->late_days,
                    'late_deduction' => (float) $existing->late_deduction,
                    'loan_deduction' => (float) $existing->loan_deduction,
                    'housekeeping_bonus' => (float) $existing->housekeeping_bonus,
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

                // For live preview, assume full attendance unless CSV is uploaded
                $attendanceDays = 26; // Default standard working days
                $absentDays = 0;
                $lateDays = 0;
                $lateDeduction = 0.0;

                // Simple auto-deduction of casbon (caps at 20% of base salary or outstanding balance, whichever is smaller)
                $suggestedLoanDeduction = min($outstandingLoanAmount, $baseSalary * 0.2);

                $totalSalary = max(0.0, $baseSalary + $housekeepingBonus + $fdFirstNightBonus + $fdNextNightsShare - $lateDeduction - $suggestedLoanDeduction);

                $payrolls[] = [
                    'id' => null,
                    'user_id' => $s->id,
                    'name' => $s->name,
                    'role' => $s->role,
                    'base_salary' => $baseSalary,
                    'attendance_days' => $attendanceDays,
                    'absent_days' => $absentDays,
                    'late_days' => $lateDays,
                    'late_deduction' => $lateDeduction,
                    'loan_deduction' => $suggestedLoanDeduction,
                    'housekeeping_bonus' => $housekeepingBonus,
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

        return Inertia::render('Admin/Finance/Payroll', [
            'payrolls' => $payrolls,
            'filters' => [
                'month' => $month,
                'year' => $year,
                'first_night_rate' => $firstNightRate,
                'next_night_rate' => $nextNightRate,
                'housekeeping_rate_per_point' => $housekeepingRatePerPoint,
                'late_deduction_rate' => $lateDeductionRate,
            ],
            'fingerprint_template_url' => route('csrf.token'), // Dummy or endpoint
        ]);
    }

    /**
     * Upload & Parse Fingerprint Attendance CSV
     */
    public function uploadAttendance(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $filePath = $file->getRealPath();

        $rows = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            // Read header
            $header = fgetcsv($handle, 1000, ',');

            // Clean headers (trim whitespace, remove BOM)
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

        // Map parsed rows to employee names
        $attendanceSummary = [];

        foreach ($rows as $row) {
            // Find employee name column dynamically
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
                    'present_days' => $presentKey ? (int) $row[$presentKey] : 26,
                    'late_days' => $lateKey ? (int) $row[$lateKey] : 0,
                    'absent_days' => $absentKey ? (int) $row[$absentKey] : 0,
                ];
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
            'payrolls.*.late_deduction' => 'required|numeric',
            'payrolls.*.loan_deduction' => 'required|numeric',
            'payrolls.*.housekeeping_bonus' => 'required|numeric',
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
                // Determine if payroll should record loan payments
                $existing = StaffPayroll::where('user_id', $payrollData['user_id'])
                    ->where('month', $month)
                    ->where('year', $year)
                    ->first();

                $loanDeduction = (float) $payrollData['loan_deduction'];

                // If first time marking this payroll as paid, record the casbon repayment!
                if ($payrollData['status'] === 'paid' && (! $existing || $existing->status !== 'paid')) {
                    if ($loanDeduction > 0) {
                        // Deduct from outstanding employee loans
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

                                // Update loan status to paid if fully repaid
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
                        'late_deduction' => $payrollData['late_deduction'],
                        'loan_deduction' => $payrollData['loan_deduction'],
                        'housekeeping_bonus' => $payrollData['housekeeping_bonus'],
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

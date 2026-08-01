<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\StaffPayroll;
use App\Models\StaffShift;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AttendanceService;
use App\Services\HousekeepingPointService;
use App\Services\PayrollCalculationService;
use App\Services\StaffPerformanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class PayrollController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected StaffPerformanceService $performanceService,
        protected PayrollCalculationService $payrollCalculationService,
        protected HousekeepingPointService $pointService
    ) {}

    /**
     * Display payroll dashboard & 7-step HR workflow management.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        // Fetch stored rate settings from SystemSetting or fallback to defaults
        $rates = [
            'bonus_booking_fo' => (float) $request->input('bonus_booking_fo', SystemSetting::get('bonus_booking_fo', 3000)),
            'bonus_night_fo' => (float) $request->input('bonus_night_fo', SystemSetting::get('bonus_night_fo', 1000)),
            'bonus_booking_hk' => (float) $request->input('bonus_booking_hk', SystemSetting::get('bonus_booking_hk', 3000)),
            'bonus_night_hk' => (float) $request->input('bonus_night_hk', SystemSetting::get('bonus_night_hk', 5000)),
            'first_night_rate' => (float) $request->input('first_night_rate', SystemSetting::get('first_night_rate', 1000)),
            'next_night_rate' => (float) $request->input('next_night_rate', SystemSetting::get('next_night_rate', 1000)),
            'housekeeping_bonus_mode' => (string) $request->input('housekeeping_bonus_mode', SystemSetting::get('housekeeping_bonus_mode', 'rate_per_point')),
            'housekeeping_rate_per_point' => (float) $request->input('housekeeping_rate_per_point', SystemSetting::get('housekeeping_rate_per_point', 2000)),
            'housekeeping_fixed_pool' => (float) $request->input('housekeeping_fixed_pool', SystemSetting::get('housekeeping_fixed_pool', 1500000)),
            'housekeeping_pool_percentage' => (float) $request->input('housekeeping_pool_percentage', SystemSetting::get('housekeeping_pool_percentage', 5.0)),
            'housekeeping_max_cap' => (float) $request->input('housekeeping_max_cap', SystemSetting::get('housekeeping_max_cap', 1500000)),
            'late_deduction_rate' => (float) $request->input('late_deduction_rate', SystemSetting::get('late_deduction_rate', 20000)),
            'standby_rate' => (float) $request->input('standby_rate', SystemSetting::get('standby_rate', 50000)),
            'overtime_rate' => (float) $request->input('overtime_rate', SystemSetting::get('overtime_rate', 25000)),
            'absent_deduction_rate' => (float) $request->input('absent_deduction_rate', SystemSetting::get('absent_deduction_rate', 100000)),
            'sick_deduction_rate' => (float) $request->input('sick_deduction_rate', SystemSetting::get('sick_deduction_rate', 50000)),
            'permission_deduction_rate' => (float) $request->input('permission_deduction_rate', SystemSetting::get('permission_deduction_rate', 75000)),
            'follow_up_rate' => (float) $request->input('follow_up_rate', SystemSetting::get('follow_up_rate', 1000)),
            'creation_rate' => (float) $request->input('creation_rate', SystemSetting::get('creation_rate', 1000)),
            'proration_standard_days' => (float) $request->input('proration_standard_days', SystemSetting::get('proration_standard_days', 26)),
        ];

        // If request has rates explicitly, automatically persist them to SystemSetting
        if ($request->has('first_night_rate') || $request->has('housekeeping_rate_per_point') || $request->has('bonus_booking_fo')) {
            SystemSetting::setMany($rates, 'payroll_rates');
        }

        // 1. Calculate payroll rows dynamically using PayrollCalculationService
        $payrolls = $this->payrollCalculationService->calculateDynamicPayroll($month, $year, $rates);

        // 2. Fetch staff & user shifts
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $staff = User::query()
            ->where('role', '!=', 'guest')
            ->whereNull('deleted_at')
            ->where('created_at', '<=', $endDate)
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        $shifts = StaffShift::whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->groupBy('user_id');

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

        // 3. Housekeeping pool data
        $poolData = $this->pointService->getMonthlyPool($month, $year, $rates['housekeeping_pool_percentage']);

        // 4. Fetch wallets
        $wallets = Wallet::orderBy('name')->get(['id', 'name', 'balance']);

        // 5. Version history for the month
        $versions = StaffPayroll::where('month', $month)
            ->where('year', $year)
            ->select('version', 'batch_id', 'is_active', 'status', 'created_at')
            ->distinct()
            ->orderBy('version', 'desc')
            ->get();

        return Inertia::render('Admin/Finance/Payroll', [
            'payrolls' => $payrolls,
            'wallets' => $wallets,
            'userShifts' => $userShifts,
            'versions' => $versions,
            'poolData' => [
                'eligible_turnover' => $poolData['eligible_turnover'],
                'total_pool' => $poolData['total_pool'],
                'total_points' => $poolData['total_points'],
                'point_rate' => $poolData['point_rate'],
            ],
            'filters' => array_merge(['month' => $month, 'year' => $year], $rates),
        ]);
    }

    /**
     * Display Attendance Review & HR Correction dashboard.
     */
    public function attendanceReview(Request $request): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $staff = User::query()
            ->where('role', '!=', 'guest')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'fingerprint_id']);

        $attendances = Attendance::with(['user:id,name,role', 'corrections.corrector:id,name'])
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderBy('date', 'asc')
            ->orderBy('user_id')
            ->get();

        return Inertia::render('Admin/Finance/Attendance', [
            'staff' => $staff,
            'attendances' => $attendances,
            'daysInMonth' => $daysInMonth,
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);
    }

    /**
     * Upload & Parse Fingerprint Attendance file (XLS/XLSX/CSV) and store in database.
     */
    public function uploadAttendance(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
            'month' => 'required|integer',
            'year' => 'required|integer',
        ]);

        $month = (int) $request->input('month');
        $year = (int) $request->input('year');

        $file = $request->file('file');
        $filePath = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension());

        $attendanceSummary = [];

        if (in_array($extension, ['xls', 'xlsx'])) {
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                $spreadsheet = $reader->load($filePath);

                for ($sheetIdx = 2; $sheetIdx < $spreadsheet->getSheetCount(); $sheetIdx++) {
                    $sheet = $spreadsheet->getSheet($sheetIdx);
                    $highestRow = $sheet->getHighestRow();
                    $highestColumn = $sheet->getHighestColumn();
                    $highestColIdx = Coordinate::columnIndexFromString($highestColumn);

                    for ($colStart = 1; $colStart < $highestColIdx; $colStart += 15) {
                        $name = $sheet->getCell([$colStart + 9, 4])->getValue();
                        $fingerprintId = $sheet->getCell([$colStart + 9, 5])->getValue();

                        if (! $name && ! $fingerprintId) {
                            continue;
                        }

                        $name = trim((string) $name);
                        $fingerprintId = trim((string) $fingerprintId);

                        $daysLogs = [];

                        for ($row = 13; $row <= 43; $row++) {
                            $dayLabel = $sheet->getCell([$colStart, $row])->getValue();
                            if (! $dayLabel) {
                                continue;
                            }

                            $day = $row - 12;
                            if ($day > Carbon::create($year, $month, 1)->endOfMonth()->day) {
                                continue;
                            }
                            $dateStr = Carbon::create($year, $month, $day)->toDateString();

                            $inPagi = $sheet->getCell([$colStart + 1, $row])->getValue();
                            $outPagi = $sheet->getCell([$colStart + 3, $row])->getValue();
                            $inSiang = $sheet->getCell([$colStart + 6, $row])->getValue();
                            $outSiang = $sheet->getCell([$colStart + 8, $row])->getValue();

                            $checkIn = $inPagi ?: $inSiang;
                            $checkOut = $outSiang ?: $outPagi;

                            $daysLogs[] = [
                                'day' => $day,
                                'date' => $dateStr,
                                'check_in' => $checkIn ?: '—',
                                'check_out' => $checkOut ?: '—',
                            ];
                        }

                        $attendanceSummary[] = [
                            'name' => $name,
                            'fingerprint_id' => $fingerprintId,
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
            // Simplified CSV fallback parsing
            try {
                if (($handle = fopen($filePath, 'r')) !== false) {
                    $header = fgetcsv($handle, 1000, ',');
                    while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                        if (count($header) === count($data)) {
                            $row = array_combine($header, $data);
                            $name = trim($row['name'] ?? $row['Nama'] ?? '');
                            if ($name) {
                                $attendanceSummary[] = [
                                    'name' => $name,
                                    'fingerprint_id' => trim($row['fingerprint_id'] ?? ''),
                                    'days_logs' => [],
                                ];
                            }
                        }
                    }
                    fclose($handle);
                }
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error parsing CSV file: '.$e->getMessage(),
                ], 500);
            }
        }

        // Store into attendances table
        $importResult = $this->attendanceService->importRawAttendance($attendanceSummary, $month, $year, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Berhasil mengimpor data absensi. {$importResult['total_imported_records']} catatan kehadiran dibuat.",
            'summary' => $attendanceSummary,
            'matched_users_count' => $importResult['matched_users_count'],
        ]);
    }

    /**
     * Perform HR attendance manual correction with audit trail.
     */
    public function correctAttendance(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'attendance_id' => 'nullable|exists:attendances,id',
            'user_id' => 'required_without:attendance_id|exists:users,id',
            'date' => 'required_without:attendance_id|date',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'status' => 'nullable|string|in:present,sick,permission,absent,holiday,off,standby',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $attendanceId = $validated['attendance_id'] ?? null;
        if (! $attendanceId && ! empty($validated['user_id']) && ! empty($validated['date'])) {
            $user = User::findOrFail($validated['user_id']);
            $att = $this->attendanceService->calculateDailyAttendance(
                $user,
                Carbon::parse($validated['date']),
                $validated['check_in'] ?? null,
                $validated['check_out'] ?? null
            );
            $attendanceId = $att->id;
        }

        $this->attendanceService->correctAttendance(
            (int) $attendanceId,
            $validated['check_in'] ?? null,
            $validated['check_out'] ?? null,
            $validated['reason'],
            $validated['notes'] ?? null,
            $request->user(),
            $validated['status'] ?? null
        );

        return redirect()->back()->with('success', 'Koreksi absensi berhasil disimpan dengan catatan audit log.');
    }

    /**
     * Generate & finalize monthly performance bonuses in Staff Performance module.
     */
    public function generateBonuses(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer',
            'year' => 'required|integer',
        ]);

        $rates = $request->only([
            'first_night_rate',
            'next_night_rate',
            'housekeeping_bonus_mode',
            'housekeeping_rate_per_point',
            'housekeeping_fixed_pool',
            'housekeeping_pool_percentage',
            'housekeeping_max_cap',
            'follow_up_rate',
            'creation_rate',
        ]);

        // Automatically persist rate settings into SystemSetting
        SystemSetting::setMany($rates, 'payroll_rates');

        $this->performanceService->calculateAndSaveMonthlyBonuses(
            (int) $validated['month'],
            (int) $validated['year'],
            $rates,
            true,
            $request->user()
        );

        return redirect()->back()->with('success', 'Bonus Staff Performance (HK & FO) dan pengaturan tarif berhasil disimpan secara permanen.');
    }

    /**
     * Update and persist payroll rates & settings into SystemSetting.
     */
    public function updateRates(Request $request): RedirectResponse
    {
        $rates = $request->only([
            'first_night_rate',
            'next_night_rate',
            'housekeeping_bonus_mode',
            'housekeeping_rate_per_point',
            'housekeeping_fixed_pool',
            'housekeeping_pool_percentage',
            'housekeeping_max_cap',
            'late_deduction_rate',
            'standby_rate',
            'overtime_rate',
            'absent_deduction_rate',
            'sick_deduction_rate',
            'permission_deduction_rate',
            'follow_up_rate',
            'creation_rate',
        ]);

        SystemSetting::setMany($rates, 'payroll_rates');

        // Recalculate bonuses with new rates if month & year are provided
        if ($request->has('month') && $request->has('year')) {
            $this->performanceService->calculateAndSaveMonthlyBonuses(
                (int) $request->input('month'),
                (int) $request->input('year'),
                $rates,
                true,
                $request->user()
            );
        }

        return redirect()->back()->with('success', 'Pengaturan tarif denda & insentif payroll berhasil disimpan secara permanen.');
    }

    /**
     * Store or Regenerate Payroll Batch (with snapshot versioning).
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
            'wallet_id' => 'nullable|exists:wallets,id',
            'replace_existing' => 'nullable|boolean',
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
            'payrolls.*.custom_allowance' => 'nullable|numeric',
            'payrolls.*.custom_deduction' => 'nullable|numeric',
            'payrolls.*.custom_allowance_reason' => 'nullable|string',
            'payrolls.*.custom_deduction_reason' => 'nullable|string',
            'payrolls.*.holiday_days' => 'required|integer',
            'payrolls.*.total_salary' => 'required|numeric',
            'payrolls.*.status' => 'required|string',
            'payrolls.*.notes' => 'nullable|string',
        ]);

        $batchId = $this->payrollCalculationService->storePayrollBatch(
            (int) $validated['month'],
            (int) $validated['year'],
            $validated['payrolls'],
            $validated['wallet_id'] ?? null,
            $user,
            (bool) ($validated['replace_existing'] ?? false)
        );

        return redirect()->back()->with('success', "Payroll versi baru berhasil disimpan (Batch: {$batchId}).");
    }

    /**
     * Approve active payroll batch for a month/year.
     */
    public function approvePayroll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer',
            'year' => 'required|integer',
        ]);

        $this->payrollCalculationService->approvePayrollBatch(
            (int) $validated['month'],
            (int) $validated['year'],
            $request->user()
        );

        return redirect()->back()->with('success', 'Payroll berhasil disetujui (Approved).');
    }

    /**
     * Pay active payroll batch and issue wallet transactions.
     */
    public function payPayroll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer',
            'year' => 'required|integer',
            'wallet_id' => 'required|exists:wallets,id',
        ]);

        $this->payrollCalculationService->payPayrollBatch(
            (int) $validated['month'],
            (int) $validated['year'],
            (int) $validated['wallet_id'],
            $request->user()
        );

        return redirect()->back()->with('success', 'Payroll berhasil dibayarkan dan dicatat ke transaksi Wallet.');
    }

    /**
     * Update employee shift and wage settings.
     */
    public function updateUserSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'fingerprint_id' => 'nullable|string|unique:users,fingerprint_id,'.$request->input('user_id'),
            'shift_start_time' => 'required|string',
            'shift_end_time' => 'required|string',
            'base_salary' => 'required|numeric|min:0',
            'holiday_quota' => 'nullable|integer|min:0',
            'join_date' => 'nullable|date',
            'resign_date' => 'nullable|date',
        ]);

        $u = User::findOrFail($validated['user_id']);
        $u->update([
            'fingerprint_id' => $validated['fingerprint_id'],
            'shift_start_time' => $validated['shift_start_time'],
            'shift_end_time' => $validated['shift_end_time'],
            'base_salary' => $validated['base_salary'],
            'holiday_quota' => $validated['holiday_quota'] ?? 4,
            'join_date' => $validated['join_date'] ?? null,
            'resign_date' => $validated['resign_date'] ?? null,
        ]);

        // Sync active unpaid payroll records for this user to reflect new base salary immediately
        StaffPayroll::where('user_id', $u->id)
            ->where('is_active', true)
            ->where('status', '!=', 'paid')
            ->update([
                'base_salary' => $validated['base_salary'],
            ]);

        return redirect()->back()->with('success', 'Pengaturan shift, gaji, & tanggal bergabung/resign staff berhasil diperbarui.');
    }

    /**
     * Store employee daily shifts (calendar).
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
}

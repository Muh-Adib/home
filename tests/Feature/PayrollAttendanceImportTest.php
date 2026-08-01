<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\StaffPerformanceBonus;
use App\Models\User;
use App\Services\AttendanceService;
use App\Services\PayrollCalculationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollAttendanceImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_sunday_is_not_treated_as_off_day_by_default(): void
    {
        $user = User::factory()->create([
            'role' => 'housekeeping',
            'shift_start_time' => '07:30:00',
            'shift_end_time' => '15:30:00',
        ]);

        $attendanceService = app(AttendanceService::class);

        // A Sunday in August 2026: 2026-08-02
        $sunday = Carbon::create(2026, 8, 2);

        // Calculate daily attendance (with no custom shift)
        $attendanceService->calculateDailyAttendance($user, $sunday, '07:30', '15:30');

        $record = Attendance::where('user_id', $user->id)
            ->whereDate('date', '2026-08-02')
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('present', $record->status);
        $this->assertFalse((bool) $record->is_off_day);
    }

    public function test_holiday_quota_limits_off_days_in_monthly_summary(): void
    {
        $user = User::factory()->create([
            'role' => 'housekeeping',
            'holiday_quota' => 2, // 2 days only
        ]);

        // Mock 4 Sundays where they didn't work (no check-in/out records) in August 2026.
        // In August 2026, Sundays are: 2nd, 9th, 16th, 23rd, 30th.
        // We will query getMonthlyAttendanceSummary for August 2026.
        $attendanceService = app(AttendanceService::class);
        $summary = $attendanceService->getMonthlyAttendanceSummary($user->id, 8, 2026);

        // Since quota is 2, 2 of those non-working days should be holiday/off,
        // and the rest (all other days of the month they did not work) should count as absent.
        // August has 31 days. There are no attendance records, and no custom shifts.
        // Non-work days = 31.
        // Quota = 2 -> 2 holiday days.
        // 31 - 2 = 29 absent days.
        $this->assertEquals(2, $summary['holiday_days']);
        $this->assertEquals(29, $summary['absent_days']);
        $this->assertEquals(0, $summary['present_days']);
    }

    public function test_payroll_dynamic_calculation_returns_shift_times_and_hk_points(): void
    {
        $user = User::factory()->create([
            'role' => 'housekeeping',
            'shift_start_time' => '09:00:00',
            'shift_end_time' => '17:00:00',
            'holiday_quota' => 4,
        ]);

        // Mock a performance bonus record with housekeeping bonus
        StaffPerformanceBonus::create([
            'user_id' => $user->id,
            'month' => 8,
            'year' => 2026,
            'role' => 'housekeeping',
            'housekeeping_bonus' => 500000.0,
            'frontdesk_first_night_bonus' => 0.0,
            'frontdesk_next_nights_bonus_share' => 0.0,
            'kpi_performance_bonus' => 0.0,
            'total_bonus' => 500000.0,
            'status' => 'finalized',
            'details' => [
                'housekeeping_south' => [
                    'points' => 10.0,
                ],
            ],
        ]);

        $payrollService = app(PayrollCalculationService::class);
        $payrolls = $payrollService->calculateDynamicPayroll(8, 2026);

        $row = collect($payrolls)->firstWhere('user_id', $user->id);

        $this->assertNotNull($row);
        $this->assertEquals('09:00:00', $row['shift_start_time']);
        $this->assertEquals('17:00:00', $row['shift_end_time']);
        $this->assertEquals(500000.0, $row['housekeeping_bonus']);
        $this->assertIsArray($row['points_details']);
    }
}

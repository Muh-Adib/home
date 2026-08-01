<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\StaffPerformanceBonus;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AttendanceService;
use App\Services\PayrollCalculationService;
use App\Services\StaffPerformanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollRefactoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_prorated_base_salary_for_mid_month_joiners(): void
    {
        // Employee joined mid-month (13th of July 2026)
        $employee = User::factory()->create([
            'role' => 'front_desk',
            'base_salary' => 3000000,
            'join_date' => Carbon::create(2026, 7, 13),
            'created_at' => Carbon::create(2026, 7, 13),
        ]);

        $service = app(PayrollCalculationService::class);
        $payrolls = $service->calculateDynamicPayroll(7, 2026);

        $employeePayroll = collect($payrolls)->firstWhere('user_id', $employee->id);

        $this->assertNotNull($employeePayroll);
        $this->assertTrue($employeePayroll['prorated']);
        $this->assertLessThan(3000000, $employeePayroll['base_salary']);
    }

    public function test_hr_attendance_correction_records_audit_trail(): void
    {
        $hrAdmin = User::factory()->create(['role' => 'super_admin']);
        $employee = User::factory()->create(['role' => 'housekeeping']);

        $attendance = Attendance::create([
            'user_id' => $employee->id,
            'date' => '2026-07-15',
            'shift_start_time' => '08:00',
            'shift_end_time' => '16:00',
            'check_in' => '09:00',
            'check_out' => '16:00',
            'work_hours' => 7,
            'late_minutes' => 60,
            'status' => 'present',
        ]);

        $service = app(AttendanceService::class);
        $updated = $service->correctAttendance(
            $attendance->id,
            '08:00',
            '16:00',
            'Lupa Tap Fingerprint',
            'Disetujui HR Manager',
            $hrAdmin
        );

        $this->assertTrue($updated->is_corrected);
        $this->assertEquals(0, $updated->late_minutes);

        $this->assertDatabaseHas('attendance_corrections', [
            'attendance_id' => $attendance->id,
            'original_check_in' => '09:00',
            'corrected_check_in' => '08:00',
            'reason' => 'Lupa Tap Fingerprint',
            'corrected_by' => $hrAdmin->id,
        ]);
    }

    public function test_bonus_isolation_only_allows_housekeeping_and_front_office(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $hk = User::factory()->create(['role' => 'housekeeping']);
        $fo = User::factory()->create(['role' => 'front_desk']);
        $finance = User::factory()->create(['role' => 'finance']);

        $service = app(StaffPerformanceService::class);
        $bonuses = $service->calculateAndSaveMonthlyBonuses(7, 2026, [], true, $superAdmin);

        $financeBonus = StaffPerformanceBonus::where('user_id', $finance->id)->where('month', 7)->first();
        $this->assertEquals(0.0, $financeBonus->total_bonus);
    }

    public function test_payroll_regenerate_creates_new_version_and_archives_previous(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'created_at' => '2026-07-01']);
        $employee = User::factory()->create(['role' => 'front_desk', 'base_salary' => 3000000, 'created_at' => '2026-07-01']);

        $service = app(PayrollCalculationService::class);
        $payrollsData = $service->calculateDynamicPayroll(7, 2026);

        // Version 1
        $service->storePayrollBatch(7, 2026, $payrollsData, null, $superAdmin, false);

        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'month' => 7,
            'year' => 2026,
            'version' => 1,
            'is_active' => true,
            'status' => 'generated',
        ]);

        // Version 2 (Regenerate)
        $service->storePayrollBatch(7, 2026, $payrollsData, null, $superAdmin, true);

        // Version 1 archived
        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'month' => 7,
            'year' => 2026,
            'version' => 1,
            'is_active' => false,
            'status' => 'archived',
        ]);

        // Version 2 active
        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'month' => 7,
            'year' => 2026,
            'version' => 2,
            'is_active' => true,
            'status' => 'generated',
        ]);
    }

    public function test_payroll_approval_and_payout_creates_wallet_transaction(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'created_at' => '2026-07-01']);
        $employee = User::factory()->create(['role' => 'front_desk', 'base_salary' => 3000000, 'created_at' => '2026-07-01']);

        $wallet = Wallet::create([
            'name' => 'Rekening Kas Utama',
            'balance' => 10000000,
            'created_by' => $superAdmin->id,
        ]);

        $service = app(PayrollCalculationService::class);
        $payrollsData = $service->calculateDynamicPayroll(7, 2026);

        $service->storePayrollBatch(7, 2026, $payrollsData, $wallet->id, $superAdmin, false);

        // Approve
        $service->approvePayrollBatch(7, 2026, $superAdmin);
        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'status' => 'approved',
        ]);

        // Pay
        $service->payPayrollBatch(7, 2026, $wallet->id, $superAdmin);

        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('property_expenses', [
            'expense_category' => 'salary',
            'wallet_id' => $wallet->id,
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'direction' => 'out',
        ]);
    }

    public function test_custom_salary_allowance_and_deduction_in_payroll(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'created_at' => '2026-07-01']);
        $employee = User::factory()->create(['role' => 'front_desk', 'base_salary' => 3000000, 'created_at' => '2026-07-01']);

        $service = app(PayrollCalculationService::class);
        $payrollsData = $service->calculateDynamicPayroll(7, 2026);

        foreach ($payrollsData as &$row) {
            if ($row['user_id'] === $employee->id) {
                $row['custom_allowance'] = 150000;
                $row['custom_allowance_reason'] = 'Bonus Pencapaian Khusus';
                $row['custom_deduction'] = 50000;
                $row['custom_deduction_reason'] = 'Potongan Kerusakan Alat';
                $row['total_salary'] = $row['base_salary'] + 150000 - 50000;
            }
        }
        unset($row);

        $service->storePayrollBatch(7, 2026, $payrollsData, null, $superAdmin, false);

        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'month' => 7,
            'year' => 2026,
            'custom_allowance' => 150000,
            'custom_deduction' => 50000,
            'custom_allowance_reason' => 'Bonus Pencapaian Khusus',
            'custom_deduction_reason' => 'Potongan Kerusakan Alat',
        ]);
    }
}

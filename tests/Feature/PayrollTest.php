<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthorized_users_cannot_access_payroll(): void
    {
        $guest = User::factory()->create(['role' => 'guest']);
        $frontDesk = User::factory()->create(['role' => 'front_desk']);

        $this->actingAs($guest)
            ->get(route('admin.finance.payroll.index'))
            ->assertStatus(403);

        $this->actingAs($frontDesk)
            ->get(route('admin.finance.payroll.index'))
            ->assertStatus(403);
    }

    public function test_authorized_users_can_access_payroll(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $finance = User::factory()->create(['role' => 'finance']);

        $this->actingAs($superAdmin)
            ->get(route('admin.finance.payroll.index'))
            ->assertStatus(200);

        $this->actingAs($finance)
            ->get(route('admin.finance.payroll.index'))
            ->assertStatus(200);
    }

    public function test_authorized_users_can_store_payroll(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $employee = User::factory()->create(['role' => 'front_desk']);

        $response = $this->actingAs($superAdmin)
            ->post(route('admin.finance.payroll.store'), [
                'month' => 7,
                'year' => 2026,
                'payrolls' => [
                    [
                        'user_id' => $employee->id,
                        'base_salary' => 3000000,
                        'attendance_days' => 26,
                        'absent_days' => 0,
                        'sick_days' => 0,
                        'sick_deduction' => 0,
                        'permission_days' => 0,
                        'permission_deduction' => 0,
                        'absent_deduction' => 0,
                        'late_days' => 0,
                        'late_hours' => 0,
                        'standby_nights' => 0,
                        'late_deduction' => 0,
                        'loan_deduction' => 0,
                        'housekeeping_bonus' => 0,
                        'standby_bonus' => 0,
                        'frontdesk_first_night_bonus' => 15000,
                        'frontdesk_next_nights_bonus_share' => 5000,
                        'overtime_hours' => 0,
                        'overtime_bonus' => 0,
                        'holiday_days' => 0,
                        'total_salary' => 3020000,
                        'status' => 'pending',
                        'notes' => 'Test Gaji',
                    ],
                ],
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('staff_payrolls', [
            'user_id' => $employee->id,
            'month' => 7,
            'year' => 2026,
            'base_salary' => 3000000,
            'total_salary' => 3020000,
            'status' => 'pending',
        ]);
    }
}

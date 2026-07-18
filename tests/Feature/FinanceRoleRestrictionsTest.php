<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FinanceRoleRestrictionsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function finance_role_has_restricted_access_to_finance_and_reports()
    {
        $finance = User::factory()->create([
            'role' => 'finance',
        ]);

        // CAN access expenses
        $this->actingAs($finance)
            ->get('/admin/finance/expenses')
            ->assertStatus(200);

        // CANNOT access general finance index
        $this->actingAs($finance)
            ->get('/admin/finance')
            ->assertStatus(403);

        // CANNOT access incomes
        $this->actingAs($finance)
            ->get('/admin/finance/incomes')
            ->assertStatus(403);

        // CANNOT access wallets
        $this->actingAs($finance)
            ->get('/admin/finance/wallets')
            ->assertStatus(403);

        // CANNOT access report
        $this->actingAs($finance)
            ->get('/admin/finance/report')
            ->assertStatus(403);

        // CANNOT access loans
        $this->actingAs($finance)
            ->get('/admin/finance/loans')
            ->assertStatus(403);

        // CANNOT access payroll
        $this->actingAs($finance)
            ->get('/admin/finance/payroll')
            ->assertStatus(403);

        // CANNOT access financial reports
        $this->actingAs($finance)
            ->get('/admin/reports/financial')
            ->assertStatus(403);

        $this->actingAs($finance)
            ->get('/admin/reports/property-performance')
            ->assertStatus(403);

        $this->actingAs($finance)
            ->get('/admin/reports/staff-performance')
            ->assertStatus(403);

        // CAN access occupancy report
        $this->actingAs($finance)
            ->get('/admin/reports/occupancy')
            ->assertStatus(200);
    }

    #[Test]
    public function property_manager_role_cannot_access_payroll_and_non_occupancy_reports()
    {
        $manager = User::factory()->create([
            'role' => 'property_manager',
        ]);

        // CANNOT access payroll
        $this->actingAs($manager)
            ->get('/admin/finance/payroll')
            ->assertStatus(403);

        // CANNOT access finance, incomes, and wallets
        $this->actingAs($manager)
            ->get('/admin/finance')
            ->assertStatus(403);

        $this->actingAs($manager)
            ->get('/admin/finance/incomes')
            ->assertStatus(403);

        $this->actingAs($manager)
            ->get('/admin/finance/wallets')
            ->assertStatus(403);

        // CANNOT access financial reports
        $this->actingAs($manager)
            ->get('/admin/reports/financial')
            ->assertStatus(403);

        $this->actingAs($manager)
            ->get('/admin/reports/property-performance')
            ->assertStatus(403);

        $this->actingAs($manager)
            ->get('/admin/reports/staff-performance')
            ->assertStatus(403);

        // CAN access occupancy report
        $this->actingAs($manager)
            ->get('/admin/reports/occupancy')
            ->assertStatus(200);
    }
}

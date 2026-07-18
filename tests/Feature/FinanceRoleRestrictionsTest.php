<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use App\Models\Wallet;
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

    #[Test]
    public function super_admin_can_store_an_expense()
    {
        $this->withoutExceptionHandling();
        $admin = User::factory()->create(['role' => 'super_admin']);
        $wallet = Wallet::create([
            'name' => 'Kas kecil',
            'balance' => 500000,
            'created_by' => $admin->id,
        ]);
        $property = Property::factory()->create();

        $response = $this->actingAs($admin)
            ->post('/admin/finance/expenses', [
                'property_id' => $property->id,
                'expense_category' => 'utilities',
                'expense_type' => 'variable',
                'description' => 'Test Expense Description',
                'amount' => 100000,
                'expense_date' => now()->toDateString(),
                'payment_method' => 'cash',
                'wallet_id' => $wallet->id,
                'expense_scope' => 'operational',
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('property_expenses', [
            'amount' => 100000,
            'wallet_id' => $wallet->id,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Income;
use App\Models\PropertyExpense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceDashboardFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_dashboard_displays_cutoff_data_properly(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        // July transactions
        Income::create([
            'source' => 'extra',
            'description' => 'July income',
            'amount' => 500000,
            'income_date' => '2026-07-15',
            'created_by' => $admin->id,
        ]);

        PropertyExpense::create([
            'expense_category' => 'other',
            'expense_type' => 'variable',
            'description' => 'July expense',
            'amount' => 200000,
            'expense_date' => '2026-07-20',
            'expense_scope' => 'operational',
            'recorded_by' => $admin->id,
            'created_by' => $admin->id,
        ]);

        // August transactions (on or after cutoff date of 2026-08-01)
        Income::create([
            'source' => 'extra',
            'description' => 'August income',
            'amount' => 800000,
            'income_date' => '2026-08-05',
            'created_by' => $admin->id,
        ]);

        PropertyExpense::create([
            'expense_category' => 'other',
            'expense_type' => 'variable',
            'description' => 'August expense',
            'amount' => 400000,
            'expense_date' => '2026-08-10',
            'expense_scope' => 'operational',
            'recorded_by' => $admin->id,
            'created_by' => $admin->id,
        ]);

        // Access dashboard with cutoff month set to August 2026
        // This means it will sum everything strictly BEFORE 2026-08-01 (excluding August data)
        $response = $this->actingAs($admin)->get('/admin/finance?month=8&year=2026');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Finance/Index')
            ->where('summary.totalIncome', 500000)
            ->where('summary.totalExpense', 200000)
            ->where('summary.netProfit', 300000)
            ->where('filters.month', 8)
            ->where('filters.year', 2026)
        );
    }
}

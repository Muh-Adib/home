<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\MonthlyPropertySettlement;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Models\Wallet;
use App\Services\MonthlySettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlySettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_generate_monthly_settlement_draft(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['name' => 'Villa Emerald']);

        // Create booking for June 2026
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2026-06-10',
            'check_out' => '2026-06-12',
            'booking_status' => 'confirmed',
            'total_amount' => 2400000,
        ]);

        // Create property expense for June 2026
        PropertyExpense::create([
            'property_id' => $property->id,
            'expense_scope' => 'unit',
            'expense_category' => 'utilities',
            'expense_type' => 'fixed',
            'description' => 'Listrik PLN',
            'amount' => 500000,
            'expense_date' => '2026-06-05',
            'status' => 'approved',
            'created_by' => $admin->id,
            'recorded_by' => $admin->id,
        ]);

        $service = app(MonthlySettlementService::class);
        $settlement = $service->generateSettlement($property, '2026-06', $admin);

        $this->assertEquals('draft', $settlement->status);
        $this->assertEquals(2400000, $settlement->total_omset);
        $this->assertEquals(500000, $settlement->total_fix_cost);
        $this->assertEquals(200000, $settlement->total_ops_fee); // 2 nights x 100k
    }

    public function test_can_finalize_and_close_settlement_with_wallet_mutation(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['name' => 'Villa Emerald']);
        $wallet = Wallet::create([
            'name' => 'Kas Utama Test',
            'balance' => 1000000,
        ]);

        $service = app(MonthlySettlementService::class);
        $settlement = $service->generateSettlement($property, '2026-06', $admin);

        $response = $this->actingAs($admin)
            ->post("/admin/finance/settlements/{$settlement->id}/finalize", [
                'target_wallet_id' => $wallet->id,
            ]);

        $response->assertRedirect();
        $settlement->refresh();

        $this->assertEquals('finalized', $settlement->status);
        $this->assertEquals($wallet->id, $settlement->target_wallet_id);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'reference_type' => MonthlyPropertySettlement::class,
            'reference_id' => $settlement->id,
        ]);
    }

    public function test_bank_account_visibility_mode_scoping(): void
    {
        BankAccount::query()->delete();

        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $pm = User::factory()->create(['role' => 'property_manager']);
        $finance = User::factory()->create(['role' => 'finance']);

        $publicAcc = BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '11111',
            'account_holder' => 'Public Acc',
            'visibility_mode' => 'public',
        ]);

        $pmAcc = BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '22222',
            'account_holder' => 'PM Acc',
            'visibility_mode' => 'super_admin_and_pm',
        ]);

        $superAdminAcc = BankAccount::create([
            'bank_name' => 'BNI',
            'account_number' => '33333',
            'account_holder' => 'Super Admin Acc',
            'visibility_mode' => 'super_admin_only',
        ]);

        // Super admin sees all 3
        $this->assertCount(3, BankAccount::visibleToUser($superAdmin)->get());

        // PM sees 2 (public + super_admin_and_pm)
        $this->assertCount(2, BankAccount::visibleToUser($pm)->get());

        // Finance sees 1 (public only)
        $this->assertCount(1, BankAccount::visibleToUser($finance)->get());
    }
}

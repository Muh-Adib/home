<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Property;
use App\Models\User;
use App\Models\Wallet;
use App\Services\ExpenseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ExpenseModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Property $property;

    private Wallet $mainWallet;

    private Wallet $pettyCash;

    protected function setUp(): void
    {
        parent::setUp();

        // Create user
        $this->admin = User::factory()->create(['role' => 'super_admin']);

        // Create property
        $this->property = Property::factory()->create([
            'owner_id' => $this->admin->id,
            'name' => 'Villa Homs Test',
            'slug' => 'villa-homs-test',
            'type' => 'homestay',
            'ownership_model' => 'partnership',
            'owner_split_pct' => 50.00,
            'investor_split_pct' => 50.00,
            'initial_build_capital' => 100000000,
        ]);

        // Create wallets
        $this->mainWallet = Wallet::create([
            'name' => 'Main Account Bank',
            'type' => 'standalone_savings',
            'balance' => 50000000, // 50 million
            'purpose' => 'main_account',
            'created_by' => $this->admin->id,
        ]);

        $this->pettyCash = Wallet::create([
            'name' => 'Petty Cash Operational',
            'type' => 'standalone_savings',
            'balance' => 2000000, // 2 million
            'purpose' => 'petty_cash',
            'created_by' => $this->admin->id,
        ]);

        // Link BankAccount to main wallet
        BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '1234567890',
            'account_holder' => 'Super Admin',
            'wallet_id' => $this->mainWallet->id,
            'can_receive_payments' => true,
        ]);
    }

    #[Test]
    public function it_can_record_operational_expense_and_deduct_wallet_balance()
    {
        $expenseService = app(ExpenseService::class);

        $data = [
            'property_id' => $this->property->id,
            'expense_category' => 'supplies_small',
            'expense_type' => 'variable',
            'description' => 'Beli Galon Aqua',
            'amount' => 50000,
            'expense_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'wallet_id' => $this->pettyCash->id,
            'expense_scope' => 'operational',
        ];

        $expense = $expenseService->recordExpense($data, $this->admin->id);

        $this->assertDatabaseHas('property_expenses', [
            'id' => $expense->id,
            'amount' => 50000.00,
            'expense_scope' => 'operational',
            'wallet_id' => $this->pettyCash->id,
        ]);

        // Wallet balance should be reduced
        $this->assertEquals(1950000, $this->pettyCash->fresh()->balance);

        // Transaction should be recorded
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $this->pettyCash->id,
            'direction' => 'out',
            'category' => 'expense',
            'amount' => 50000.00,
            'reference_type' => 'expense',
            'reference_id' => $expense->id,
        ]);
    }

    #[Test]
    public function it_can_record_capex_and_prive_with_correct_scopes()
    {
        $expenseService = app(ExpenseService::class);

        // 1. CAPEX Expense
        $capexData = [
            'property_id' => $this->property->id,
            'expense_category' => 'renovation',
            'expense_type' => 'variable',
            'description' => 'Beli Kasur Baru',
            'amount' => 2000000,
            'expense_date' => now()->toDateString(),
            'wallet_id' => $this->mainWallet->id,
            'expense_scope' => 'capital',
            'capital_split_investor_pct' => 50.00,
        ];

        $capex = $expenseService->recordExpense($capexData, $this->admin->id);

        $this->assertDatabaseHas('property_expenses', [
            'id' => $capex->id,
            'expense_scope' => 'capital',
            'capital_split_investor_pct' => 50.00,
        ]);

        // Main wallet balance should be reduced
        $this->assertEquals(48000000, $this->mainWallet->fresh()->balance);

        // 2. Prive Expense
        $priveData = [
            'property_id' => $this->property->id,
            'expense_category' => 'prive',
            'expense_type' => 'variable',
            'description' => 'Tarik Prive Owner',
            'amount' => 500000,
            'expense_date' => now()->toDateString(),
            'wallet_id' => $this->mainWallet->id,
            'expense_scope' => 'prive',
        ];

        $prive = $expenseService->recordExpense($priveData, $this->admin->id);

        // Balance should be reduced again
        $this->assertEquals(47500000, $this->mainWallet->fresh()->balance);

        // Wallet Transaction should have category 'prive'
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $this->mainWallet->id,
            'direction' => 'out',
            'category' => 'prive',
            'amount' => 500000.00,
        ]);
    }

    #[Test]
    public function it_blocks_expense_if_insufficient_wallet_balance()
    {
        $expenseService = app(ExpenseService::class);

        $data = [
            'property_id' => $this->property->id,
            'expense_category' => 'renovation',
            'expense_type' => 'variable',
            'description' => 'Renovasi Besar',
            'amount' => 60000000, // 60 million (wallet only has 50 million)
            'expense_date' => now()->toDateString(),
            'wallet_id' => $this->mainWallet->id,
            'expense_scope' => 'capital',
        ];

        $this->expectException(ValidationException::class);
        $expenseService->recordExpense($data, $this->admin->id);
    }

    #[Test]
    public function it_can_adjust_wallet_balance_properly()
    {
        $expenseService = app(ExpenseService::class);

        // Adjust balance from 2,000,000 to 2,050,000
        $tx = $expenseService->adjustBalance(
            $this->pettyCash->id,
            2050000.00,
            'Kelebihan kas fisik di laci',
            now()->toDateString(),
            $this->admin->id
        );

        $this->assertEquals(2050000.00, $this->pettyCash->fresh()->balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'id' => $tx->id,
            'wallet_id' => $this->pettyCash->id,
            'direction' => 'in',
            'category' => 'adjustment',
            'amount' => 50000.00,
        ]);
    }
}

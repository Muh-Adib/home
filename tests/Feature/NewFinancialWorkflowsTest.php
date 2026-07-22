<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Income;
use App\Models\Payment;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\RefundRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\HousekeepingPointService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NewFinancialWorkflowsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $staffUser;

    private Property $property;

    private Wallet $wallet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'super_admin']);
        $this->staffUser = User::factory()->create(['role' => 'front_desk', 'base_salary' => 3000000]);

        $owner = User::factory()->create(['role' => 'property_owner']);
        $this->property = Property::factory()->create([
            'owner_id' => $owner->id,
            'base_rate' => 1000000,
        ]);

        $this->wallet = Wallet::create([
            'name' => 'Kas Utama',
            'type' => 'standalone_savings',
            'balance' => 10000000,
            'purpose' => 'main_account',
            'created_by' => $this->admin->id,
            'property_id' => $this->property->id,
        ]);

        WalletTransaction::create([
            'wallet_id' => $this->wallet->id,
            'direction' => 'in',
            'amount' => 10000000,
            'category' => 'adjustment',
            'transaction_date' => now()->toDateString(),
            'description' => 'Opening Balance',
            'reference_type' => 'manual',
            'created_by' => $this->admin->id,
        ]);
    }

    #[Test]
    public function e_statement_sync_works_correctly(): void
    {
        $bankAccount = BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '1234567890',
            'account_holder' => 'Kas Utama',
            'wallet_id' => $this->wallet->id,
            'can_receive_payments' => true,
        ]);

        $mutation = BankMutation::create([
            'bank_account_id' => $bankAccount->id,
            'trx_at' => now(),
            'amount' => 150000,
            'direction' => 'debit',
            'sender_name' => 'Suplier Listrik',
            'description' => 'Token Listrik Unit 101',
            'status' => 'baru',
        ]);

        // Get unmapped debit mutations
        $response = $this->actingAs($this->admin)
            ->get(route('admin.finance.unmapped-debit-mutations'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Finance/EStatementSync')
                ->has('mutations')
            );

        // Map it to property expense
        $response = $this->actingAs($this->admin)
            ->post(route('admin.finance.map-debit-mutation'), [
                'bank_mutation_id' => $mutation->id,
                'property_id' => $this->property->id,
                'expense_category' => 'utilities',
                'expense_scope' => 'operational',
                'description' => 'Token Listrik Reconciled',
                'wallet_id' => $this->wallet->id,
            ]);

        $response->assertRedirect();

        // Assert PropertyExpense is created
        $this->assertDatabaseHas('property_expenses', [
            'bank_mutation_id' => $mutation->id,
            'amount' => 150000,
            'expense_category' => 'utilities',
            'status' => 'approved',
        ]);

        // Assert Wallet balance decremented
        $this->wallet->refresh();
        $this->assertEquals(9850000, (int) $this->wallet->balance);
    }

    #[Test]
    public function breakfast_vendor_billing_flow_works(): void
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
        ]);

        $breakfastService = BookingService::create([
            'booking_id' => $booking->id,
            'service_name' => 'Sarapan Spesial',
            'service_type' => 'breakfast',
            'quantity' => 2,
            'unit_price' => 50000,
            'total_price' => 100000,
            'vendor_unit_price' => 35000,
            'vendor_total_price' => 70000,
            'status' => 'provided',
            'service_date' => now(),
        ]);

        // Get unbilled breakfasts
        $response = $this->actingAs($this->admin)
            ->get(route('admin.finance.unbilled-breakfasts'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Finance/BreakfastBilling')
                ->has('breakfasts')
            );

        // Process bill
        $response = $this->actingAs($this->admin)
            ->post(route('admin.finance.bill-breakfasts'), [
                'booking_service_ids' => [$breakfastService->id],
                'vendor_name' => 'Warteg Bahari',
                'wallet_id' => $this->wallet->id,
            ]);

        $response->assertRedirect();

        // Assert PropertyExpense is created for vendor price
        $this->assertDatabaseHas('property_expenses', [
            'amount' => 70000,
            'expense_category' => 'catering',
            'status' => 'approved',
        ]);

        // Assert BookingService is linked to expense
        $breakfastService->refresh();
        $this->assertNotNull($breakfastService->expense_id);

        // Assert Wallet balance decremented
        $this->wallet->refresh();
        $this->assertEquals(9930000, (int) $this->wallet->balance);
    }

    #[Test]
    public function refund_request_request_and_approve_flow(): void
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
        ]);

        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 500000,
            'payment_status' => 'verified',
        ]);

        $income = Income::create([
            'property_id' => $this->property->id,
            'payment_id' => $payment->id,
            'booking_id' => $booking->id,
            'amount' => 500000,
            'source' => 'booking',
            'income_date' => now(),
        ]);

        // 1. Submit refund request
        $response = $this->actingAs($this->staffUser)
            ->post(route('admin.finance.refunds.store'), [
                'payment_id' => $payment->id,
                'amount' => 500000,
                'reason' => 'Double payment refund request',
                'bank_name' => 'BCA',
                'account_number' => '12345678',
                'account_name' => 'John Doe',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('refund_requests', [
            'payment_id' => $payment->id,
            'amount' => 500000,
            'status' => 'pending',
        ]);

        $payment->refresh();
        $this->assertEquals('pending_refund', $payment->payment_status);

        // 2. Approve refund request
        $refundRequest = RefundRequest::first();

        $response = $this->actingAs($this->admin)
            ->post(route('admin.finance.refunds.approve', $refundRequest->id));

        $response->assertRedirect();

        $refundRequest->refresh();
        $this->assertEquals('approved', $refundRequest->status);

        $payment->refresh();
        $this->assertEquals('refunded', $payment->payment_status);

        // Wallet should be decremented
        $this->wallet->refresh();
        $this->assertEquals(9500000, (int) $this->wallet->balance);

        // Income should be deleted
        $this->assertDatabaseMissing('incomes', ['id' => $income->id]);
    }

    #[Test]
    public function housekeeping_pool_and_payroll_integration(): void
    {
        // Setup housekeeping users, check-ins, performance KPIs
        $housekeeper = User::factory()->create(['role' => 'housekeeping', 'base_salary' => 2500000]);

        // Record some check-ins/deals
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'created_by' => $this->staffUser->id,
            'closed_by' => $this->staffUser->id,
            'total_amount' => 2000000,
        ]);

        // Test monthly pool net profit logic
        $pointService = app(HousekeepingPointService::class);

        // Setup some income & expenses to simulate net profit
        Income::create([
            'property_id' => $this->property->id,
            'booking_id' => $booking->id,
            'amount' => 2000000,
            'source' => 'booking',
            'income_date' => now(),
        ]);

        PropertyExpense::create([
            'property_id' => $this->property->id,
            'amount' => 500000,
            'expense_scope' => 'operational',
            'expense_category' => 'utilities',
            'status' => 'approved',
            'expense_date' => now(),
            'description' => 'Tagihan Listrik Bulanan',
            'recorded_by' => $this->admin->id,
            'created_by' => $this->admin->id,
        ]);

        // Calculate pool (Net Profit = 2,000,000 - 500,000 - unrecordedSalaries fallback: base_salaries sum)
        // With $housekeepingPoolPercentage = 5.0
        $poolData = $pointService->getMonthlyPool(now()->month, now()->year, 5.0);

        $this->assertNotNull($poolData);
        $this->assertArrayHasKey('total_pool', $poolData);

        // Test payroll dashboard access
        $response = $this->actingAs($this->admin)
            ->get(route('admin.finance.payroll.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Finance/Payroll')
                ->has('payrolls')
            );
    }
}

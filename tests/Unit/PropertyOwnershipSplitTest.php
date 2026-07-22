<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\FinanceController;
use App\Models\BankAccount;
use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\EmployeeLoan;
use App\Models\Income;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Services\ReconciliationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class PropertyOwnershipSplitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user acting as admin
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin);
    }

    /**
     * Test that group overhead changes do not affect investor split shares, only owner's net profit.
     */
    public function test_group_overhead_increases_do_not_affect_investor_splits()
    {
        // 1. Create a bank account
        $bankAccount = BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '1370500743444',
            'account_holder' => 'Indah Arini Puspitasari',
        ]);

        // 2. Create partnership property (50-50 split)
        $partnershipProperty = Property::create([
            'name' => 'Partnership Unit B',
            'slug' => 'partnership-unit-b',
            'type' => 'homestay',
            'address' => 'Yogyakarta',
            'capacity' => 4,
            'capacity_max' => 6,
            'bedroom_count' => 2,
            'bathroom_count' => 1,
            'base_rate' => 500000,
            'bank_account_id' => $bankAccount->id,
            'ownership_model' => 'partnership',
            'owner_split_pct' => 50.00,
            'investor_split_pct' => 50.00,
            'owner_id' => User::first()->id,
        ]);

        // 3. Create owned property (Terakota)
        $ownedProperty = Property::create([
            'name' => 'Owned Unit Terakota',
            'slug' => 'owned-unit-terakota',
            'type' => 'homestay',
            'address' => 'Yogyakarta',
            'capacity' => 4,
            'capacity_max' => 6,
            'bedroom_count' => 2,
            'bathroom_count' => 1,
            'base_rate' => 600000,
            'bank_account_id' => $bankAccount->id,
            'ownership_model' => 'owned',
            'owner_split_pct' => 100.00,
            'investor_split_pct' => 0.00,
            'monthly_mortgage_cost' => 4000000,
            'mortgage_interest_monthly' => 1500000,
            'owner_id' => User::first()->id,
        ]);

        // 4. Create direct income for partnership property
        Income::create([
            'property_id' => $partnershipProperty->id,
            'amount' => 10000000, // 10 million gross income
            'income_date' => Carbon::now()->toDateString(),
            'source' => 'other',
        ]);

        // 5. Create direct expenses for partnership property
        PropertyExpense::create([
            'property_id' => $partnershipProperty->id,
            'expense_category' => 'utilities',
            'description' => 'Listrik token',
            'amount' => 2000000, // 2 million direct costs
            'expense_date' => Carbon::now()->toDateString(),
            'recorded_by' => User::first()->id,
        ]);

        // 6. Create initial group overhead (e.g. salary)
        $overheadExpense = PropertyExpense::create([
            'property_id' => null, // Global expense
            'expense_category' => 'staff',
            'description' => 'Gaji Karyawan',
            'amount' => 3000000, // 3 million overhead
            'expense_date' => Carbon::now()->toDateString(),
            'recorded_by' => User::first()->id,
        ]);

        // Run report calculation
        $controller = new FinanceController;
        $request = new Request([
            'from' => Carbon::now()->startOfMonth()->toDateString(),
            'to' => Carbon::now()->endOfMonth()->toDateString(),
        ]);

        $response1 = $controller->financialReport($request);
        $data1 = $response1->toResponse($request)->original['page']['props'];

        $partnershipReport1 = collect($data1['byProperty'])->firstWhere('property_id', $partnershipProperty->id);
        $investorAmountBefore = $partnershipReport1['investor_share'];
        $ownerNetProfitBefore = $data1['netProfitOwner'];

        // Laba operasional = 10jt income - 2jt direct expense = 8jt.
        // Split 50-50 means investor gets 4jt, owner gets 4jt.
        $this->assertEquals(4000000, $investorAmountBefore);

        // 7. Increase group overhead by 2 million
        $additionalOverhead = PropertyExpense::create([
            'property_id' => null,
            'expense_category' => 'marketing',
            'description' => 'Iklan Instagram',
            'amount' => 2000000, // 2 million additional overhead
            'expense_date' => Carbon::now()->toDateString(),
            'recorded_by' => User::first()->id,
        ]);

        $response2 = $controller->financialReport($request);
        $data2 = $response2->toResponse($request)->original['page']['props'];

        $partnershipReport2 = collect($data2['byProperty'])->firstWhere('property_id', $partnershipProperty->id);
        $investorAmountAfter = $partnershipReport2['investor_share'];
        $ownerNetProfitAfter = $data2['netProfitOwner'];

        // Investor amount MUST remain exactly same (4 million) because group overhead is paid by owner only
        $this->assertEquals($investorAmountBefore, $investorAmountAfter);
        $this->assertEquals(4000000, $investorAmountAfter);

        // Owner's net profit must decrease by exactly 2 million
        $this->assertEquals($ownerNetProfitBefore - 2000000, $ownerNetProfitAfter);
    }

    /**
     * Test that employee loan (casbon) disbursements do not decrease owner's net profit.
     */
    public function test_casbon_disbursement_does_not_decrease_net_profit()
    {
        // Get initial report state
        $controller = new FinanceController;
        $request = new Request([
            'from' => Carbon::now()->startOfMonth()->toDateString(),
            'to' => Carbon::now()->endOfMonth()->toDateString(),
        ]);

        $response1 = $controller->financialReport($request);
        $data1 = $response1->toResponse($request)->original['page']['props'];
        $ownerNetProfitBefore = $data1['netProfitOwner'];

        // Create an employee loan (casbon) of 1 million
        $employee = User::factory()->create(['role' => 'housekeeping']);
        EmployeeLoan::create([
            'employee_id' => $employee->id,
            'amount' => 1000000,
            'disbursed_at' => Carbon::now()->toDateString(),
            'status' => 'active',
            'created_by' => User::first()->id,
        ]);

        $response2 = $controller->financialReport($request);
        $data2 = $response2->toResponse($request)->original['page']['props'];
        $ownerNetProfitAfter = $data2['netProfitOwner'];

        // Net profit should remain exactly the same
        $this->assertEquals($ownerNetProfitBefore, $ownerNetProfitAfter);
        $this->assertEquals(1000000, $data2['loanDisbursements']);
        $this->assertEquals(1000000, $data2['outstandingLoans']);
    }

    /**
     * Test that ReconciliationService automatically matches mutation amount to pending payment
     */
    public function test_reconciliation_service_matches_correct_bank_mutation()
    {
        // 1. Create a bank account
        $bankAccount = BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '1370500743444',
            'account_holder' => 'Indah Arini Puspitasari',
        ]);

        // 2. Create property
        $property = Property::create([
            'name' => 'Partnership Unit B',
            'slug' => 'partnership-unit-b',
            'type' => 'homestay',
            'address' => 'Yogyakarta',
            'capacity' => 4,
            'capacity_max' => 6,
            'bedroom_count' => 2,
            'bathroom_count' => 1,
            'base_rate' => 500000,
            'bank_account_id' => $bankAccount->id,
            'ownership_model' => 'partnership',
            'owner_split_pct' => 50.00,
            'investor_split_pct' => 50.00,
            'owner_id' => User::first()->id,
        ]);

        // 3. Create a booking
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_number' => 'BK-1000',
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '08123456789',
            'check_in' => Carbon::now()->toDateString(),
            'check_out' => Carbon::now()->addDays(2)->toDateString(),
            'guest_count' => 2,
            'base_amount' => 1000000,
            'total_amount' => 1000000,
            'dp_amount' => 300000,    // 30% of 1000000
            'dp_paid_amount' => 0,
            'remaining_amount' => 1000000,
            'booking_status' => 'pending',
            'payment_status' => 'unpaid',
            'verification_status' => 'unverified',
        ]);

        // Create a payment method
        $paymentMethod = PaymentMethod::create([
            'name' => 'Transfer Bank',
            'code' => 'bank_transfer',
            'type' => 'manual',
            'is_active' => true,
        ]);

        // 4. Create a payment awaiting reconciliation (status 'menunggu')
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'payment_number' => 'PAY-1000',
            'payment_method_id' => $paymentMethod->id,
            'amount' => 500000,
            'payment_type' => 'dp',
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
            'status' => 'menunggu',
            'unique_code' => 123,
            'expected_amount' => 500123,
            'payment_date' => now(),
        ]);

        // 5. Create a bank mutation record representing the bank transfer
        $mutation = BankMutation::create([
            'bank_account_id' => $bankAccount->id,
            'trx_at' => now(),
            'amount' => 500123,
            'direction' => 'kredit',
            'sender_name' => 'JOHN DOE',
            'description' => 'Trsf dari John Doe',
            'external_ref' => 'REF-123456',
            'source' => 'impor',
            'status' => 'baru',
        ]);

        // 6. Perform matching
        $matched = ReconciliationService::match($mutation);

        $this->assertTrue($matched);

        // Verify status updates
        $payment->refresh();
        $mutation->refresh();
        $booking->refresh();

        $this->assertEquals('cocok', $payment->status);
        $this->assertEquals('verified', $payment->payment_status);
        $this->assertEquals($mutation->id, $payment->matched_mutation_id);
        $this->assertNotNull($payment->matched_at);

        $this->assertEquals('cocok', $mutation->status);
        $this->assertEquals($payment->id, $mutation->matched_payment_id);

        $this->assertEquals('dp_received', $booking->payment_status);
        $this->assertEquals(500000, $booking->dp_paid_amount);
    }
}

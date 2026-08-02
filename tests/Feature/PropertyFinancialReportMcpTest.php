<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Services\PropertyFinancialReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyFinancialReportMcpTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_expense_and_generate_july_financial_report_by_ownership_schema(): void
    {
        // 1. Create properties with different ownership models
        $rentedProp = Property::factory()->create([
            'name' => 'Villa Rented',
            'slug' => 'villa-rented',
            'ownership_model' => 'rented',
            'monthly_rent_cost' => 5000000.00,
            'owner_split_pct' => 100,
            'investor_split_pct' => 0,
        ]);

        $partnershipProp = Property::factory()->create([
            'name' => 'Villa Partner',
            'slug' => 'villa-partner',
            'ownership_model' => 'partnership',
            'owner_split_pct' => 60,
            'investor_split_pct' => 40,
        ]);

        // 2. Create bookings for July 2026
        Booking::factory()->create([
            'property_id' => $rentedProp->id,
            'check_in' => '2026-07-05',
            'check_out' => '2026-07-10',
            'total_amount' => 10000000,
            'booking_status' => 'confirmed',
            'commission_pct' => 0,
        ]);

        Booking::factory()->create([
            'property_id' => $partnershipProp->id,
            'check_in' => '2026-07-12',
            'check_out' => '2026-07-17',
            'total_amount' => 20000000,
            'booking_status' => 'confirmed',
            'commission_pct' => 0,
        ]);

        $service = app(PropertyFinancialReportService::class);

        // 3. Record operational expense
        $exp = $service->recordExpense([
            'property_id' => $rentedProp->id,
            'amount' => 1000000,
            'description' => 'Listrik & WiFi Juli',
            'expense_category' => 'utilities',
            'expense_scope' => 'operational',
            'expense_date' => '2026-07-25',
        ]);

        $this->assertDatabaseHas('property_expenses', [
            'id' => $exp->id,
            'amount' => 1000000,
            'property_id' => $rentedProp->id,
        ]);

        // 4. Generate July report and save to DB
        $reportData = $service->generateMonthlyReport(7, 2026, null, true);

        $this->assertEquals(2, $reportData['summary']['total_properties']);
        $this->assertEquals(30000000, $reportData['summary']['total_income']);

        // Check rented property calculation: Laba Operasional = 10,000,000 - 1,000,000 = 9,000,000. Rent = 5,166,666.67. Net owner = 3,833,333.33
        $rentedReport = collect($reportData['properties'])->firstWhere('property_id', $rentedProp->id);
        $this->assertEquals(10000000, $rentedReport['total_income']);
        $this->assertEquals(1000000, $rentedReport['operational_expenses']);
        $this->assertEquals(9000000, $rentedReport['laba_operasional']);

        // Check partnership property calculation: 20,000,000. Investor (40%) = 8,000,000. Owner (60%) = 12,000,000.
        $partnerReport = collect($reportData['properties'])->firstWhere('property_id', $partnershipProp->id);
        $this->assertEquals(20000000, $partnerReport['total_income']);
        $this->assertEquals(8000000, $partnerReport['investor_share']);
        $this->assertEquals(12000000, $partnerReport['owner_share']);

        $this->assertDatabaseHas('financial_reports', [
            'property_id' => $rentedProp->id,
            'report_period' => '2026-07',
            'report_type' => 'monthly',
        ]);

        // 5. Test CLI commands
        $this->artisan('finance:record-expense', [
            'property' => $rentedProp->slug,
            'amount' => 500000,
            'description' => 'Pembelian Amenitas',
        ])->assertExitCode(0);

        $this->artisan('finance:july-report', [
            '--save' => true,
        ])->assertExitCode(0);
    }
}

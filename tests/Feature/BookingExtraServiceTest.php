<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Payment;
use App\Models\Property;
use App\Models\ServiceMaster;
use App\Services\BookingExtraServiceSyncService;
use App\Services\PaymentIncomeSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingExtraServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_service_sync_stores_vendor_prices_and_dates(): void
    {
        $property = Property::factory()->create();

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->addDays(1),
            'check_out' => now()->addDays(3),
            'base_amount' => 1000000,
            'total_amount' => 1000000,
            'dp_percentage' => 30,
            'dp_amount' => 300000,
            'remaining_amount' => 700000,
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
        ]);

        $servicesData = [
            [
                'service_name' => 'Breakfast Day 1',
                'service_type' => 'breakfast',
                'quantity' => 2,
                'unit_price' => 50000,
                'discount_amount' => 10000,
                'total_price' => 80000, // 2 * (50000 - 10000)
                'vendor_unit_price' => 30000,
                'vendor_total_price' => 60000,
                'service_date' => now()->addDays(1)->toDateString(),
            ],
            [
                'service_name' => 'Breakfast Day 2',
                'service_type' => 'breakfast',
                'quantity' => 1,
                'unit_price' => 45000,
                'discount_amount' => 5000,
                'total_price' => 40000, // 1 * (45000 - 5000)
                'vendor_unit_price' => 25000,
                'vendor_total_price' => 25000,
                'service_date' => now()->addDays(2)->toDateString(),
            ],
        ];

        $syncService = new BookingExtraServiceSyncService;
        $total = $syncService->sync($booking, $servicesData, true);

        $this->assertEquals(120000, $total);
        $this->assertDatabaseCount('booking_services', 2);

        $this->assertDatabaseHas('booking_services', [
            'booking_id' => $booking->id,
            'service_name' => 'Breakfast Day 1',
            'discount_amount' => 10000,
            'vendor_unit_price' => 30000,
            'vendor_total_price' => 60000,
            'service_date' => now()->addDays(1)->toDateString().' 00:00:00',
        ]);
    }

    public function test_payment_income_sync_splits_room_and_extra_services_proportionally(): void
    {
        $property = Property::factory()->create();

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'base_amount' => 1000000, // Room charge
            'total_amount' => 1200000, // Room charge + services
            'dp_percentage' => 50,
            'dp_amount' => 600000,
            'remaining_amount' => 600000,
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
        ]);

        // Create 2 nights of BookingDailyRevenue
        $date1 = now()->addDays(1)->format('Y-m-d');
        $date2 = now()->addDays(2)->format('Y-m-d');

        BookingDailyRevenue::create([
            'booking_id' => $booking->id,
            'property_id' => $property->id,
            'tanggal' => $date1,
            'amount' => 600000,
            'base_amount' => 500000,
        ]);

        BookingDailyRevenue::create([
            'booking_id' => $booking->id,
            'property_id' => $property->id,
            'tanggal' => $date2,
            'amount' => 600000,
            'base_amount' => 500000,
        ]);

        // Create verified payment of 600,000 (50% DP)
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'payment_number' => 'PAY-TEST-001',
            'amount' => 600000,
            'payment_type' => 'dp',
            'payment_method' => 'manual',
            'payment_status' => 'verified',
            'payment_date' => now(),
        ]);

        $syncService = new PaymentIncomeSyncService;
        $result = $syncService->syncOnVerified($payment);

        $this->assertTrue($result);

        // Under daily allocation:
        // total payment verified = 600,000
        // Night 1 (date1) daily amount is 600,000 -> gets filled with 600,000
        // Night 2 (date2) has remaining amount = 0 -> gets 0 (no record created)
        $this->assertDatabaseHas('incomes', [
            'booking_id' => $booking->id,
            'payment_id' => $payment->id,
            'source' => 'booking',
            'amount' => 600000,
            'income_date' => $date1.' 00:00:00',
        ]);

        $this->assertDatabaseMissing('incomes', [
            'booking_id' => $booking->id,
            'income_date' => $date2,
        ]);
    }

    public function test_booking_service_sync_auto_calculates_discounts_based_on_master(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->addDays(1),
            'check_out' => now()->addDays(3),
            'base_amount' => 1000000,
            'total_amount' => 1000000,
        ]);

        $master = ServiceMaster::create([
            'name' => 'Breakfast Special',
            'service_type' => 'breakfast',
            'unit_price' => 30000,
            'vendor_unit_price' => 20000,
            'discount_amount' => 5000,
            'discount_limit' => 2,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        // Request has total 3 breakfasts: 2 on day 1, 1 on day 2
        // It does not specify prices - those should be pulled from the master!
        $servicesData = [
            [
                'service_master_id' => $master->id,
                'service_name' => 'Breakfast Special',
                'service_type' => 'breakfast',
                'quantity' => 2,
                'unit_price' => 0, // Should be auto-populated
                'total_price' => 0, // Should be auto-calculated
                'service_date' => now()->addDays(1)->toDateString(),
            ],
            [
                'service_master_id' => $master->id,
                'service_name' => 'Breakfast Special',
                'service_type' => 'breakfast',
                'quantity' => 1,
                'unit_price' => 0, // Should be auto-populated
                'total_price' => 0, // Should be auto-calculated
                'service_date' => now()->addDays(2)->toDateString(),
            ],
        ];

        $syncService = new BookingExtraServiceSyncService;
        $total = $syncService->sync($booking, $servicesData, true);

        // Total should be: (2 * (30000 - 5000)) + (1 * 30000) = 50000 + 30000 = 80000
        $this->assertEquals(80000, $total);

        // Assert Day 1 record has discount of 5000 per unit
        $this->assertDatabaseHas('booking_services', [
            'booking_id' => $booking->id,
            'service_master_id' => $master->id,
            'quantity' => 2,
            'unit_price' => 30000,
            'discount_amount' => 5000,
            'total_price' => 50000,
            'vendor_unit_price' => 20000,
            'vendor_total_price' => 40000,
            'service_date' => now()->addDays(1)->toDateString().' 00:00:00',
        ]);

        // Assert Day 2 record has discount of 0
        $this->assertDatabaseHas('booking_services', [
            'booking_id' => $booking->id,
            'service_master_id' => $master->id,
            'quantity' => 1,
            'unit_price' => 30000,
            'discount_amount' => 0,
            'total_price' => 30000,
            'vendor_unit_price' => 20000,
            'vendor_total_price' => 20000,
            'service_date' => now()->addDays(2)->toDateString().' 00:00:00',
        ]);
    }
}

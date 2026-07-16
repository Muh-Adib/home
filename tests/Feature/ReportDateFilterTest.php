<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReportDateFilterTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function property_performance_report_includes_first_day_of_month_data(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-07-01',
            'check_out' => '2026-07-03',
        ]);

        // Create revenue records for the first day (July 1st) and mid month (July 15th)
        BookingDailyRevenue::create([
            'booking_id' => $booking->id,
            'property_id' => $property->id,
            'tanggal' => '2026-07-01',
            'amount' => 500000,
            'base_amount' => 500000,
        ]);

        BookingDailyRevenue::create([
            'booking_id' => $booking->id,
            'property_id' => $property->id,
            'tanggal' => '2026-07-15',
            'amount' => 600000,
            'base_amount' => 600000,
        ]);

        // Query the report for July 2026
        $response = $this->actingAs($admin)->get(route('admin.reports.property-performance', [
            'date_from' => '2026-07-01',
            'date_to' => '2026-07-31',
            'period' => 'custom',
            'property_id' => 'all',
        ]));

        $response->assertStatus(200);

        // Assert that both revenue entries are present in the response data
        $response->assertInertia(function ($page) {
            $data = $page->toArray()['props']['data'];
            $this->assertNotEmpty($data['dailyBreakdown']);

            $dates = collect($data['dailyBreakdown'])->pluck('date')->toArray();
            $this->assertContains('2026-07-01', $dates);
            $this->assertContains('2026-07-15', $dates);
        });
    }

    #[Test]
    public function property_performance_report_correctly_filters_checked_out_and_cancelled_bookings(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);

        // 1. Checked-out booking (Should be included)
        $checkoutBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'checked_out',
            'check_in' => '2026-07-01',
            'check_out' => '2026-07-03',
        ]);
        BookingDailyRevenue::create([
            'booking_id' => $checkoutBooking->id,
            'property_id' => $property->id,
            'tanggal' => '2026-07-02',
            'amount' => 400000,
            'base_amount' => 400000,
        ]);

        // 2. Paid cancelled booking (Should be included)
        $paidCancelBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'cancelled',
            'payment_status' => 'dp_received',
            'check_in' => '2026-07-04',
            'check_out' => '2026-07-06',
        ]);
        BookingDailyRevenue::create([
            'booking_id' => $paidCancelBooking->id,
            'property_id' => $property->id,
            'tanggal' => '2026-07-05',
            'amount' => 300000,
            'base_amount' => 300000,
        ]);

        // 3. Unpaid cancelled booking (Should be excluded)
        $unpaidCancelBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'cancelled',
            'payment_status' => 'dp_pending',
            'check_in' => '2026-07-07',
            'check_out' => '2026-07-09',
        ]);
        BookingDailyRevenue::create([
            'booking_id' => $unpaidCancelBooking->id,
            'property_id' => $property->id,
            'tanggal' => '2026-07-08',
            'amount' => 200000,
            'base_amount' => 200000,
        ]);

        // Query the report for July 2026
        $response = $this->actingAs($admin)->get(route('admin.reports.property-performance', [
            'date_from' => '2026-07-01',
            'date_to' => '2026-07-31',
            'period' => 'custom',
            'property_id' => 'all',
        ]));

        $response->assertStatus(200);

        $response->assertInertia(function ($page) {
            $data = $page->toArray()['props']['data'];
            $dates = collect($data['dailyBreakdown'])->pluck('date')->toArray();

            // Should contain July 2nd (checked_out) and July 5th (paid cancelled)
            $this->assertContains('2026-07-02', $dates);
            $this->assertContains('2026-07-05', $dates);

            // Should NOT contain July 8th (unpaid cancelled)
            $this->assertNotContains('2026-07-08', $dates);
        });
    }

    #[Test]
    public function daily_revenue_sync_command_correctly_syncs_dynamic_extra_beds(): void
    {
        $property = Property::factory()->create(['status' => 'active', 'base_rate' => 500000]);
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-07-01',
            'check_out' => '2026-07-03',
            'guest_count' => 2,
        ]);

        // Create a dynamic extra bed service for July 2nd
        $booking->services()->create([
            'service_name' => 'Extra Bed Dynamic',
            'service_type' => 'extra_bed',
            'quantity' => 2,
            'unit_price' => 150000,
            'total_price' => 300000,
            'service_date' => '2026-07-02',
        ]);

        // Run the sync console command
        $this->artisan('booking:sync-daily-revenue', [
            '--booking' => $booking->id,
        ])->assertExitCode(0);

        // Fetch daily revenues and verify July 2nd has 2 extra beds and 300,000 amount
        $rev1 = BookingDailyRevenue::where('booking_id', $booking->id)->where('tanggal', '2026-07-01')->first();
        $rev2 = BookingDailyRevenue::where('booking_id', $booking->id)->where('tanggal', '2026-07-02')->first();

        $this->assertNotNull($rev1);
        $this->assertNotNull($rev2);

        // July 1st has no service specific record, fallback to 0 or booking-level exbeds
        $this->assertEquals(0, $rev1->extra_bed_count);

        // July 2nd has the dynamic extra bed service (qty = 2, amount = 300,000)
        $this->assertEquals(2, $rev2->extra_bed_count);
        $this->assertEquals(300000, $rev2->extra_bed_amount);
    }
}

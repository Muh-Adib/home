<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Income;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class BookingImportExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Reset custom test now before each test
        Carbon::setTestNow();
    }

    public function test_admin_can_export_bookings()
    {
        Excel::fake();
        Carbon::setTestNow('2026-07-11 12:00:00');

        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        Booking::factory()->count(5)->create(['property_id' => $property->id]);

        $response = $this->actingAs($admin)
            ->get(route('admin.bookings.export'));

        $response->assertStatus(200);
        Excel::assertDownloaded('bookings_2026-07-11_120000.xlsx');
    }

    public function test_admin_can_preview_and_confirm_import_bookings_with_payment_and_income_sync()
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'name' => 'Admin Name']);
        $staff = User::factory()->create(['role' => 'property_manager', 'name' => 'Staff Name']);
        $property = Property::factory()->create([
            'name' => 'Test Property',
            'capacity' => 2,
            'capacity_max' => 4,
            'extra_bed_rate' => 150000,
        ]);
        $paymentMethod = PaymentMethod::factory()->create(['name' => 'Manual Transfer', 'type' => 'transfer', 'is_active' => true]);

        // Create a valid Excel file using PhpSpreadsheet
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $headers = [
            'Booking Number', 'Property Name', 'Property Capacity', 'Property Max Capacity',
            'Guest Name', 'Guest Email', 'Guest Phone', 'Guest Country', 'Guest ID Number',
            'Guest Gender', 'Guest Male', 'Guest Female', 'Guest Children', 'Effective Guest Count',
            'Relationship Type', 'Check In', 'Check In Time', 'Check Out', 'Nights', 'Base Amount',
            'Extra Bed Amount', 'Service Amount', 'Tax Amount', 'Total Amount', 'DP Percentage',
            'DP Amount', 'Remaining Amount', 'Booking Status', 'Payment Status',
            'Payment 1 Amount', 'Payment 1 Date', 'Payment 1 Method', 'Payment 1 Status',
            'Payment 2 Amount', 'Payment 2 Date', 'Payment 2 Method', 'Payment 2 Status',
            'Internal Notes', 'Created At', 'Created By', 'Verified By', 'Followed Up By', 'Closed By',
        ];

        $rowData = [
            'BK-IMPORT-99', 'Test Property', 2, 4,
            'John Doe', 'john@example.com', '6281234567890', 'Indonesia', '1234567890',
            'male', 2, 0, 0, 2,
            'keluarga', '12/07/2026', '14:00', '15/07/2026', 3, 1500000,
            300000, 0, 0, 1800000, 50,
            900000, 900000, 'confirmed', 'fully_paid',
            1000000, '12/07/2026', 'Manual Transfer', 'verified',
            800000, '13/07/2026', 'Manual Transfer', 'verified',
            'notes', '2026-07-11 12:00:00', 'Admin Name', 'Admin Name', 'Staff Name', 'Staff Name',
        ];

        $sheet->fromArray([$headers, $rowData]);

        $tempFile = tempnam(sys_get_temp_dir(), 'test_import');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempFile);

        $file = new UploadedFile($tempFile, 'bookings.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        // 1. Preview
        $response = $this->actingAs($admin)
            ->post(route('admin.bookings.import.preview'), [
                'file' => $file,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'preview' => [
                'new',
                'updated',
                'unchanged',
                'errors',
            ],
            'summary',
        ]);

        // 2. Confirm import (which actually runs Excel::import)
        $responseConfirm = $this->actingAs($admin)
            ->post(route('admin.bookings.import.confirmed'), [
                'file' => $file,
                'accepted_rows' => [2], // Row 2 is our row
            ]);

        $responseConfirm->assertStatus(302); // Redirect back

        // Assert Booking was created
        $booking = Booking::where('booking_number', 'BK-IMPORT-99')->first();
        $this->assertNotNull($booking);
        $this->assertEquals('confirmed', $booking->booking_status);
        $this->assertEquals('fully_paid', $booking->payment_status);
        $this->assertEquals(1800000, $booking->total_amount);
        $this->assertEquals(1500000, $booking->base_amount);
        $this->assertEquals(300000, $booking->extra_bed_amount);
        $this->assertEquals(2, $booking->extra_bed_count);
        $this->assertEquals($admin->id, $booking->created_by);
        $this->assertEquals($admin->id, $booking->verified_by);
        $this->assertEquals($staff->id, $booking->followed_up_by);
        $this->assertEquals($staff->id, $booking->closed_by);

        // Assert BookingDailyRevenue records were created (3 nights)
        // daily base: 1500k/3 = 500k
        // daily extra: 300k/3 = 100k
        // daily count: 2 extra beds/3 nights = 0, remainder 2 -> first 2 nights should have 1, last night 0
        $dailyRevenues = BookingDailyRevenue::where('booking_id', $booking->id)->orderBy('tanggal')->get();
        $this->assertCount(3, $dailyRevenues);

        $this->assertEquals(600000, $dailyRevenues[0]->amount);
        $this->assertEquals(500000, $dailyRevenues[0]->base_amount);
        $this->assertEquals(100000, $dailyRevenues[0]->extra_bed_amount);
        $this->assertEquals(1, $dailyRevenues[0]->extra_bed_count);

        $this->assertEquals(600000, $dailyRevenues[1]->amount);
        $this->assertEquals(500000, $dailyRevenues[1]->base_amount);
        $this->assertEquals(100000, $dailyRevenues[1]->extra_bed_amount);
        $this->assertEquals(1, $dailyRevenues[1]->extra_bed_count);

        $this->assertEquals(600000, $dailyRevenues[2]->amount);
        $this->assertEquals(500000, $dailyRevenues[2]->base_amount);
        $this->assertEquals(100000, $dailyRevenues[2]->extra_bed_amount);
        $this->assertEquals(0, $dailyRevenues[2]->extra_bed_count);

        // Assert two payments were created and verified
        $payments = Payment::where('booking_id', $booking->id)->orderBy('created_at')->get();
        $this->assertCount(2, $payments);

        $this->assertEquals('verified', $payments[0]->payment_status);
        $this->assertEquals(1000000, $payments[0]->amount);
        $this->assertEquals('12/07/2026', $payments[0]->payment_date->format('d/m/Y'));

        $this->assertEquals('verified', $payments[1]->payment_status);
        $this->assertEquals(800000, $payments[1]->amount);
        $this->assertEquals('13/07/2026', $payments[1]->payment_date->format('d/m/Y'));

        // Assert Income records were synced per day (3 nights of 600k each = 1.8M total synced incomes)
        $incomes = Income::where('booking_id', $booking->id)->orderBy('income_date')->get();
        $this->assertCount(3, $incomes);
        foreach ($incomes as $income) {
            $this->assertEquals(600000, $income->amount);
        }

        @unlink($tempFile);
    }
}

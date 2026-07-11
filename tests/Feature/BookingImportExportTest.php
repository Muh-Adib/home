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
        $property = Property::factory()->create(['name' => 'Test Property', 'capacity' => 2, 'capacity_max' => 4]);
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
            'DP Amount', 'Remaining Amount', 'Booking Status', 'Payment Status', 'Payment Method',
            'Internal Notes', 'Created At', 'Created By', 'Verified By',
        ];

        $rowData = [
            'BK-IMPORT-99', 'Test Property', 2, 4,
            'John Doe', 'john@example.com', '6281234567890', 'Indonesia', '1234567890',
            'male', 2, 0, 0, 2,
            'keluarga', '12/07/2026', '14:00', '15/07/2026', 3, 1500000,
            0, 0, 0, 1500000, 50,
            750000, 750000, 'confirmed', 'fully_paid', 'Manual Transfer',
            'notes', '2026-07-11 12:00:00', 'Admin Name', 'Admin Name',
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
        $this->assertEquals(1500000, $booking->total_amount);
        $this->assertEquals(1500000, $booking->base_amount);

        // Assert BookingDailyRevenue records were created (3 nights)
        $dailyRevenues = BookingDailyRevenue::where('booking_id', $booking->id)->get();
        $this->assertCount(3, $dailyRevenues);
        foreach ($dailyRevenues as $revenue) {
            $this->assertEquals(500000, $revenue->amount);
            $this->assertEquals(500000, $revenue->base_amount);
        }

        // Assert Payment was created and verified
        $payment = Payment::where('booking_id', $booking->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('verified', $payment->payment_status);
        $this->assertEquals(1500000, $payment->amount);

        // Assert Income records were synced per day (3 nights of 500k each)
        $incomes = Income::where('booking_id', $booking->id)->get();
        $this->assertCount(3, $incomes);
        foreach ($incomes as $income) {
            $this->assertEquals(500000, $income->amount);
        }

        @unlink($tempFile);
    }
}

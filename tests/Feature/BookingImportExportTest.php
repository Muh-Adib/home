<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

class BookingImportExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_export_bookings()
    {
        Excel::fake();

        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        Booking::factory()->count(5)->create(['property_id' => $property->id]);

        $response = $this->actingAs($admin)
            ->get(route('admin.bookings.export'));

        $response->assertStatus(200);
        Excel::assertDownloaded('bookings.xlsx');
    }

    public function test_admin_can_import_bookings()
    {
        Excel::fake();

        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['name' => 'Test Property']);

        $file = UploadedFile::fake()->create('bookings.xlsx');

        $response = $this->actingAs($admin)
            ->post(route('admin.bookings.import'), [
                'file' => $file,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        
        Excel::assertImported('bookings.xlsx');
    }
}

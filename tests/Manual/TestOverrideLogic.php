<?php

namespace Tests\Manual;

use App\Models\Property;
use App\Models\Booking;
use App\Services\AvailabilityService;
use Illuminate\Support\Carbon;

class TestOverrideLogic
{
    public function run()
    {
        $log = "";

        // 1. Setup - Find or Create Property
        $property = Property::first();
        if (!$property) {
            file_put_contents('test_override_output.txt', "No property found.\n");
            return;
        }

        $log .= "Testing Logic on Property: {$property->name} (ID: {$property->id})\n";

        // 2. Define Test Dates (Far future to avoid conflicts)
        $dateA = Carbon::now()->addYears(2); // OTA Date
        $dateB = Carbon::now()->addYears(2)->addMonth(); // Direct Date

        // Cleanup potential debris from previous failed runs
        Booking::where('property_id', $property->id)
            ->whereIn('check_in', [$dateA->format('Y-m-d'), $dateB->format('Y-m-d')])
            ->forceDelete();

        // 3. Create Scenarios

        // Scenario A: OTA Booking
        $otaBooking = Booking::create([
            'property_id' => $property->id,
            'booking_number' => 'TEST-OTA-' . uniqid(),
            'guest_name' => 'Test OTA',
            'guest_email' => 'test@ota.com',
            'guest_phone' => '0000',
            'guest_count' => 1,
            'check_in' => $dateA,
            'check_out' => $dateA->copy()->addDay(),
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid',
            'source' => 'airbnb',
            'relationship_type' => 'keluarga',
            'guest_gender' => 'male',
            'guest_country' => 'Indonesia',
            'check_in_time' => '14:00',
            'base_amount' => 100000,
            'total_amount' => 100000,
            'remaining_amount' => 0,
        ]);
        $log .= "Created OTA Booking (Airbnb) on {$dateA->toDateString()}\n";

        // Scenario B: Direct Booking
        $directBooking = Booking::create([
            'property_id' => $property->id,
            'booking_number' => 'TEST-DIRECT-' . uniqid(),
            'guest_name' => 'Test Direct',
            'guest_email' => 'test@direct.com',
            'guest_phone' => '0000',
            'guest_count' => 1,
            'check_in' => $dateB,
            'check_out' => $dateB->copy()->addDay(),
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid',
            'source' => 'direct',
            'relationship_type' => 'keluarga',
            'guest_gender' => 'male',
            'guest_country' => 'Indonesia',
            'check_in_time' => '14:00',
            'base_amount' => 100000,
            'total_amount' => 100000,
            'remaining_amount' => 0,
        ]);
        $log .= "Created Direct Booking on {$dateB->toDateString()}\n";

        // 4. Verify Logic
        $service = app(AvailabilityService::class);

        // Test OTA Override
        $checkA_Normal = $service->checkAvailability($property, $dateA->toDateString(), $dateA->copy()->addDay()->toDateString());
        $checkA_Override = $service->checkAvailability($property, $dateA->toDateString(), $dateA->copy()->addDay()->toDateString(), null, null, true);

        $log .= "--- Scenario A: OTA Booking ---\n";
        $log .= "Normal Check (Should Fail): " . ($checkA_Normal['available'] ? 'Available (FAIL)' : 'Blocked (PASS)') . "\n";
        $log .= "Override Check (Should Pass): " . ($checkA_Override['available'] ? 'Available (PASS)' : 'Blocked (FAIL)') . "\n";

        // Test Direct Non-Override
        $checkB_Normal = $service->checkAvailability($property, $dateB->toDateString(), $dateB->copy()->addDay()->toDateString());
        // Even with override=true, it should fail because source is 'direct'
        $checkB_Override = $service->checkAvailability($property, $dateB->toDateString(), $dateB->copy()->addDay()->toDateString(), null, null, true);

        $log .= "--- Scenario B: Direct Booking ---\n";
        $log .= "Normal Check (Should Fail): " . ($checkB_Normal['available'] ? 'Available (FAIL)' : 'Blocked (PASS)') . "\n";
        $log .= "Override Check (Should Fail): " . ($checkB_Override['available'] ? 'Available (FAIL - Override Direct)' : 'Blocked (PASS)') . "\n";

        // 5. Cleanup
        // $otaBooking->forceDelete();
        // $directBooking->forceDelete();
        $log .= "Cleanup skipped for review. Please delete TEST bookings manually if needed.\n";

        file_put_contents('test_override_output.txt', $log);
        echo "Log written to test_override_output.txt";
    }
}

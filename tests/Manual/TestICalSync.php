<?php

namespace Tests\Manual;

use App\Models\Property;
use App\Models\Booking;
use App\Services\ICalService;
use App\Services\AvailabilityService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class TestICalSync
{
    public function run()
    {
        $log = "";

        // 1. Setup Mock Property
        $property = Property::first();
        if (!$property) {
            $log .= "No property found to test.\n";
            file_put_contents('test_output.txt', $log);
            return;
        }

        $log .= "Testing with Property: {$property->name} (ID: {$property->id})\n";

        // Save original URLs
        $originalUrls = $property->ical_import_urls;

        // Set test URL (Provided by user)
        $testUrl = 'https://www.airbnb.co.id/calendar/ical/1205129898022280415.ics?t=8f8e8a1bc7d7445181d6f3cab7f41058';
        $property->ical_import_urls = [$testUrl];
        $property->save();

        // 2. Run Sync
        $log .= "Running Sync...\n";
        $service = app(ICalService::class);
        $result = $service->syncFromExternal($property);

        $log .= "Sync Result: " . json_encode($result) . "\n";

        // 3. Verify OTA Bookings
        $otaBookings = Booking::where('property_id', $property->id)
            ->whereIn('source', ['airbnb', 'booking_com', 'ota'])
            ->get();

        $log .= "Found " . $otaBookings->count() . " OTA bookings.\n";
        if ($otaBookings->count() > 0) {
            $first = $otaBookings->first();
            $log .= "Sample Booking: {$first->check_in} - {$first->check_out} ({$first->source})\n";
        }

        // 4. Test Availability (Normal)
        $availabilityService = app(AvailabilityService::class);
        $first = $otaBookings->first();
        if ($first) {
            $check = $availabilityService->checkAvailability($property, $first->check_in->format('Y-m-d'), $first->check_out->format('Y-m-d'));
            $log .= "Availability Check (without override): " . ($check['available'] ? 'AVAILABLE (FAIL)' : 'BLOCKED (PASS)') . "\n";

            // 5. Test Availability (Approved Override)
            $checkOverride = $availabilityService->checkAvailability($property, $first->check_in->format('Y-m-d'), $first->check_out->format('Y-m-d'), null, null, true);
            $log .= "Availability Check (WITH override): " . ($checkOverride['available'] ? 'AVAILABLE (PASS)' : 'BLOCKED (FAIL)') . "\n";
        }

        // Clean up
        $property->ical_import_urls = $originalUrls;
        $property->save();

        $log .= "Test Completed.\n";

        file_put_contents('test_output.txt', $log);
        echo "Log written to test_output.txt";
    }
}

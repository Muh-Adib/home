<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Property;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ICalService
{
    /**
     * Generate iCal content for a property
     */
    public function generateForProperty(Property $property): string
    {
        $bookings = $property->bookings()
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->get();

        $ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Homsjogja//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:' . $property->name,
        ];

        foreach ($bookings as $booking) {
            $ical[] = 'BEGIN:VEVENT';
            $ical[] = 'DTSTART;VALUE=DATE:' . $booking->check_in->format('Ymd');
            $ical[] = 'DTEND;VALUE=DATE:' . $booking->check_out->format('Ymd');
            $ical[] = 'UID:' . $booking->booking_number . '@homsjogja.com';
            $ical[] = 'SUMMARY:' . ($booking->source === 'direct' ? 'Booked' : strtoupper($booking->source));
            $ical[] = 'END:VEVENT';
        }

        $ical[] = 'END:VCALENDAR';

        return implode("\r\n", $ical);
    }

    /**
     * Sync external iCal feeds to local bookings
     */
    public function syncFromExternal(Property $property): array
    {
        if (empty($property->ical_import_urls)) {
            return ['success' => false, 'message' => 'No import URLs configured'];
        }

        $allSyncedExternalIds = [];
        $totalSynced = 0;
        $errors = [];

        foreach ($property->ical_import_urls as $url) {
            if (empty($url))
                continue;

            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ])->get($url);
                if (!$response->successful()) {
                    $errors[] = "Failed to fetch $url: " . $response->status();
                    continue;
                }

                $events = $this->parseICal($response->body());
                $source = $this->detectSource($url);

                foreach ($events as $event) {
                    if (!isset($event['dtstart']) || !isset($event['dtend'])) {
                        continue;
                    }

                    $externalId = $event['uid'] ?? md5($event['dtstart'] . $event['dtend'] . $url);
                    $allSyncedExternalIds[] = $externalId;

                    $existing = Booking::where('property_id', $property->id)
                        ->where('external_id', $externalId)
                        ->first();

                    Booking::updateOrCreate(
                        [
                            'property_id' => $property->id,
                            'external_id' => $externalId,
                        ],
                        [
                            'booking_number' => $existing ? $existing->booking_number : 'EXT-' . strtoupper(Str::random(8)),
                            'guest_name' => 'External Booking (' . strtoupper($source) . ')',
                            'guest_email' => 'external@homsjogja.com',
                            'guest_phone' => '0000',
                            'guest_count' => 1,
                            'check_in' => Carbon::parse($event['dtstart']),
                            'check_out' => Carbon::parse($event['dtend']),
                            'nights' => Carbon::parse($event['dtstart'])->diffInDays(Carbon::parse($event['dtend'])),
                            'base_amount' => 0,
                            'total_amount' => 0,
                            'remaining_amount' => 0,
                            'booking_status' => 'confirmed',
                            'payment_status' => 'fully_paid',
                            'source' => $source,
                            'relationship_type' => 'keluarga',
                            'guest_gender' => 'male',
                            'guest_country' => 'Indonesia',
                            'check_in_time' => '14:00',
                        ]
                    );
                    $totalSynced++;
                }
            } catch (\Exception $e) {
                $errors[] = "Error with $url: " . $e->getMessage();
            }
        }

        // Remove external bookings that are no longer in ANY of the current feeds
        // We only remove bookings that have a source indicating they're from OTAs
        Booking::where('property_id', $property->id)
            ->whereIn('source', ['airbnb', 'booking_com', 'ota'])
            ->whereNotNull('external_id')
            ->whereNotIn('external_id', $allSyncedExternalIds)
            ->delete();

        return [
            'success' => count($errors) < count($property->ical_import_urls),
            'count' => $totalSynced,
            'message' => count($errors) > 0 ? implode('; ', $errors) : 'Success'
        ];
    }

    /**
     * Simple iCal parser
     */
    private function parseICal(string $content): array
    {
        $events = [];
        $lines = explode("\n", str_replace("\r", "", $content));
        $currentEvent = null;

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === 'BEGIN:VEVENT') {
                $currentEvent = [];
                continue;
            }

            if ($line === 'END:VEVENT') {
                if ($currentEvent) {
                    $events[] = $currentEvent;
                }
                $currentEvent = null;
                continue;
            }

            if ($currentEvent !== null && strpos($line, ':') !== false) {
                list($key, $value) = explode(':', $line, 2);
                $key = strtolower(explode(';', $key)[0]); // Strip parameters like ;VALUE=DATE
                $currentEvent[$key] = $value;
            }
        }

        return $events;
    }

    /**
     * Detect source from URL
     */
    private function detectSource(string $url): string
    {
        if (str_contains($url, 'airbnb.'))
            return 'airbnb';
        if (str_contains($url, 'booking.com'))
            return 'booking_com';
        return 'ota';
    }
}

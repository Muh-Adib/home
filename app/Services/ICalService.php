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
            ->select(['check_in', 'check_out', 'booking_number', 'source'])
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->whereNotIn('source', ['airbnb', 'booking_com', 'ota'])
            ->where('check_out', '>=', today())
            ->orderBy('check_in')
            ->cursor();

        $ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Homsjogja//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
        ];

        $now = now()->format('Ymd\THis\Z');

        foreach ($bookings as $booking) {
            $ical[] = 'BEGIN:VEVENT';
            $ical[] = 'DTSTAMP:'.$now;
            $ical[] = 'DTSTART;VALUE=DATE:'.$booking->check_in->format('Ymd');
            $ical[] = 'DTEND;VALUE=DATE:'.$booking->check_out->format('Ymd');
            $ical[] = 'UID:'.$booking->booking_number.'@homsjogja.com';
            $ical[] = 'SUMMARY:'.($booking->source === 'direct' ? 'Booked' : strtoupper($booking->source));
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
        $successfulUrls = 0;

        foreach ($property->ical_import_urls as $url) {
            if (empty($url)) {
                continue;
            }

            try {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ])
                    ->get($url);

                if (! $response->successful()) {
                    $errors[] = "Failed to fetch $url: HTTP ".$response->status();

                    continue;
                }

                $events = $this->parseICal($response->body());
                $source = $this->detectSource($url);
                $successfulUrls++;

                foreach ($events as $event) {
                    if (! isset($event['dtstart']) || ! isset($event['dtend'])) {
                        continue;
                    }

                    // Skip semua blocked/unavailable dates
                    if ($this->isBlockedDate($event)) {
                        continue;
                    }

                    $externalId = $event['uid'] ?? md5($event['dtstart'].$event['dtend'].$url);
                    $allSyncedExternalIds[] = $externalId;

                    // Extract detail dari DESCRIPTION (Airbnb)
                    [$externalUrl, $externalPhone] = $this->extractAirbnbDetails(
                        $source,
                        $event['description'] ?? ''
                    );

                    $this->upsertExternalBooking(
                        $property->id,
                        $externalId,
                        $source,
                        $event,
                        $externalUrl,
                        $externalPhone
                    );

                    $totalSynced++;
                }

            } catch (\Exception $e) {
                Log::error("iCal Sync Error for {$url}: ".$e->getMessage(), [
                    'property_id' => $property->id,
                    'trace' => $e->getTraceAsString(),
                ]);
                $errors[] = "Error with $url: ".$e->getMessage();
            }
        }

        // SAFETY: Hanya hapus jika minimal 1 URL berhasil di-fetch
        // Mencegah penghapusan massal saat semua feed sedang error
        if ($successfulUrls > 0 && ! empty($allSyncedExternalIds)) {
            Booking::where('property_id', $property->id)
                ->whereIn('source', ['airbnb', 'booking_com', 'ota'])
                ->whereNotNull('external_id')
                ->whereNotIn('external_id', $allSyncedExternalIds)
                ->delete();
        }

        return [
            'success' => $successfulUrls > 0,
            'count' => $totalSynced,
            'errors' => $errors,
            'message' => empty($errors)
                ? "Synced $totalSynced bookings successfully"
                : implode('; ', $errors),
        ];
    }

    /**
     * Check apakah event adalah blocked date (bukan booking nyata)
     */
    private function isBlockedDate(array $event): bool
    {
        $summary = strtolower(trim($event['summary'] ?? ''));

        $blockedPatterns = [
            'not available',
            'closed',
            'unavailable',
            'blocked',
        ];

        foreach ($blockedPatterns as $pattern) {
            if (str_contains($summary, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract Airbnb-specific details dari DESCRIPTION
     *
     * @return array{0: string|null, 1: string|null} [$url, $phone]
     */
    private function extractAirbnbDetails(string $source, string $description): array
    {
        if ($source !== 'airbnb' || empty($description)) {
            return [null, null];
        }

        $externalUrl = null;
        $externalPhone = null;

        if (preg_match('/Reservation URL:\s*(https:\/\/\S+)/', $description, $matches)) {
            $externalUrl = $matches[1];
        }

        if (preg_match('/Phone Number \(Last 4 Digits\):\s*(\d{4})/', $description, $matches)) {
            $externalPhone = $matches[1];
        }

        return [$externalUrl, $externalPhone];
    }

    /**
     * Insert atau update external booking
     * FIX: Pisahkan data create-only vs update untuk mencegah override booking_number
     */
    private function upsertExternalBooking(
        int $propertyId,
        string $externalId,
        string $source,
        array $event,
        ?string $externalUrl,
        ?string $externalPhone
    ): void {
        $checkIn = Carbon::parse($event['dtstart'])->startOfDay();
        $checkOut = Carbon::parse($event['dtend'])->startOfDay();
        $nights = $checkIn->diffInDays($checkOut);

        // Cek apakah booking sudah ada
        $existing = Booking::where('property_id', $propertyId)
            ->where('external_id', $externalId)
            ->lockForUpdate()  // Lock row yang spesifik
            ->first();

        if ($existing) {
            // Update: hanya update data yang mungkin berubah
            $updateData = [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'nights' => $nights,
                'guest_phone' => $externalPhone ?? $existing->guest_phone,
                'external_reservation_url' => $externalUrl ?? $existing->external_reservation_url,
                'external_phone' => $externalPhone ?? $existing->external_phone,
                'booking_status' => 'confirmed',
            ];

            // Tambahkan external URL ke internal notes jika belum ada
            if ($externalUrl && ! str_contains((string) $existing->internal_notes, $externalUrl)) {
                $note = 'External Reservation URL: '.$externalUrl;
                $updateData['internal_notes'] = $existing->internal_notes
                    ? $existing->internal_notes."\n".$note
                    : $note;
            }

            $existing->update($updateData);
        } else {
            // Create: set semua field termasuk booking_number
            Booking::create([
                'property_id' => $propertyId,
                'external_id' => $externalId,
                'booking_number' => 'EXT-'.strtoupper(Str::random(8)),
                'guest_name' => 'External Booking ('.strtoupper($source).')',
                'guest_email' => 'external@homsjogja.com',
                'guest_phone' => $externalPhone ?? '0000',
                'guest_count' => 1,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'nights' => $nights,
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
                'external_reservation_url' => $externalUrl,
                'external_phone' => $externalPhone,
                'internal_notes' => $externalUrl ? 'External Reservation URL: '.$externalUrl : null,
            ]);
        }
    }

    /**
     * Improved iCal parser with line folding support (RFC 5545)
     */
    private function parseICal(string $content): array
    {
        // Step 1: Normalize line endings
        $content = str_replace("\r\n", "\n", $content);
        $content = str_replace("\r", "\n", $content);

        // Step 2: Unfold lines (RFC 5545 §3.1)
        $content = preg_replace('/\n[ \t]/', '', $content);

        $events = [];
        $lines = explode("\n", $content);
        $currentEvent = null;

        foreach ($lines as $line) {
            $line = rtrim($line);

            if ($line === '') {
                continue;
            }

            if ($line === 'BEGIN:VEVENT') {
                $currentEvent = [];

                continue;
            }

            if ($line === 'END:VEVENT') {
                if ($currentEvent !== null) {
                    $events[] = $currentEvent;
                }
                $currentEvent = null;

                continue;
            }

            if ($currentEvent !== null) {
                $colonPos = strpos($line, ':');
                if ($colonPos === false) {
                    continue;
                }

                $keyPart = substr($line, 0, $colonPos);
                $value = substr($line, $colonPos + 1);

                // Handle parameter: DTSTART;VALUE=DATE
                $semicolonPos = strpos($keyPart, ';');
                if ($semicolonPos !== false) {
                    $key = strtolower(substr($keyPart, 0, $semicolonPos));
                    $params = substr($keyPart, $semicolonPos + 1);
                } else {
                    $key = strtolower($keyPart);
                    $params = '';
                }

                // Decode escaped characters
                $value = str_replace(
                    ['\,', '\;', '\n', '\N'],
                    [',', ';', "\n", "\n"],
                    $value
                );

                $currentEvent[$key] = $value;

                if ($params !== '') {
                    $currentEvent[$key.'_params'] = $params;
                }
            }
        }

        return $events;
    }

    /**
     * Detect source platform dari URL
     */
    private function detectSource(string $url): string
    {
        return match (true) {
            str_contains($url, 'airbnb.') => 'airbnb',
            str_contains($url, 'booking.com') => 'booking_com',
            default => 'ota',
        };
    }
}

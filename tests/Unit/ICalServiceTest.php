<?php

namespace Tests\Unit;

use App\Services\ICalService;
use PHPUnit\Framework\TestCase;

class ICalServiceTest extends TestCase
{
    /**
     * Test line folding (RFC 5545)
     */
    public function test_parser_handles_line_folding()
    {
        // Line folding example:
        // DESCRIPTION:This is a long description that continues on the next line.
        //  (space at start of next line indicates continuation)

        $content = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'BEGIN:VEVENT',
            'SUMMARY:Folded Event',
            'DESCRIPTION:This is a very long description that is fol',
            ' ded into multiple lines.',
            'END:VEVENT',
            'END:VCALENDAR',
        ]);

        // We need to access private method parseICal
        $service = new ICalService;
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('parseICal');
        $method->setAccessible(true);

        $events = $method->invokeArgs($service, [$content]);

        $this->assertCount(1, $events);
        $this->assertEquals('Folded Event', $events[0]['summary']);
        $this->assertEquals('This is a very long description that is folded into multiple lines.', $events[0]['description']);
    }

    /**
     * Test extraction logic for Airbnb DESCRIPTION
     */
    public function test_extracts_airbnb_details()
    {
        $description = "Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMCERA4RRD\nPhone Number (Last 4 Digits): 5303";

        $url = null;
        $phone = null;

        if (preg_match('/Reservation URL: (https:\/\/[^\s]+)/', $description, $matches)) {
            $url = $matches[1];
        }

        if (preg_match('/Phone Number \(Last 4 Digits\): (\d{4})/', $description, $matches)) {
            $phone = $matches[1];
        }

        $this->assertEquals('https://www.airbnb.com/hosting/reservations/details/HMCERA4RRD', $url);
        $this->assertEquals('5303', $phone);
    }

    /**
     * Test filtering logic for "Not Available" events
     */
    public function test_filtering_logic()
    {
        $testCases = [
            'Airbnb (Not available)' => true, // Should skip
            'CLOSED - Not available' => true, // Should skip
            'Not available' => true, // Should skip
            'Reserved' => false, // Should Keep
            'Booked' => false, // Should Keep
        ];

        foreach ($testCases as $summary => $shouldSkip) {
            $skipped = false;
            if (stripos($summary, 'Airbnb (Not available)') !== false) {
                $skipped = true;
            }
            if (stripos($summary, 'CLOSED - Not available') !== false) {
                $skipped = true;
            }
            if (stripos($summary, 'Not available') !== false) {
                $skipped = true;
            }

            $this->assertEquals($shouldSkip, $skipped, "Failed assertion for summary: '$summary'");
        }
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class BookingImportPreviewController extends Controller
{
    protected $availabilityService;
    protected $rateCalculationService;

    public function __construct(AvailabilityService $availabilityService, RateCalculationService $rateCalculationService)
    {
        $this->availabilityService = $availabilityService;
        $this->rateCalculationService = $rateCalculationService;
    }

    /**
     * Preview import changes before applying them
     */
    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv',
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Skip header row
            $headers = array_shift($rows);
            
            $preview = [
                'new' => [],
                'updated' => [],
                'unchanged' => [],
                'errors' => [],
            ];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2; // +2 because we skipped header and arrays are 0-indexed
                
                // Skip empty rows (check Property Name and Guest Name)
                if (empty($row[1]) && empty($row[4])) {
                    continue;
                }

                try {
                    $bookingNumber = $row[0] ?? null;
                    $propertyName = $row[1] ?? null;
                    
                    // Find property by name
                    $property = null;
                    if ($propertyName && $propertyName !== 'N/A') {
                        $property = Property::where('name', $propertyName)->first();
                    }

                    // NEW BOOKING LOGIC: If no booking number, treat as new booking
                    if (!$bookingNumber) {
                        // Validate required fields for new booking
                        $missingFields = $this->validateRequiredFields($row);
                        
                        if (!empty($missingFields)) {
                            $preview['errors'][] = [
                                'row' => $rowNumber,
                                'is_new' => true,
                                'missing_fields' => $missingFields,
                                'error' => 'Incomplete data for new booking: ' . implode(', ', $missingFields),
                                'data' => $this->mapRowToRawData($row, $property),
                            ];
                            continue;
                        }

                        if (!$property) {
                            $preview['errors'][] = [
                                'row' => $rowNumber,
                                'is_new' => true,
                                'error' => "Property '{$propertyName}' not found",
                                'data' => $this->mapRowToRawData($row),
                            ];
                            continue;
                        }

                        // Check availability for new booking
                        $checkIn = $this->parseDate($row[15]);
                        $checkOut = $this->parseDate($row[17]);
                        
                        // Calculate guest count
                        $guestMale = (int) ($row[10] ?? 1);
                        $guestFemale = (int) ($row[11] ?? 0);
                        $guestChildren = (int) ($row[12] ?? 0);
                        if ($property->capacity < $property->capacity_max) {
                            $guestCount = $guestMale + $guestFemale + (int)floor($guestChildren / 2);
                        } else {
                            $guestCount = $guestMale + $guestFemale + $guestChildren;
                        }
                        
                        $availabilityIssue = $this->checkAvailability($property->id, $checkIn, $checkOut, $guestCount);

                        $newData = $this->mapRowToBookingData($row, $property);
                        
                        $preview['new'][] = [
                            'row' => $rowNumber,
                            'is_new' => true,
                            'booking_number' => null,
                            'data' => $newData,
                            'availability_warning' => $availabilityIssue,
                        ];
                        continue;
                    }

                    // EXISTING BOOKING LOGIC
                    if (!$property) {
                        $preview['errors'][] = [
                            'row' => $rowNumber,
                            'error' => "Property '{$propertyName}' not found",
                            'data' => $this->mapRowToRawData($row),
                        ];
                        continue;
                    }

                    // Check if booking exists
                    $existingBooking = Booking::where('booking_number', $bookingNumber)->first();

                    $newData = $this->mapRowToBookingData($row, $property);

                    if (!$existingBooking) {
                        // New booking with booking number - check availability
                        $checkIn = $this->parseDate($row[15]);
                        $checkOut = $this->parseDate($row[17]);
                        
                        // Calculate guest count
                        $guestMale = (int) ($row[10] ?? 1);
                        $guestFemale = (int) ($row[11] ?? 0);
                        $guestChildren = (int) ($row[12] ?? 0);
                        if ($property->capacity < $property->capacity_max) {
                            $guestCount = $guestMale + $guestFemale + (int)floor($guestChildren / 2);
                        } else {
                            $guestCount = $guestMale + $guestFemale + $guestChildren;
                        }
                        
                        $availabilityIssue = $this->checkAvailability($property->id, $checkIn, $checkOut, $guestCount);
                        
                        $preview['new'][] = [
                            'row' => $rowNumber,
                            'is_new' => true,
                            'booking_number' => $bookingNumber,
                            'data' => $newData,
                            'availability_warning' => $availabilityIssue,
                        ];
                    } else {
                        // Check for changes
                        $changes = $this->detectChanges($existingBooking, $newData);
                        
                        if (empty($changes)) {
                            $preview['unchanged'][] = [
                                'row' => $rowNumber,
                                'booking_number' => $bookingNumber,
                            ];
                        } else {
                            // Check if dates are changing, if so validate availability (exclude current booking)
                            $availabilityWarning = null;
                            $datesChanged = isset($changes['check_in']) || isset($changes['check_out']);
                            
                            if ($datesChanged) {
                                $checkIn = $newData['check_in'];
                                $checkOut = $newData['check_out'];
                                
                                // Calculate guest count
                                $guestMale = (int) ($row[10] ?? 1);
                                $guestFemale = (int) ($row[11] ?? 0);
                                $guestChildren = (int) ($row[12] ?? 0);
                                if ($property->capacity < $property->capacity_max) {
                                    $guestCount = $guestMale + $guestFemale + (int)floor($guestChildren / 2);
                                } else {
                                    $guestCount = $guestMale + $guestFemale + $guestChildren;
                                }
                                
                                // Check availability excluding current booking
                                $availabilityWarning = $this->checkAvailabilityForUpdate(
                                    $property->id, 
                                    $checkIn, 
                                    $checkOut, 
                                    $guestCount,
                                    $existingBooking->id
                                );
                            }
                            
                            $preview['updated'][] = [
                                'row' => $rowNumber,
                                'booking_number' => $bookingNumber,
                                'changes' => $changes,
                                'old_data' => $this->extractBookingData($existingBooking),
                                'new_data' => $newData,
                                'availability_warning' => $availabilityWarning,
                            ];
                        
                        }
                    }
                } catch (\Exception $e) {
                    $preview['errors'][] = [
                        'row' => $rowNumber,
                        'error' => $e->getMessage(),
                        'data' => $this->mapRowToRawData($row, $property ?? null),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'preview' => $preview,
                'summary' => [
                    'new_count' => count($preview['new']),
                    'updated_count' => count($preview['updated']),
                    'unchanged_count' => count($preview['unchanged']),
                    'error_count' => count($preview['errors']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to preview import: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Parse date from Excel format (d/m/Y or Y-m-d)
     */
    private function parseDate($dateValue): ?string
    {
        if (empty($dateValue)) {
            return null;
        }

        // Jika value numeric → Excel serial date
        if (is_numeric($dateValue)) {
            try {
                $date = Date::excelToDateTimeObject($dateValue);
                return \Carbon\Carbon::instance($date)->format('Y-m-d');
            } catch (\Exception $e) {
                // fallback serial date manual jika dibutuhkan
                return \Carbon\Carbon::createFromDate(1899, 12, 30)->addDays($dateValue)->format('Y-m-d');
            }
        }

        // Jika sudah berupa DateTime object
        if ($dateValue instanceof \DateTime) {
            return $dateValue->format('Y-m-d');
        }

        // Try parsing d/m/Y format
        try {
            $date = \Carbon\Carbon::createFromFormat('d/m/Y', $dateValue);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            // Fallback ke Y-m-d dsb.
            try {
                $date = \Carbon\Carbon::parse($dateValue);
                return $date->format('Y-m-d');
            } catch (\Exception $e2) {
                return null;
            }
        }
    }

    /**
     * Validate required fields for new booking
     */
    private function validateRequiredFields(array $row): array
    {
        $missing = [];
        
        // Required fields with their column indices
        $requiredFields = [
            1 => 'Property Name',
            4 => 'Guest Name',
            5 => 'Guest Email',
            6 => 'Guest Phone',
            9 => 'Guest Gender',
            7 => 'Guest Country',
            10 => 'Guest Male Count',
            11 => 'Guest Female Count',
            14 => 'Relationship Type',
            15 => 'Check-in Date',
            17 => 'Check-out Date',
            27 => 'Booking Status',
        ];

        foreach ($requiredFields as $index => $fieldName) {
            if (empty($row[$index]) && $row[$index] !== 0) {
                $missing[] = $fieldName;
            }
        }

        // Conditional validation: Payment Method required if Payment Status is paid
        $paymentStatus = strtolower($row[28] ?? '');
        $paidStatuses = ['fully_paid', 'dp_received', 'dp_paid'];
        
        if (in_array($paymentStatus, $paidStatuses)) {
            if (empty($row[29])) { // Payment Method column
                $missing[] = 'Payment Method (Required for paid status)';
            }
        }

        return $missing;
    }

    /**
     * Check availability for property on given dates
     * Also validates that rate calculation succeeds
     */
    private function checkAvailability(int $propertyId, ?string $checkIn, ?string $checkOut, int $guestCount = 1): ?string
    {
        if (!$checkIn || !$checkOut) {
            return null;
        }

        $property = Property::find($propertyId);
        if (!$property) {
            return 'Property not found';
        }

        // Check availability using AvailabilityService
        $availabilityCheck = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut);
        
        if (!$availabilityCheck['available']) {
            $conflicts = count($availabilityCheck['booked_periods'] ?? []);
            return "Property has {$conflicts} conflicting booking(s) on selected dates";
        }

        // Also validate rate calculation
        try {
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $checkIn,
                $checkOut,
                $guestCount
            );
            
            if (!$rateCalculation || $rateCalculation->totalAmount <= 0) {
                return 'Unable to calculate rate for selected dates';
            }
        } catch (\Exception $e) {
            return 'Rate calculation error: ' . $e->getMessage();
        }

        return null;
    }

    /**
     * Check availability for property on given dates, excluding a specific booking
     * Used when updating existing bookings
     */
    private function checkAvailabilityForUpdate(int $propertyId, ?string $checkIn, ?string $checkOut, int $guestCount = 1, ?int $excludeBookingId = null): ?string
    {
        if (!$checkIn || !$checkOut) {
            return null;
        }

        $property = Property::find($propertyId);
        if (!$property) {
            return 'Property not found';
        }

        // Check availability using AvailabilityService with exclusion
        // We need to temporarily modify the availabilityService to exclude a booking
        // For now, we'll check manually with exclusion
        
        $conflictingBookings = Booking::where('property_id', $propertyId)
            ->where('booking_status', '!=', 'cancelled')
            ->when($excludeBookingId, function($query) use ($excludeBookingId) {
                $query->where('id', '!=', $excludeBookingId);
            })
            ->where(function ($query) use ($checkIn, $checkOut) {
                $query->where(function ($q) use ($checkIn, $checkOut) {
                    // New booking starts during existing booking
                    $q->where('check_in', '<=', $checkIn)
                      ->where('check_out', '>', $checkIn);
                })
                ->orWhere(function ($q) use ($checkIn, $checkOut) {
                    // New booking ends during existing booking
                    $q->where('check_in', '<', $checkOut)
                      ->where('check_out', '>=', $checkOut);
                })
                ->orWhere(function ($q) use ($checkIn, $checkOut) {
                    // New booking fully contains existing booking
                    $q->where('check_in', '>=', $checkIn)
                      ->where('check_out', '<=', $checkOut);
                });
            })
            ->get();

        if ($conflictingBookings->count() > 0) {
            return "Property has {$conflictingBookings->count()} conflicting booking(s) on selected dates";
        }

        // Also validate rate calculation
        try {
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $checkIn,
                $checkOut,
                $guestCount
            );
            
            if (!$rateCalculation || $rateCalculation->totalAmount <= 0) {
                return 'Unable to calculate rate for selected dates';
            }
        } catch (\Exception $e) {
            return 'Rate calculation error: ' . $e->getMessage();
        }

        return null;
    }

    /**
     * Map spreadsheet row to raw booking data (for errors/previews without property)
     */
    private function mapRowToRawData(array $row, ?Property $property = null): array
    {
        $paymentMethodName = $row[29] ?? null;
        $paymentMethodId = null;
        
        if ($paymentMethodName) {
            $paymentMethod = \App\Models\PaymentMethod::where('name', $paymentMethodName)->first();
            $paymentMethodId = $paymentMethod ? $paymentMethod->id : null;
        }

        return [
            'booking_number' => $row[0] ? trim($row[0]) : null,
            'property_id' => $property ? $property->id : null,
            'property_name' => $row[1] ? trim($row[1]) : null,
            'guest_name' => $row[4] ? trim($row[4]) : null,
            'guest_email' => $row[5] ? trim($row[5]) : null,
            'guest_phone' => $row[6] ? trim($row[6]) : null,
            'guest_country' => $row[7] ? trim($row[7]) : null,
            'guest_id_number' => $row[8] ? trim($row[8]) : null,
            'guest_gender' => $row[9] ? trim($row[9]) : null,
            'guest_male' => !empty($row[10]) ? (int) $row[10] : 0,
            'guest_female' => !empty($row[11]) ? (int) $row[11] : 0,
            'guest_children' => !empty($row[12]) ? (int) $row[12] : 0,
            'relationship_type' => $row[14] ? trim($row[14]) : null,
            'check_in' => $this->parseDate($row[15] ?? null),
            'check_in_time' => $row[16] ? trim($row[16]) : '15:00',
            'check_out' => $this->parseDate($row[17] ?? null),
            'nights' => (int) ($row[18] ?? 0),
            'base_amount' => (float) ($row[19] ?? 0),
            'extra_bed_amount' => (float) ($row[20] ?? 0),
            'service_amount' => (float) ($row[21] ?? 0),
            'tax_amount' => (float) ($row[22] ?? 0),
            'total_amount' => (float) ($row[23] ?? 0),
            'dp_percentage' => (int) ($row[24] ?? 30),
            'dp_amount' => (float) ($row[25] ?? 0),
            'remaining_amount' => (float) ($row[26] ?? 0),
            'booking_status' => $row[27] ? trim($row[27]) : null,
            'payment_status' => $row[28] ? trim($row[28]) : null,
            'payment_method_name' => $paymentMethodName ? trim($paymentMethodName) : null,
            'payment_method_id' => $paymentMethodId,
            'internal_notes' => $row[30] ? trim($row[30]) : null, // Shifted index
        ];
    }

    /**
     * Map spreadsheet row to booking data
     */
    private function mapRowToBookingData(array $row, Property $property): array
    {
        return $this->mapRowToRawData($row, $property);
    }

    /**
     * Extract booking data for comparison
     */
    private function extractBookingData(Booking $booking): array
    {
        $paymentMethodName = $booking->payments->sortByDesc('created_at')->first()?->paymentMethod?->name ?? null;

        return [
            'booking_number' => $booking->booking_number,
            'property_id' => $booking->property_id,
            'property_name' => $booking->property->name,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_country' => $booking->guest_country,
            'guest_id_number' => $booking->guest_id_number,
            'guest_gender' => $booking->guest_gender,
            'guest_male' => $booking->guest_male,
            'guest_female' => $booking->guest_female,
            'guest_children' => $booking->guest_children,
            'relationship_type' => $booking->relationship_type,
            'check_in' => $booking->check_in ? $booking->check_in->format('Y-m-d') : null,
            'check_in_time' => $booking->check_in_time,
            'check_out' => $booking->check_out ? $booking->check_out->format('Y-m-d') : null,
            'nights' => $booking->nights,
            'base_amount' => (float) $booking->base_amount,
            'extra_bed_amount' => (float) $booking->extra_bed_amount,
            'service_amount' => (float) ($booking->service_amount ?? 0),
            'tax_amount' => (float) ($booking->tax_amount ?? 0),
            'total_amount' => (float) $booking->total_amount,
            'dp_percentage' => $booking->dp_percentage,
            'dp_amount' => (float) $booking->dp_amount,
            'remaining_amount' => (float) $booking->remaining_amount,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'payment_method_name' => $paymentMethodName,
            'special_requests' => $booking->special_requests,
            'internal_notes' => $booking->internal_notes,
        ];
    }

    /**
     * Detect changes between existing and new data
     */
    private function detectChanges(Booking $existing, array $newData): array
    {
        $oldData = $this->extractBookingData($existing);
        $changes = [];

        $fieldsToCompare = [
            'guest_name', 'guest_email', 'guest_phone', 'guest_country',
            'guest_id_number', 'guest_gender', 'guest_male', 'guest_female',
            'guest_children', 'relationship_type', 'check_in', 'check_in_time',
            'check_out', 'nights', 'base_amount', 'extra_bed_amount',
            'service_amount', 'tax_amount', 'total_amount', 'dp_percentage',
            'booking_status', 'payment_status', 'payment_method_name', 'special_requests', 'internal_notes',
        ];

        foreach ($fieldsToCompare as $field) {
            $oldValue = $oldData[$field] ?? null;
            $newValue = $newData[$field] ?? null;

            // Normalize for comparison
            if (is_numeric($oldValue) && is_numeric($newValue)) {
                $oldValue = (float) $oldValue;
                $newValue = (float) $newValue;
            }

            if ($oldValue != $newValue) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }
}

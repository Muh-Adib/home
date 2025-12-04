<?php

namespace App\Imports;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingService;
use App\Domain\Booking\ValueObjects\BookingRequest;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Row;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class BookingsImport implements OnEachRow, WithHeadingRow, WithValidation, SkipsOnError
{
    use SkipsErrors;

    protected $acceptedRows;
    protected $importedCount = 0;

    public function __construct(array $acceptedRows = [])
    {
        $this->acceptedRows = $acceptedRows;
        \Log::info('BookingsImport initialized', ['acceptedRows' => $acceptedRows]);
    }

    public function getImportedCount(): int
    {
        return $this->importedCount;
    }

    public function onRow(Row $row)
    {
        $rowIndex = $row->getIndex();
        $rowArray = $row->toArray();

        // If acceptedRows is specified, only process those rows
        if (!empty($this->acceptedRows)) {
            // We rely on the Excel row index which matches the preview logic ($index + 2)
            // We cast to int to ensure type matching
            if (!in_array((int)$rowIndex, array_map('intval', $this->acceptedRows))) {
                \Log::info("Skipping row $rowIndex (not in acceptedRows)");
                return;
            }
        }
        
        \Log::info("Processing row $rowIndex");

        try {
            // Find property by name
            $property = Property::where('name', $rowArray['property_name'])->first();
            
            if (!$property) {
                \Log::warning("Row $rowIndex: Property not found: " . ($rowArray['property_name'] ?? 'null'));
                return;
            }

            $bookingNumber = $rowArray['booking_number'] ?? null;

            // User requested to NOT generate booking number locally if missing, let BookingService handle it.
            // if (!$bookingNumber) {
            //    $bookingNumber = $this->generateBookingNumber();
            // }

            // Ensure guest user exists
            $guestUser = User::where('email', $rowArray['guest_email'])->first();
            if (!$guestUser) {
                $guestUser = User::create([
                    'name' => $rowArray['guest_name'],
                    'email' => $rowArray['guest_email'],
                    'phone' => $rowArray['guest_phone'] ?? null,
                    'password' => Hash::make(Str::random(12)),
                    'role' => 'guest',
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]);
            }

            // Parse dates
            $checkIn = $this->parseDate($rowArray['check_in']);
            $checkOut = $this->parseDate($rowArray['check_out']);

            $guestMale = (int) ($rowArray['guest_male'] ?? 1);
            $guestFemale = (int) ($rowArray['guest_female'] ?? 0);
            $guestChildren = (int) ($rowArray['guest_children'] ?? 0);
            // Apply conditional logic: if capacity < capacity_max, children count as floor(children/2)
            if ($property->capacity < $property->capacity_max) {
                $guestCount = $guestMale + $guestFemale + (int)floor($guestChildren / 2);
            } else {
                $guestCount = $guestMale + $guestFemale + $guestChildren;
            }

            // Prepare BookingRequest data
            // We map the Excel row data to the BookingRequest fields
            $bookingRequest = new BookingRequest(
                propertyId: $property->id,
                checkInDate: $checkIn->format('Y-m-d'),
                checkOutDate: $checkOut->format('Y-m-d'),
                checkInTime: $rowArray['check_in_time'] ?? '15:00',
                guestCount: $guestCount, // BookingService calculates effective count, but we need a base count
                guestMale: $guestMale,
                guestFemale: $guestFemale,
                guestChildren: $guestChildren,
                guestName: $rowArray['guest_name'],
                guestEmail: $rowArray['guest_email'],
                guestPhone: $rowArray['guest_phone'] ?? '6281234567890',
                guestCountry: $rowArray['guest_country'] ?? 'Indonesia',
                guestIdNumber: $rowArray['guest_id_number'] ?? null,
                guestGender: $rowArray['guest_gender'] ?? 'male',
                relationshipType: $rowArray['relationship_type'] ?? 'keluarga',
                guests: [], // Detailed guests list not typically in simple import
                specialRequests: $rowArray['special_requests'] ?? null,
                internalNotes: $rowArray['internal_notes'] ?? null,
                bookingStatus: $rowArray['booking_status'] ?? 'pending_verification',
                paymentStatus: $rowArray['payment_status'] ?? 'dp_pending',
                dpPercentage: (int) ($rowArray['dp_percentage'] ?? 50),
                autoConfirm: false // Don't auto confirm via service unless specified
            );

            // Resolve BookingService
            $bookingService = app(BookingService::class);
            $currentUser = auth()->user();

            // Check if booking exists
            $existingBooking = Booking::where('booking_number', $bookingNumber)->first();

            if ($existingBooking) {
                // Update existing booking
                $bookingService->updateBooking($existingBooking, $bookingRequest);
                $booking = $existingBooking->refresh();
            } else {
                // Create new booking
                // Use guestUser as the creator context for the service if needed, or currentUser.
                // User corrected this to use guestUser in previous step, but let's stick to what works.
                // Actually, createBooking 2nd arg is 'user' (creator/guest context).
                // Usually it's the guest user for the booking.
                $booking = $bookingService->createBooking($bookingRequest, $guestUser);
                
                // If we have a specific booking number from import, enforce it
                //if ($bookingNumber && $booking->booking_number !== $bookingNumber) {
                //    $booking->booking_number = $bookingNumber;
                //    $booking->save();
                //}
            }

            // Ensure created_by is set correctly
            // Logic: Find user by name from 'created_by' column (excluding guests).
            // If found, use that ID. If not, use current user ID.
            // Force rewrite created_by

            $createdByName = $rowArray['created_by'] ?? null;
            $creatorId = $currentUser->id;
            if ($createdByName) {
                $creator = User::where('name', $createdByName)
                    ->where('role', '!=', 'guest')
                    ->first();
                
                if ($creator) {
                    $creatorId = $creator->id;
                }
            }
            $booking->created_by = $creatorId;
            $booking->save();


            // Handle Payment Creation hanya buat payment jika tidak ada [payment]
            $paymentMethodName = $rowArray['payment_method'] ?? null;
            if ($paymentMethodName) {
                $paymentMethod = \App\Models\PaymentMethod::where('name', $paymentMethodName)->first();
                
                if ($paymentMethod) {
                    // Determine amount and status based on booking payment status
                    $amount = 0;
                    $paymentStatus = 'pending';
                    $paymentType = 'dp'; // Default

                    if ($booking->payment_status === 'fully_paid') {
                        $amount = $booking->total_amount;
                        $paymentStatus = 'verified';
                        $paymentType = 'full';
                    } elseif ($booking->payment_status === 'dp_received' || $booking->payment_status === 'dp_paid') {
                        $amount = $booking->dp_amount;
                        $paymentStatus = 'verified';
                        $paymentType = 'dp';
                    } elseif ($booking->payment_status === 'dp_pending') {
                         $amount = $booking->dp_amount;
                         $paymentStatus = 'pending';
                         $paymentType = 'dp';
                    }
                    
                    // Only create payment if amount > 0 and no existing payments (to avoid duplicates on re-import)
                    // Or if it's a new booking
                    if ($amount > 0 && $booking->payments()->count() === 0) {
                         $payment = $booking->payments()->create([
                            'payment_number' => \App\Models\Payment::generatePaymentNumber(),
                            'payment_method_id' => $paymentMethod->id,
                            'amount' => $amount,
                            'payment_type' => $paymentType,
                            'payment_method' => $paymentMethod->type, // 'transfer', 'cash', etc.
                            'payment_status' => $paymentStatus,
                            'payment_date' => now(),
                            'bank_name' => $paymentMethod->bank_name,
                            'processed_by' => $currentUser->id,
                            'verified_by' => $paymentStatus === 'verified' ? $currentUser->id : null,
                            'verified_at' => $paymentStatus === 'verified' ? now() : null,
                        ]);
                        
                        // Sync income if verified
                        if ($paymentStatus === 'verified') {
                            // Use fully qualified class name or import it
                            app(\App\Services\PaymentIncomeSyncService::class)->syncOnVerified($payment);
                        }
                    }
                }
            }

            $this->importedCount++;
        } catch (\Exception $e) {
            \Log::error("Error importing row $rowIndex: " . $e->getMessage(), [
                'row_data' => $rowArray,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Generate unique booking number
     */
    private function generateBookingNumber(): string
    {
        $prefix = 'BK';
        $date = now()->format('Ymd');
        
        // Get last booking number for today
        $lastBooking = Booking::where('booking_number', 'LIKE', "{$prefix}-{$date}-%")
            ->orderBy('booking_number', 'desc')
            ->first();

        if ($lastBooking) {
            // Extract sequence number and increment
            $lastNumber = (int) substr($lastBooking->booking_number, -4);
            $sequence = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $sequence = '0001';
        }

        return "{$prefix}-{$date}-{$sequence}";
    }

    /**
     * Parse date from various formats
     */
    private function parseDate($dateValue): Carbon
    {
        if ($dateValue instanceof Carbon) {
            return $dateValue;
        }

        // Handle Excel serial date format (numeric)
        if (is_numeric($dateValue)) {
            try {
                $date = Date::excelToDateTimeObject($dateValue);
                return Carbon::instance($date);
            } catch (\Exception $e) {
                \Log::warning("Failed to parse Excel date serial: $dateValue");
            }
        }

        // Try d/m/Y format first (our export format)
        try {
            return Carbon::createFromFormat('d/m/Y', $dateValue);
        } catch (\Exception $e) {
            // Fallback to standard parsing
            return Carbon::parse($dateValue);
        }
    }

    public function rules(): array
    {
        return [
            'property_name' => 'required',
            'guest_name' => 'required',
            'guest_email' => 'required|email',
            'check_in' => 'required',
            'check_out' => 'required',
        ];
    }
}

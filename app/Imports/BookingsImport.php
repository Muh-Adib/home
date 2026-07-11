<?php

namespace App\Imports;

use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingService;
use App\Services\PaymentIncomeSyncService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Row;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class BookingsImport implements OnEachRow, SkipsOnError, WithHeadingRow, WithValidation
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
        if (! empty($this->acceptedRows)) {
            // We rely on the Excel row index which matches the preview logic ($index + 2)
            // We cast to int to ensure type matching
            if (! in_array((int) $rowIndex, array_map('intval', $this->acceptedRows))) {
                \Log::info("Skipping row $rowIndex (not in acceptedRows)");

                return;
            }
        }

        \Log::info("Processing row $rowIndex");

        try {
            // Find property by name
            $property = Property::where('name', $rowArray['property_name'])->first();

            if (! $property) {
                \Log::warning("Row $rowIndex: Property not found: ".($rowArray['property_name'] ?? 'null'));

                return;
            }

            $bookingNumber = $rowArray['booking_number'] ?? null;

            // User requested to NOT generate booking number locally if missing, let BookingService handle it.
            // if (!$bookingNumber) {
            //    $bookingNumber = $this->generateBookingNumber();
            // }

            // Ensure guest user exists
            $guestUser = User::where('email', $rowArray['guest_email'])->first();
            if (! $guestUser) {
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
                $guestCount = $guestMale + $guestFemale + (int) floor($guestChildren / 2);
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
                guestPhoneAlternative: null,
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
                $booking = $bookingService->createBooking($bookingRequest, $guestUser);
            }

            // Force override specific attributes from Excel
            if ($bookingNumber) {
                $booking->booking_number = $bookingNumber;
            }
            if (isset($rowArray['base_amount'])) {
                $booking->base_amount = (int) $rowArray['base_amount'];
            }
            if (isset($rowArray['extra_bed_amount'])) {
                $booking->extra_bed_amount = (int) $rowArray['extra_bed_amount'];
                // Calculate and set extra_bed_count based on extra_bed_amount and property extra_bed_rate
                $extraBedRate = (float) ($property->extra_bed_rate ?? 150000);
                if ($booking->extra_bed_amount > 0 && $extraBedRate > 0) {
                    $booking->extra_bed_count = (int) round($booking->extra_bed_amount / $extraBedRate);
                } else {
                    $booking->extra_bed_count = 0;
                }
            }
            if (isset($rowArray['service_amount'])) {
                $booking->service_amount = (int) $rowArray['service_amount'];
            }
            if (isset($rowArray['tax_amount'])) {
                $booking->tax_amount = (int) $rowArray['tax_amount'];
            }
            if (isset($rowArray['total_amount'])) {
                $booking->total_amount = (int) $rowArray['total_amount'];
            }
            if (isset($rowArray['dp_percentage'])) {
                $booking->dp_percentage = (int) $rowArray['dp_percentage'];
            }
            if (isset($rowArray['dp_amount'])) {
                $booking->dp_amount = (int) $rowArray['dp_amount'];
            }
            if (isset($rowArray['remaining_amount'])) {
                $booking->remaining_amount = (int) $rowArray['remaining_amount'];
            }
            if (isset($rowArray['booking_status'])) {
                $booking->booking_status = $rowArray['booking_status'];
            }
            if (isset($rowArray['payment_status'])) {
                $booking->payment_status = $rowArray['payment_status'];
            }
            if (isset($rowArray['internal_notes'])) {
                $booking->internal_notes = $rowArray['internal_notes'];
            }

            // Enforce creator
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

            // Recreate daily revenues with imported amounts
            $this->syncDailyRevenues($booking, $rowArray);

            // Handle Payment Creation & Sync (for real multiple transactions)
            $existingPayments = $booking->payments()->orderBy('created_at')->get();

            // Sync Payment 1
            $this->syncImportedPayment(
                $booking,
                $existingPayments->get(0),
                ! empty($rowArray['payment_1_amount']) ? (float) $rowArray['payment_1_amount'] : null,
                $rowArray['payment_1_date'] ?? null,
                $rowArray['payment_1_method'] ?? null,
                $rowArray['payment_1_status'] ?? null,
                'dp',
                $currentUser
            );

            // Sync Payment 2
            $this->syncImportedPayment(
                $booking,
                $existingPayments->get(1),
                ! empty($rowArray['payment_2_amount']) ? (float) $rowArray['payment_2_amount'] : null,
                $rowArray['payment_2_date'] ?? null,
                $rowArray['payment_2_method'] ?? null,
                $rowArray['payment_2_status'] ?? null,
                'remaining',
                $currentUser
            );

            // Always update payment status to recalculate paid/remaining fields
            $booking->updatePaymentStatus(true);

            $this->importedCount++;
        } catch (\Throwable $e) {
            \Log::error("Error importing row $rowIndex: ".$e->getMessage(), [
                'row_data' => $rowArray,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Recreate daily revenues for imported bookings
     */
    protected function syncDailyRevenues(Booking $booking, array $rowArray): void
    {
        BookingDailyRevenue::where('booking_id', $booking->id)->delete();

        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);
        $nights = $checkIn->diffInDays($checkOut);

        if ($nights <= 0) {
            return;
        }

        $baseAmount = (int) ($rowArray['base_amount'] ?? $booking->base_amount ?? 0);
        $extraBedAmount = (int) ($rowArray['extra_bed_amount'] ?? $booking->extra_bed_amount ?? 0);
        $discountAmount = (int) ($rowArray['discount_amount'] ?? $booking->discount_amount ?? 0);
        $extraBedCount = (int) ($booking->extra_bed_count ?? 0);

        $dailyBase = (int) floor($baseAmount / $nights);
        $dailyExtra = (int) floor($extraBedAmount / $nights);
        $dailyDiscount = (int) floor($discountAmount / $nights);
        $dailyExtraCount = (int) floor($extraBedCount / $nights);

        $remainderBase = $baseAmount % $nights;
        $remainderExtra = $extraBedAmount % $nights;
        $remainderDiscount = $discountAmount % $nights;
        $remainderExtraCount = $extraBedCount % $nights;

        $revenueData = [];

        for ($i = 0; $i < $nights; $i++) {
            $date = $checkIn->copy()->addDays($i);
            $curBase = $dailyBase + ($i < $remainderBase ? 1 : 0);
            $curExtra = $dailyExtra + ($i < $remainderExtra ? 1 : 0);
            $curDiscount = $dailyDiscount + ($i < $remainderDiscount ? 1 : 0);
            $curExtraCount = $dailyExtraCount + ($i < $remainderExtraCount ? 1 : 0);
            $curAmount = $curBase + $curExtra - $curDiscount;

            $revenueData[] = [
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tanggal' => $date->format('Y-m-d'),
                'amount' => $curAmount,
                'base_amount' => $curBase,
                'extra_bed_amount' => $curExtra,
                'extra_bed_count' => $curExtraCount,
                'weekend_premium' => 0,
                'seasonal_premium' => 0,
                'rate_type' => 'imported',
                'rate_name' => 'Imported Rate',
                'is_weekend' => $date->isWeekend(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        BookingDailyRevenue::insert($revenueData);
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

    /**
     * Sync imported payment details with DB
     */
    protected function syncImportedPayment(
        Booking $booking,
        ?Payment $existingPayment,
        ?float $amount,
        ?string $dateStr,
        ?string $methodName,
        ?string $status,
        string $defaultType,
        User $currentUser
    ): void {
        if (empty($amount) || $amount <= 0) {
            return;
        }

        // Find payment method by name
        $paymentMethod = null;
        if ($methodName) {
            $paymentMethod = PaymentMethod::where('name', $methodName)->first();
        }

        // Fallback payment method if missing
        if (! $paymentMethod) {
            $paymentMethod = PaymentMethod::active()->first();
        }

        if (! $paymentMethod) {
            return; // No payment method available
        }

        // Parse date
        $paymentDate = now();
        if ($dateStr) {
            try {
                $paymentDate = $this->parseDate($dateStr);
            } catch (\Exception $e) {
                $paymentDate = now();
            }
        }

        // Determine bank account details
        $bankAccount = $booking->property->bankAccount;
        $bankName = $bankAccount ? $bankAccount->bank_name : $paymentMethod->bank_name;
        $accountNumber = $bankAccount ? $bankAccount->account_number : $paymentMethod->account_number;
        $accountName = $bankAccount ? $bankAccount->account_holder : $paymentMethod->account_name;

        $paymentStatus = $status ? strtolower($status) : 'verified';

        if ($existingPayment) {
            // Update existing payment
            $existingPayment->update([
                'amount' => $amount,
                'payment_method_id' => $paymentMethod->id,
                'payment_method' => $paymentMethod->type,
                'payment_status' => $paymentStatus,
                'payment_date' => $paymentDate,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'account_name' => $accountName,
            ]);

            // Sync incomes for this payment if verified
            if ($paymentStatus === 'verified') {
                $existingPayment->verified_by = $currentUser->id;
                $existingPayment->verified_at = $existingPayment->verified_at ?? now();
                $existingPayment->save();
                app(PaymentIncomeSyncService::class)->syncOnVerified($existingPayment);
            }
        } else {
            // Create new payment
            $payment = $booking->payments()->create([
                'payment_number' => Payment::generatePaymentNumber(),
                'payment_method_id' => $paymentMethod->id,
                'amount' => $amount,
                'payment_type' => $defaultType,
                'payment_method' => $paymentMethod->type,
                'payment_status' => $paymentStatus,
                'payment_date' => $paymentDate,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'account_name' => $accountName,
                'processed_by' => $currentUser->id,
                'verified_by' => $paymentStatus === 'verified' ? $currentUser->id : null,
                'verified_at' => $paymentStatus === 'verified' ? now() : null,
            ]);

            if ($paymentStatus === 'verified') {
                app(PaymentIncomeSyncService::class)->syncOnVerified($payment);
            }
        }
    }
}

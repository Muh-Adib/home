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
            $nights = $checkIn->diffInDays($checkOut);

            if ($nights <= 0) {
                $nights = 1;
            }

            $guestMale = (int) ($rowArray['guest_male'] ?? 1);
            $guestFemale = (int) ($rowArray['guest_female'] ?? 0);
            $guestChildren = (int) ($rowArray['guest_children'] ?? 0);

            // Apply capacity-based guest count check
            if ($property->capacity < $property->capacity_max) {
                $guestCount = $guestMale + $guestFemale + (int) floor($guestChildren / 2);
            } else {
                $guestCount = $guestMale + $guestFemale + $guestChildren;
            }

            // Parse daily extra bed counts (can be pipe-separated e.g. "2|3")
            $extraBedInput = trim((string) ($rowArray['jumlah_extra_bed'] ?? '0'));
            $extraBedsPerNight = [];
            if (str_contains($extraBedInput, '|')) {
                $extraBedsPerNight = array_map('intval', explode('|', $extraBedInput));
            } else {
                $singleVal = (int) $extraBedInput;
                $extraBedsPerNight = array_fill(0, max(1, $nights), $singleVal);
            }

            // Calculate total extra bed count and amount
            $totalExtraBedCount = array_sum($extraBedsPerNight);
            $extraBedRate = (float) ($property->extra_bed_rate ?? 150000);
            $totalExtraBedAmount = 0;
            foreach ($extraBedsPerNight as $count) {
                $totalExtraBedAmount += $count * $extraBedRate;
            }

            $totalAmount = ! empty($rowArray['total_amount']) ? (float) $rowArray['total_amount'] : 0;
            $baseAmount = max(0.0, $totalAmount - $totalExtraBedAmount);

            // Parse payments & calculate payment status
            $p1Amount = ! empty($rowArray['pembayaran_1_nominal']) ? (float) $rowArray['pembayaran_1_nominal'] : 0;
            $p2Amount = ! empty($rowArray['pembayaran_2_nominal']) ? (float) $rowArray['pembayaran_2_nominal'] : 0;
            $totalPaid = $p1Amount + $p2Amount;

            if ($totalPaid >= $totalAmount && $totalAmount > 0) {
                $paymentStatus = 'fully_paid';
            } elseif ($totalPaid > 0) {
                $paymentStatus = 'dp_received';
            } else {
                $paymentStatus = 'dp_pending';
            }

            $dpPercentage = $totalAmount > 0 ? (int) round(($p1Amount / $totalAmount) * 100) : 50;

            // Resolve booking status
            $bookingStatusInput = strtolower(trim((string) ($rowArray['booking_status'] ?? '')));
            if ($bookingStatusInput === 'cancelled' || $bookingStatusInput === 'cancel') {
                $bookingStatus = 'cancelled';
            } else {
                $bookingStatus = 'confirmed';
            }

            // Prepare BookingRequest
            $bookingRequest = new BookingRequest(
                propertyId: $property->id,
                checkInDate: $checkIn->format('Y-m-d'),
                checkOutDate: $checkOut->format('Y-m-d'),
                checkInTime: $property->check_in_time ?? '15:00', // default to property check-in time
                guestCount: $guestCount,
                guestMale: $guestMale,
                guestFemale: $guestFemale,
                guestChildren: $guestChildren,
                guestName: $rowArray['guest_name'],
                guestEmail: $rowArray['guest_email'],
                guestPhone: $rowArray['guest_phone'] ?? '6281234567890',
                guestPhoneAlternative: null,
                guestCountry: $rowArray['guest_country'] ?? 'Indonesia',
                guestIdNumber: null, // skipped
                guestGender: $rowArray['guest_gender'] ?? 'male',
                relationshipType: 'keluarga', // skipped, default keluarga
                guests: [],
                specialRequests: null,
                internalNotes: $rowArray['internal_notes'] ?? null,
                bookingStatus: $bookingStatus,
                paymentStatus: $paymentStatus,
                dpPercentage: $dpPercentage,
                autoConfirm: false
            );

            // Resolve BookingService and current user
            $bookingService = app(BookingService::class);
            $currentUser = auth()->user();

            // Check if booking exists
            $existingBooking = Booking::where('booking_number', $bookingNumber)->first();

            if ($existingBooking) {
                $bookingService->updateBooking($existingBooking, $bookingRequest);
                $booking = $existingBooking->refresh();
            } else {
                $booking = $bookingService->createBooking($bookingRequest, $guestUser);
            }

            // Force overrides
            if ($bookingNumber) {
                $booking->booking_number = $bookingNumber;
            }
            $booking->base_amount = $baseAmount;
            $booking->extra_bed_amount = $totalExtraBedAmount;
            $booking->extra_bed_count = $totalExtraBedCount;
            $booking->service_amount = 0;
            $booking->tax_amount = 0;
            $booking->total_amount = $totalAmount;
            $booking->dp_amount = $p1Amount;
            $booking->remaining_amount = max(0.0, $totalAmount - $p1Amount);
            $booking->booking_status = $bookingStatus;
            $booking->payment_status = $paymentStatus;
            $booking->internal_notes = $rowArray['internal_notes'] ?? null;

            // Resolve closed_by staff name for created_by and closed_by fields
            $closedByName = $rowArray['closed_by'] ?? null;
            $closedById = $currentUser->id;
            if ($closedByName) {
                $closedUser = User::where('name', $closedByName)
                    ->where('role', '!=', 'guest')
                    ->first();
                if ($closedUser) {
                    $closedById = $closedUser->id;
                }
            }
            $booking->created_by = $closedById;
            $booking->closed_by = $closedById;

            // Resolve followed_up_by
            $followedUpByName = $rowArray['followed_up_by'] ?? null;
            if ($followedUpByName) {
                $follower = User::where('name', $followedUpByName)
                    ->where('role', '!=', 'guest')
                    ->first();
                if ($follower) {
                    $booking->followed_up_by = $follower->id;
                } else {
                    $booking->followed_up_by = null;
                }
            } else {
                $booking->followed_up_by = null;
            }

            $booking->save();

            // Recreate daily revenues
            $this->syncDailyRevenues($booking, $rowArray, $extraBedsPerNight);

            // Handle Payment Sync
            $existingPayments = $booking->payments()->orderBy('created_at')->get();

            // Sync Payment 1 (DP)
            $this->syncImportedPayment(
                $booking,
                $existingPayments->get(0),
                $p1Amount,
                $rowArray['pembayaran_1_tanggal'] ?? null,
                $rowArray['pembayaran_1_bank'] ?? null,
                $rowArray['pembayaran_1_no_rekening'] ?? null,
                'verified',
                'dp',
                $closedById
            );

            // Sync Payment 2 (Pelunasan)
            $this->syncImportedPayment(
                $booking,
                $existingPayments->get(1),
                $p2Amount,
                $rowArray['pembayaran_2_tanggal'] ?? null,
                $rowArray['pembayaran_2_bank'] ?? null,
                $rowArray['pembayaran_2_no_rekening'] ?? null,
                'verified',
                'remaining',
                $closedById
            );

            // Re-update payment status to sync balances/flags
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
     * Recreate daily revenues with explicit daily extra bed counts
     */
    protected function syncDailyRevenues(Booking $booking, array $rowArray, array $extraBedsPerNight): void
    {
        BookingDailyRevenue::where('booking_id', $booking->id)->delete();

        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);
        $nights = $checkIn->diffInDays($checkOut);

        if ($nights <= 0) {
            $nights = 1;
        }

        $totalAmount = (int) ($rowArray['total_amount'] ?? $booking->total_amount ?? 0);
        $extraBedRate = (float) ($booking->property->extra_bed_rate ?? 150000);

        $totalExtraBedAmount = 0;
        foreach ($extraBedsPerNight as $count) {
            $totalExtraBedAmount += $count * $extraBedRate;
        }

        $baseAmount = max(0, $totalAmount - $totalExtraBedAmount);

        $dailyBase = (int) floor($baseAmount / $nights);
        $remainderBase = $baseAmount % $nights;

        $revenueData = [];

        for ($i = 0; $i < $nights; $i++) {
            $date = $checkIn->copy()->addDays($i);
            $curBase = $dailyBase + ($i < $remainderBase ? 1 : 0);

            // Allocate extra beds day-by-day
            $curExtraCount = $extraBedsPerNight[$i] ?? 0;
            $curExtraAmount = $curExtraCount * $extraBedRate;
            $curAmount = $curBase + $curExtraAmount;

            $revenueData[] = [
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tanggal' => $date->format('Y-m-d'),
                'amount' => $curAmount,
                'base_amount' => $curBase,
                'extra_bed_amount' => $curExtraAmount,
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
        ?string $bankName,
        ?string $accountNumber,
        string $status,
        string $type,
        int $closedById
    ): void {
        if (empty($amount) || $amount <= 0) {
            return;
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

        // Resolve payment method by type bank_transfer
        $paymentMethod = PaymentMethod::where('type', 'transfer')->first()
            ?? PaymentMethod::active()->first();
        $paymentMethodId = $paymentMethod ? $paymentMethod->id : null;
        $paymentMethodType = $paymentMethod ? $paymentMethod->type : 'bank_transfer';

        // Fallback bank details from property bank account
        if (empty($bankName)) {
            $bankAccount = $booking->property->bankAccount;
            $bankName = $bankAccount ? $bankAccount->bank_name : ($paymentMethod ? $paymentMethod->bank_name : 'BCA');
            $accountNumber = $bankAccount ? $bankAccount->account_number : ($paymentMethod ? $paymentMethod->account_number : '');
        }

        $paymentStatus = strtolower($status);

        if ($existingPayment) {
            $existingPayment->update([
                'amount' => $amount,
                'payment_method_id' => $paymentMethodId,
                'payment_method' => $paymentMethodType,
                'payment_status' => $paymentStatus,
                'payment_date' => $paymentDate,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
            ]);

            if ($paymentStatus === 'verified') {
                $existingPayment->verified_by = $closedById;
                $existingPayment->verified_at = $existingPayment->verified_at ?? now();
                $existingPayment->save();
                app(PaymentIncomeSyncService::class)->syncOnVerified($existingPayment);
            }
        } else {
            $payment = $booking->payments()->create([
                'payment_number' => Payment::generatePaymentNumber(),
                'payment_method_id' => $paymentMethodId,
                'amount' => $amount,
                'payment_type' => $type,
                'payment_method' => $paymentMethodType,
                'payment_status' => $paymentStatus,
                'payment_date' => $paymentDate,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'processed_by' => $closedById,
                'verified_by' => $paymentStatus === 'verified' ? $closedById : null,
                'verified_at' => $paymentStatus === 'verified' ? now() : null,
            ]);

            if ($paymentStatus === 'verified') {
                app(PaymentIncomeSyncService::class)->syncOnVerified($payment);
            }
        }
    }
}

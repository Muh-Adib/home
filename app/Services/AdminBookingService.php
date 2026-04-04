<?php

declare(strict_types=1);

namespace App\Services;

use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Jobs\SyncPaymentIncomeJob;
use App\Services\AvailabilityService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

/**
 * AdminBookingService - Centralized service for admin booking operations
 * 
 * This service handles all admin-specific booking business logic:
 * - Guest user creation/lookup
 * - Auto-confirmation
 * - Payment processing
 * - Rate override handling
 * - Payment proof upload
 * - Service synchronization
 * 
 * Follows single source of truth and separation of concerns principles.
 */
class AdminBookingService
{
    public function __construct(
        private GuestCountService $guestCountService,
        private BookingExtraServiceSyncService $serviceSyncService,
        private RateOverrideLogService $rateOverrideLogService,
        private AvailabilityService $availabilityService,
        private \App\Actions\Booking\CreateBookingAction $createBookingAction,
        private \App\Actions\User\EnsureGuestUserAction $ensureUserAction,
        private ImageService $imageService
    ) {
    }

    /**
     * Create an admin booking with all related entities
     * 
     * @param array $validated Validated request data
     * @param UploadedFile|null $paymentProof Payment proof file
     * @param User $admin Admin user creating the booking
     * @return AdminBookingResult
     */
    public function createAdminBooking(
        array $validated,
        ?UploadedFile $paymentProof,
        User $admin
    ): AdminBookingResult {
        // 1. Guest count validation (before transaction)
        $property = Property::findOrFail($validated['property_id']);
        $guestCount = $this->guestCountService->calculateFromRequest($property, $validated);

        if ($guestCount > $property->capacity_max) {
            return AdminBookingResult::failure([
                'guest_count' => "Total guests ({$guestCount}) exceeds property maximum capacity ({$property->capacity_max}).",
            ]);
        }

        // 2. Availability check (before transaction)
        $forceOverride = (bool) ($validated['force_ota_override'] ?? false);
        $availability = $this->availabilityService->checkAvailability(
            $property,
            $validated['check_in_date'],
            $validated['check_out_date'],
            $guestCount,
            null,
            $forceOverride
        );

        if (!$availability['available']) {
            $overlappingBookings = \App\Models\Booking::where('property_id', $property->id)
                ->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
                ->where('check_in', '<', $validated['check_out_date'])
                ->where('check_out', '>', $validated['check_in_date'])
                ->get(['id', 'source']);

            $blockedByOtaOnly = $overlappingBookings->every(
                fn($b) => in_array($b->source, ['airbnb', 'booking_com', 'ota'])
            );

            return AdminBookingResult::failure([
                'error' => 'Property is not available for selected dates.',
                'booked_periods' => $availability['booked_periods'] ?? [],
                'can_override' => $blockedByOtaOnly,
            ]);
        }

        try {
            DB::beginTransaction();

            // 3. Prepare booking data (reuse already-computed $property and $guestCount)
            $bookingData = $this->prepareBookingData($validated, $guestCount);

            // 4. Create booking via CreateBookingAction (Shared logic)
            $booking = $this->createBookingAction->execute($bookingData, $admin);

            // 5. Create payment if provided
            $payment = null;
            if (!empty($validated['payment_method_id']) && !empty($validated['payment_amount'])) {
                $payment = $this->createPayment($booking, $validated, $paymentProof, $admin);
            }

            DB::commit();

            // Dispatch async payment income sync after commit (not inside transaction)
            if ($payment && $payment->payment_status === 'verified') {
                SyncPaymentIncomeJob::dispatch($payment->id)->afterCommit();
            }

            return AdminBookingResult::success($booking, $payment);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Admin booking creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'admin_id' => $admin->id,
            ]);
            return AdminBookingResult::failure(['error' => 'Failed to create booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Prepare booking data for BookingRequest
     */
    private function prepareBookingData(array $validated, int $guestCount): array
    {
        return [
            'property_id' => $validated['property_id'],
            'check_in' => $validated['check_in_date'],
            'check_out' => $validated['check_out_date'],
            'check_in_time' => $validated['check_in_time'] ?? '15:00',
            'guest_male' => $validated['guest_male'],
            'guest_female' => $validated['guest_female'],
            'guest_children' => $validated['guest_children'],
            'guest_count' => $guestCount,
            'guest_name' => $validated['guest_name'],
            'guest_email' => $validated['guest_email'],
            'guest_phone' => $validated['guest_phone'],
            'guest_country' => $validated['guest_country'] ?? 'Indonesia',
            'guest_id_number' => $validated['guest_id_number'] ?? null,
            'guest_gender' => $validated['guest_gender'] ?? 'male',
            'relationship_type' => $validated['relationship_type'] ?? 'keluarga',
            'guests' => $validated['guests'] ?? [],
            'special_requests' => $validated['special_requests'] ?? null,
            'internal_notes' => $validated['internal_notes'] ?? null,
            'booking_status' => $validated['booking_status'],
            'payment_status' => $validated['payment_status'],
            'dp_percentage' => $validated['dp_percentage'],
            'auto_confirm' => $validated['auto_confirm'] ?? false,
            'rate_override' => $validated['rate_override'] ?? false,
            'override_amount' => $validated['override_amount'] ?? null,
            'override_reason' => $validated['override_reason'] ?? null,
        ];
    }

    /**
     * Create payment and handle payment proof upload
     */
    private function createPayment(
        Booking $booking,
        array $validated,
        ?UploadedFile $paymentProof,
        User $admin
    ): Payment {
        $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
        $paymentStatus = $validated['payment_status_payment'] ?? 'verified';

        $payment = $booking->payments()->create([
            'payment_method_id' => $validated['payment_method_id'],
            'payment_number' => Payment::generatePaymentNumber(),
            'amount' => $validated['payment_amount'],
            'payment_type' => 'dp',
            'payment_method' => $paymentMethod->type,
            'payment_status' => $paymentStatus,
            'payment_date' => $validated['payment_date'] ?? now(),
            'reference_number' => $validated['reference_number'] ?? null,
            'bank_name' => $validated['bank_name'] ?? $paymentMethod->bank_name,
            'account_number' => $validated['account_number'] ?? null,
            'account_name' => $validated['account_name'] ?? null,
            'verification_notes' => $validated['verification_notes'] ?? null,
            'processed_by' => $admin->id,
            'verified_by' => $paymentStatus === 'verified' ? $admin->id : null,
            'verified_at' => $paymentStatus === 'verified' ? now() : null,
        ]);

        // Update booking payment status
        $booking->updatePaymentStatus();

        // Handle payment proof upload
        if ($paymentProof) {
            $this->uploadPaymentProof($payment, $paymentProof, $booking->booking_number);
        }

        return $payment;
    }

    /**
     * Upload and process payment proof (convert to WebP if image and supported)
     */
    private function uploadPaymentProof(Payment $payment, UploadedFile $file, string $bookingNumber): void
    {
        $isImage = str_starts_with($file->getMimeType(), 'image/');

        if ($isImage) {
            // Use centralized ImageService for image processing
            $result = $this->imageService->upload($file, [
                'directory' => 'payments/proof',
                'filename' => $bookingNumber . '_' . time(),
                'max_width' => 1920,
                'max_height' => 1920,
                'quality' => 85,
                'convert_to_webp' => true,
            ]);

            if (!$result->success) {
                // Fallback to original format if conversion fails
                Log::warning('Image processing failed, using original format', [
                    'error' => $result->error,
                    'booking_number' => $bookingNumber,
                ]);

                $extension = strtolower($file->getClientOriginalExtension());
                $originalFilename = $bookingNumber . '_' . time() . '.' . $extension;
                $finalPath = $file->storeAs('payments/proof', $originalFilename, 'public');
            } else {
                $finalPath = $result->path;
            }
        } else {
            // Store PDF as-is
            $extension = strtolower($file->getClientOriginalExtension());
            $pdfFilename = $bookingNumber . '_' . time() . '.' . $extension;
            $finalPath = $file->storeAs('payments/proof', $pdfFilename, 'public');
        }

        $payment->update(['attachment_path' => $finalPath]);
    }

}

/**
 * Result object for admin booking operations
 */
class AdminBookingResult
{
    private function __construct(
        private bool $success,
        private ?Booking $booking = null,
        private ?Payment $payment = null,
        private array $errors = []
    ) {
    }

    public static function success(Booking $booking, ?Payment $payment = null): self
    {
        return new self(true, $booking, $payment);
    }

    public static function failure(array $errors): self
    {
        return new self(false, null, null, $errors);
    }

    public function isSuccess(): bool
    {
        return $this->success;
    }

    public function isFailure(): bool
    {
        return !$this->success;
    }

    public function getBooking(): ?Booking
    {
        return $this->booking;
    }

    public function getPayment(): ?Payment
    {
        return $this->payment;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}

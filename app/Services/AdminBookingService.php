<?php

declare(strict_types=1);

namespace App\Services;

use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

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
        private BookingService $bookingService,
        private GuestCountService $guestCountService,
        private BookingServiceSyncService $serviceSyncService,
        private RateOverrideLogService $rateOverrideLogService,
        private PaymentIncomeSyncService $paymentIncomeSyncService
    ) {}

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
        try {
            DB::beginTransaction();

            // 1. Find or create guest user
            $guestUser = $this->findOrCreateGuestUser($validated);

            // 2. Calculate guest count
            $property = Property::findOrFail($validated['property_id']);
            $guestCount = $this->guestCountService->calculateFromRequest($property, $validated);

            // 3. Prepare booking data
            $bookingData = $this->prepareBookingData($validated, $guestCount);
            $bookingRequest = BookingRequest::fromArray($bookingData);

            // 4. Create booking via BookingService
            $booking = $this->bookingService->createBooking($bookingRequest, $guestUser);

            // 5. Apply admin-specific updates
            $this->applyAdminMetadata($booking, $admin, $validated);

            // 6. Handle rate override if specified
            if (!empty($validated['rate_override']) && !empty($validated['override_amount'])) {
                $this->applyRateOverride($booking, $validated, $admin);
            }

            // 7. Auto-verify if requested
            if ($validated['auto_confirm'] ?? false) {
                $this->autoConfirmBooking($booking, $admin);
            }

            // 8. Create payment if provided
            $payment = null;
            if (!empty($validated['payment_method_id']) && !empty($validated['payment_amount'])) {
                $payment = $this->createPayment($booking, $validated, $paymentProof, $admin);
            }

            // 9. Sync extra services
            $this->syncServices($booking, $validated['services'] ?? []);

            DB::commit();

            return AdminBookingResult::success($booking, $payment);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('Admin booking creation validation failed', [
                'errors' => $e->errors(),
                'admin_id' => $admin->id,
            ]);
            return AdminBookingResult::failure($e->errors());

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
     * Find existing guest user or create new one
     */
    private function findOrCreateGuestUser(array $validated): User
    {
        $guestUser = User::where('email', $validated['guest_email'])->first();

        if (!$guestUser) {
            $guestUser = User::create([
                'name' => $validated['guest_name'],
                'email' => $validated['guest_email'],
                'phone' => $validated['guest_phone'],
                'password' => Hash::make(Str::random(12)),
                'role' => 'guest',
                'status' => 'active',
                'email_verified_at' => now(), // Admin-created users are auto-verified
            ]);
        }

        return $guestUser;
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
            'guest_country' => $validated['guest_country'],
            'guest_id_number' => $validated['guest_id_number'],
            'guest_gender' => $validated['guest_gender'],
            'relationship_type' => $validated['relationship_type'],
            'guests' => $validated['guests'] ?? [],
            'special_requests' => $validated['special_requests'],
            'internal_notes' => $validated['internal_notes'],
            'booking_status' => $validated['booking_status'],
            'payment_status' => $validated['payment_status'],
            'dp_percentage' => $validated['dp_percentage'],
            'auto_confirm' => $validated['auto_confirm'] ?? false,
        ];
    }

    /**
     * Apply admin-specific metadata to booking
     */
    private function applyAdminMetadata(Booking $booking, User $admin, array $validated): void
    {
        $booking->update([
            'created_by' => $admin->id,
            'source' => $validated['source'] ?? 'direct',
        ]);
    }

    /**
     * Apply rate override and log the change
     */
    private function applyRateOverride(Booking $booking, array $validated, User $admin): void
    {
        $originalAmount = $booking->total_amount;
        $overrideAmount = $validated['override_amount'];
        $overrideReason = $validated['override_reason'] ?? null;

        $logMessage = $this->rateOverrideLogService->generateLog(
            $admin,
            $originalAmount,
            $overrideAmount,
            $overrideReason
        );

        $booking->update([
            'total_amount' => $overrideAmount,
            'internal_notes' => $this->rateOverrideLogService->appendToNotes(
                $booking->internal_notes,
                $logMessage
            ),
        ]);
    }

    /**
     * Auto-confirm booking
     */
    private function autoConfirmBooking(Booking $booking, User $admin): void
    {
        $booking->update([
            'verification_status' => 'approved',
            'verified_by' => $admin->id,
            'verified_at' => now(),
        ]);

        $booking->workflow()->create([
            'step' => 'approved',
            'status' => 'completed',
            'processed_by' => $admin->id,
            'processed_at' => now(),
            'notes' => 'Manual booking created by admin and auto-confirmed',
        ]);
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

        // Sync income if verified
        if ($paymentStatus === 'verified') {
            $this->paymentIncomeSyncService->syncOnVerified($payment);
        }

        // Handle payment proof upload
        if ($paymentProof) {
            $this->uploadPaymentProof($payment, $paymentProof, $booking->booking_number);
        }

        return $payment;
    }

    /**
     * Upload and process payment proof (convert to WebP if image)
     */
    private function uploadPaymentProof(Payment $payment, UploadedFile $file, string $bookingNumber): void
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $baseFilename = $bookingNumber . '_' . time();
        $isImage = in_array($extension, ['jpg', 'jpeg', 'png']);

        if ($isImage) {
            // Convert to WebP
            $webpFilename = $baseFilename . '.webp';
            $tempPath = $file->storeAs('payments/proof/temp', $file->hashName(), 'public');
            $tempFullPath = Storage::disk('public')->path($tempPath);
            $webpPath = 'payments/proof/' . $webpFilename;
            $webpFullPath = Storage::disk('public')->path($webpPath);

            // Ensure directory exists
            $directory = dirname($webpFullPath);
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }

            // Convert using Intervention Image v3
            $manager = new ImageManager(new Driver());
            $image = $manager->read($tempFullPath);

            // Resize if too large (max 1920x1920)
            if ($image->width() > 1920 || $image->height() > 1920) {
                $image->scaleDown(1920, 1920);
            }

            // Save as WebP with quality 85
            $image->toWebp(85)->save($webpFullPath);

            // Delete temp file
            Storage::disk('public')->delete($tempPath);

            $finalPath = $webpPath;
        } else {
            // Store PDF as-is
            $pdfFilename = $baseFilename . '.pdf';
            $finalPath = $file->storeAs('payments/proof', $pdfFilename, 'public');
        }

        $payment->update(['attachment_path' => $finalPath]);
    }

    /**
     * Sync booking services
     */
    private function syncServices(Booking $booking, array $services): void
    {
        if (empty($services)) {
            return;
        }

        $servicesTotal = $this->serviceSyncService->sync($booking, $services, false);
        $this->serviceSyncService->updateBookingTotalWithServices($booking, $servicesTotal);
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
    ) {}

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

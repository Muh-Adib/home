<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Actions\User\EnsureGuestUserAction;
use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingService;
use App\Services\BookingServiceSyncService;
use App\Services\RateOverrideLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CreateBookingAction - Unified action for creating bookings from guest and admin flows
 */
class CreateBookingAction
{
    public function __construct(
        private EnsureGuestUserAction $ensureUserAction,
        private BookingService $bookingService,
        private BookingServiceSyncService $serviceSyncService,
        private RateOverrideLogService $rateOverrideLogService
    ) {
    }

    /**
     * @param array $data Validated booking data
     * @param User|null $actor The user creating the booking (Admin/Staff or Guest)
     * @return Booking
     * @throws \Exception
     */
    public function execute(array $data, ?User $actor = null): Booking
    {
        return DB::transaction(function () use ($data, $actor) {
            // 1. Ensure Guest User
            $guestUser = $this->ensureUserAction->execute($data);

            // 2. Prepare Property
            $property = Property::findOrFail($data['property_id']);

            // 3. Create Booking via Core Service
            $bookingRequest = BookingRequest::fromArray($data);
            $booking = $this->bookingService->createBooking($bookingRequest, $guestUser);

            // 4. Guest-side Auto Login Logic
            if (!$actor && !Auth::check()) {
                Auth::login($guestUser);
                Log::info('New guest auto-logged in after booking', ['user_id' => $guestUser->id]);
            }

            // 5. Admin-side Metadata
            if ($actor && ($actor->hasRole('super_admin') || $actor->hasRole('property_manager') || $actor->hasRole('front_desk'))) {
                $booking->update([
                    'created_by' => $actor->id,
                    'source' => $data['source'] ?? 'direct',
                ]);

                // Handle Auto-Confirmation
                if ($data['auto_confirm'] ?? false) {
                    $this->autoConfirm($booking, $actor);
                }

                // Handle Rate Override
                if (($data['rate_override'] ?? false) && !empty($data['override_amount'])) {
                    $this->applyRateOverride($booking, $data, $actor);
                }
            }

            // 6. Sync Extra Services
            if (!empty($data['services'])) {
                $servicesTotal = $this->serviceSyncService->sync($booking, $data['services'], false);
                $this->serviceSyncService->updateBookingTotalWithServices($booking, $servicesTotal);
            }

            // 7. Session Cleanup (Guest side)
            if (session()->has('booking_data') || session()->has('pending_booking_data')) {
                session()->forget(['booking_data', 'pending_booking_data']);
            }

            return $booking;
        });
    }

    private function autoConfirm(Booking $booking, User $admin): void
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
            'notes' => 'Booking auto-confirmed during creation by admin/staff',
        ]);
    }

    private function applyRateOverride(Booking $booking, array $data, User $admin): void
    {
        $originalAmount = (float) $booking->total_amount;
        $overrideAmount = (float) $data['override_amount'];
        $overrideReason = $data['override_reason'] ?? 'Manual override';

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

        // Recalculate DP if needed
        $booking->update([
            'dp_amount' => ($booking->total_amount * $booking->dp_percentage) / 100,
            'remaining_amount' => $booking->total_amount - (($booking->total_amount * $booking->dp_percentage) / 100),
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Income;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeploymentDiagnosticService
{
    protected PaymentIncomeSyncService $incomeSyncService;

    public function __construct(PaymentIncomeSyncService $incomeSyncService)
    {
        $this->incomeSyncService = $incomeSyncService;
    }

    /**
     * Run full system diagnostic & data repair
     */
    public function runFullDiagnosticAndRepair(): array
    {
        $incomesFixed = $this->repairMissingIncomes();
        $paymentsSynced = $this->syncVerifiedPaymentIncomes();
        $bookingsUpdated = $this->recalculateBookingBalances();
        $hkStaffFixed = $this->repairMissingHkLocations();

        return [
            'status' => 'success',
            'repairs' => [
                'missing_incomes_created' => $incomesFixed,
                'verified_payments_synced' => $paymentsSynced,
                'booking_balances_recalculated' => $bookingsUpdated,
                'hk_staff_locations_defaulted_to_selatan' => $hkStaffFixed,
            ],
            'system' => [
                'db_connection' => DB::connection()->getPdo() ? 'connected' : 'failed',
                'active_bookings_count' => Booking::whereIn('booking_status', ['confirmed', 'checked_in'])->count(),
                'housekeeping_staff_count' => User::where('role', 'housekeeping')->count(),
            ],
        ];
    }

    /**
     * Repair missing Income entries for confirmed bookings
     */
    public function repairMissingIncomes(): int
    {
        $confirmedBookings = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])->get();
        $createdCount = 0;

        foreach ($confirmedBookings as $booking) {
            $hasIncome = Income::where('booking_id', $booking->id)->exists();
            if (! $hasIncome && $booking->total_amount > 0) {
                Income::create([
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'income_number' => 'INC-'.str_replace('BK', '', $booking->booking_number),
                    'category' => 'room_rent',
                    'amount' => $booking->total_amount,
                    'income_date' => $booking->check_in,
                    'source' => 'booking',
                    'description' => "Pendapatan dari Booking #{$booking->booking_number} ({$booking->guest_name})",
                    'recorded_by' => $booking->created_by ?: 1,
                    'verified_by' => $booking->verified_by ?: 1,
                    'verified_at' => $booking->verified_at ?: now(),
                ]);
                $createdCount++;
            }
        }

        return $createdCount;
    }

    /**
     * Sync all verified payments with Income records
     */
    public function syncVerifiedPaymentIncomes(): int
    {
        $verifiedPayments = Payment::where('payment_status', 'verified')->get();
        $syncedCount = 0;

        foreach ($verifiedPayments as $payment) {
            $this->incomeSyncService->syncOnVerified($payment);
            $syncedCount++;
        }

        return $syncedCount;
    }

    /**
     * Recalculate payment status and balances across all active bookings
     */
    public function recalculateBookingBalances(): int
    {
        $bookings = Booking::where('booking_status', '!=', 'cancelled')->get();
        $updatedCount = 0;

        foreach ($bookings as $booking) {
            $booking->updatePaymentStatus(save: true);
            $updatedCount++;
        }

        return $updatedCount;
    }

    /**
     * Ensure all Housekeeping staff have an explicit location ('selatan' default per user rule)
     */
    public function repairMissingHkLocations(): int
    {
        return User::where('role', 'housekeeping')
            ->whereNull('hk_location')
            ->update(['hk_location' => 'selatan']);
    }
}

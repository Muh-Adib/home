<?php

declare(strict_types=1);

namespace App\Models\Traits;

use App\Models\Payment;
use Illuminate\Support\Carbon;

/**
 * Payment Management Trait for Booking Model
 *
 * Handles all payment-related calculations and status management
 */
trait HasPaymentManagement
{
    /**
     * Calculate DP and remaining amounts based on total
     */
    public function calculateAmounts(): void
    {
        $this->dp_amount = $this->total_amount * ($this->dp_percentage / 100);
        $this->remaining_amount = $this->total_amount - $this->dp_paid_amount;
    }

    /**
     * Get total verified payment amount
     */
    public function getTotalPaidAmount(): float
    {
        return (float) $this->payments()
            ->where('payment_status', 'verified')
            ->sum('amount');
    }

    /**
     * Get payment progress details
     */
    public function getPaymentProgress(): array
    {
        $totalPaid = $this->getTotalPaidAmount();
        $dpPercentage = $this->dp_amount > 0 ? ($totalPaid / $this->dp_amount) * 100 : 0;
        $totalPercentage = ($totalPaid / $this->total_amount) * 100;

        return [
            'total_paid' => $totalPaid,
            'dp_percentage' => min(100, $dpPercentage),
            'total_percentage' => min(100, $totalPercentage),
            'is_dp_complete' => $totalPaid >= $this->dp_amount,
            'is_fully_paid' => $totalPaid >= $this->total_amount,
        ];
    }

    public function updatePaymentStatus(bool $save = false): void
    {
        $totalPaid = $this->getTotalPaidAmount();

        $dpAmount = $this->dp_amount ?? 0;
        $isFullyPaid = $totalPaid >= $this->total_amount;
        $isDpComplete = $dpAmount > 0 ? $totalPaid >= $dpAmount : $totalPaid > 0;

        if ($isFullyPaid) {
            $this->payment_status = 'fully_paid';
        } elseif ($isDpComplete) {
            $this->payment_status = 'dp_received';
        } elseif ($this->is_dp_overdue) {
            $this->payment_status = 'overdue';
        } else {
            $this->payment_status = 'dp_pending';
        }

        // Update monetary fields — single source of truth
        $this->dp_paid_amount = (int) $totalPaid;
        $this->remaining_amount = max(0, (int) ($this->total_amount - $totalPaid));

        if ($save) {
            $this->save();
        }
    }

    /**
     * Generate secure payment token
     */
    public function generatePaymentToken(): string
    {
        $token = bin2hex(random_bytes(16)); // 32 character token
        $expiresAt = Carbon::parse(now()->addDays(7)->toDateTimeString());

        $this->newQuery()->where($this->getKeyName(), $this->getKey())->update([
            'payment_token' => $token,
            'payment_token_expires_at' => $expiresAt,
        ]);

        $this->payment_token = $token;
        $this->payment_token_expires_at = $expiresAt;
        $this->syncOriginalAttribute('payment_token');
        $this->syncOriginalAttribute('payment_token_expires_at');

        return $token;
    }

    /**
     * Check if payment token is valid (including check_out date + 1 day limit)
     */
    public function isPaymentTokenValid(string $token): bool
    {
        if ($this->check_out) {
            $checkOutLimit = Carbon::parse($this->check_out)->addDay()->endOfDay();
            if (now()->gt($checkOutLimit)) {
                return false;
            }
        }

        if ($this->payment_token !== $token) {
            return false;
        }

        if (! $this->payment_token_expires_at || $this->payment_token_expires_at->isPast()) {
            $expiresAt = now()->addDays(7);
            $this->newQuery()->where($this->getKeyName(), $this->getKey())->update([
                'payment_token_expires_at' => $expiresAt,
            ]);
            $this->payment_token_expires_at = $expiresAt;
        }

        return true;
    }

    /**
     * Get secure payment URL
     */
    public function getSecurePaymentUrl(): ?string
    {
        if (! $this->payment_token) {
            return null;
        }

        return route('booking.secure-payment', [
            'booking' => $this->booking_number,
            'token' => $this->payment_token,
        ]);
    }

    /**
     * Clear payment token
     */
    public function clearPaymentToken(): void
    {
        $this->newQuery()->where($this->getKeyName(), $this->getKey())->update([
            'payment_token' => null,
            'payment_token_expires_at' => null,
        ]);

        $this->payment_token = null;
        $this->payment_token_expires_at = null;
        $this->syncOriginalAttribute('payment_token');
        $this->syncOriginalAttribute('payment_token_expires_at');
    }
}

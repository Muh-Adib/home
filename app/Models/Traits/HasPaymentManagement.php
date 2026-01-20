<?php

declare(strict_types=1);

namespace App\Models\Traits;

use App\Models\Payment;

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

    /**
     * Update payment status based on payments received
     */
    public function updatePaymentStatus(): void
    {
        $progress = $this->getPaymentProgress();
        
        if ($progress['is_fully_paid']) {
            $this->payment_status = 'fully_paid';
        } elseif ($progress['is_dp_complete']) {
            $this->payment_status = 'dp_received';
        } elseif ($this->is_dp_overdue) {
            $this->payment_status = 'overdue';
        } else {
            $this->payment_status = 'dp_pending';
        }
    }

    /**
     * Generate secure payment token
     */
    public function generatePaymentToken(): string
    {
        $token = bin2hex(random_bytes(16)); // 32 character token
        
        $this->update([
            'payment_token' => $token,
            'payment_token_expires_at' => now()->addDays(7), // Valid for 7 days
        ]);

        return $token;
    }

    /**
     * Check if payment token is valid
     */
    public function isPaymentTokenValid(string $token): bool
    {
        return $this->payment_token === $token && 
               $this->payment_token_expires_at && 
               $this->payment_token_expires_at->isFuture();
    }

    /**
     * Get secure payment URL
     */
    public function getSecurePaymentUrl(): ?string
    {
        if (!$this->payment_token) {
            return null;
        }

        return route('booking.secure-payment', [
            'booking' => $this->booking_number,
            'token' => $this->payment_token
        ]);
    }

    /**
     * Clear payment token
     */
    public function clearPaymentToken(): void
    {
        $this->update([
            'payment_token' => null,
            'payment_token_expires_at' => null,
        ]);
    }
}

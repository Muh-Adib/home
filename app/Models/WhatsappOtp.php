<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappOtp extends Model
{
    protected $fillable = [
        'phone',
        'otp_code',
        'expires_at',
        'is_verified',
        'attempts',
        'ip_address',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_verified' => 'boolean',
    ];

    /**
     * Check if OTP is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if max attempts reached
     */
    public function isMaxAttempts(): bool
    {
        return $this->attempts >= 3;
    }

    /**
     * Increment verification attempts
     */
    public function incrementAttempts(): void
    {
        $this->increment('attempts');
    }

    /**
     * Mark OTP as verified
     */
    public function markAsVerified(): void
    {
        $this->update(['is_verified' => true]);
    }

    /**
     * Get the latest unverified OTP for a phone number
     */
    public static function getLatestForPhone(string $phone): ?self
    {
        return static::where('phone', $phone)
            ->where('is_verified', false)
            ->latest()
            ->first();
    }
}

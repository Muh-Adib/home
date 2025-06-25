<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Str;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'booking_number',
        'property_id',
        'guest_name',
        'guest_email',
        'guest_phone',
        'guest_country',
        'guest_id_number',
        'guest_gender',
        'guest_count',
        'guest_male',
        'guest_female',
        'guest_children',
        'relationship_type',
        'check_in',
        'check_in_time',
        'check_out',
        'nights',
        'base_amount',
        'extra_bed_amount',
        'service_amount',
        'tax_amount',
        'total_amount',
        'dp_percentage',
        'dp_amount',
        'dp_paid_amount',
        'remaining_amount',
        'payment_status',
        'booking_status',
        'verification_status',
        'dp_deadline',
        'special_requests',
        'internal_notes',
        'cancellation_reason',
        'cancelled_at',
        'cancelled_by',
        'verified_by',
        'verified_at',
        'payment_token',
        'payment_token_expires_at',
        'created_by',
        'source',
    ];

    protected $casts = [
        'check_in' => 'date',
        'check_out' => 'date',
        'base_amount' => 'decimal:2',
        'extra_bed_amount' => 'decimal:2',
        'service_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'dp_amount' => 'decimal:2',
        'dp_paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'dp_deadline' => 'datetime',
        'cancelled_at' => 'datetime',
        'verified_at' => 'datetime',
        'payment_token_expires_at' => 'datetime',
    ];

    // Boot method untuk auto-generate booking number
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($booking) {
            if (empty($booking->booking_number)) {
                $booking->booking_number = self::generateBookingNumber();
            }
            
            // Auto calculate nights
            if ($booking->check_in && $booking->check_out) {
                $booking->nights = \Carbon\Carbon::parse($booking->check_in)
                                                ->diffInDays(\Carbon\Carbon::parse($booking->check_out));
            }
            
            // Auto calculate DP deadline (2 days from creation)
            if (!$booking->dp_deadline) {
                $booking->dp_deadline = now()->addDays(2);
            }
        });

        static::updating(function ($booking) {
            // Recalculate nights if dates change
            if ($booking->isDirty(['check_in', 'check_out'])) {
                $booking->nights = \Carbon\Carbon::parse($booking->check_in)
                ->diffInDays(\Carbon\Carbon::parse($booking->check_out));
            }
        });
    }

    // Relationships
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(BookingGuest::class);
    }

    public function primaryGuest(): HasMany
    {
        return $this->hasMany(BookingGuest::class)->where('guest_type', 'primary');
    }

    public function services(): HasMany
    {
        return $this->hasMany(BookingService::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function workflow(): HasMany
    {
        return $this->hasMany(BookingWorkflow::class);
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('booking_status', 'pending_verification');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('booking_status', 'confirmed');
    }

    public function scopeActiveBookings($query)
    {
        return $query->whereIn('booking_status', ['confirmed', 'checked_in']);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('check_in', '>', now())
                    ->whereIn('booking_status', ['confirmed', 'pending_verification']);
    }

    public function scopeCurrentGuests($query)
    {
        return $query->where('booking_status', 'checked_in')
                    ->where('check_in', '<=', now())
                    ->where('check_out', '>', now());
    }

    public function scopeOverdueDP($query)
    {
        return $query->where('payment_status', 'dp_pending')
                    ->where('dp_deadline', '<', now());
    }

    // Accessors & Mutators
    protected function formattedTotalAmount(): Attribute
    {
        return Attribute::make(
            get: fn () => 'Rp ' . number_format($this->total_amount, 0, ',', '.')
        );
    }

    protected function formattedDpAmount(): Attribute
    {
        return Attribute::make(
            get: fn () => 'Rp ' . number_format($this->dp_amount, 0, ',', '.')
        );
    }

    protected function formattedRemainingAmount(): Attribute
    {
        return Attribute::make(
            get: fn () => 'Rp ' . number_format($this->remaining_amount, 0, ',', '.')
        );
    }

    protected function isDpOverdue(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->payment_status === 'dp_pending' && $this->dp_deadline < now()
        );
    }

    protected function daysUntilCheckIn(): Attribute
    {
        return Attribute::make(
            get: fn () => now()->diffInDays($this->check_in, false)
        );
    }

    protected function statusBadgeColor(): Attribute
    {
        return Attribute::make(
            get: fn () => match($this->booking_status) {
                'pending_verification' => 'yellow',
                'confirmed' => 'green', 
                'checked_in' => 'blue',
                'checked_out' => 'gray',
                'cancelled' => 'red',
                'no_show' => 'red',
                default => 'gray'
            }
        );
    }

    // Accessor and Mutator for check_in_time
    protected function checkInTime(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                
                // Handle different time formats
                try {
                    if (strlen($value) === 5) { // Already in H:i format
                        return $value;
                    } elseif (strlen($value) === 8) { // H:i:s format
                        return \Carbon\Carbon::createFromFormat('H:i:s', $value)->format('H:i');
                    } else {
                        // Try to parse as Carbon time
                        return \Carbon\Carbon::parse($value)->format('H:i');
                    }
                } catch (\Exception $e) {
                    return $value; // Return original value if parsing fails
                }
            },
            set: function ($value) {
                if (!$value) return null;
                
                try {
                    // Ensure we store in H:i:s format for database
                    if (strlen($value) === 5) { // H:i format
                        return $value . ':00';
                    } elseif (strlen($value) === 8) { // Already H:i:s
                        return $value;
                    } else {
                        // Try to parse and format
                        return \Carbon\Carbon::parse($value)->format('H:i:s');
                    }
                } catch (\Exception $e) {
                    // Fallback - assume it's already in correct format
                    return $value;
                }
            },
        );
    }

    // Static Methods
    public static function generateBookingNumber(): string
    {
        $prefix = 'BK';
        $date = now()->format('ymd');
        $lastBooking = self::whereDate('created_at', today())
                          ->latest('id')
                          ->first();
        
        $sequence = $lastBooking ? 
                   intval(substr($lastBooking->booking_number, -3)) + 1 : 1;
        
        return $prefix . $date . sprintf('%03d', $sequence);
    }

    // Helper Methods
    public function calculateAmounts(): void
    {
        // Calculate DP amount based on percentage
        $this->dp_amount = $this->total_amount * ($this->dp_percentage / 100);
        $this->remaining_amount = $this->total_amount - $this->dp_paid_amount;
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->booking_status, [
            'pending_verification', 
            'confirmed'
        ]) && $this->check_in > now();
    }

    public function canCheckIn(): bool
    {
        return $this->booking_status === 'confirmed' 
               && $this->payment_status === 'fully_paid'
               && $this->check_in <= now()
               && $this->check_out > now();
    }

    public function canCheckOut(): bool
    {
        return $this->booking_status === 'checked_in'
               && $this->check_out <= now()->addHours(2); // Grace period
    }

    public function isGuest($guestCount): bool
    {
        return $this->guest_count === $guestCount;
    }

    public function needsExtraBed(): bool
    {
        return $this->guest_count > $this->property->capacity;
    }

    public function getExtraBedCount(): int
    {
        return max(0, $this->guest_count - $this->property->capacity);
    }

    public function getTotalPaidAmount(): float
    {
        return $this->payments()
                   ->where('payment_status', 'verified')
                   ->sum('amount');
    }

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

    public function updatePaymentStatus(): void
    {
        $progress = $this->getPaymentProgress();
        
        if ($progress['is_fully_paid']) {
            $this->payment_status = 'fully_paid';
        } elseif ($progress['is_dp_complete']) {
            $this->payment_status = 'dp_received';
        } elseif ($this->isDpOverdue) {
            $this->payment_status = 'overdue';
        } else {
            $this->payment_status = 'dp_pending';
        }
        
        $this->save();
    }

    public function getRouteKeyName(): string
    {
        return 'booking_number';
    }

    /**
     * Generate secure payment token for verified booking
     */
    public function generatePaymentToken(): string
    {
        $token = bin2hex(random_bytes(16)); // 32 character token
        
        $this->update([
            'payment_token' => $token,
            'payment_token_expires_at' => now()->addDays(7), // Token valid for 7 days
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

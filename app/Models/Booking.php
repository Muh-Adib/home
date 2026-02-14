<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Str;

class Booking extends Model
{
    use HasFactory, SoftDeletes;
    use Traits\HasPaymentManagement;
    use Traits\HasCheckinInstructions;
    use Traits\HasBookingStatus;

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
        // Note: rate_calculation removed - breakdown stored in booking_daily_revenue table
        'base_amount',
        'extra_bed_amount',
        'extra_bed_count',
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
        'checkin_instruction',
        'keybox_code',
        'maps_link',
        'is_cleaned',
        'cleaned_at',
        'cleaned_by',
        'cleaning_notes',
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
        'external_id',
        'external_reservation_url',
        'external_phone',
    ];

    protected $casts = [
        'check_in' => 'date',
        'check_out' => 'date',
        'base_amount' => 'integer',
        'extra_bed_amount' => 'integer',
        'extra_bed_count' => 'integer',
        'service_amount' => 'integer',
        'total_amount' => 'integer',
        'dp_amount' => 'integer',
        'dp_paid_amount' => 'integer',
        'remaining_amount' => 'integer',
        'dp_deadline' => 'datetime',
        'cancelled_at' => 'datetime',
        'verified_at' => 'datetime',
        'cleaned_at' => 'datetime',
        'payment_token_expires_at' => 'datetime',
        'is_cleaned' => 'boolean',
        // Note: rate_calculation removed from casts - use accessor instead
    ];

    protected $appends = [
        'payment_link',
        'rate_calculation', // Virtual attribute generated from booking_daily_revenue
    ];

    // Boot method untuk auto-generate booking number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($booking) {
            // Only generate if booking_number is explicitly null or empty
            if (empty($booking->booking_number) || $booking->booking_number === '') {
                // Generate booking number - now with built-in locking and duplicate prevention
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

    public function primaryGuest(): HasOne
    {
        return $this->hasOne(BookingGuest::class)->where('guest_type', 'primary');
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

    public function cleanedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cleaned_by');
    }

    public function review()
    {
        return $this->hasOne(Review::class);
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

    /**
     * ✅ NEW SCOPES - Laravel Best Practices
     */

    /**
     * Scope: Active bookings (not cancelled or no-show)
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('booking_status', ['cancelled', 'no_show']);
    }

    /**
     * Scope: Overlapping bookings for a date range
     */
    public function scopeOverlapping($query, string $checkIn, string $checkOut)
    {
        return $query->where(function ($q) use ($checkIn, $checkOut) {
            $q->where('check_in', '<', $checkOut)
                ->where('check_out', '>', $checkIn);
        });
    }

    /**
     * Scope: Bookings for a specific property
     */
    public function scopeForProperty($query, int $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    /**
     * Scope: Bookings visible to a user (respects property ownership)
     */
    public function scopeForUser($query, User $user)
    {
        if ($user->role === 'property_owner') {
            return $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Admin, super_admin, etc can see all bookings
        return $query;
    }

    /**
     * Scope: Bookings in a date range
     */
    public function scopeInDateRange($query, string $startDate, string $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('check_in', [$startDate, $endDate])
                ->orWhereBetween('check_out', [$startDate, $endDate])
                ->orWhere(function ($q2) use ($startDate, $endDate) {
                    $q2->where('check_in', '<=', $startDate)
                        ->where('check_out', '>=', $endDate);
                });
        });
    }

    // Accessors & Mutators
    protected function formattedTotalAmount(): Attribute
    {
        return Attribute::make(
            get: fn() => 'Rp ' . number_format((int) $this->total_amount, 0, ',', '.')
        );
    }

    protected function formattedDpAmount(): Attribute
    {
        return Attribute::make(
            get: fn() => 'Rp ' . number_format((int) $this->dp_amount, 0, ',', '.')
        );
    }

    protected function formattedRemainingAmount(): Attribute
    {
        return Attribute::make(
            get: fn() => 'Rp ' . number_format((int) $this->remaining_amount, 0, ',', '.')
        );
    }

    protected function isDpOverdue(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->payment_status === 'dp_pending' && $this->dp_deadline < now()
        );
    }

    protected function daysUntilCheckIn(): Attribute
    {
        return Attribute::make(
            get: fn() => now()->diffInDays($this->check_in, false)
        );
    }

    protected function statusBadgeColor(): Attribute
    {
        return Attribute::make(
            get: fn() => match ($this->booking_status) {
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
                if (!$value)
                    return null;

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
                if (!$value)
                    return null;

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

        // Use database transaction with locking to prevent race conditions
        return \DB::transaction(function () use ($prefix, $date) {
            // Find the highest sequence number for today, including soft-deleted records
            // Use withTrashed() to check ALL records (including soft-deleted) to avoid duplicates
            $lastBooking = self::withTrashed()
                ->where('booking_number', 'LIKE', $prefix . $date . '%')
                ->lockForUpdate() // Lock to prevent concurrent access
                ->orderByRaw('CAST(SUBSTR(booking_number, -4) AS UNSIGNED) DESC')
                ->first();

            // Extract sequence from last booking number
            if ($lastBooking && preg_match('/\d{4}$/', $lastBooking->booking_number, $matches)) {
                $sequence = intval($matches[0]) + 1;
            } else {
                $sequence = 1;
            }

            // Cap sequence at 9999 (4 digits)
            if ($sequence > 9999) {
                // If we exceed 9999 bookings in a day, add microsecond suffix
                $microseconds = substr(str_replace('.', '', (string) microtime(true)), -6);
                return $prefix . $date . '9999-' . $microseconds;
            }

            $bookingNumber = $prefix . $date . sprintf('%04d', $sequence);

            // Final safety check - if somehow still exists, add microsecond suffix
            $attempts = 0;
            while (self::withTrashed()->where('booking_number', $bookingNumber)->exists() && $attempts < 10) {
                $sequence++;
                if ($sequence > 9999) {
                    $microseconds = substr(str_replace('.', '', (string) microtime(true)), -6);
                    $bookingNumber = $prefix . $date . '9999-' . $microseconds;
                    break;
                }
                $bookingNumber = $prefix . $date . sprintf('%04d', $sequence);
                $attempts++;
            }

            return $bookingNumber;
        });
    }

    // ✅ Methods moved to Traits:
    // - Payment methods → HasPaymentManagement trait
    // - Checkin instructions → HasCheckinInstructions trait  
    // - Status checks → HasBookingStatus trait

    /**
     * @deprecated Use isGuest() is not a clear naming, consider renaming or removing
     */
    public function isGuest($guestCount): bool
    {
        return $this->guest_count === $guestCount;
    }

    public function getRouteKeyName(): string
    {
        return 'booking_number';
    }

    // ✅ Payment token methods moved to HasPaymentManagement trait

    /**
     * Get payment link for frontend
     */
    protected function paymentLink(): Attribute
    {
        return Attribute::make(
            get: function () {
                // Generate payment token if not exists
                if (!$this->payment_token) {
                    $this->generatePaymentToken();
                }

                return $this->getSecurePaymentUrl();
            }
        );
    }

    // ✅ clearPaymentToken() moved to HasPaymentManagement trait

    /**
     * Get rate calculation (virtual attribute)
     * Generated from booking_daily_revenue or recalculated from booking data
     */
    protected function rateCalculation(): Attribute
    {
        return Attribute::make(
            get: function () {
                // Try to generate from booking_daily_revenue first
                $dailyRevenues = $this->dailyRevenues;

                if ($dailyRevenues->isNotEmpty()) {
                    return $this->generateRateCalculationFromDailyRevenue($dailyRevenues);
                }

                // If no daily revenue, recalculate from booking data
                return $this->recalculateRateCalculation();
            }
        );
    }

    /**
     * Generate rate calculation from booking_daily_revenue
     */
    private function generateRateCalculationFromDailyRevenue($dailyRevenues): array
    {
        $totalAmount = $dailyRevenues->sum('amount');
        $dailyBreakdown = [];

        foreach ($dailyRevenues as $revenue) {
            $date = $revenue->tanggal->format('Y-m-d');
            $carbonDate = \Carbon\Carbon::parse($date);

            $dailyBreakdown[$date] = [
                'date' => $date,
                'day_name' => $carbonDate->format('l'),
                'base_rate' => (string) $revenue->amount,
                'final_rate' => (string) $revenue->amount,
                'premiums' => [],
                'seasonal_rate' => null,
                'extra_bed_rate' => '0.00',
            ];
        }

        return [
            'nights' => $this->nights,
            'base_amount' => $this->base_amount,
            'weekend_premium' => $this->extra_bed_amount ?? 0, // Adjust based on your logic
            'seasonal_premium' => 0,
            'extra_bed_amount' => $this->extra_bed_amount ?? 0,
            'cleaning_fee' => 0,
            'tax_amount' => $this->tax_amount ?? 0,
            'total_amount' => (float) $this->total_amount,
            'extra_beds' => $this->extra_bed_count ?? 0,
            'breakdown' => [
                'daily_breakdown' => $dailyBreakdown,
                'total_base_amount' => (float) $this->base_amount,
                'subtotal' => (float) $this->total_amount,
            ],
            'seasonal_rates_applied' => [],
        ];
    }

    /**
     * Recalculate rate calculation from booking data
     */
    private function recalculateRateCalculation(): array
    {
        // Recalculate using RateCalculationService
        try {
            $rateCalculationService = app(\App\Services\RateCalculationService::class);
            $checkIn = $this->check_in instanceof \DateTimeInterface ? $this->check_in->format('Y-m-d') : $this->check_in;
            $checkOut = $this->check_out instanceof \DateTimeInterface ? $this->check_out->format('Y-m-d') : $this->check_out;

            $calculation = $rateCalculationService->calculateRate(
                $this->property,
                $checkIn,
                $checkOut,
                $this->guest_count
            );

            return $calculation->toArray();
        } catch (\Exception $e) {
            // Fallback to basic structure
            return [
                'nights' => $this->nights,
                'base_amount' => (float) $this->base_amount,
                'weekend_premium' => 0,
                'seasonal_premium' => 0,
                'extra_bed_amount' => (float) ($this->extra_bed_amount ?? 0),
                'cleaning_fee' => 0,
                'tax_amount' => (float) ($this->tax_amount ?? 0),
                'total_amount' => (float) $this->total_amount,
                'extra_beds' => 0,
                'breakdown' => [
                    'daily_breakdown' => [],
                    'total_base_amount' => (float) $this->base_amount,
                    'subtotal' => (float) $this->total_amount,
                ],
                'seasonal_rates_applied' => [],
            ];
        }
    }

    /**
     * Relationship to booking_daily_revenue
     */
    public function dailyRevenues(): HasMany
    {
        return $this->hasMany(BookingDailyRevenue::class);
    }
}

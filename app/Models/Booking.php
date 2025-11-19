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
        // Note: rate_calculation removed - breakdown stored in booking_daily_revenue table
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
                // Generate base booking number
                $baseNumber = self::generateBookingNumber();
                
                // Quick check if exists - if yes, immediately add microsecond suffix
                // This avoids multiple retry loops
                if (self::where('booking_number', $baseNumber)->exists()) {
                    // Immediately use microsecond suffix for guaranteed uniqueness
                    $microseconds = substr(str_replace('.', '', (string)microtime(true)), -6);
                    $booking->booking_number = $baseNumber . '-' . $microseconds;
                    
                    // Final check - if still exists (very rare), add random suffix
                    if (self::where('booking_number', $booking->booking_number)->exists()) {
                        $random = strtoupper(Str::random(4));
                        $booking->booking_number = $baseNumber . '-' . $microseconds . $random;
                    }
                } else {
                    $booking->booking_number = $baseNumber;
                }
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
        
        // Optimized: Use simple query without lock for better performance
        // Lock is only needed in high-concurrency scenarios
        $lastBooking = self::whereDate('created_at', today())
            ->orderByRaw('CAST(SUBSTR(booking_number, -3) AS INTEGER) DESC')
            ->first();
        
        $sequence = $lastBooking ? 
                   intval(substr($lastBooking->booking_number, -3)) + 1 : 1;
        
        // Cap sequence at 999 to avoid issues
        if ($sequence > 999) {
            $sequence = 1; // Reset or use microsecond suffix
        }
        
        $bookingNumber = $prefix . $date . sprintf('%03d', $sequence);
        
        // Quick check - if exists, increment sequence once (no retry loop)
        if (self::where('booking_number', $bookingNumber)->exists()) {
            $sequence++;
            if ($sequence > 999) {
                $sequence = 1;
            }
            $bookingNumber = $prefix . $date . sprintf('%03d', $sequence);
        }
        
        return $bookingNumber;
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
    }

    /**
     * Get check-in instructions for this booking.
     * Flow: custom booking instruction > property template > default template
     * Keybox code is always taken from property.current_keybox_code
     */
    public function getCheckinInstructions(): array
    {
        $property = $this->property;
        
        // Step 1: Check if booking has custom checkin_instruction
        if (!empty($this->checkin_instruction)) {
            $instructions = is_array($this->checkin_instruction) 
                ? $this->checkin_instruction 
                : ['custom' => $this->checkin_instruction];
        } 
        // Step 2: Use property template if exists
        elseif (!empty($property->checkin_instructions) && is_array($property->checkin_instructions)) {
            $instructions = $property->checkin_instructions;
        } 
        // Step 3: Fallback to default template
        else {
            $instructions = Property::getDefaultCheckinInstructionsTemplate();
        }

        // Replace placeholders with actual data
        $keyboxCode = $property->current_keybox_code ?? 'N/A';
        $propertyName = $property->name ?? 'Property';
        $propertyAddress = $property->address ?? '';

        return $this->replaceInstructionPlaceholders($instructions, [
            'keybox_code' => $keyboxCode,
            'property_name' => $propertyName,
            'address' => $propertyAddress,
        ]);
    }

    /**
     * Replace placeholders in instructions array/string
     */
    private function replaceInstructionPlaceholders($instructions, array $replacements): array
    {
        if (is_string($instructions)) {
            return str_replace(
                array_map(fn($key) => '{{' . $key . '}}', array_keys($replacements)),
                array_values($replacements),
                $instructions
            );
        }

        if (!is_array($instructions)) {
            return [];
        }

        $result = [];
        foreach ($instructions as $key => $value) {
            if (is_string($value)) {
                $result[$key] = str_replace(
                    array_map(fn($k) => '{{' . $k . '}}', array_keys($replacements)),
                    array_values($replacements),
                    $value
                );
            } elseif (is_array($value)) {
                $result[$key] = $this->replaceInstructionPlaceholders($value, $replacements);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Get formatted check-in instructions as string (for display)
     */
    public function getFormattedCheckinInstructions(): string
    {
        $instructions = $this->getCheckinInstructions();
        
        if (empty($instructions)) {
            return '';
        }

        $formatted = [];
        
        // Handle array format
        if (isset($instructions['welcome'])) {
            if (!empty($instructions['welcome'])) {
                $formatted[] = $instructions['welcome'];
            }
            if (!empty($instructions['keybox_location'])) {
                $formatted[] = $instructions['keybox_location'];
            }
            if (!empty($instructions['keybox_code'])) {
                $formatted[] = $instructions['keybox_code'];
            }
            if (!empty($instructions['checkin_time'])) {
                $formatted[] = $instructions['checkin_time'];
            }
            if (!empty($instructions['emergency_contact'])) {
                $formatted[] = $instructions['emergency_contact'];
            }
            if (!empty($instructions['additional_info']) && is_array($instructions['additional_info'])) {
                $formatted[] = "\n" . implode("\n", array_map(fn($info) => "• " . $info, $instructions['additional_info']));
            }
        } 
        // Handle simple array or custom format
        else {
            foreach ($instructions as $key => $value) {
                if (is_string($value)) {
                    $formatted[] = $value;
                } elseif (is_array($value)) {
                    $formatted[] = implode("\n", array_map(fn($v) => "• " . $v, $value));
                }
            }
        }

        return implode("\n\n", array_filter($formatted));
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
            'extra_beds' => 0,
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
            $calculation = $rateCalculationService->calculateRate(
                $this->property,
                $this->check_in->format('Y-m-d'),
                $this->check_out->format('Y-m-d'),
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

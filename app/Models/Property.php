<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Str;

class Property extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'address',
        'maps_link',
        'lat',
        'lng',
        'capacity',
        'capacity_max',
        'bedroom_count',
        'bathroom_count',
        'base_rate',
        'weekend_premium_percent',
        'cleaning_fee',
        'extra_bed_rate',
        'status',
        'amenities',
        'house_rules',
        'check_in_time',
        'check_out_time',
        'min_stay_weekday',
        'min_stay_weekend',
        'min_stay_peak',
        'is_featured',
        'sort_order',
        'seo_title',
        'seo_description',
        'seo_keywords',
        'current_keybox_code',
        'keybox_updated_at',
        'keybox_updated_by',
        'checkin_instructions',
    ];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'base_rate' => 'decimal:2',
        'cleaning_fee' => 'decimal:2',
        'extra_bed_rate' => 'decimal:2',
        'amenities' => 'array',
        'is_featured' => 'boolean',
        'check_in_time' => 'datetime:H:i',
        'check_out_time' => 'datetime:H:i',
        'checkin_instructions' => 'array',
        'keybox_updated_at' => 'datetime',
    ];

    // Boot method untuk auto-generate slug
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($property) {
            if (empty($property->slug)) {
                $property->slug = Str::slug($property->name);
            }
        });

        static::updating(function ($property) {
            if ($property->isDirty('name') && empty($property->slug)) {
                $property->slug = Str::slug($property->name);
            }
        });
    }

    // Relationships
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(PropertyMedia::class);
    }

    public function coverImage(): HasMany
    {
        return $this->hasMany(PropertyMedia::class)->where('is_cover', true)->latest();
    }

    public function featuredImages(): HasMany
    {
        return $this->hasMany(PropertyMedia::class)->where('is_featured', true)->orderBy('display_order');
    }

    public function amenityRelations(): HasMany
    {
        return $this->hasMany(PropertyAmenity::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'property_amenities')
                    ->withPivot('is_available', 'notes')
                    ->withTimestamps();
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function confirmedBookings(): HasMany
    {
        return $this->hasMany(Booking::class)->where('booking_status', 'confirmed');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(PropertyExpense::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(FinancialReport::class);
    }

    public function seasonalRates(): HasMany
    {
        return $this->hasMany(PropertySeasonalRate::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function approvedReviews(): HasMany
    {
        return $this->hasMany(Review::class)->approved();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeByOwner($query, $ownerId)
    {
        return $query->where('owner_id', $ownerId);
    }

    public function scopeAvailableFor($query, $checkIn, $checkOut)
    {
        return $query->whereDoesntHave('bookings', function ($bookingQuery) use ($checkIn, $checkOut) {
            $bookingQuery->where('booking_status', '!=', 'cancelled')
                        ->where(function ($dateQuery) use ($checkIn, $checkOut) {
                            $dateQuery->whereBetween('check_in', [$checkIn, $checkOut])
                                     ->orWhereBetween('check_out', [$checkIn, $checkOut])
                                     ->orWhere(function ($overlapQuery) use ($checkIn, $checkOut) {
                                         $overlapQuery->where('check_in', '<=', $checkIn)
                                                     ->where('check_out', '>=', $checkOut);
                                     });
                        });
        });
    }

    // Accessors & Mutators using Laravel 12 Attribute
    protected function formattedBaseRate(): Attribute
    {
        return Attribute::make(
            get: fn () => 'Rp ' . number_format($this->base_rate, 0, ',', '.')
        );
    }

    protected function isAvailable(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->status === 'active'
        );
    }

    protected function totalCapacity(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->capacity}-{$this->capacity_max} guests"
        );
    }

    // Helper Methods
    public function isAvailableForDates($checkIn, $checkOut): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        // Convert input dates to ensure proper format
        try {
            $checkInDate = \Carbon\Carbon::parse($checkIn);
            $checkOutDate = \Carbon\Carbon::parse($checkOut);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Invalid date format in isAvailableForDates', [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'error' => $e->getMessage()
            ]);
            return false;
        }

        // Convert to standard Y-m-d format for consistency
        $checkIn = $checkInDate->format('Y-m-d');
        $checkOut = $checkOutDate->format('Y-m-d');
        $nights = $checkInDate->diffInDays($checkOutDate);

        // Check minimum stay requirements
        //if (!$this->meetsMinimumStay($checkInDate, $checkOutDate, $nights)) {
        //    return false;
        //}

        // Check for existing bookings using CORRECT overlap detection logic
        // Two periods overlap if: start1 < end2 AND start2 < end1
        $hasOverlappingBooking = $this->bookings()
                    ->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
                    ->where(function ($query) use ($checkIn, $checkOut) {
                        $query->where('check_in', '<', $checkOut)
                              ->where('check_out', '>', $checkIn);
                    })
                    ->exists();

        if ($hasOverlappingBooking) {
            \Illuminate\Support\Facades\Log::info('Property not available - overlapping booking found', [
                'property_id' => $this->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'hasOverlappingBooking' => $hasOverlappingBooking 
            ]);
            return false;
        }

        // Check maintenance blocks (if implemented later)
        // This could check against a maintenance_schedules table

        return true;
    }

    /**
     * Check if booking meets minimum stay requirements
     */
    private function meetsMinimumStay(\Carbon\Carbon $checkInDate, \Carbon\Carbon $checkOutDate, int $nights): bool
    {
        // Get effective minimum stay considering seasonal rates
        $effectiveMinStay = $this->getEffectiveMinimumStay(
            $checkInDate->format('Y-m-d'), 
            $checkOutDate->format('Y-m-d')
        );
        
        return $nights >= $effectiveMinStay;
    }

    public function calculateRate($checkIn, $checkOut, $guestCount = null): array
    {
        $checkInDate = \Carbon\Carbon::parse($checkIn);
        $checkOutDate = \Carbon\Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);
        
        if ($nights <= 0) {
            throw new \InvalidArgumentException('Check-out must be after check-in date');
        }
        
        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $this->id, 
            $checkInDate, 
            $checkOutDate
        );
        
        // Initialize calculation variables
        $totalBaseAmount = 0;
        $totalWeekendPremium = 0;
        $totalSeasonalPremium = 0;
        $weekendNights = 0;
        $weekdayNights = 0;
        $seasonalNights = 0;
        $dailyBreakdown = [];
        $appliedSeasonalRates = [];
        
        // Calculate night-by-night for dynamic pricing
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            $dayRate = $this->base_rate;
            $dateString = $date->format('Y-m-d');
            $seasonalRate = $seasonalRates[$dateString] ?? null;
            $appliedPremiums = [];
            
            // Apply seasonal rate if exists
            $seasonalPremiumAmount = 0;
            if ($seasonalRate) {
                $originalRate = $dayRate;
                $dayRate = $seasonalRate->calculateRate($dayRate);
                $seasonalPremiumAmount = $dayRate - $originalRate;
                $totalSeasonalPremium += $seasonalPremiumAmount;
                $seasonalNights++;
                
                $appliedPremiums[] = [
                    'type' => 'seasonal',
                    'name' => $seasonalRate->name,
                    'description' => $seasonalRate->getFormattedRateDescription(),
                    'amount' => $seasonalPremiumAmount,
                    'min_stay_nights' => $seasonalRate->min_stay_nights 
                ];
                
                // Track unique seasonal rates applied
                if (!in_array($seasonalRate->name, array_column($appliedSeasonalRates, 'name'))) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'description' => $seasonalRate->getFormattedRateDescription(),
                        'dates' => [$dateString],
                        'min_stay_nights' => $seasonalRate->min_stay_nights 
                    ];
                } else {
                    // Add date to existing seasonal rate
                    $key = array_search($seasonalRate->name, array_column($appliedSeasonalRates, 'name'));
                    $appliedSeasonalRates[$key]['dates'][] = $dateString;
                }
            }
            
            // Weekend premium (Friday, Saturday) - only if no seasonal rate or if seasonal rate allows
            $weekendPremiumAmount = 0;
            if (($date->isFriday() || $date->isSaturday()) && 
                (!$seasonalRate || !$seasonalRate->applies_to_weekends_only)) {
                $weekendNights++;
                $weekendPremiumAmount = $this->base_rate * ($this->weekend_premium_percent / 100);
                $totalWeekendPremium += $weekendPremiumAmount;
                $dayRate += $weekendPremiumAmount;
                
                $appliedPremiums[] = [
                    'type' => 'weekend',
                    'name' => 'Weekend Premium',
                    'description' => "+{$this->weekend_premium_percent}%",
                    'amount' => $weekendPremiumAmount
                ];
            } else if (!($date->isFriday() || $date->isSaturday())) {
                $weekdayNights++;
            }
            
            // Long weekend premium (national holidays) - stacks with others
            $holidayPremiumAmount = 0;
            if ($this->isLongWeekend($date)) {
                $holidayPremiumAmount = $this->base_rate * 0.15; // 15% holiday premium
                $dayRate += $holidayPremiumAmount;
                
                $appliedPremiums[] = [
                    'type' => 'holiday',
                    'name' => 'Holiday Premium',
                    'description' => '+15%',
                    'amount' => $holidayPremiumAmount
                ];
            }
            
            $totalBaseAmount += $dayRate;
            
            $dailyBreakdown[$dateString] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('l'),
                'base_rate' => $this->base_rate,
                'final_rate' => $dayRate,
                'premiums' => $appliedPremiums,
                'seasonal_rate' => $seasonalRate ? [
                    'name' => $seasonalRate->name,
                    'type' => $seasonalRate->rate_type,
                    'value' => $seasonalRate->rate_value
                ] : null
            ];
        }
        
        // Extra bed calculation
        $extraBeds = $guestCount ? max(0, $guestCount - $this->capacity) : 0;
        $extraBedAmount = $extraBeds * $this->extra_bed_rate * $nights;
        
        // Apply minimum stay discount
        $minimumStayDiscount = 0;
        if ($nights >= 7) {
            $minimumStayDiscount = $totalBaseAmount * 0.1; // 10% discount for weekly stays
        } elseif ($nights >= 3) {
            $minimumStayDiscount = $totalBaseAmount * 0.05; // 5% discount for 3+ nights
        }
        
        $subtotal = $totalBaseAmount + $extraBedAmount + $this->cleaning_fee - $minimumStayDiscount;
        
        // Tax calculation (11% VAT)
        $taxAmount = $subtotal * 0.11;
        $totalAmount = $subtotal + $taxAmount;
        
        // Get minimum stay information
        $minimumStayInfo = $this->getMinimumStayInfo($checkIn, $checkOut);
        
        return [
            'nights' => $nights,
            'weekday_nights' => $weekdayNights,
            'weekend_nights' => $weekendNights,
            'seasonal_nights' => $seasonalNights,
            'base_amount' => $this->base_rate * $nights,
            'total_base_amount' => $totalBaseAmount,
            'weekend_premium' => $totalWeekendPremium,
            'seasonal_premium' => $totalSeasonalPremium,
            'extra_bed_amount' => $extraBedAmount,
            'cleaning_fee' => $this->cleaning_fee,
            'minimum_stay_discount' => $minimumStayDiscount,
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'extra_beds' => $extraBeds,
            'minimum_stay' => $minimumStayInfo,
            'rate_breakdown' => [
                'base_rate_per_night' => $this->base_rate,
                'weekend_premium_percent' => $this->weekend_premium_percent,
                'peak_season_applied' => $this->hasPeakSeasonDates($checkInDate, $checkOutDate),
                'long_weekend_applied' => $this->hasLongWeekend($checkInDate, $checkOutDate),
                'seasonal_rates_applied' => $appliedSeasonalRates,
            ],
            'daily_breakdown' => $dailyBreakdown,
            'summary' => [
                'average_nightly_rate' => $nights > 0 ? $totalBaseAmount / $nights : 0,
                'total_nights' => $nights,
                'base_nights_rate' => $this->base_rate * $nights,
                'total_premiums' => $totalWeekendPremium + $totalSeasonalPremium,
                'effective_discount' => $minimumStayDiscount,
                'taxes_and_fees' => $taxAmount + $this->cleaning_fee + $extraBedAmount,
            ]
        ];
    }

    /**
     * Check if date is a long weekend (Indonesian national holidays)
     */
    private function isLongWeekend(\Carbon\Carbon $date): bool
    {
        // Common Indonesian long weekends (simplified)
        $longWeekends = [
            // New Year
            ['month' => 1, 'day' => 1],
            // Independence Day
            ['month' => 8, 'day' => 17],
            // Christmas
            ['month' => 12, 'day' => 25],
        ];
        
        foreach ($longWeekends as $holiday) {
            if ($date->month === $holiday['month'] && $date->day === $holiday['day']) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if date range has peak season dates
     */
    private function hasPeakSeasonDates(\Carbon\Carbon $checkIn, \Carbon\Carbon $checkOut): bool
    {
        for ($date = $checkIn->copy(); $date->lt($checkOut); $date->addDay()) {
            if (in_array($date->month, [12, 7, 8])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if date range has long weekend
     */
    private function hasLongWeekend(\Carbon\Carbon $checkIn, \Carbon\Carbon $checkOut): bool
    {
        for ($date = $checkIn->copy(); $date->lt($checkOut); $date->addDay()) {
            if ($this->isLongWeekend($date)) {
                return true;
            }
        }
        return false;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Generate new keybox code and update property
     */
    public function generateNewKeyboxCode($updatedBy = null): string
    {
        $newCode = str_pad(random_int(100, 999), 3, '0', STR_PAD_LEFT);
        
        $this->update([
            'current_keybox_code' => $newCode,
            'keybox_updated_at' => now(),
            'keybox_updated_by' => $updatedBy ?? auth()->id(),
        ]);

        return $newCode;
    }

    /**
     * Get formatted check-in instructions with current keybox code
     */
    public function getFormattedCheckinInstructions(): array
    {
        $instructions = $this->checkin_instructions ?? [];
        
        // Replace placeholders with actual data
        return array_map(function($instruction) {
            if (is_string($instruction)) {
                return str_replace(
                    ['{{keybox_code}}', '{{property_name}}', '{{address}}'],
                    [$this->current_keybox_code, $this->name, $this->address],
                    $instruction
                );
            }
            return $instruction;
        }, $instructions);
    }

    /**
     * Default check-in instructions template
     */
    public static function getDefaultCheckinInstructionsTemplate(): array
    {
        return [
            'welcome' => 'Selamat datang di {{property_name}}!',
            'keybox_location' => 'Keybox terletak di depan pintu masuk.',
            'keybox_code' => 'Kode keybox: {{keybox_code}}',
            'checkin_time' => 'Check-in time: 14:00 - 22:00',
            'emergency_contact' => 'Hubungi kami jika ada kendala: 0812-3456-7890',
            'additional_info' => [
                'WiFi password tersedia di dalam rumah',
                'Harap menjaga kebersihan selama menginap',
                'Check-out maksimal pukul 12:00'
            ]
        ];
    }

    /**
     * Relationship to user who updated keybox
     */
    public function keyboxUpdatedBy()
    {
        return $this->belongsTo(User::class, 'keybox_updated_by');
    }

    /**
     * Get list of booked dates within a given range
     */
    public function getBookedDatesInRange($checkIn, $checkOut): array
    {
        $checkInDate = \Carbon\Carbon::parse($checkIn);
        $checkOutDate = \Carbon\Carbon::parse($checkOut);
        
        // Get all confirmed bookings that overlap with the range
        $bookings = $this->bookings()
            ->whereIn('booking_status', ['confirmed', 'checked_in'])
            ->where(function ($query) use ($checkInDate, $checkOutDate) {
                $query->where(function ($q) use ($checkInDate, $checkOutDate) {
                    // Booking starts within our range
                    $q->whereBetween('check_in', [$checkInDate->format('Y-m-d'), $checkOutDate->format('Y-m-d')])
                      // Booking ends within our range
                      ->orWhereBetween('check_out', [$checkInDate->format('Y-m-d'), $checkOutDate->format('Y-m-d')])
                      // Booking completely encompasses our range
                      ->orWhere(function ($encompass) use ($checkInDate, $checkOutDate) {
                          $encompass->where('check_in', '<=', $checkInDate->format('Y-m-d'))
                                   ->where('check_out', '>=', $checkOutDate->format('Y-m-d'));
                      });
                });
            })
            ->get(['check_in', 'check_out']);

        $bookedDates = [];
        
        foreach ($bookings as $booking) {
            $bookingStart = \Carbon\Carbon::parse($booking->check_in);
            $bookingEnd = \Carbon\Carbon::parse($booking->check_out);
            
            // Generate all dates within the booking period
            $currentDate = $bookingStart->copy();
            while ($currentDate->lte($bookingEnd->subDay())) { // Exclude checkout date
                if ($currentDate->gte($checkInDate) && $currentDate->lte($checkOutDate)) {
                    $bookedDates[] = $currentDate->format('Y-m-d');
                }
                $currentDate->addDay();
            }
        }
        
        return array_unique($bookedDates);
    }

    /**
     * Get effective minimum stay for a date range considering seasonal rates
     */
    public function getEffectiveMinimumStay($checkIn, $checkOut): int
    {
        $checkInDate = \Carbon\Carbon::parse($checkIn);
        $checkOutDate = \Carbon\Carbon::parse($checkOut);
        
        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $this->id, 
            $checkInDate, 
            $checkOutDate
        );
        
        // If no seasonal rates, use property default
        if (empty($seasonalRates)) {
            return $this->getDefaultMinimumStay($checkInDate, $checkOutDate);
        }
        
        // Get the highest minimum stay from seasonal rates
        $maxSeasonalMinStay = 0;
        foreach ($seasonalRates as $date => $seasonalRate) {
            if ($seasonalRate && $seasonalRate->min_stay_nights > $maxSeasonalMinStay) {
                $maxSeasonalMinStay = $seasonalRate->min_stay_nights;
            }
        }
        
        // If seasonal rate has higher minimum stay, use it
        if ($maxSeasonalMinStay > 0) {
            return $maxSeasonalMinStay;
        }
        
        // Otherwise use property default
        return $this->getDefaultMinimumStay($checkInDate, $checkOutDate);
    }
    
    /**
     * Get default minimum stay based on property settings
     */
    private function getDefaultMinimumStay(\Carbon\Carbon $checkInDate, \Carbon\Carbon $checkOutDate): int
    {
        $nights = $checkInDate->diffInDays($checkOutDate);
        
        // Check if it includes weekend (Friday/Saturday checkout)
        $includesWeekend = false;
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            if ($date->isFriday() || $date->isSaturday()) {
                $includesWeekend = true;
                break;
            }
        }

        // Check if it includes peak season
        $includesPeakSeason = $this->hasPeakSeasonDates($checkInDate, $checkOutDate);

        // Return appropriate minimum stay
        if ($includesPeakSeason) {
            return $this->min_stay_peak;
        } elseif ($includesWeekend) {
            return $this->min_stay_weekend;
        } else {
            return $this->min_stay_weekday;
        }
    }

    /**
     * Get minimum stay information for frontend display
     */
    public function getMinimumStayInfo($checkIn, $checkOut): array
    {
        $checkInDate = \Carbon\Carbon::parse($checkIn);
        $checkOutDate = \Carbon\Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);
        
        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $this->id, 
            $checkInDate, 
            $checkOutDate
        );
        
        $effectiveMinStay = $this->getEffectiveMinimumStay($checkIn, $checkOut);
        $meetsRequirement = $nights >= $effectiveMinStay;
        
        // Get seasonal rate info if applicable
        $seasonalRateInfo = null;
        if (!empty($seasonalRates)) {
            $appliedSeasonalRates = [];
            foreach ($seasonalRates as $date => $seasonalRate) {
                if ($seasonalRate && $seasonalRate->min_stay_nights > 0) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'min_stay' => $seasonalRate->min_stay_nights,
                        'date' => $date
                    ];
                }
            }
            
            if (!empty($appliedSeasonalRates)) {
                $seasonalRateInfo = $appliedSeasonalRates;
            }
        }
        
        return [
            'effective_min_stay' => $effectiveMinStay,
            'current_nights' => $nights,
            'meets_requirement' => $meetsRequirement,
            'has_seasonal_rate' => !empty($seasonalRates),
            'seasonal_rate_info' => $seasonalRateInfo,
            'default_min_stay' => [
                'weekday' => $this->min_stay_weekday,
                'weekend' => $this->min_stay_weekend,
                'peak' => $this->min_stay_peak,
            ]
        ];
    }
}

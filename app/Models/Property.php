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

        $checkInDate = \Carbon\Carbon::parse($checkIn);
        $checkOutDate = \Carbon\Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);

        // Check minimum stay requirements
        if (!$this->meetsMinimumStay($checkInDate, $checkOutDate, $nights)) {
            return false;
        }

        // Check for existing bookings (avoid overlaps)
        $hasOverlappingBooking = $this->bookings()
                    ->where('booking_status', '!=', 'cancelled')
                    ->where(function ($query) use ($checkIn, $checkOut) {
                        $query->whereBetween('check_in', [$checkIn, $checkOut])
                              ->orWhereBetween('check_out', [$checkIn, $checkOut])
                              ->orWhere(function ($overlapQuery) use ($checkIn, $checkOut) {
                                  $overlapQuery->where('check_in', '<=', $checkIn)
                                              ->where('check_out', '>=', $checkOut);
                              });
                    })
                    ->exists();

        if ($hasOverlappingBooking) {
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

        // Apply minimum stay rules
        if ($includesPeakSeason && $nights < $this->min_stay_peak) {
            return false;
        } elseif ($includesWeekend && $nights < $this->min_stay_weekend) {
            return false;
        } elseif ($nights < $this->min_stay_weekday) {
            return false;
        }

        return true;
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
                    'amount' => $seasonalPremiumAmount
                ];
                
                // Track unique seasonal rates applied
                if (!in_array($seasonalRate->name, array_column($appliedSeasonalRates, 'name'))) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'description' => $seasonalRate->getFormattedRateDescription(),
                        'dates' => [$dateString]
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
                    $q->whereBetween('check_in_date', [$checkInDate->format('Y-m-d'), $checkOutDate->format('Y-m-d')])
                      // Booking ends within our range
                      ->orWhereBetween('check_out_date', [$checkInDate->format('Y-m-d'), $checkOutDate->format('Y-m-d')])
                      // Booking completely encompasses our range
                      ->orWhere(function ($encompass) use ($checkInDate, $checkOutDate) {
                          $encompass->where('check_in_date', '<=', $checkInDate->format('Y-m-d'))
                                   ->where('check_out_date', '>=', $checkOutDate->format('Y-m-d'));
                      });
                });
            })
            ->get(['check_in_date', 'check_out_date']);

        $bookedDates = [];
        
        foreach ($bookings as $booking) {
            $bookingStart = \Carbon\Carbon::parse($booking->check_in_date);
            $bookingEnd = \Carbon\Carbon::parse($booking->check_out_date);
            
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
}

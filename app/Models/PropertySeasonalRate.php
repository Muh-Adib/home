<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class PropertySeasonalRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'name',
        'start_date',
        'end_date', 
        'rate_type',
        'rate_value',
        'min_stay_nights',
        'applies_to_weekends_only',
        'is_active',
        'priority',
        'description',
        'applicable_days',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'rate_value' => 'decimal:2',
        'applies_to_weekends_only' => 'boolean',
        'is_active' => 'boolean',
        'applicable_days' => 'array',
    ];

    /**
     * Get the property that owns this seasonal rate
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Scope to get active seasonal rates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get rates ordered by priority (highest first)
     */
    public function scopeByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }

    /**
     * Check if this seasonal rate applies to a specific date
     */
    public function appliesTo(Carbon $date): bool
    {
        // Check if date is within the range
        if (!$date->between($this->start_date, $this->end_date)) {
            return false;
        }

        // Check if it applies to weekends only
        if ($this->applies_to_weekends_only && !$date->isWeekend()) {
            return false;
        }

        // Check specific days if applicable_days is set
        if ($this->applicable_days && !empty($this->applicable_days)) {
            $dayOfWeek = $date->dayOfWeek; // 0=Sunday, 1=Monday, etc.
            if (!in_array($dayOfWeek, $this->applicable_days)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate the rate for a specific base rate
     */
    public function calculateRate(float $baseRate): float
    {
        switch ($this->rate_type) {
            case 'percentage':
                return $baseRate * (1 + $this->rate_value / 100);
            case 'fixed':
                return $this->rate_value;
            case 'multiplier':
                return $baseRate * $this->rate_value;
            default:
                return $baseRate;
        }
    }

    /**
     * Get formatted description of the rate
     */
    public function getFormattedRateDescription(): string
    {
        switch ($this->rate_type) {
            case 'percentage':
                return "+{$this->rate_value}% dari tarif dasar";
            case 'fixed':
                return "Rp " . number_format($this->rate_value, 0, ',', '.') . " per malam";
            case 'multiplier':
                return "{$this->rate_value}x tarif dasar";
            default:
                return "Tarif khusus";
        }
    }

    /**
     * Check if this rate conflicts with another rate for the same property
     */
    public function conflictsWith(PropertySeasonalRate $other): bool
    {
        // Same property and same priority level
        if ($this->property_id === $other->property_id && $this->priority === $other->priority) {
            // Check date overlap
            return $this->start_date <= $other->end_date && $this->end_date >= $other->start_date;
        }
        
        return false;
    }

    /**
     * Get the effective rate for a date range
     */
    public static function getEffectiveRateForProperty(int $propertyId, Carbon $startDate, Carbon $endDate): array
    {
        $rates = static::where('property_id', $propertyId)
            ->active()
            ->byPriority()
            ->where(function ($query) use ($startDate, $endDate) {
                $query->where(function ($q) use ($startDate, $endDate) {
                    // Seasonal rate starts within booking period
                    $q->whereBetween('start_date', [$startDate, $endDate])
                    // Or seasonal rate ends within booking period  
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    // Or seasonal rate completely covers booking period
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->where('start_date', '<=', $startDate)
                           ->where('end_date', '>=', $endDate);
                    });
                });
            })
            ->get();

        $dailyRates = [];
        
        // Group rates by date
        for ($date = $startDate->copy(); $date->lt($endDate); $date->addDay()) {
            $applicableRates = $rates->filter(function ($rate) use ($date) {
                return $rate->appliesTo($date);
            });
            
            // Get highest priority rate for this date
            $effectiveRate = $applicableRates->first();
            $dailyRates[$date->format('Y-m-d')] = $effectiveRate;
        }

        return $dailyRates;
    }
} 
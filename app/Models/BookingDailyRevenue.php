<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class BookingDailyRevenue extends Model
{
    use HasFactory;

    protected $table = 'booking_daily_revenue';

    protected $fillable = [
        'booking_id',
        'property_id',
        'tanggal',
        'amount',
        'base_amount',
        'weekend_premium',
        'seasonal_premium',
        'extra_bed_amount',
        'rate_type',
        'rate_name',
        'is_weekend',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'amount' => 'decimal:2',
        'base_amount' => 'decimal:2',
        'weekend_premium' => 'decimal:2',
        'seasonal_premium' => 'decimal:2',
        'extra_bed_amount' => 'decimal:2',
        'is_weekend' => 'boolean',
    ];

    /**
     * Relationship to Booking
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Relationship to Property
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeInPeriod(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('tanggal', [$startDate, $endDate]);
    }

    /**
     * Scope: Filter by confirmed/active bookings only
     */
    public function scopeConfirmedBookings(Builder $query): Builder
    {
        return $query->whereHas('booking', function ($q) {
            $q->whereIn('booking_status', ['confirmed', 'checked_in', 'completed']);
        });
    }

    /**
     * Scope: Filter by property owner
     */
    public function scopeForOwner(Builder $query, int $ownerId): Builder
    {
        return $query->whereHas('property', function ($q) use ($ownerId) {
            $q->where('owner_id', $ownerId);
        });
    }

    /**
     * Get revenue breakdown by type for a period
     */
    public static function getRevenueBreakdown($startDate, $endDate, ?int $propertyId = null, ?int $ownerId = null): array
    {
        $query = static::query()
            ->inPeriod($startDate, $endDate)
            ->confirmedBookings();

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        if ($ownerId) {
            $query->forOwner($ownerId);
        }

        return [
            'total' => (float) $query->sum('amount'),
            'base_amount' => (float) (clone $query)->sum('base_amount'),
            'weekend_premium' => (float) (clone $query)->sum('weekend_premium'),
            'seasonal_premium' => (float) (clone $query)->sum('seasonal_premium'),
            'extra_bed_amount' => (float) (clone $query)->sum('extra_bed_amount'),
            'days_count' => (clone $query)->count(),
            'weekend_days' => (clone $query)->where('is_weekend', true)->count(),
            'seasonal_days' => (clone $query)->where('rate_type', 'seasonal')->count(),
        ];
    }

    /**
     * Get monthly revenue breakdown
     */
    public static function getMonthlyBreakdown(int $year, ?int $propertyId = null, ?int $ownerId = null): array
    {
        $months = [];
        
        for ($month = 1; $month <= 12; $month++) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
            
            $breakdown = static::getRevenueBreakdown($startDate, $endDate, $propertyId, $ownerId);
            
            $months[] = [
                'month' => $month,
                'month_name' => $startDate->format('M'),
                'year' => $year,
                ...$breakdown
            ];
        }
        
        return $months;
    }
}
 
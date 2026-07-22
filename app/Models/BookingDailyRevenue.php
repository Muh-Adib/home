<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'extra_bed_count',
        'rate_type',
        'rate_name',
        'is_weekend',
    ];

    protected $casts = [
        'tanggal' => 'datetime',
        'amount' => 'integer',
        'base_amount' => 'integer',
        'weekend_premium' => 'integer',
        'seasonal_premium' => 'integer',
        'extra_bed_amount' => 'integer',
        'extra_bed_count' => 'integer',
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
        $start = $startDate instanceof Carbon ? $startDate->toDateString() : $startDate;
        $end = $endDate instanceof Carbon ? $endDate->toDateString() : $endDate;

        return $query->whereBetween('tanggal', [$start, $end]);
    }

    /**
     * Scope: Filter by confirmed/active bookings only
     */
    public function scopeConfirmedBookings(Builder $query): Builder
    {
        return $query->whereHas('booking', function ($q) {
            $q->where(function ($sub) {
                $sub->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->orWhere(function ($orSub) {
                        $orSub->where('booking_status', 'cancelled')
                            ->whereIn('payment_status', ['dp_received', 'fully_paid']);
                    });
            });
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
                ...$breakdown,
            ];
        }

        return $months;
    }
}

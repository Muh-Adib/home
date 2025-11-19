<?php

namespace App\Models;

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
    ];

    protected $casts = [
        'tanggal' => 'date',
        'amount' => 'decimal:2',
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
} 
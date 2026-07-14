<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingCleaner extends Model
{
    use HasFactory;

    protected $table = 'booking_cleaners';

    protected $fillable = [
        'booking_id',
        'user_id',
        'points',
    ];

    protected $casts = [
        'points' => 'float',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

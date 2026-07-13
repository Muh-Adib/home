<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LostAndFound extends Model
{
    use HasFactory;

    protected $table = 'lost_and_founds';

    protected $fillable = [
        'property_id',
        'booking_id',
        'item_name',
        'description',
        'photo_path',
        'found_date',
        'status',
        'claimed_by_name',
        'claimed_at',
        'notes',
    ];

    protected $casts = [
        'found_date' => 'date',
        'claimed_at' => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}

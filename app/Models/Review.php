<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'booking_id',
        'property_id',
        'user_id',
        'guest_name',
        'guest_email',
        'rating',
        'comment',
        'is_verified',
        'is_approved',
        'admin_response',
        'responded_by',
        'responded_at'
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_verified' => 'boolean',
        'is_approved' => 'boolean',
        'responded_at' => 'datetime',
    ];

    // Relationships
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function respondedBy()
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    // Scopes
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    public function scopeForProperty($query, $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    // Accessors
    public function getFormattedRatingAttribute()
    {
        return number_format($this->rating, 1);
    }

    public function getStarsAttribute()
    {
        return str_repeat('⭐', $this->rating);
    }
}

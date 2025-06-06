<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingGuest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_id',
        'guest_type',
        'full_name',
        'id_number',
        'phone',
        'email',
        'gender',
        'age_category',
        'relationship_to_primary',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'guest_type' => 'string',
        'gender' => 'string',
        'age_category' => 'string',
    ];

    /**
     * Get the booking that owns the guest.
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Check if this is the primary guest
     */
    public function isPrimaryGuest(): bool
    {
        return $this->guest_type === 'primary';
    }

    /**
     * Check if this is an additional guest
     */
    public function isAdditionalGuest(): bool
    {
        return $this->guest_type === 'additional';
    }

    /**
     * Get formatted guest details
     */
    public function getFullDetails(): array
    {
        return [
            'name' => $this->full_name,
            'id_number' => $this->id_number,
            'contact' => [
                'phone' => $this->phone,
                'email' => $this->email,
            ],
            'demographics' => [
                'gender' => $this->gender,
                'age_category' => $this->age_category,
            ],
            'relationship' => $this->relationship_to_primary,
            'emergency_contact' => [
                'name' => $this->emergency_contact_name,
                'phone' => $this->emergency_contact_phone,
            ],
        ];
    }

    /**
     * Get guest age category label
     */
    public function getAgeCategoryLabel(): string
    {
        return match($this->age_category) {
            'adult' => 'Dewasa',
            'child' => 'Anak-anak',
            'infant' => 'Bayi',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get guest gender label
     */
    public function getGenderLabel(): string
    {
        return match($this->gender) {
            'male' => 'Laki-laki',
            'female' => 'Perempuan',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Scope: Get primary guests only
     */
    public function scopePrimary($query)
    {
        return $query->where('guest_type', 'primary');
    }

    /**
     * Scope: Get additional guests only
     */
    public function scopeAdditional($query)
    {
        return $query->where('guest_type', 'additional');
    }

    /**
     * Scope: Get adult guests only
     */
    public function scopeAdults($query)
    {
        return $query->where('age_category', 'adult');
    }

    /**
     * Scope: Get children guests only
     */
    public function scopeChildren($query)
    {
        return $query->where('age_category', 'child');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceMaster extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'service_type',
        'unit_price',
        'thumbnail_path',
        'is_active',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'unit_price' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'thumbnail_url',
    ];

    /**
     * Get the booking services that use this service master.
     */
    public function bookingServices(): HasMany
    {
        return $this->hasMany(BookingService::class);
    }

    /**
     * Get the thumbnail URL.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) {
            return null;
        }

        return asset('storage/' . $this->thumbnail_path);
    }

    /**
     * Scope a query to only include active services.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to filter by service type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('service_type', $type);
    }

    /**
     * Scope a query to order by sort order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Get service type label
     */
    public function getServiceTypeLabel(): string
    {
        return match($this->service_type) {
            'extra_bed' => 'Tempat Tidur Tambahan',
            'breakfast' => 'Sarapan',
            'airport_transfer' => 'Transfer Bandara',
            'bbq_package' => 'Paket BBQ',
            'private_chef' => 'Chef Pribadi',
            'laundry' => 'Laundry',
            'tour_package' => 'Paket Tour',
            'motor_rental' => 'Rental Motor',
            'other' => 'Lainnya',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Check if service is active
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }
}


<?php

namespace App\Models;

use App\Http\Controllers\SitemapController;
use App\Services\PropertyBusinessRulesService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Property extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'type',
        'slug',
        'description',
        'address',
        'location',
        'maps_link',
        'tiktok_video_url',
        'lat',
        'lng',
        'capacity',
        'capacity_max',
        'bedroom_count',
        'bathroom_count',
        'base_rate',
        'weekend_premium_percent',
        'weekend_premium_type',
        'weekend_premium_fixed',
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
        'current_keybox_code',
        'keybox_updated_at',
        'keybox_updated_by',
        'checkin_instructions',
        'ical_import_urls',
        'ical_export_token',
        'bank_account_id',
        'payment_method_id',
        'ownership_model',
        'owner_split_pct',
        'investor_split_pct',
        'monthly_rent_cost',
        'monthly_mortgage_cost',
        'mortgage_interest_monthly',
        'initial_build_capital',
        'lease_capital',
    ];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'base_rate' => 'integer',
        'cleaning_fee' => 'integer',
        'extra_bed_rate' => 'integer',
        'weekend_premium_fixed' => 'integer',
        'amenities' => 'array',
        'is_featured' => 'boolean',
        'check_in_time' => 'string',
        'check_out_time' => 'string',
        'checkin_instructions' => 'array',
        'ical_import_urls' => 'array',
        'keybox_updated_at' => 'datetime',
        'bank_account_id' => 'integer',
        'payment_method_id' => 'integer',
        'owner_split_pct' => 'float',
        'investor_split_pct' => 'float',
        'monthly_rent_cost' => 'integer',
        'monthly_mortgage_cost' => 'integer',
        'mortgage_interest_monthly' => 'integer',
        'initial_build_capital' => 'integer',
        'lease_capital' => 'integer',
    ];

    // Boot method untuk auto-generate slug
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($property) {
            if (empty($property->slug)) {
                $property->slug = Str::slug($property->name);
            }

            if (empty($property->ical_export_token)) {
                $property->ical_export_token = Str::random(32);
            }
        });

        static::updating(function ($property) {
            if ($property->isDirty('name') && empty($property->slug)) {
                $property->slug = Str::slug($property->name);
            }
        });

        // Auto-invalidate sitemap cache (Next.js style)
        static::created(function () {
            SitemapController::clearCache();
        });

        static::updated(function () {
            SitemapController::clearCache();
        });

        static::deleted(function () {
            SitemapController::clearCache();
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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function approvedReviews(): HasMany
    {
        return $this->hasMany(Review::class)->approved();
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
            // ✅ FIX: Include all statuses that make property unavailable
            $bookingQuery->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
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
            get: fn () => 'Rp '.number_format((int) $this->base_rate, 0, ',', '.')
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

    protected function wifiPassword(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->checkin_instructions['wifi_password'] ?? null
        );
    }

    /**
     * Check if booking meets minimum stay requirements
     */
    private function meetsMinimumStay(Carbon $checkInDate, Carbon $checkOutDate, int $nights): bool
    {
        // Get effective minimum stay considering seasonal rates
        $effectiveMinStay = $this->getEffectiveMinimumStay(
            $checkInDate->format('Y-m-d'),
            $checkOutDate->format('Y-m-d')
        );

        return $nights >= $effectiveMinStay;
    }

    /**
     * Scope for filtering properties available between dates
     */
    public function scopeAvailableBetween($query, string $checkIn, string $checkOut)
    {
        return $query->whereDoesntHave('bookings', function ($q) use ($checkIn, $checkOut) {
            $q->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
                ->where('check_in', '<', $checkOut)
                ->where('check_out', '>', $checkIn);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Update keybox code manually (staff input from frontend)
     */
    public function updateKeyboxCode(string $newCode, $updatedBy = null): bool
    {
        // Validate code format (3 digits)
        if (! preg_match('/^\d{3}$/', $newCode)) {
            throw new \InvalidArgumentException('Keybox code must be 3 digits');
        }

        return $this->update([
            'current_keybox_code' => $newCode,
            'keybox_updated_at' => now(),
            'keybox_updated_by' => $updatedBy ?? auth()->id(),
        ]);
    }

    /**
     * Get checkin instructions for dashboard (when payment paid + checkin time)
     */
    public function getCheckinInstructionsForDashboard(): array
    {
        $instructions = $this->checkin_instructions ?? [];

        // Replace placeholders with actual data
        return array_map(function ($instruction) {
            if (is_string($instruction)) {
                return str_replace(
                    ['{{keybox_code}}', '{{property_name}}', '{{address}}'],
                    [$this->current_keybox_code, $this->name, $this->address],
                    $instruction
                );
            }

            return $instruction;
        }, $instructions);
    }

    /**
     * Default check-in instructions template
     */
    public static function getDefaultCheckinInstructionsTemplate(): array
    {
        return [
            'welcome' => 'Selamat datang di {{property_name}}!',
            'keybox_location' => 'Keybox terletak di depan pintu masuk.',
            'keybox_code' => 'Kode keybox: {{keybox_code}}',
            'checkin_time' => 'Check-in time: 14:00 - 22:00',
            'emergency_contact' => 'Hubungi kami jika ada kendala: 0811-2500-082',
            'additional_info' => [
                'WiFi password tersedia di dalam rumah',
                'Harap menjaga kebersihan selama menginap',
                'Check-out maksimal pukul 11:00',
            ],
        ];
    }

    /**
     * Relationship to user who updated keybox
     */
    public function keyboxUpdatedBy()
    {
        return $this->belongsTo(User::class, 'keybox_updated_by');
    }

    /**
     * Get effective minimum stay for a date range considering seasonal rates
     * ✅ Delegates to PropertyBusinessRulesService for consistency
     */
    public function getEffectiveMinimumStay($checkIn, $checkOut): int
    {
        return PropertyBusinessRulesService::getEffectiveMinimumStay($this, $checkIn, $checkOut);
    }

    /**
     * Get minimum stay information for frontend display
     * ✅ Delegates to PropertyBusinessRulesService for consistency
     */
    public function getMinimumStayInfo($checkIn, $checkOut): array
    {
        return PropertyBusinessRulesService::getMinimumStayInfo($this, $checkIn, $checkOut);
    }

    /**
     * Get the next check-in booking for this property
     * Used by cleaning dashboard to show upcoming guests
     */
    public function getNextCheckIn()
    {
        $nextBooking = $this->bookings()
            ->where('booking_status', 'confirmed')
            ->where('check_in', '>', now())
            ->orderBy('check_in', 'asc')
            ->first(['check_in', 'guest_name']);

        if (! $nextBooking) {
            return null;
        }

        return [
            'check_in' => $nextBooking->check_in,
            'guest_name' => $nextBooking->guest_name,
        ];
    }

    /**
     * Get seasonal rates for a date range
     */
    public function getSeasonalRates($startDate, $endDate): array
    {
        return PropertySeasonalRate::getEffectiveRateForProperty(
            $this->id,
            Carbon::parse($startDate),
            Carbon::parse($endDate)
        );
    }

    /**
     * Get the bank account associated with this property.
     */
    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    /**
     * Get the payment method associated with this property.
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}

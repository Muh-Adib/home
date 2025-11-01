<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingService extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_id',
        'service_master_id',
        'service_name',
        'service_type',
        'quantity',
        'unit_price',
        'total_price',
        'notes',
        'status',
        'provided_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'provided_at' => 'datetime',
    ];

    /**
     * Get the booking that owns the service.
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the service master that this booking service is based on.
     */
    public function serviceMaster(): BelongsTo
    {
        return $this->belongsTo(ServiceMaster::class);
    }

    /**
     * Calculate total price based on quantity and unit price
     */
    public function calculateTotal(): float
    {
        return round($this->quantity * $this->unit_price, 2);
    }

    /**
     * Automatically calculate total before saving
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($service) {
            // If service_master_id is provided, sync name and unit_price from master
            if ($service->service_master_id && !$service->exists) {
                $serviceMaster = ServiceMaster::find($service->service_master_id);
                if ($serviceMaster) {
                    if (empty($service->service_name)) {
                        $service->service_name = $serviceMaster->name;
                    }
                    if (empty($service->service_type)) {
                        $service->service_type = $serviceMaster->service_type;
                    }
                    if (empty($service->unit_price) || $service->unit_price == 0) {
                        $service->unit_price = $serviceMaster->unit_price;
                    }
                }
            }
            
            $service->total_price = $service->calculateTotal();
        });
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
            'transport' => 'Transport',
            'catering' => 'Katering',
            'equipment' => 'Peralatan',
            'guide' => 'Pemandu',
            'cleaning' => 'Pembersihan',
            'other' => 'Lainnya',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get service status label
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'pending' => 'Menunggu',
            'confirmed' => 'Dikonfirmasi',
            'provided' => 'Telah Disediakan',
            'cancelled' => 'Dibatalkan',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Check if service is provided
     */
    public function isProvided(): bool
    {
        return $this->status === 'provided';
    }

    /**
     * Check if service is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Mark service as provided
     */
    public function markAsProvided(): bool
    {
        return $this->update([
            'status' => 'provided',
            'provided_at' => now(),
        ]);
    }

    /**
     * Scope: Get transport services
     */
    public function scopeTransport($query)
    {
        return $query->where('service_type', 'transport');
    }

    /**
     * Scope: Get catering services
     */
    public function scopeCatering($query)
    {
        return $query->where('service_type', 'catering');
    }

    /**
     * Scope: Get equipment services
     */
    public function scopeEquipment($query)
    {
        return $query->where('service_type', 'equipment');
    }

    /**
     * Scope: Get provided services
     */
    public function scopeProvided($query)
    {
        return $query->where('status', 'provided');
    }

    /**
     * Scope: Get pending services
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}

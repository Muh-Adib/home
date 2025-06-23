<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'property_id',
        'location',
        'location_details',
        'current_stock',
        'reserved_stock',
        'serial_number',
        'asset_tag',
        'condition',
        'status',
        'expiry_date',
        'unit_cost_at_purchase',
        'purchase_date',
        'purchase_order_ref',
        'purchase_notes',
        'last_maintenance_date',
        'next_maintenance_due',
        'maintenance_notes',
        'usage_count',
        'last_used_at',
        'usage_notes',
        'created_by',
        'updated_by',
        'condition_photos',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'purchase_date' => 'date',
        'last_maintenance_date' => 'date',
        'next_maintenance_due' => 'date',
        'last_used_at' => 'datetime',
        'unit_cost_at_purchase' => 'decimal:2',
        'condition_photos' => 'array',
    ];

    // Conditions
    const CONDITIONS = [
        'new' => 'New',
        'excellent' => 'Excellent',
        'good' => 'Good',
        'fair' => 'Fair',
        'poor' => 'Poor',
        'needs_repair' => 'Needs Repair',
        'broken' => 'Broken',
        'disposed' => 'Disposed',
    ];

    // Status options
    const STATUSES = [
        'in_stock' => 'In Stock',
        'in_use' => 'In Use',
        'maintenance' => 'Under Maintenance',
        'reserved' => 'Reserved',
        'lost' => 'Lost',
        'disposed' => 'Disposed',
    ];

    /**
     * Relationships
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'stock_id');
    }

    /**
     * Scopes
     */
    public function scopeByProperty($query, $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    public function scopeByItem($query, $itemId)
    {
        return $query->where('item_id', $itemId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCondition($query, $condition)
    {
        return $query->where('condition', $condition);
    }

    public function scopeInStock($query)
    {
        return $query->where('status', 'in_stock');
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'in_stock')
                    ->where('condition', 'good');
    }

    public function scopeLowStock($query)
    {
        return $query->whereHas('item', function($q) {
            $q->whereRaw('inventory_stocks.current_stock <= inventory_items.min_stock_level');
        });
    }

    public function scopeExpired($query)
    {
        return $query->whereNotNull('expiry_date')
                    ->where('expiry_date', '<', now());
    }

    public function scopeExpiringWithin($query, $days = 30)
    {
        return $query->whereNotNull('expiry_date')
                    ->whereBetween('expiry_date', [now(), now()->addDays($days)]);
    }

    public function scopeNeedsMaintenance($query)
    {
        return $query->whereNotNull('next_maintenance_due')
                    ->where('next_maintenance_due', '<=', now());
    }

    /**
     * Accessors
     */
    public function getConditionNameAttribute(): string
    {
        return self::CONDITIONS[$this->condition] ?? $this->condition;
    }

    public function getStatusNameAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getAvailableStockAttribute(): int
    {
        return max(0, $this->current_stock - $this->reserved_stock);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->current_stock <= ($this->item->min_stock_level ?? 0);
    }

    public function getNeedsMaintenanceAttribute(): bool
    {
        return $this->next_maintenance_due && $this->next_maintenance_due->isPast();
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }
        
        return now()->diffInDays($this->expiry_date, false);
    }

    public function getDaysUntilMaintenanceAttribute(): ?int
    {
        if (!$this->next_maintenance_due) {
            return null;
        }
        
        return now()->diffInDays($this->next_maintenance_due, false);
    }

    public function getStockValueAttribute(): float
    {
        return $this->current_stock * $this->unit_cost_at_purchase;
    }

    /**
     * Business Methods
     */
    
    /**
     * Reserve stock
     */
    public function reserve(int $quantity): bool
    {
        if ($this->available_stock < $quantity) {
            return false;
        }

        $this->increment('reserved_stock', $quantity);
        return true;
    }

    /**
     * Release reservation
     */
    public function releaseReservation(int $quantity): bool
    {
        if ($this->reserved_stock < $quantity) {
            return false;
        }

        $this->decrement('reserved_stock', $quantity);
        return true;
    }

    /**
     * Add stock
     */
    public function addStock(int $quantity, array $transactionData = []): bool
    {
        $this->increment('current_stock', $quantity);

        // Create transaction record
        $this->createTransaction('stock_in', $quantity, $transactionData);

        return true;
    }

    /**
     * Remove stock
     */
    public function removeStock(int $quantity, array $transactionData = []): bool
    {
        if ($this->current_stock < $quantity) {
            return false;
        }

        $this->decrement('current_stock', $quantity);

        // Create transaction record
        $this->createTransaction('stock_out', -$quantity, $transactionData);

        return true;
    }

    /**
     * Use stock (for consumable items)
     */
    public function useStock(int $quantity, array $usageData = []): bool
    {
        if (!$this->removeStock($quantity, $usageData)) {
            return false;
        }

        // Update usage tracking
        $this->increment('usage_count');
        $this->update(['last_used_at' => now()]);

        return true;
    }

    /**
     * Update condition
     */
    public function updateCondition(string $newCondition, ?string $notes = null): bool
    {
        $oldCondition = $this->condition;
        
        $this->update([
            'condition' => $newCondition,
            'maintenance_notes' => $notes,
        ]);

        // Create transaction for condition change
        $this->createTransaction('adjustment', 0, [
            'reason' => "Condition changed from {$oldCondition} to {$newCondition}",
            'notes' => $notes,
        ]);

        return true;
    }

    /**
     * Schedule maintenance
     */
    public function scheduleMaintenance(\DateTime $maintenanceDate, ?string $instructions = null): bool
    {
        $this->update([
            'next_maintenance_due' => $maintenanceDate,
            'maintenance_notes' => $instructions,
            'status' => 'maintenance',
        ]);

        $this->createTransaction('maintenance_in', 0, [
            'reason' => 'Scheduled for maintenance',
            'notes' => $instructions,
        ]);

        return true;
    }

    /**
     * Complete maintenance
     */
    public function completeMaintenance(?string $notes = null): bool
    {
        $nextDue = null;
        if ($this->item->requires_maintenance && $this->item->maintenance_interval_days) {
            $nextDue = now()->addDays($this->item->maintenance_interval_days);
        }

        $this->update([
            'last_maintenance_date' => now(),
            'next_maintenance_due' => $nextDue,
            'maintenance_notes' => $notes,
            'status' => 'in_stock',
        ]);

        $this->createTransaction('maintenance_out', 0, [
            'reason' => 'Maintenance completed',
            'notes' => $notes,
        ]);

        return true;
    }

    /**
     * Create transaction record
     */
    private function createTransaction(string $type, int $quantity, array $data = []): InventoryTransaction
    {
        return InventoryTransaction::create(array_merge([
            'item_id' => $this->item_id,
            'property_id' => $this->property_id,
            'stock_id' => $this->id,
            'transaction_type' => $type,
            'quantity' => $quantity,
            'quantity_before' => $this->current_stock - $quantity,
            'quantity_after' => $this->current_stock,
            'unit_cost' => $this->unit_cost_at_purchase,
            'total_cost' => abs($quantity) * $this->unit_cost_at_purchase,
            'created_by' => auth()->id() ?? $this->created_by,
        ], $data));
    }

    /**
     * Get stock alerts
     */
    public function getAlerts(): array
    {
        $alerts = [];

        // Low stock alert
        if ($this->is_low_stock) {
            $alerts[] = [
                'type' => 'low_stock',
                'level' => 'warning',
                'message' => 'Stock level is below minimum threshold',
                'current_stock' => $this->current_stock,
                'min_stock' => $this->item->min_stock_level,
            ];
        }

        // Expiry alert
        if ($this->expiry_date) {
            $daysUntilExpiry = $this->days_until_expiry;
            
            if ($this->is_expired) {
                $alerts[] = [
                    'type' => 'expired',
                    'level' => 'danger',
                    'message' => 'Item has expired',
                    'expiry_date' => $this->expiry_date,
                    'days_expired' => abs($daysUntilExpiry),
                ];
            } elseif ($daysUntilExpiry <= 7) {
                $alerts[] = [
                    'type' => 'expiring_soon',
                    'level' => 'warning',
                    'message' => 'Item expires within 7 days',
                    'expiry_date' => $this->expiry_date,
                    'days_until_expiry' => $daysUntilExpiry,
                ];
            }
        }

        // Maintenance alert
        if ($this->needs_maintenance) {
            $alerts[] = [
                'type' => 'maintenance_due',
                'level' => 'info',
                'message' => 'Maintenance is due',
                'maintenance_due' => $this->next_maintenance_due,
                'days_overdue' => abs($this->days_until_maintenance),
            ];
        }

        return $alerts;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'code',
        'name',
        'slug',
        'description',
        'brand',
        'model',
        'size',
        'color',
        'material',
        'unit',
        'unit_cost',
        'selling_price',
        'min_stock_level',
        'max_stock_level',
        'reorder_point',
        'reorder_quantity',
        'track_expiry',
        'track_serial',
        'track_location',
        'is_consumable',
        'requires_maintenance',
        'maintenance_interval_days',
        'maintenance_instructions',
        'primary_supplier',
        'supplier_item_code',
        'lead_time_days',
        'is_active',
        'is_visible_to_guests',
        'photos',
        'usage_instructions',
        'safety_notes',
        'discontinued_at',
        'replacement_item',
        'tags',
        'barcode',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'track_expiry' => 'boolean',
        'track_serial' => 'boolean',
        'track_location' => 'boolean',
        'is_consumable' => 'boolean',
        'requires_maintenance' => 'boolean',
        'is_active' => 'boolean',
        'is_visible_to_guests' => 'boolean',
        'photos' => 'array',
        'tags' => 'array',
        'discontinued_at' => 'date',
    ];

    // Units
    const UNITS = [
        'pcs' => 'Pieces',
        'kg' => 'Kilograms',
        'g' => 'Grams',
        'liter' => 'Liters',
        'ml' => 'Milliliters',
        'meter' => 'Meters',
        'cm' => 'Centimeters',
        'box' => 'Boxes',
        'pack' => 'Packs',
        'bottle' => 'Bottles',
        'roll' => 'Rolls',
        'sheet' => 'Sheets',
        'set' => 'Sets',
        'pair' => 'Pairs',
    ];

    /**
     * Relationships
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(InventoryCategory::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(InventoryStock::class, 'item_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'item_id');
    }

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            if (empty($item->slug)) {
                $item->slug = Str::slug($item->name);
            }
            if (empty($item->code)) {
                $item->code = static::generateItemCode($item->category_id);
            }
        });

        static::updating(function ($item) {
            if ($item->isDirty('name')) {
                $item->slug = Str::slug($item->name);
            }
        });
    }

    /**
     * Generate unique item code
     */
    public static function generateItemCode($categoryId): string
    {
        $category = InventoryCategory::find($categoryId);
        $prefix = $category ? strtoupper(substr($category->name, 0, 3)) : 'ITM';
        
        $lastItem = static::where('code', 'like', $prefix . '%')
            ->orderBy('code', 'desc')
            ->first();
        
        if ($lastItem) {
            $lastNumber = (int) substr($lastItem->code, -4);
            $sequence = $lastNumber + 1;
        } else {
            $sequence = 1;
        }
        
        return $prefix . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    public function scopeConsumable($query)
    {
        return $query->where('is_consumable', true);
    }

    public function scopeRequiresMaintenance($query)
    {
        return $query->where('requires_maintenance', true);
    }

    public function scopeTrackExpiry($query)
    {
        return $query->where('track_expiry', true);
    }

    public function scopeTrackSerial($query)
    {
        return $query->where('track_serial', true);
    }

    public function scopeLowStock($query)
    {
        return $query->whereHas('stocks', function($q) {
            $q->whereRaw('current_stock <= (SELECT min_stock_level FROM inventory_items WHERE id = inventory_stocks.item_id)');
        });
    }

    public function scopeNeedsReorder($query)
    {
        return $query->whereHas('stocks', function($q) {
            $q->whereRaw('current_stock <= (SELECT reorder_point FROM inventory_items WHERE id = inventory_stocks.item_id)');
        });
    }

    public function scopeVisibleToGuests($query)
    {
        return $query->where('is_visible_to_guests', true);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('code', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhere('brand', 'like', "%{$search}%")
              ->orWhere('model', 'like', "%{$search}%")
              ->orWhere('barcode', 'like', "%{$search}%");
        });
    }

    /**
     * Accessors
     */
    public function getUnitNameAttribute(): string
    {
        return self::UNITS[$this->unit] ?? $this->unit;
    }

    public function getFullNameAttribute(): string
    {
        $parts = [$this->name];
        
        if ($this->brand) {
            $parts[] = $this->brand;
        }
        
        if ($this->model) {
            $parts[] = $this->model;
        }
        
        if ($this->size) {
            $parts[] = $this->size;
        }
        
        return implode(' - ', $parts);
    }

    public function getIsDiscontinuedAttribute(): bool
    {
        return $this->discontinued_at && $this->discontinued_at->isPast();
    }

    public function getTotalStockAttribute(): int
    {
        return $this->stocks()->sum('current_stock');
    }

    public function getTotalAvailableStockAttribute(): int
    {
        return $this->stocks()->sum('available_stock');
    }

    public function getTotalReservedStockAttribute(): int
    {
        return $this->stocks()->sum('reserved_stock');
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->total_stock <= $this->min_stock_level;
    }

    public function getNeedsReorderAttribute(): bool
    {
        return $this->total_stock <= $this->reorder_point;
    }

    public function getStockValueAttribute(): float
    {
        return $this->total_stock * $this->unit_cost;
    }

    public function getMainPhotoAttribute(): ?string
    {
        return $this->photos && !empty($this->photos) ? $this->photos[0] : null;
    }

    /**
     * Business Methods
     */
    
    /**
     * Get stock for specific property
     */
    public function getStockForProperty(int $propertyId): ?InventoryStock
    {
        return $this->stocks()->where('property_id', $propertyId)->first();
    }

    /**
     * Get total stock across all properties
     */
    public function getTotalStockAcrossProperties(): int
    {
        return $this->stocks()->sum('current_stock');
    }

    /**
     * Check if item is available in sufficient quantity for property
     */
    public function isAvailableInProperty(int $propertyId, int $quantity = 1): bool
    {
        $stock = $this->getStockForProperty($propertyId);
        return $stock && $stock->available_stock >= $quantity;
    }

    /**
     * Get properties where this item is available
     */
    public function getAvailableProperties(): array
    {
        return $this->stocks()
            ->where('current_stock', '>', 0)
            ->with('property:id,name')
            ->get()
            ->pluck('property')
            ->toArray();
    }

    /**
     * Calculate reorder suggestion
     */
    public function getReorderSuggestion(): array
    {
        $currentStock = $this->total_stock;
        $minStock = $this->min_stock_level;
        $maxStock = $this->max_stock_level;
        $reorderPoint = $this->reorder_point;
        $reorderQty = $this->reorder_quantity;

        $suggestion = [
            'needs_reorder' => $currentStock <= $reorderPoint,
            'current_stock' => $currentStock,
            'reorder_point' => $reorderPoint,
            'suggested_quantity' => 0,
            'estimated_cost' => 0,
            'lead_time_days' => $this->lead_time_days,
        ];

        if ($suggestion['needs_reorder']) {
            $suggestedQty = $reorderQty > 0 ? $reorderQty : ($maxStock - $currentStock);
            $suggestion['suggested_quantity'] = max($suggestedQty, $minStock - $currentStock);
            $suggestion['estimated_cost'] = $suggestion['suggested_quantity'] * $this->unit_cost;
        }

        return $suggestion;
    }

    /**
     * Get maintenance schedule for item
     */
    public function getMaintenanceSchedule(): array
    {
        if (!$this->requires_maintenance || !$this->maintenance_interval_days) {
            return [];
        }

        $schedule = [];
        $stocks = $this->stocks()
            ->where('status', 'in_stock')
            ->whereNotNull('last_maintenance_date')
            ->get();

        foreach ($stocks as $stock) {
            $nextDue = $stock->last_maintenance_date 
                ? $stock->last_maintenance_date->addDays($this->maintenance_interval_days)
                : now()->addDays($this->maintenance_interval_days);

            $schedule[] = [
                'stock_id' => $stock->id,
                'property_name' => $stock->property->name,
                'last_maintenance' => $stock->last_maintenance_date,
                'next_due' => $nextDue,
                'is_overdue' => $nextDue->isPast(),
                'days_until_due' => now()->diffInDays($nextDue, false),
            ];
        }

        return $schedule;
    }

    /**
     * Get stock level status
     */
    public function getStockStatus(): string
    {
        $currentStock = $this->total_stock;
        
        if ($currentStock == 0) {
            return 'out_of_stock';
        } elseif ($currentStock <= $this->reorder_point) {
            return 'needs_reorder';
        } elseif ($currentStock <= $this->min_stock_level) {
            return 'low_stock';
        } elseif ($currentStock >= $this->max_stock_level) {
            return 'overstock';
        } else {
            return 'normal';
        }
    }

    /**
     * Get expiry alerts for tracked items
     */
    public function getExpiryAlerts(): array
    {
        if (!$this->track_expiry) {
            return [];
        }

        $alerts = [];
        $stocks = $this->stocks()
            ->whereNotNull('expiry_date')
            ->where('status', 'in_stock')
            ->get();

        foreach ($stocks as $stock) {
            $daysUntilExpiry = now()->diffInDays($stock->expiry_date, false);
            
            $alertLevel = 'info';
            if ($stock->expiry_date->isPast()) {
                $alertLevel = 'danger';
            } elseif ($daysUntilExpiry <= 7) {
                $alertLevel = 'warning';
            } elseif ($daysUntilExpiry <= 30) {
                $alertLevel = 'info';
            }

            if ($alertLevel !== 'info' || $daysUntilExpiry <= 30) {
                $alerts[] = [
                    'stock_id' => $stock->id,
                    'property_name' => $stock->property->name,
                    'expiry_date' => $stock->expiry_date,
                    'days_until_expiry' => $daysUntilExpiry,
                    'is_expired' => $stock->expiry_date->isPast(),
                    'alert_level' => $alertLevel,
                    'quantity' => $stock->current_stock,
                ];
            }
        }

        return $alerts;
    }

    /**
     * Discontinue item
     */
    public function discontinue(?string $replacementItem = null): bool
    {
        return $this->update([
            'is_active' => false,
            'discontinued_at' => now(),
            'replacement_item' => $replacementItem,
        ]);
    }

    /**
     * Reactivate discontinued item
     */
    public function reactivate(): bool
    {
        return $this->update([
            'is_active' => true,
            'discontinued_at' => null,
            'replacement_item' => null,
        ]);
    }
}

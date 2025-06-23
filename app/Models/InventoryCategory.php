<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class InventoryCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'category_type',
        'parent_id',
        'sort_order',
        'is_active',
        'track_expiry',
        'track_serial',
        'auto_reorder',
        'default_min_stock',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'track_expiry' => 'boolean',
        'track_serial' => 'boolean',
        'auto_reorder' => 'boolean',
    ];

    // Category types
    const CATEGORY_TYPES = [
        'cleaning_supplies' => 'Cleaning Supplies',
        'guest_amenities' => 'Guest Amenities',
        'kitchen_supplies' => 'Kitchen Supplies',
        'bathroom_supplies' => 'Bathroom Supplies',
        'maintenance_tools' => 'Maintenance Tools',
        'linens_towels' => 'Linens & Towels',
        'electronics' => 'Electronics',
        'furniture' => 'Furniture',
        'outdoor_equipment' => 'Outdoor Equipment',
        'safety_equipment' => 'Safety Equipment',
        'office_supplies' => 'Office Supplies',
        'consumables' => 'Consumables',
    ];

    /**
     * Relationships
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(InventoryCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(InventoryCategory::class, 'parent_id')->orderBy('sort_order');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryItem::class, 'category_id');
    }

    public function allChildren(): HasMany
    {
        return $this->hasMany(InventoryCategory::class, 'parent_id')->with('allChildren');
    }

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        static::updating(function ($category) {
            if ($category->isDirty('name')) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRootCategories($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeByCategoryType($query, $type)
    {
        return $query->where('category_type', $type);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Accessors
     */
    public function getCategoryTypeNameAttribute(): string
    {
        return self::CATEGORY_TYPES[$this->category_type] ?? $this->category_type;
    }

    public function getFullNameAttribute(): string
    {
        $names = [$this->name];
        $parent = $this->parent;

        while ($parent) {
            array_unshift($names, $parent->name);
            $parent = $parent->parent;
        }

        return implode(' > ', $names);
    }

    public function getDepthAttribute(): int
    {
        $depth = 0;
        $parent = $this->parent;

        while ($parent) {
            $depth++;
            $parent = $parent->parent;
        }

        return $depth;
    }

    /**
     * Business Methods
     */
    public function getAllDescendantIds(): array
    {
        $ids = [$this->id];
        
        foreach ($this->children as $child) {
            $ids = array_merge($ids, $child->getAllDescendantIds());
        }

        return $ids;
    }

    public function getTotalItemsCount(): int
    {
        $descendantIds = $this->getAllDescendantIds();
        return InventoryItem::whereIn('category_id', $descendantIds)->count();
    }

    public function canBeDeleted(): bool
    {
        return $this->items()->count() === 0 && $this->children()->count() === 0;
    }
}

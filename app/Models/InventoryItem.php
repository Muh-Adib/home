<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'sku', 'unit', 'min_stock', 'selling_price', 'category', 'average_unit_cost', 'last_unit_cost', 'image_path', 'assigned_user_id',
    ];

    protected $casts = [
        'average_unit_cost' => 'integer',
        'last_unit_cost' => 'integer',
        'selling_price' => 'integer',
        'min_stock' => 'decimal:4',
        'assigned_user_id' => 'integer',
    ];

    public static function generateUniqueSku(): string
    {
        do {
            $sku = 'H-'.strtoupper(Str::random(8));
        } while (self::withTrashed()->where('sku', $sku)->exists());

        return $sku;
    }

    public function getCurrentStockAttribute(): float
    {
        $in = (float) InventoryStockMovement::where('inventory_item_id', $this->id)
            ->whereIn('type', ['purchase', 'in'])
            ->sum('quantity');
        $out = (float) InventoryStockMovement::where('inventory_item_id', $this->id)
            ->where('type', 'out')
            ->sum('quantity');
        $adj = (float) InventoryStockMovement::where('inventory_item_id', $this->id)
            ->where('type', 'adjustment')
            ->sum('quantity');

        return $in - $out + $adj;
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryStockMovement::class);
    }

    public function usages(): HasMany
    {
        return $this->hasMany(InventoryUsage::class);
    }
}

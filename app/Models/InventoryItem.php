<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name','sku','unit','min_stock','category','average_unit_cost','last_unit_cost','image_path'
    ];

    protected $casts = [
        'average_unit_cost' => 'decimal:4',
        'last_unit_cost' => 'decimal:4',
        'min_stock' => 'decimal:4',
    ];

    public function getCurrentStockAttribute(): float
    {
        $in = (float) \App\Models\InventoryStockMovement::where('inventory_item_id', $this->id)
            ->whereIn('type', ['purchase','in'])
            ->sum('quantity');
        $out = (float) \App\Models\InventoryStockMovement::where('inventory_item_id', $this->id)
            ->where('type', 'out')
            ->sum('quantity');
        $adj = (float) \App\Models\InventoryStockMovement::where('inventory_item_id', $this->id)
            ->where('type', 'adjustment')
            ->sum('quantity');
        return $in - $out + $adj;
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



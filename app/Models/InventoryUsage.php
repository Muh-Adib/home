<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id','property_id','usage_date','quantity_used','unit_cost_snapshot','total_cost','notes','created_by','expense_id'
    ];

    protected $casts = [
        'usage_date' => 'date',
        'quantity_used' => 'decimal:4',
        'unit_cost_snapshot' => 'decimal:4',
        'total_cost' => 'decimal:2',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(PropertyExpense::class, 'expense_id');
    }
}




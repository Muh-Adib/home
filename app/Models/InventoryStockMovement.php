<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryStockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id',
        'property_id',
        'type',
        'quantity',
        'unit_cost',
        'total_cost',
        'movement_date',
        'reference_type',
        'reference_id',
        'vendor_name',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_cost' => 'integer',
        'total_cost' => 'integer',
        'movement_date' => 'date',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id')->withTrashed();
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

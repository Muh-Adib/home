<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySettlementItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'monthly_settlement_id',
        'type',
        'date',
        'item_name',
        'amount',
        'notes',
        'sort_order',
    ];

    protected $casts = [
        'monthly_settlement_id' => 'integer',
        'date' => 'date',
        'amount' => 'float',
        'sort_order' => 'integer',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(MonthlyPropertySettlement::class, 'monthly_settlement_id');
    }
}

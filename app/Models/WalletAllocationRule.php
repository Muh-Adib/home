<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletAllocationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id','wallet_id','name','mode','value','active','priority'
    ];

    protected $casts = [
        'active' => 'boolean',
        'value' => 'decimal:2',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}




<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitDamageAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'unit_damage_id',
        'user_id',
        'action_details',
        'points',
    ];

    public function unitDamage(): BelongsTo
    {
        return $this->belongsTo(UnitDamage::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

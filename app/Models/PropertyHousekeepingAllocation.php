<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyHousekeepingAllocation extends Model
{
    use HasFactory;

    protected $table = 'property_housekeeping_allocations';

    protected $fillable = [
        'property_id',
        'user_id',
        'percentage',
    ];

    protected $casts = [
        'percentage' => 'float',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitDamage extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'reported_by',
        'assigned_to',
        'title',
        'description',
        'photo_path',
        'status',
        'resolved_by',
        'resolved_at',
        'resolved_notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(UnitDamageAction::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class UnitDamage extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'property_id',
        'reported_by',
        'assigned_to',
        'title',
        'description',
        'photo_path',
        'status',
        'difficulty',
        'resolved_photo_path',
        'resolved_by',
        'resolved_at',
        'resolved_notes',
        'completion_notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

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

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'unit_damage_actions')
            ->withPivot('action_details', 'points')
            ->withTimestamps();
    }
}

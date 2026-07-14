<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'tier',
        'points',
        'completed_at',
        'created_by',
    ];

    protected $casts = [
        'points' => 'float',
        'completed_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'custom_task_members')
            ->withPivot('points')
            ->withTimestamps();
    }

    public function memberDetails(): HasMany
    {
        return $this->hasMany(CustomTaskMember::class);
    }
}

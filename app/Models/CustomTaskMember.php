<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomTaskMember extends Model
{
    use HasFactory;

    protected $table = 'custom_task_members';

    protected $fillable = [
        'custom_task_id',
        'user_id',
        'points',
    ];

    protected $casts = [
        'points' => 'float',
    ];

    public function customTask(): BelongsTo
    {
        return $this->belongsTo(CustomTask::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

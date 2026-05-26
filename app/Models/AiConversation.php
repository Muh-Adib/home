<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'channel',
        'user_identifier',
        'lead_id',
        'status',
        'summary',
        'tags',
        'started_at',
        'last_activity_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'started_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(AiLead::class, 'lead_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiConversationMessage::class, 'conversation_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeEscalated($query)
    {
        return $query->where('status', 'escalated');
    }
}

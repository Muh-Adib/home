<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiLead extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'intent_type',
        'intent_summary',
        'units_inquired',
        'preferred_check_in',
        'preferred_check_out',
        'guests',
        'tags',
        'urgency',
        'persona_tag',
        'channel',
        'conversation_id',
        'status',
        'assigned_to',
        'captured_at',
        'next_follow_up_at',
    ];

    protected $casts = [
        'units_inquired' => 'array',
        'tags' => 'array',
        'preferred_check_in' => 'date',
        'preferred_check_out' => 'date',
        'captured_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
    ];

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function escalations(): HasMany
    {
        return $this->hasMany(AiEscalation::class, 'lead_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(AiConversation::class, 'lead_id');
    }

    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    public function scopeUrgent($query)
    {
        return $query->where('urgency', 'urgent');
    }
}

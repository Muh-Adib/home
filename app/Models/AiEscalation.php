<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiEscalation extends Model
{
    use HasFactory;

    protected $fillable = [
        'escalation_id',
        'conversation_id',
        'lead_id',
        'trigger',
        'urgency',
        'summary',
        'context',
        'recommended_action',
        'channel_preference',
        'status',
        'claimed_by',
        'claimed_at',
        'resolved_at',
        'notification_dashboard',
        'notification_whatsapp',
    ];

    protected $casts = [
        'context' => 'array',
        'claimed_at' => 'datetime',
        'resolved_at' => 'datetime',
        'notification_dashboard' => 'boolean',
        'notification_whatsapp' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(AiLead::class, 'lead_id');
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['created', 'claimed']);
    }

    public function scopeUrgent($query)
    {
        return $query->whereIn('urgency', ['critical', 'high']);
    }
}

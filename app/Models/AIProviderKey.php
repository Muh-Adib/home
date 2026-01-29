<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;

class AIProviderKey extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Explicitly set table name to prevent Laravel from using 'a_i_provider_keys'
     */
    protected $table = 'ai_provider_keys';

    protected $fillable = [
        'name',
        'provider',
        'api_key',
        'is_active',
        'priority',
        'requests_count',
        'tokens_used',
        'total_cost',
        'last_used_at',
        'requests_per_minute',
        'daily_limit',
        'auto_rotate',
        'metadata',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'priority' => 'integer',
        'requests_count' => 'integer',
        'tokens_used' => 'integer',
        'total_cost' => 'decimal:4',
        'last_used_at' => 'datetime',
        'requests_per_minute' => 'integer',
        'daily_limit' => 'integer',
        'auto_rotate' => 'boolean',
        'metadata' => 'array',
    ];

    protected $hidden = [
        'api_key', // Hide API key in JSON responses
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Accessors & Mutators
    public function getApiKeyAttribute($value): string
    {
        return Crypt::decryptString($value);
    }

    public function setApiKeyAttribute($value): void
    {
        $this->attributes['api_key'] = Crypt::encryptString($value);
    }

    public function getMaskedApiKeyAttribute(): string
    {
        try {
            $key = $this->api_key;
            $visibleChars = 4;

            if (strlen($key) <= $visibleChars * 2) {
                return str_repeat('*', strlen($key));
            }

            return substr($key, 0, $visibleChars)
                . str_repeat('*', strlen($key) - ($visibleChars * 2))
                . substr($key, -$visibleChars);
        } catch (\Exception $e) {
            return '****';
        }
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    public function scopeAvailable($query)
    {
        return $query->active()
            ->where(function ($q) {
                $q->whereNull('daily_limit')
                    ->orWhereRaw('requests_count < daily_limit');
            });
    }

    public function scopeOrderByLeastUsed($query)
    {
        return $query->orderBy('requests_count', 'asc')
            ->orderBy('priority', 'desc');
    }

    // Methods
    public function incrementUsage(int $tokens = 0, float $cost = 0.0): void
    {
        $this->increment('requests_count');

        if ($tokens > 0) {
            $this->increment('tokens_used', $tokens);
        }

        if ($cost > 0) {
            $this->total_cost += $cost;
        }

        $this->last_used_at = now();
        $this->save();
    }

    public function isRateLimited(): bool
    {
        if (!$this->daily_limit) {
            return false;
        }

        return $this->requests_count >= $this->daily_limit;
    }

    public function resetStats(): void
    {
        $this->update([
            'requests_count' => 0,
            'tokens_used' => 0,
            'total_cost' => 0,
            'last_used_at' => null,
        ]);
    }

    /**
     * Get the best available key for a provider based on rotation logic
     */
    public static function getOptimalKey(string $provider): ?self
    {
        return static::active()
            ->forProvider($provider)
            ->available()
            ->where('auto_rotate', true)
            ->orderByLeastUsed()
            ->first();
    }

    /**
     * Get statistics summary
     */
    public function getStatsSummary(): array
    {
        return [
            'total_requests' => number_format($this->requests_count),
            'total_tokens' => number_format($this->tokens_used),
            'total_cost' => '$' . number_format($this->total_cost, 2),
            'limit_remaining' => $this->daily_limit
                ? ($this->daily_limit - $this->requests_count)
                : 'Unlimited',
            'last_used' => $this->last_used_at?->diffForHumans() ?? 'Never',
            'avg_tokens_per_request' => $this->requests_count > 0
                ? round($this->tokens_used / $this->requests_count)
                : 0,
        ];
    }
}

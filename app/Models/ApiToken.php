<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApiToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'token',
        'token_hash',
        'client_name',
        'scopes',
        'is_active',
        'last_used_at',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'scopes' => 'array',
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    // Never expose raw token or hash in serialization
    protected $hidden = ['token', 'token_hash'];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Generate a new raw API token string.
     * Format: hjg_<env>_<random32>
     * IMPORTANT: Store the hash, not the raw value.
     */
    public static function generateToken(): string
    {
        $env = app()->environment('production') ? 'prod' : 'dev';

        return 'hjg_'.$env.'_'.Str::random(32);
    }

    /**
     * Hash a raw token for secure storage.
     */
    public static function hashToken(string $rawToken): string
    {
        return hash('sha256', $rawToken);
    }

    /**
     * Find an active token by its raw value using hash lookup.
     * Avoids timing attacks — hash comparison is constant-time via DB index.
     */
    public static function findByRawToken(string $rawToken): ?self
    {
        $hash = self::hashToken($rawToken);

        return self::active()->where('token_hash', $hash)->first();
    }

    /**
     * Check if token has a specific scope.
     * Empty scopes = full access (no restriction).
     */
    public function hasScope(string $scope): bool
    {
        if (empty($this->scopes)) {
            return true;
        }

        return in_array($scope, $this->scopes) || in_array('*', $this->scopes);
    }

    /**
     * Mark token as used (quiet update — no events/timestamps).
     */
    public function markAsUsed(): void
    {
        $this->updateQuietly(['last_used_at' => now()]);
    }
}

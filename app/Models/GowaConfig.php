<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class GowaConfig extends Model
{
    protected $fillable = [
        'name',
        'url',
        'username',
        'password',
        'whatsapp_number',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Encrypt password when setting, decrypt when getting
     */
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => encrypt($value),
            get: fn ($value) => decrypt($value),
        );
    }

    /**
     * Get the active GOWA configuration
     */
    public static function getActive(): ?self
    {
        return static::where('is_active', true)->first();
    }
}

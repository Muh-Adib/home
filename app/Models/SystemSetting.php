<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
    ];

    /**
     * Get a setting value by key.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("system_setting.{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            if (! $setting || $setting->value === null) {
                return $default;
            }

            $value = $setting->value;
            $json = json_decode($value, true);

            return json_last_error() === JSON_ERROR_NONE ? $json : $value;
        });
    }

    /**
     * Set a setting value by key.
     */
    public static function set(string $key, mixed $value, string $group = 'general'): static
    {
        $serialized = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;

        $setting = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $serialized,
                'group' => $group,
            ]
        );

        Cache::forget("system_setting.{$key}");

        return $setting;
    }

    /**
     * Set multiple settings at once.
     */
    public static function setMany(array $settings, string $group = 'general'): void
    {
        foreach ($settings as $key => $value) {
            static::set($key, $value, $group);
        }
    }

    /**
     * Get all settings in a group as key-value pairs.
     */
    public static function getGroup(string $group): array
    {
        $settings = static::where('group', $group)->get();
        $results = [];

        foreach ($settings as $setting) {
            $value = $setting->value;
            $json = json_decode((string) $value, true);
            $results[$setting->key] = json_last_error() === JSON_ERROR_NONE ? $json : $value;
        }

        return $results;
    }
}

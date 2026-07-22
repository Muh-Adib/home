<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

/**
 * Service untuk mengelola rate override logging.
 *
 * Bertanggung jawab untuk generate log message yang konsisten
 * ketika admin melakukan rate override.
 */
class RateOverrideLogService
{
    /**
     * Generate rate override log message.
     */
    public function generateLog(User $user, float $originalAmount, float $newAmount, ?string $reason = null): string
    {
        return '['.now()->format('Y-m-d H:i:s').'] Rate override by '.$user->name.
               ': '.($reason ?? 'No reason provided').
               ' (Original: '.number_format($originalAmount, 0, ',', '.').
               ', New: '.number_format($newAmount, 0, ',', '.').')';
    }

    /**
     * Append rate override log to existing notes.
     */
    public function appendToNotes(?string $existingNotes, string $logMessage): string
    {
        if (empty($existingNotes)) {
            return $logMessage;
        }

        return $existingNotes."\n".$logMessage;
    }
}

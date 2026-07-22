<?php

namespace App\Exceptions;

use Exception;

/**
 * Custom exception for AI generation failures
 * Provides detailed error context for better debugging and user feedback
 */
class AIGenerationException extends Exception
{
    protected array $details;

    /**
     * Create a new AI generation exception
     *
     * @param  string  $message  User-friendly error message
     * @param  array  $details  Additional error context (provider, suggestions, etc.)
     * @param  int  $code  HTTP status code
     */
    public function __construct(string $message, array $details = [], int $code = 500)
    {
        parent::__construct($message, $code);
        $this->details = $details;
    }

    /**
     * Get additional error details
     */
    public function getDetails(): array
    {
        return $this->details;
    }

    /**
     * Check if retry is suggested for this error
     */
    public function shouldRetry(): bool
    {
        return $this->details['retry_suggested'] ?? false;
    }
}

<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\GoogleIndexingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class NotifyGoogleIndexingJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Delay (seconds) before retry attempts.
     *
     * @var array<int>
     */
    public array $backoff = [60, 300, 900];

    /**
     * Create a new job instance.
     *
     * @param  string  $url  The full public URL to notify Google about
     * @param  string  $type  'URL_UPDATED' or 'URL_DELETED'
     */
    public function __construct(
        public readonly string $url,
        public readonly string $type = 'URL_UPDATED',
    ) {}

    /**
     * Execute the job.
     */
    public function handle(GoogleIndexingService $service): void
    {
        if (empty(config('services.google_indexing.private_key')) || empty(config('services.google_indexing.client_email'))) {
            Log::info('[GoogleIndexing] Google Indexing credentials not fully configured. Skipping notification.');

            return;
        }

        Log::info('[GoogleIndexing] Dispatching indexing notification.', [
            'url' => $this->url,
            'type' => $this->type,
        ]);

        $success = $service->notifyUrl($this->url, $this->type);

        if (! $success) {
            Log::warning('[GoogleIndexing] Notification failed, will retry.', [
                'url' => $this->url,
                'attempts' => $this->attempts(),
            ]);

            // Fail the job so Laravel retries it based on $backoff
            $this->fail(new \RuntimeException("Google Indexing API notification failed for: {$this->url}"));
        }
    }
}

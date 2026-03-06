<?php

namespace App\Jobs;

use App\Models\Article;
use App\Models\Property;
use App\Services\AIArticleService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateArticleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected Article $article,
        protected string $outline,
        protected array $keywords,
        protected array $propertyIds = [],
        protected string $provider = 'gemini',
        protected string $language = 'id',
        protected string $tone = 'casual'
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(AIArticleService $aiService): void
    {
        set_time_limit(600); // Article generation can take minutes
        try {
            $properties = [];
            if (!empty($this->propertyIds)) {
                $properties = Property::whereIn('id', $this->propertyIds)
                    ->get(['id', 'name', 'slug'])
                    ->toArray();
            }

            $intent = $this->article->generation_metadata['search_intent'] ?? null;

            $result = $aiService->generateContent(
                $this->outline,
                $this->keywords,
                $properties,
                $this->provider,
                $this->language,
                $this->tone,
                $intent
            );

            $this->article->update([
                'content' => $result['content'],
                'generation_metadata' => array_merge($this->article->generation_metadata ?? [], [
                    'generated_at' => now()->toDateTimeString(),
                    'provider' => $this->provider,
                ]),
            ]);

            Log::info("AI Content generated for article: {$this->article->id}");

        } catch (\Exception $e) {
            Log::error("Failed to generate AI content for article: {$this->article->id}", [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

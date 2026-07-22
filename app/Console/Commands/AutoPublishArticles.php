<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoPublishArticles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'articles:auto-publish';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Publish scheduled articles that are due';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $count = 0;

        Log::info('Running Auto-Publish Check...');

        // Find scheduled articles due for publishing
        $articles = Article::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->with('contentPlan')
            ->get();

        foreach ($articles as $article) {
            /** @var Article $article */
            try {
                $article->update([
                    'status' => 'published',
                    'published_at' => now(),
                ]);

                // Sync Content Plan if exists
                if ($article->contentPlan) {
                    $article->contentPlan->update([
                        'status' => 'published',
                        'actual_publish_date' => now(),
                    ]);
                }

                $this->info("Published: {$article->title}");
                Log::info("Auto-Published Article ID: {$article->id}");
                $count++;
            } catch (\Exception $e) {
                Log::error("Failed to auto-publish article {$article->id}: ".$e->getMessage());
                $this->error("Failed to publish: {$article->title}");
            }
        }

        $this->info("Published {$count} articles.");
    }
}

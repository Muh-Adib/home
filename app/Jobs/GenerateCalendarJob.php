<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ContentPlanService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class GenerateCalendarJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected array $keywords,
        protected int $articleCount,
        protected string $targetAudience,
        protected ?string $startDate,
        protected int $userId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ContentPlanService $contentPlanService): void
    {
        set_time_limit(600); // Increase limit for AI generation
        try {
            Log::info("Starting GenerateCalendarJob for User ID: {$this->userId}", [
                'keywords' => $this->keywords,
                'count' => $this->articleCount,
            ]);

            // Impersonate user to ensure 'created_by' is correct (if service uses auth()->id())
            // However, it's better to pass userId to service.
            // Since service uses auth()->id(), we might need to login manually or adjust service.
            // For now, let's login as the user.
            if ($user = User::find($this->userId)) {
                Auth::login($user);
            }

            $plans = $contentPlanService->generateMonthlyCalendar(
                $this->keywords,
                $this->articleCount,
                $this->targetAudience,
                $this->startDate
            );

            Log::info('GenerateCalendarJob completed. Created '.count($plans).' plans.');

        } catch (\Exception $e) {
            Log::error('GenerateCalendarJob failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // Optional: Notify user via notification system if available
        }
    }
}

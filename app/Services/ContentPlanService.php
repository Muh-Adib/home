<?php

namespace App\Services;

use App\Models\ContentPlan;
use App\Models\Article;
use App\Models\User;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class ContentPlanService
{
    public function __construct(
        protected AIArticleService $aiService
    ) {
    }

    /**
     * Create a new content plan
     */
    public function createPlan(array $data): ContentPlan
    {
        $plan = ContentPlan::create([
            'title' => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'target_keywords' => $data['target_keywords'] ?? [],
            'target_audience' => $data['target_audience'] ?? null,
            'content_type' => $data['content_type'] ?? 'article',
            'status' => $data['status'] ?? 'idea',
            'priority' => $data['priority'] ?? 3,
            'planned_publish_date' => $data['planned_publish_date'] ?? null,
            'created_by' => $data['created_by'] ?? auth()->id(),
            'assigned_to' => $data['assigned_to'] ?? null,
        ]);

        // IMMEDIATELY create the Article entity (Source of Truth) for ALL text-based content
        $textBasedTypes = ['article', 'guide', 'tips', 'comparison', 'news', 'review'];

        if (in_array($data['content_type'], $textBasedTypes)) {
            Article::create([
                'content_plan_id' => $plan->id,
                'title' => $plan->title ?? 'Untitled Article',
                'slug' => \Str::slug(($plan->title ?? 'untitled') . '-' . \Str::random(6)),
                'status' => $plan->status, // Sync status
                'author_id' => $plan->assigned_to ?? $plan->created_by,
                'target_keywords' => $plan->target_keywords,
                'scheduled_at' => $plan->planned_publish_date, // Sync schedule
                'language' => 'id',
            ]);
        }

        return $plan;
    }

    /**
     * Update existing content plan
     */
    public function updatePlan(ContentPlan $plan, array $data): ContentPlan
    {
        $plan->update($data);
        return $plan->fresh();
    }

    /**
     * Delete content plan
     */
    public function deletePlan(ContentPlan $plan): bool
    {
        return $plan->delete();
    }

    /**
     * Generate 30-day content calendar using AI
     */
    public function generateMonthlyCalendar(
        array $keywords,
        int $articleCount = 30,
        string $targetAudience = 'property renters',
        ?string $startDate = null
    ): array {
        $start = $startDate ? Carbon::parse($startDate) : now();

        $prompt = "Generate a {$articleCount}-day content calendar for a property rental blog.\n\n" .
            "Keywords: " . implode(', ', $keywords) . "\n" .
            "Target Audience: {$targetAudience}\n\n" .
            "For each article, provide:\n" .
            "1. Title (SEO-optimized, engaging)\n" .
            "2. Related keywords (4-6 keywords)\n" .
            "3. Content type (guide, tips, comparison, news, review)\n" .
            "4. Day offset (0-{$articleCount}, spread evenly)\n" .
            "5. Description (one sentence)\n" .
            "6. Priority (1-5, based on importance)\n\n" .
            "CRITICAL:\n" .
            "- Return ONLY valid JSON array\n" .
            "- NO intro text, NO explanations\n" .
            "- LANGUAGE: All text content MUST be in **Bahasa Indonesia**\n" .
            "- Format: [{\"title\": \"...\", \"keywords\": [...], \"content_type\": \"...\", \"day_offset\": N, \"description\": \"...\", \"priority\": N}]\n" .
            "- Ensure diverse topics and balanced distribution";

        // Use generateTitle as a proxy to call AI (it returns array with 'content' key)
        // We'll create a temporary wrapper for general AI calls
        $response = $this->generateCalendarWithAI($prompt);

        // Parse JSON response
        $content = $response['content'];

        // Try to extract JSON from response
        if (preg_match('/\[.*\]/s', $content, $matches)) {
            $jsonStr = $matches[0];
        } else {
            $jsonStr = $content;
        }

        $plans = json_decode($jsonStr, true);

        if (!$plans || !is_array($plans)) {
            throw new \Exception('Failed to parse AI response');
        }

        // Create content plans
        $created = [];
        foreach ($plans as $planData) {
            $publishDate = $start->copy()->addDays($planData['day_offset'] ?? 0);

            $created[] = $this->createPlan([
                'title' => $planData['title'] ?? 'Untitled',
                'description' => $planData['description'] ?? null,
                'target_keywords' => $planData['keywords'] ?? [],
                'target_audience' => $targetAudience,
                'content_type' => $planData['content_type'] ?? 'article',
                'status' => 'idea',
                'priority' => $planData['priority'] ?? 3,
                'planned_publish_date' => $publishDate,
                'created_by' => auth()->id(),
            ]);
        }

        return $created;
    }

    /**
     * Research topic using AI (Deep Analysis)
     */
    public function researchTopic(ContentPlan $plan): array
    {
        // Use the new analyzeTopic method (LLM based)
        $research = $this->aiService->analyzeTopic($plan->title ?? 'general topic');

        $plan->update([
            'ai_research_data' => $research,
            'status' => 'researching',
        ]);

        return $research;
    }

    /**
     * Generate outline for content plan
     */
    public function generateOutlineForPlan(ContentPlan $plan): string
    {
        $outline = $this->aiService->generateOutline(
            $plan->title ?? 'Article',
            $plan->target_keywords ?? [],
            'gemini',
            $plan->ai_research_data ?? [] // Pass research context
        );

        $plan->update([
            'ai_outline' => $outline['outline'],
            'status' => 'outlining',
        ]);

        return $outline['outline'];
    }

    /**
     * Mark content plan as published
     */
    public function markAsPublished(ContentPlan $plan): void
    {
        $plan->markAsPublished();
    }

    /**
     * Assign plan to a user
     */
    public function assignTo(ContentPlan $plan, User $user): void
    {
        $plan->update(['assigned_to' => $user->id]);
    }

    /**
     * Update plan status with validation (Sync to Article)
     */
    public function updateStatus(ContentPlan $plan, string $status): void
    {
        $validStatuses = ['idea', 'researching', 'outlining', 'writing', 'draft', 'reviewing', 'scheduled', 'published'];

        if (in_array($status, $validStatuses)) {
            $plan->update(['status' => $status]);
            // Sync handled by ContentPlanObserver
        }
    }

    /**
     * Check if a plan is overdue
     */
    public function isOverdue(ContentPlan $plan): bool
    {
        return $plan->planned_publish_date instanceof Carbon
            && $plan->planned_publish_date->isPast()
            && (!$plan->article || $plan->article->status !== 'published')
            && $plan->status !== 'published';
    }

    /**
     * Convert content plan to article
     * (Deprecated/Refactored: Now simply returns existing article or creates one if missing)
     */
    public function convertToArticle(ContentPlan $plan): Article
    {
        if ($plan->article) {
            return $plan->article;
        }

        // Fallback for old plans without articles
        $article = Article::create([
            'title' => $plan->title,
            'slug' => \Str::slug($plan->title . '-' . uniqid()),
            'target_keywords' => $plan->target_keywords,
            'language' => 'id',
            'status' => 'draft',
            'content_plan_id' => $plan->id,
            'author_id' => $plan->assigned_to ?? $plan->created_by,
        ]);

        $plan->update(['status' => 'writing']);

        return $article;
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(array $uuids, string $status): int
    {
        $plans = ContentPlan::whereIn('uuid', $uuids)->with('article')->get();
        $count = 0;

        foreach ($plans as $plan) {
            $this->updateStatus($plan, $status);
            $count++;
        }

        return $count;
    }

    /**
     * Assign plan to user (Sync to Article)
     */
    public function assignToUser(ContentPlan $plan, User $user): ContentPlan
    {
        $plan->assignTo($user);
        // Sync handled by ContentPlanObserver

        return $plan->fresh();
    }

    /**
     * Get calendar data for a specific month (Source: Article > Plan)
     */
    public function getCalendarData(string $month, array $filters = []): array
    {
        $start = Carbon::parse($month)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        // Query plans within range, or plans with articles within range
        $query = ContentPlan::with(['creator', 'assignee', 'article'])
            ->where(function ($q) use ($start, $end) {
                // Plan date in range
                $q->whereBetween('planned_publish_date', [$start, $end])
                    // OR Article scheduled/published date in range
                    ->orWhereHas('article', function ($qa) use ($start, $end) {
                    $qa->whereBetween('scheduled_at', [$start, $end])
                        ->orWhereBetween('published_at', [$start, $end]);
                });
            });

        $this->applyFilters($query, $filters);

        $plans = $query->get();

        return $plans->map(function ($plan) {
            // Determine display date
            $date = $plan->planned_publish_date;
            if ($plan->article) {
                if ($plan->article->status === 'published' && $plan->article->published_at) {
                    $date = $plan->article->published_at;
                } elseif ($plan->article->scheduled_at) {
                    $date = $plan->article->scheduled_at;
                }
            }

            // Determine status
            $status = $plan->article->status ?? $plan->status;

            return [
                'id' => $plan->uuid,
                'title' => $plan->title,
                'start' => $date?->format('Y-m-d'),
                'backgroundColor' => $this->getStatusColor($status),
                'borderColor' => $this->getStatusColor($status),
                'extendedProps' => [
                    'status' => $status,
                    'priority' => $plan->priority,
                    'content_type' => $plan->content_type,
                    'has_article' => $plan->article !== null,
                ],
            ];
        })->toArray();
    }

    /**
     * Get kanban data grouped by status (Source: Article)
     */
    public function getKanbanData(array $filters = []): array
    {
        $statuses = ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'];

        // Eager load article to be the source of truth
        $query = ContentPlan::has('article') // Only plans with articles
            ->with(['creator', 'assignee', 'article'])
            ->orderBy('priority', 'desc');

        // For plans without articles (legacy or non-article types), we might still want to show them?
        // User requirement: "Content Plan TIDAK lagi menghasilkan entitas plan kosong"
        // So we assume all valid plans now have articles.
        // Left join logic via Eloquent:

        $this->applyFilters($query, $filters);

        $plans = $query->get();

        $data = [];
        foreach ($statuses as $status) {
            // Filter collection by ARTICLE status, or fallback to plan status
            $data[$status] = $plans->filter(function ($plan) use ($status) {
                return ($plan->article->status ?? $plan->status) === $status;
            })->values();
        }

        return $data;
    }

    /**
     * Apply common filters to query
     */
    private function applyFilters($query, array $filters)
    {
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('description', 'like', '%' . $filters['search'] . '%')
                    ->orWhereJsonContains('target_keywords', $filters['search']);
            });
        }

        if (!empty($filters['status'])) {
            // Filter by Article status or Plan status (fallback)
            $status = $filters['status'];
            $query->where(function ($q) use ($status) {
                $q->where('status', $status)
                    ->orWhereHas('article', fn($qa) => $qa->where('status', $status));
            });
        }

        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        if (!empty($filters['content_type'])) {
            $query->where('content_type', $filters['content_type']);
        }
    }

    /**
     * Get statistics for the dashboard
     */
    public function getPipelineStats(array $filters = []): array
    {
        // Getting stats is harder now with distributed truth.
        // We'll trust the Plan status mostly for counts unless we want to do heavy joins.
        // Assuming updateStatus keeps Plan status in sync as "cache".

        $baseQuery = ContentPlan::query();
        $this->applyFilters($baseQuery, $filters);

        $total = $baseQuery->count();

        $thisMonth = (clone $baseQuery)->whereBetween('planned_publish_date', [
            now()->startOfMonth(),
            now()->endOfMonth()
        ])->count();

        $nextMonth = (clone $baseQuery)->whereBetween('planned_publish_date', [
            now()->addMonth()->startOfMonth(),
            now()->addMonth()->endOfMonth()
        ])->count();

        $inProgress = (clone $baseQuery)->whereIn('status', ['writing', 'reviewing', 'draft', 'outlining'])->count();

        $byStatus = (clone $baseQuery)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return [
            'total' => $total,
            'this_month' => $thisMonth,
            'next_month' => $nextMonth,
            'in_progress' => $inProgress,
            'by_status' => $byStatus,
        ];
    }

    /**
     * Get status color for calendar
     */
    private function getStatusColor(string $status): string
    {
        return match ($status) {
            'idea' => '#9CA3AF', // Gray
            'researching' => '#3B82F6', // Blue
            'outlining' => '#8B5CF6', // Purple
            'writing' => '#F59E0B', // Amber
            'draft' => '#F59E0B', // Amber
            'reviewing' => '#EF4444', // Red
            'scheduled' => '#10B981', // Emerald
            'published' => '#059669', // Green
            default => '#6B7280',
        };
    }

    /**
     * Generate calendar using AI (wrapper method)
     */
    private function generateCalendarWithAI(string $prompt): array
    {
        // Try gemini first, then fallback via AIArticleService logic
        return $this->aiService->callAI('gemini', $prompt, maxTokens: 2000);
    }
}

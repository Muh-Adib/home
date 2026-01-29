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
        return ContentPlan::create([
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
            "2. Related keywords (2-3 keywords)\n" .
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
     * Research topic using AI
     */
    public function researchTopic(ContentPlan $plan): array
    {
        $research = $this->aiService->researchTopic($plan->title ?? 'general topic');

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
            'gemini'
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
     * Update plan status with validation
     */
    public function updateStatus(ContentPlan $plan, string $status): void
    {
        $validStatuses = ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'];

        if (in_array($status, $validStatuses)) {
            $plan->update(['status' => $status]);
        }
    }

    /**
     * Check if a plan is overdue
     */
    public function isOverdue(ContentPlan $plan): bool
    {
        return $plan->planned_publish_date instanceof Carbon
            && $plan->planned_publish_date->isPast()
            && !$plan->article
            && $plan->status !== 'published';
    }

    /**
     * Convert content plan to article
     */
    public function convertToArticle(ContentPlan $plan): Article
    {
        $article = Article::create([
            'title' => $plan->title,
            'slug' => \Str::slug($plan->title),
            'target_keywords' => $plan->target_keywords,
            'language' => 'id',
            'status' => 'draft',
            'content_plan_id' => $plan->id,
            'author_id' => $plan->assigned_to ?? $plan->created_by,
        ]);

        // Update plan status
        $plan->update(['status' => 'writing']);

        return $article;
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(array $uuids, string $status): int
    {
        return ContentPlan::whereIn('uuid', $uuids)->update(['status' => $status]);
    }

    /**
     * Assign plan to user
     */
    public function assignToUser(ContentPlan $plan, User $user): ContentPlan
    {
        $plan->assignTo($user);
        return $plan->fresh();
    }

    /**
     * Get calendar data for a specific month
     */
    public function getCalendarData(string $month, array $filters = []): array
    {
        $start = Carbon::parse($month)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $query = ContentPlan::whereBetween('planned_publish_date', [$start, $end]);

        $this->applyFilters($query, $filters);

        $plans = $query->with(['creator', 'assignee', 'article'])->get();

        return $plans->map(function ($plan) {
            return [
                'id' => $plan->uuid,
                'title' => $plan->title,
                'start' => $plan->planned_publish_date?->format('Y-m-d'),
                'backgroundColor' => $this->getStatusColor($plan->status),
                'borderColor' => $this->getStatusColor($plan->status),
                'extendedProps' => [
                    'status' => $plan->status,
                    'priority' => $plan->priority,
                    'content_type' => $plan->content_type,
                    'has_article' => $plan->article !== null,
                ],
            ];
        })->toArray();
    }

    /**
     * Get kanban data grouped by status
     */
    public function getKanbanData(array $filters = []): array
    {
        $statuses = ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'];
        $data = [];

        foreach ($statuses as $status) {
            $query = ContentPlan::where('status', $status);

            $this->applyFilters($query, $filters);

            $data[$status] = $query->with(['creator', 'assignee', 'article'])
                ->orderBy('priority', 'desc')
                ->orderBy('planned_publish_date')
                ->get();
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
            $query->where('status', $filters['status']);
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

        $inProgress = (clone $baseQuery)->whereIn('status', ['writing', 'reviewing'])->count();

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
            'idea' => '#9CA3AF',
            'researching' => '#3B82F6',
            'outlining' => '#8B5CF6',
            'writing' => '#F59E0B',
            'reviewing' => '#EF4444',
            'scheduled' => '#10B981',
            'published' => '#059669',
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

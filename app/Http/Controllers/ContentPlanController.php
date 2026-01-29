<?php

namespace App\Http\Controllers;

use App\Models\ContentPlan;
use App\Services\ContentPlanService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ContentPlanController extends Controller
{
    public function __construct(
        protected ContentPlanService $contentPlanService
    ) {
    }

    /**
     * Display content plans (calendar + kanban + list)
     */
    public function index(Request $request): Response
    {
        $view = $request->get('view', 'calendar'); // calendar, kanban, list
        $month = $request->get('month', now()->format('Y-m'));

        $filters = [
            'search' => $request->get('search'),
            'status' => $request->get('status'),
            'assigned_to' => $request->get('assigned_to'),
            'content_type' => $request->get('content_type'),
        ];

        $users = \App\Models\User::select('id', 'name')
            ->whereIn('role', ['super_admin', 'property_owner', 'property_manager'])
            ->get()
            ->map(fn($user) => ['id' => $user->id, 'name' => $user->name])
            ->values();

        $data = [
            'view' => $view,
            'month' => $month,
            'filters' => $filters,
            'users' => $users,
            'stats' => $this->contentPlanService->getPipelineStats($filters),
        ];

        if ($view === 'calendar') {
            $data['events'] = $this->contentPlanService->getCalendarData($month, $filters);
        } elseif ($view === 'kanban') {
            $data['columns'] = $this->contentPlanService->getKanbanData($filters);
        } else {
            $query = ContentPlan::with(['creator', 'assignee', 'article']);

            // Apply similar filters to list view query
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

            $data['plans'] = $query->orderBy('planned_publish_date')
                ->orderBy('priority', 'desc')
                ->paginate(20)
                ->withQueryString();
        }

        return Inertia::render('Admin/ContentPlans/Index', $data);
    }

    /**
     * Show create form
     */
    public function create(Request $request): Response
    {
        $users = \App\Models\User::select('id', 'name')
            ->whereIn('role', ['super_admin', 'property_owner', 'property_manager'])
            ->get()
            ->map(fn($user) => ['id' => $user->id, 'name' => $user->name])
            ->values();

        return Inertia::render('Admin/ContentPlans/Create', [
            'statuses' => ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled'],
            'contentTypes' => ['article', 'guide', 'tips', 'comparison', 'news', 'review'],
            'users' => $users,
            'initialDate' => $request->get('planned_publish_date', null),
        ]);
    }

    /**
     * Store new content plan
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_keywords' => 'nullable|array',
            'target_audience' => 'nullable|string',
            'content_type' => 'required|in:article,guide,tips,comparison,news,review',
            'status' => 'required|in:idea,researching,outlining,writing,reviewing,scheduled',
            'priority' => 'nullable|integer|min:1|max:5',
            'planned_publish_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $plan = $this->contentPlanService->createPlan($validated);

        return redirect()->route('admin.content-plans.index')
            ->with('success', 'Content plan created successfully!');
    }

    /**
     * Show content plan detail
     */
    public function show(ContentPlan $contentPlan): Response
    {
        $users = \App\Models\User::select('id', 'name')
            ->whereIn('role', ['super_admin', 'property_owner', 'property_manager'])
            ->get()
            ->map(fn($user) => ['id' => $user->id, 'name' => $user->name])
            ->values();

        return Inertia::render('Admin/ContentPlans/Show', [
            'plan' => $contentPlan->load(['creator', 'assignee', 'article']),
            'statuses' => ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'],
            'contentTypes' => ['article', 'guide', 'tips', 'comparison', 'news', 'review'],
            'users' => $users,
        ]);
    }

    /**
     * Show edit form
     */
    public function edit(ContentPlan $contentPlan): Response
    {
        $users = \App\Models\User::select('id', 'name')
            ->whereIn('role', ['super_admin', 'property_owner', 'property_manager'])
            ->get()
            ->map(fn($user) => ['id' => $user->id, 'name' => $user->name])
            ->values();

        return Inertia::render('Admin/ContentPlans/Edit', [
            'plan' => $contentPlan->load(['creator', 'assignee']),
            'statuses' => ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'],
            'contentTypes' => ['article', 'guide', 'tips', 'comparison', 'news', 'review'],
            'users' => $users,
        ]);
    }

    /**
     * Update content plan
     */
    public function update(Request $request, ContentPlan $contentPlan): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'target_keywords' => 'nullable|array',
            'target_audience' => 'nullable|string',
            'content_type' => 'nullable|in:article,guide,tips,comparison,news,review',
            'status' => 'nullable|in:idea,researching,outlining,writing,reviewing,scheduled,published',
            'priority' => 'nullable|integer|min:1|max:5',
            'planned_publish_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $plan = $this->contentPlanService->updatePlan($contentPlan, $validated);

        return redirect()->route('admin.content-plans.show', $contentPlan->uuid)
            ->with('success', 'Content plan updated successfully!');
    }

    /**
     * Delete content plan
     */
    public function destroy(ContentPlan $contentPlan): RedirectResponse
    {
        $this->contentPlanService->deletePlan($contentPlan);

        return redirect()->route('admin.content-plans.index')
            ->with('success', 'Content plan deleted successfully!');
    }

    /**
     * Generate monthly content calendar using AI
     */
    public function generateCalendar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'keywords' => 'required|array|min:1',
            'article_count' => 'nullable|integer|min:1|max:60',
            'target_audience' => 'nullable|string',
            'start_date' => 'nullable|date',
        ]);

        try {
            $plans = $this->contentPlanService->generateMonthlyCalendar(
                $validated['keywords'],
                $validated['article_count'] ?? 30,
                $validated['target_audience'] ?? 'property renters',
                $validated['start_date'] ?? null
            );

            return response()->json([
                'success' => true,
                'plans' => $plans,
                'count' => count($plans),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * AI research for topic
     */
    public function aiResearch(ContentPlan $contentPlan): JsonResponse
    {
        try {
            $research = $this->contentPlanService->researchTopic($contentPlan);

            return response()->json([
                'success' => true,
                'research' => $research,
                'plan' => $contentPlan->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate outline for plan
     */
    public function generateOutline(ContentPlan $contentPlan): JsonResponse
    {
        try {
            $outline = $this->contentPlanService->generateOutlineForPlan($contentPlan);

            return response()->json([
                'success' => true,
                'outline' => $outline,
                'plan' => $contentPlan->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Convert content plan to article
     */
    public function convertToArticle(ContentPlan $contentPlan): JsonResponse
    {
        try {
            $article = $this->contentPlanService->convertToArticle($contentPlan);

            return response()->json([
                'success' => true,
                'article' => $article,
                'redirect' => route('admin.articles.edit', $article->slug),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_ids' => 'required|array',
            'plan_ids.*' => 'exists:content_plans,uuid',
            'status' => 'required|in:idea,researching,outlining,writing,reviewing,scheduled,published',
        ]);

        $count = $this->contentPlanService->bulkUpdateStatus(
            $validated['plan_ids'],
            $validated['status']
        );

        return response()->json([
            'success' => true,
            'updated' => $count,
        ]);
    }
}

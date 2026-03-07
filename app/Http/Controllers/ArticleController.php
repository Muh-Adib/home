<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Property;
use App\Models\ContentPlan;
use App\Services\ArticleImageService;
use App\Services\ArticleService;
use App\Services\ArticleAnalysisService;
use App\Services\SeoService;
use App\Http\Requests\Admin\StoreArticleRequest;
use App\Http\Requests\Admin\UpdateArticleRequest;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\PropertyMedia;

class ArticleController extends Controller
{
    public function __construct(
        private ArticleImageService $imageService,
        private ArticleService $articleService,
        private ArticleAnalysisService $analysisService,
        private SeoService $seoService
    ) {
    }

    /**
     * Display article listing for admin
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Article::class);

        $query = Article::with(['author', 'properties'])
            ->withCount('properties');

        // Search
        if ($request->filled('search')) {
            $query->search($request->get('search'));
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        // Language filter
        if ($request->filled('language')) {
            $query->byLanguage($request->get('language'));
        }

        // Author filter
        if ($request->filled('author_id')) {
            $query->where('author_id', $request->get('author_id'));
        }

        // Sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        $allowedSorts = ['title', 'status', 'published_at', 'view_count', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $articles = $query->paginate(15);

        // Map the result to inject completeness score
        $articles->getCollection()->transform(function ($article) {
            $score = 0;

            // 1. Has featured image (30%)
            if (!empty($article->featured_image))
                $score += 30;

            // 2. Has meta description or excerpt (20%)
            if (!empty($article->meta_description) || !empty($article->excerpt))
                $score += 20;

            // 3. Word count > 300 (30%)
            $wordCount = str_word_count(strip_tags($article->content ?? ''));
            if ($wordCount >= 300)
                $score += 30;
            else if ($wordCount >= 100)
                $score += 15;

            // 4. Linked to properties (20%)
            if ($article->properties_count > 0)
                $score += 20;

            $article->completeness_score = $score;
            return $article;
        });

        return Inertia::render('Admin/Articles/Index', [
            'articles' => $articles,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'language' => $request->get('language'),
                'author_id' => $request->get('author_id'),
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
            'languages' => config('article.languages.supported'),
        ]);
    }

    /**
     * Show article creation form
     */
    public function create(): Response
    {
        $this->authorize('create', Article::class);

        $properties = Property::active()->get(['id', 'name', 'slug']);
        $contentPlans = ContentPlan::pending()
            ->where('assigned_to', auth()->id())
            ->orWhere('created_by', auth()->id())
            ->get();

        return Inertia::render('Admin/Articles/Create', [
            'properties' => $properties,
            'contentPlans' => $contentPlans,
            'languages' => config('article.languages.supported'),
            'config' => [
                'ai_providers' => array_keys(config('article.ai.providers')),
                'default_provider' => config('article.ai.default_provider'),
            ],
        ]);
    }

    /**
     * Store new article
     */
    public function store(StoreArticleRequest $request): RedirectResponse
    {
        $this->authorize('create', Article::class);

        $article = $this->articleService->createArticle($request->validated());

        return redirect()->route('articles.edit', $article->slug)
            ->with('success', 'Article created successfully.');
    }

    /**
     * Display specific article (public)
     */
    public function show(string $slug): Response
    {
        $article = Article::where('slug', $slug)
            ->with(['author', 'properties.media'])
            ->firstOrFail();

        $this->authorize('view', $article);

        // Increment view count
        $article->increment('view_count');

        // Get related articles
        $relatedArticles = Article::published()
            ->where('id', '!=', $article->id)
            ->where('language', $article->language)
            ->limit(3)
            ->get();

        return Inertia::render('Articles/Show', [
            'article' => $article,
            'relatedArticles' => $relatedArticles,
            'seo' => $this->seoService->forArticle($article),
            'schema' => $this->seoService->articleSchema($article),
        ]);
    }

    /**
     * Show edit form
     */
    public function edit(Article $article): Response
    {
        $this->authorize('update', $article);

        $article->load(['properties', 'contentPlan']);

        $allProperties = Property::active()->get(['id', 'name', 'slug']);

        return Inertia::render('Admin/Articles/Edit', [
            'article' => $article,
            'seoScore' => $this->analysisService->calculateSeoScore($article),
            'properties' => $allProperties,
            'linkedPropertyIds' => $article->properties->pluck('id'),
            'languages' => config('article.languages.supported'),
            'config' => [
                'ai_providers' => array_keys(config('article.ai.providers')),
                'default_provider' => config('article.ai.default_provider'),
            ],
        ]);
    }

    /**
     * Update article
     */
    public function update(UpdateArticleRequest $request, Article $article)
    {
        $this->authorize('update', $article);

        $this->articleService->updateArticle($article, $request->validated());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Article updated automatically.'
            ]);
        }

        return redirect()->back()
            ->with('success', 'Article updated successfully.');
    }

    /**
     * Delete article
     */
    public function destroy(Article $article): RedirectResponse
    {
        $this->authorize('delete', $article);

        $article->delete();

        return redirect()->route('articles.index')
            ->with('success', 'Article deleted successfully.');
    }

    /**
     * Publish article
     */
    public function publish(Article $article): RedirectResponse
    {
        $this->authorize('publish', $article);

        $this->articleService->publishArticle($article);

        return redirect()->back()
            ->with('success', 'Article published successfully.');
    }

    /**
     * Schedule article
     */
    public function schedule(Request $request, Article $article): RedirectResponse
    {
        $this->authorize('schedule', $article);

        $validated = $request->validate([
            'scheduled_at' => 'required|date|after:now',
        ]);

        $article->schedule(new \DateTime($validated['scheduled_at']));

        return redirect()->back()
            ->with('success', 'Article scheduled successfully.');
    }

    /**
     * Duplicate article
     */
    public function duplicate(Article $article): RedirectResponse
    {
        $this->authorize('create', Article::class);

        $newArticle = $this->articleService->duplicateArticle($article);

        return redirect()->route('articles.edit', $newArticle->slug)
            ->with('success', 'Article duplicated successfully.');
    }

    /**
     * Upload article image (WebP conversion)
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $this->authorize('create', Article::class);

        $request->validate([
            'image' => 'required|image|max:10240', // 10MB
            'article_slug' => 'nullable|string',
        ]);

        try {
            $article = $request->filled('article_slug')
                ? Article::where('slug', $request->get('article_slug'))->first()
                : null;

            $result = $this->imageService->uploadImage(
                $request->file('image'),
                $article
            );

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete article image
     */
    public function deleteImage(Request $request): JsonResponse
    {
        $this->authorize('create', Article::class);

        $request->validate([
            'path' => 'required|string',
        ]);

        try {
            $deleted = $this->imageService->deleteImage($request->get('path'));

            return response()->json([
                'success' => $deleted,
                'message' => $deleted ? 'Image deleted successfully' : 'Image not found',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get media for the article editor
     */
    public function getMedia(): JsonResponse
    {
        $this->authorize('create', Article::class);

        $mediaList = [];

        // 1. Get uploaded images from articles/images directory
        $articleImages = Storage::disk('public')->allFiles('articles/images');
        foreach ($articleImages as $path) {
            if (in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                $mediaList[] = [
                    'id' => 'article_' . md5($path),
                    'url' => asset('storage/' . $path),
                    'path' => $path,
                    'name' => basename($path),
                    'size' => Storage::disk('public')->size($path),
                    'last_modified' => Storage::disk('public')->lastModified($path),
                    'source' => 'article',
                ];
            }
        }

        // 2. Get property images
        $propertyImages = PropertyMedia::with('property:id,name')->get();
        foreach ($propertyImages as $media) {
            $mediaList[] = [
                'id' => 'property_' . $media->id,
                'url' => $media->url,
                'path' => $media->file_path,
                'name' => $media->property ? $media->property->name . ' - ' . basename($media->file_path) : basename($media->file_path),
                'size' => $media->file_size,
                'last_modified' => strtotime($media->updated_at),
                'source' => 'property',
            ];
        }

        // Sort by last modified (newest first)
        usort($mediaList, function ($a, $b) {
            return $b['last_modified'] <=> $a['last_modified'];
        });

        return response()->json([
            'success' => true,
            'media' => $mediaList,
        ]);
    }

    /**
     * Public article index
     */
    public function publicIndex(Request $request): Response
    {
        $query = Article::published()
            ->with(['author', 'properties'])
            ->latest('published_at');

        // Language filter
        if ($request->filled('language')) {
            $query->byLanguage($request->get('language'));
        }

        // Search
        if ($request->filled('search')) {
            $query->search($request->get('search'));
        }

        $articles = $query->paginate(12);

        return Inertia::render('Articles/Index', [
            'articles' => $articles,
            'filters' => [
                'search' => $request->get('search'),
                'language' => $request->get('language'),
            ],
        ]);
    }
}

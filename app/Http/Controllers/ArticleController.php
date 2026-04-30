<?php

namespace App\Http\Controllers;

use App\Http\Requests\Admin\StoreArticleRequest;
use App\Http\Requests\Admin\UpdateArticleRequest;
use App\Models\Article;
use App\Models\ContentPlan;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Services\ArticleAnalysisService;
use App\Services\ArticleImageService;
use App\Services\ArticleService;
use App\Services\SeoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function __construct(
        private ArticleImageService $imageService,
        private ArticleService $articleService,
        private ArticleAnalysisService $analysisService,
        private SeoService $seoService
    ) {}

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
            $query->search($request->input('search'));
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Language filter
        if ($request->filled('language')) {
            $query->byLanguage($request->input('language'));
        }

        // Author filter
        if ($request->filled('author_id')) {
            $query->where('author_id', $request->input('author_id'));
        }

        // Sorting
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        $allowedSorts = ['title', 'status', 'published_at', 'view_count', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $articles = $query->paginate(15);

        // Map the result to inject completeness score
        $articles->getCollection()->transform(function ($article) {
            $score = 0;

            // 1. Has featured image (30%)
            if (! empty($article->featured_image)) {
                $score += 30;
            }

            // 2. Has meta description or excerpt (20%)
            if (! empty($article->meta_description) || ! empty($article->excerpt)) {
                $score += 20;
            }

            // 3. Word count > 300 (30%)
            $wordCount = str_word_count(strip_tags($article->content ?? ''));
            if ($wordCount >= 300) {
                $score += 30;
            } elseif ($wordCount >= 100) {
                $score += 15;
            }

            // 4. Linked to properties (20%)
            if ($article->properties_count > 0) {
                $score += 20;
            }

            $article->completeness_score = $score;

            return $article;
        });

        return Inertia::render('Admin/Articles/Index', [
            'articles' => $articles,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'language' => $request->input('language'),
                'author_id' => $request->input('author_id'),
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
        $safeSlug = strlen($slug) > 50 ? substr($slug, 0, 50).'_'.md5($slug) : $slug;
        $cacheKey = "article_show_v2_{$safeSlug}";

        // Cache only plain arrays — never Eloquent models/collections (causes __PHP_Incomplete_Class on unserialize)
        $data = Cache::remember($cacheKey, 3600, function () use ($slug) {
            $article = Article::where('slug', $slug)
                ->with(['author', 'properties.media'])
                ->firstOrFail();

            $relatedArticles = Article::published()
                ->where('id', '!=', $article->id)
                ->where('language', $article->language)
                ->limit(3)
                ->get();

            return [
                'article' => $article->toArray(),
                'relatedArticles' => $relatedArticles->toArray(),
                'seo' => $this->seoService->forArticle($article),
                'schema' => $this->seoService->articleSchema($article),
            ];
        });

        // Re-fetch minimal data for authorization (not from cache) — id is always in the cached array
        $article = Article::findOrFail($data['article']['id']);
        $this->authorize('view', $article);

        // Increment view count directly in DB to avoid stale cache issues
        Article::where('id', $data['article']['id'])->increment('view_count');

        // Merge incremented view count into cached array for display
        $articleData = $data['article'];
        $articleData['view_count'] = ($articleData['view_count'] ?? 0) + 1;

        return Inertia::render('Articles/Show', [
            'article' => $articleData,
            'relatedArticles' => $data['relatedArticles'],
            'seo' => $data['seo'],
            'schema' => $data['schema'],
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
                'message' => 'Article updated automatically.',
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
                ? Article::where('slug', $request->input('article_slug'))->first()
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
            $deleted = $this->imageService->deleteImage($request->input('path'));

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
    public function getMedia(Request $request): JsonResponse
    {
        $this->authorize('create', Article::class);

        $mediaList = [];
        $search = $request->input('search');

        // 1. Get uploaded images from articles/images directory
        $articleImages = Storage::disk('public')->allFiles('articles/images');
        foreach ($articleImages as $path) {
            if (in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                if ($search && ! str_contains(strtolower(basename($path)), strtolower($search))) {
                    continue;
                }
                $mediaList[] = [
                    'id' => 'article_'.md5($path),
                    'url' => asset('storage/'.$path),
                    'thumbnail_url' => asset('storage/'.$path),
                    'path' => $path,
                    'name' => basename($path),
                    'size' => Storage::disk('public')->size($path),
                    'last_modified' => Storage::disk('public')->lastModified($path),
                    'source' => 'article',
                ];
            }
        }

        // 2. Get property images
        $propertyQuery = PropertyMedia::with('property:id,name');
        if ($search) {
            $propertyQuery->whereHas('property', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }
        $propertyImages = $propertyQuery->get();

        foreach ($propertyImages as $media) {
            $mediaList[] = [
                'id' => 'property_'.$media->id,
                'url' => $media->url,
                'thumbnail_url' => $media->thumbnail_url ?? $media->url,
                'path' => $media->file_path,
                'name' => $media->property ? $media->property->name.' - '.basename($media->file_path) : basename($media->file_path),
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
            $query->byLanguage($request->input('language'));
        }

        // Search
        if ($request->filled('search')) {
            $query->search($request->input('search'));
        }

        // Do NOT cache the paginator object — LengthAwarePaginator is not safely serializable.
        // Cache only the plain array representation to avoid __PHP_Incomplete_Class errors.
        $cacheKey = 'articles_index_v2_'.md5(json_encode($request->only(['page', 'language', 'search'])));

        $articlesData = Cache::remember($cacheKey, 3600, function () use ($query) {
            $paginator = $query->paginate(12);

            return $paginator->toArray();
        });

        // Re-wrap as a plain array for Inertia (already paginator-shaped from toArray())
        $articles = $articlesData;

        return Inertia::render('Articles/Index', [
            'articles' => $articles,
            'filters' => [
                'search' => $request->input('search'),
                'language' => $request->input('language'),
            ],
            'seo' => $this->seoService->forArticlesIndex(),
            'itemListSchema' => $this->seoService->articlesIndexSchema(collect($articles['data'] ?? [])),
            'breadcrumbSchema' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Artikel', 'item' => route('articles.index')],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SitemapController;
use App\Models\SeoLandingPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AdminSeoLandingController extends Controller
{
    public function index(Request $request)
    {
        $query = SeoLandingPage::query();

        // Search support
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('slug', 'like', "%{$search}%")
                    ->orWhere('target_keyword', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $pages = $query->latest()->paginate(15)->appends($request->query());

        // Append url accessor to each item
        $pages->getCollection()->transform(function ($page) {
            $page->append('url');

            return $page;
        });

        return Inertia::render('Admin/Settings/Seo/Index', [
            'pages' => $pages,
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $request->input('status', 'all'),
            ],
        ]);
    }

    /**
     * Check if an SEO landing page is accessible (health check)
     */
    public function checkHealth(SeoLandingPage $seoPage): JsonResponse
    {
        try {
            $url = url('/s/'.$seoPage->slug);
            $response = Http::timeout(10)->get($url);

            return response()->json([
                'id' => $seoPage->id,
                'status' => $response->status(),
                'ok' => $response->successful(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'id' => $seoPage->id,
                'status' => 0,
                'ok' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Shared validation rules for store/update
     */
    private function validationRules(?int $ignoreId = null): array
    {
        $slugUnique = $ignoreId
            ? 'required|max:255|unique:seo_landing_pages,slug,'.$ignoreId
            : 'required|unique:seo_landing_pages,slug|max:255';

        return [
            'slug' => $slugUnique,
            'target_keyword' => 'required|max:255',
            'title' => 'required|max:255',
            'h1' => 'nullable|max:255',
            'meta_description' => 'nullable|string|max:500',
            'filters' => 'nullable|array',
            'search_volume' => 'nullable|integer|min:0',
            'sitemap_priority' => 'nullable|numeric|min:0|max:1',
            'sitemap_changefreq' => 'nullable|string|in:always,hourly,daily,weekly,monthly,yearly,never',
            'intro_text' => 'nullable|string',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Auto-fill h1 and meta_description when not provided
     */
    private function autoFillSeoFields(array &$validated): void
    {
        if (empty($validated['h1'])) {
            $validated['h1'] = $validated['title'];
        }
        if (empty($validated['meta_description'])) {
            $validated['meta_description'] = "Temukan {$validated['target_keyword']} terbaik di Yogyakarta. Booking online mudah dan aman di Homsjogja.";
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->validationRules());
        $this->autoFillSeoFields($validated);

        SeoLandingPage::create($validated);
        SitemapController::clearCache();

        return redirect()->back()->with('success', 'Halaman SEO berhasil dibuat.');
    }

    public function update(Request $request, SeoLandingPage $seoPage)
    {
        $validated = $request->validate($this->validationRules($seoPage->id));
        $this->autoFillSeoFields($validated);

        $seoPage->update($validated);
        SitemapController::clearCache();

        return redirect()->back()->with('success', 'Halaman SEO berhasil diperbarui.');
    }

    public function destroy(SeoLandingPage $seoPage)
    {
        $seoPage->delete();
        SitemapController::clearCache();

        return redirect()->back()->with('success', 'Halaman SEO berhasil dihapus.');
    }
}

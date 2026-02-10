<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SeoLandingPage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class AdminSeoLandingController extends Controller
{
    public function index()
    {
        $pages = SeoLandingPage::query()
            ->latest()
            ->paginate(10);

        return Inertia::render('Admin/Settings/Seo/Index', [
            'pages' => $pages,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'slug' => 'required|unique:seo_landing_pages,slug|max:255',
            'target_keyword' => 'required|max:255',
            'title' => 'required|max:255',
            'filters' => 'nullable|array',
            'intro_text' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        SeoLandingPage::create($validated);

        return redirect()->back()->with('success', 'Page created successfully.');
    }

    public function update(Request $request, SeoLandingPage $page)
    {
        $validated = $request->validate([
            'slug' => 'required|max:255|unique:seo_landing_pages,slug,' . $page->id,
            'target_keyword' => 'required|max:255',
            'title' => 'required|max:255',
            'filters' => 'nullable|array',
            'intro_text' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $page->update($validated);

        return redirect()->back()->with('success', 'Page updated successfully.');
    }

    public function destroy(SeoLandingPage $page)
    {
        $page->delete();
        return redirect()->back()->with('success', 'Page deleted successfully.');
    }
}

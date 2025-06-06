<?php

namespace App\Http\Controllers;

use App\Models\Amenity;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class AmenityController extends Controller
{
    /**
     * Display admin amenities listing
     */
    public function index(Request $request): Response
    {
        $query = Amenity::query()->withCount('properties');

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->get('category'));
        }

        // Filter by status
        if ($request->filled('status')) {
            $status = $request->get('status') === 'active';
            $query->where('is_active', $status);
        }

        $amenities = $query->ordered()->paginate(20);

        // Get categories for filter
        $categories = Amenity::select('category')
                            ->distinct()
                            ->orderBy('category')
                            ->pluck('category');

        return Inertia::render('Admin/Amenities/Index', [
            'amenities' => $amenities,
            'categories' => $categories,
            'filters' => [
                'search' => $request->get('search'),
                'category' => $request->get('category'),
                'status' => $request->get('status'),
            ]
        ]);
    }

    /**
     * Show the form for creating a new amenity
     */
    public function create(): Response
    {
        $categories = [
            'basic' => 'Basic Amenities',
            'entertainment' => 'Entertainment',
            'kitchen' => 'Kitchen & Dining',
            'outdoor' => 'Outdoor',
            'wellness' => 'Wellness & Spa',
            'business' => 'Business',
        ];

        return Inertia::render('Admin/Amenities/Create', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created amenity
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:amenities,name',
            'icon' => 'nullable|string|max:100',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        // Set default sort order if not provided
        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = Amenity::max('sort_order') + 1;
        }

        Amenity::create($validated);

        return redirect()->route('admin.amenities.index')
            ->with('success', 'Amenity created successfully.');
    }

    /**
     * Display the specified amenity
     */
    public function show(Amenity $amenity): Response
    {
        $amenity->load(['properties' => function ($query) {
            $query->select('properties.id', 'properties.name', 'properties.status')
                  ->withPivot('is_available', 'notes');
        }]);

        return Inertia::render('Admin/Amenities/Show', [
            'amenity' => $amenity,
        ]);
    }

    /**
     * Show the form for editing the specified amenity
     */
    public function edit(Amenity $amenity): Response
    {
        $categories = [
            'basic' => 'Basic Amenities',
            'entertainment' => 'Entertainment',
            'kitchen' => 'Kitchen & Dining',
            'outdoor' => 'Outdoor',
            'wellness' => 'Wellness & Spa',
            'business' => 'Business',
        ];

        return Inertia::render('Admin/Amenities/Edit', [
            'amenity' => $amenity,
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified amenity
     */
    public function update(Request $request, Amenity $amenity): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:amenities,name,' . $amenity->id,
            'icon' => 'nullable|string|max:100',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $amenity->update($validated);

        return redirect()->route('admin.amenities.index')
            ->with('success', 'Amenity updated successfully.');
    }

    /**
     * Remove the specified amenity
     */
    public function destroy(Amenity $amenity): RedirectResponse
    {
        // Check if amenity is being used by properties
        if ($amenity->properties()->count() > 0) {
            return back()->withErrors([
                'error' => 'Cannot delete amenity that is being used by properties.'
            ]);
        }

        $amenity->delete();

        return redirect()->route('admin.amenities.index')
            ->with('success', 'Amenity deleted successfully.');
    }

    /**
     * API endpoint for amenities (for frontend selects)
     */
    public function api_index(Request $request): JsonResponse
    {
        $query = Amenity::active()->ordered();

        // Filter by category if provided
        if ($request->filled('category')) {
            $query->byCategory($request->get('category'));
        }

        $amenities = $query->get(['id', 'name', 'icon', 'category']);

        return response()->json([
            'amenities' => $amenities,
        ]);
    }

    /**
     * Bulk update amenity status
     */
    public function bulkStatus(Request $request): RedirectResponse
    {
        $request->validate([
            'amenity_ids' => 'required|array',
            'amenity_ids.*' => 'exists:amenities,id',
            'status' => 'required|boolean',
        ]);

        $amenityIds = $request->get('amenity_ids');
        $status = $request->get('status');

        Amenity::whereIn('id', $amenityIds)->update(['is_active' => $status]);

        $statusText = $status ? 'activated' : 'deactivated';
        $count = count($amenityIds);

        return redirect()->back()
            ->with('success', "Successfully {$statusText} {$count} amenities.");
    }

    /**
     * Toggle amenity status
     */
    public function toggleStatus(Request $request, Amenity $amenity): RedirectResponse
    {
        $amenity->update([
            'is_active' => !$amenity->is_active
        ]);

        $status = $amenity->is_active ? 'activated' : 'deactivated';

        return redirect()->back()
            ->with('success', "Amenity {$status} successfully.");
    }

    /**
     * Reorder amenities
     */
    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'amenities' => 'required|array',
            'amenities.*.id' => 'required|exists:amenities,id',
            'amenities.*.sort_order' => 'required|integer|min:0',
        ]);

        $amenities = $request->get('amenities');

        foreach ($amenities as $amenityData) {
            Amenity::where('id', $amenityData['id'])
                   ->update(['sort_order' => $amenityData['sort_order']]);
        }

        return redirect()->back()
            ->with('success', 'Amenities reordered successfully.');
    }
}

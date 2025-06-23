<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class InventoryCategoryController extends Controller
{
    /**
     * Display a listing of inventory categories
     */
    public function index(Request $request): Response
    {
        $query = InventoryCategory::with(['parent', 'children', 'items']);

        // Apply filters
        if ($request->filled('category_type')) {
            $query->where('category_type', $request->category_type);
        }

        if ($request->filled('parent_id')) {
            if ($request->parent_id === 'root') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort', 'sort_order');
        $sortDirection = $request->get('direction', 'asc');
        
        if (in_array($sortBy, ['name', 'category_type', 'sort_order', 'created_at'])) {
            $query->orderBy($sortBy, $sortDirection);
        }

        if (!$request->filled('sort')) {
            $query->orderBy('parent_id')->orderBy('sort_order');
        }

        $categories = $query->paginate(20)->withQueryString();

        // Get filter options
        $parentCategories = InventoryCategory::whereNull('parent_id')
            ->where('is_active', true)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Get statistics
        $stats = [
            'total_categories' => InventoryCategory::count(),
            'active_categories' => InventoryCategory::where('is_active', true)->count(),
            'root_categories' => InventoryCategory::whereNull('parent_id')->count(),
            'total_items' => InventoryCategory::withCount('items')->get()->sum('items_count'),
        ];

        return Inertia::render('Admin/InventoryCategories/Index', [
            'categories' => $categories,
            'parentCategories' => $parentCategories,
            'stats' => $stats,
            'filters' => $request->only(['category_type', 'parent_id', 'status', 'search']),
            'categoryTypes' => InventoryCategory::CATEGORY_TYPES,
        ]);
    }

    /**
     * Show the form for creating a new category
     */
    public function create(): Response
    {
        $parentCategories = InventoryCategory::getTree();

        return Inertia::render('Admin/InventoryCategories/Create', [
            'parentCategories' => $parentCategories,
            'categoryTypes' => InventoryCategory::CATEGORY_TYPES,
            'defaultColors' => $this->getDefaultColors(),
            'availableIcons' => $this->getAvailableIcons(),
        ]);
    }

    /**
     * Store a newly created category
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:inventory_categories,name',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'category_type' => 'required|in:' . implode(',', array_keys(InventoryCategory::CATEGORY_TYPES)),
            'parent_id' => 'nullable|exists:inventory_categories,id',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'track_expiry' => 'boolean',
            'track_serial' => 'boolean',
            'auto_reorder' => 'boolean',
            'default_min_stock' => 'required|integer|min:0',
        ]);

        // Generate slug
        $validated['slug'] = Str::slug($validated['name']);

        // Ensure unique slug
        $originalSlug = $validated['slug'];
        $counter = 1;
        while (InventoryCategory::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = $originalSlug . '-' . $counter;
            $counter++;
        }

        // If parent specified, validate it's not creating a circular reference
        if ($validated['parent_id']) {
            $parent = InventoryCategory::find($validated['parent_id']);
            if ($parent && $parent->depth >= 2) {
                return back()->withErrors(['parent_id' => 'Maximum category depth is 3 levels.']);
            }
        }

        $category = InventoryCategory::create($validated);

        return redirect()->route('admin.inventory-categories.show', $category)
            ->with('success', 'Inventory category created successfully.');
    }

    /**
     * Display the specified category
     */
    public function show(InventoryCategory $inventoryCategory): Response
    {
        $inventoryCategory->load([
            'parent',
            'children' => function($query) {
                $query->withCount('items')->orderBy('sort_order');
            },
            'items' => function($query) {
                $query->with(['category', 'stocks']);
            }
        ]);

        // Get category statistics
        $stats = [
            'total_items' => $inventoryCategory->items()->count(),
            'active_items' => $inventoryCategory->items()->where('status', 'active')->count(),
            'total_stock_value' => $inventoryCategory->items()
                ->join('inventory_stocks', 'inventory_items.id', '=', 'inventory_stocks.item_id')
                ->where('inventory_stocks.status', 'in_stock')
                ->sum(\DB::raw('inventory_stocks.quantity * inventory_items.unit_cost')),
            'subcategories' => $inventoryCategory->children()->count(),
        ];

        return Inertia::render('Admin/InventoryCategories/Show', [
            'category' => $inventoryCategory,
            'stats' => $stats,
            'canEdit' => auth()->user()->can('update', $inventoryCategory),
            'canDelete' => auth()->user()->can('delete', $inventoryCategory),
        ]);
    }

    /**
     * Show the form for editing the category
     */
    public function edit(InventoryCategory $inventoryCategory): Response
    {
        $parentCategories = InventoryCategory::getTree()
            ->reject(function($category) use ($inventoryCategory) {
                // Remove self and descendants to prevent circular references
                return $category['id'] === $inventoryCategory->id ||
                       in_array($inventoryCategory->id, $category['ancestor_ids'] ?? []);
            });

        return Inertia::render('Admin/InventoryCategories/Edit', [
            'category' => $inventoryCategory,
            'parentCategories' => $parentCategories,
            'categoryTypes' => InventoryCategory::CATEGORY_TYPES,
            'defaultColors' => $this->getDefaultColors(),
            'availableIcons' => $this->getAvailableIcons(),
        ]);
    }

    /**
     * Update the specified category
     */
    public function update(Request $request, InventoryCategory $inventoryCategory): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:inventory_categories,name,' . $inventoryCategory->id,
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'category_type' => 'required|in:' . implode(',', array_keys(InventoryCategory::CATEGORY_TYPES)),
            'parent_id' => 'nullable|exists:inventory_categories,id',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'track_expiry' => 'boolean',
            'track_serial' => 'boolean',
            'auto_reorder' => 'boolean',
            'default_min_stock' => 'required|integer|min:0',
        ]);

        // Update slug if name changed
        if ($validated['name'] !== $inventoryCategory->name) {
            $validated['slug'] = Str::slug($validated['name']);
            
            // Ensure unique slug
            $originalSlug = $validated['slug'];
            $counter = 1;
            while (InventoryCategory::where('slug', $validated['slug'])
                ->where('id', '!=', $inventoryCategory->id)->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        // Validate parent_id doesn't create circular reference
        if ($validated['parent_id'] && $validated['parent_id'] !== $inventoryCategory->parent_id) {
            if ($validated['parent_id'] === $inventoryCategory->id) {
                return back()->withErrors(['parent_id' => 'Category cannot be its own parent.']);
            }
            
            if ($inventoryCategory->isAncestorOf($validated['parent_id'])) {
                return back()->withErrors(['parent_id' => 'This would create a circular reference.']);
            }

            $parent = InventoryCategory::find($validated['parent_id']);
            if ($parent && $parent->depth >= 2) {
                return back()->withErrors(['parent_id' => 'Maximum category depth is 3 levels.']);
            }
        }

        $inventoryCategory->update($validated);

        return redirect()->route('admin.inventory-categories.show', $inventoryCategory)
            ->with('success', 'Inventory category updated successfully.');
    }

    /**
     * Remove the specified category
     */
    public function destroy(InventoryCategory $inventoryCategory): RedirectResponse
    {
        // Check if category has items
        if ($inventoryCategory->items()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete category that contains items.']);
        }

        // Check if category has subcategories
        if ($inventoryCategory->children()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete category that has subcategories.']);
        }

        $inventoryCategory->delete();

        return redirect()->route('admin.inventory-categories.index')
            ->with('success', 'Inventory category deleted successfully.');
    }

    /**
     * Get category tree as JSON for API calls
     */
    public function getTree(): JsonResponse
    {
        $tree = InventoryCategory::getTree();
        
        return response()->json($tree);
    }

    /**
     * Get default colors for categories
     */
    private function getDefaultColors(): array
    {
        return [
            '#3b82f6', // Blue
            '#10b981', // Green
            '#f59e0b', // Yellow
            '#ef4444', // Red
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
            '#f97316', // Orange
            '#84cc16', // Lime
            '#ec4899', // Pink
            '#6b7280', // Gray
        ];
    }

    /**
     * Get available icons for categories
     */
    private function getAvailableIcons(): array
    {
        return [
            'Sparkles',      // Cleaning supplies
            'ShowerHead',    // Bathroom supplies
            'ChefHat',       // Kitchen supplies
            'Bed',           // Linens & Towels
            'Wrench',        // Maintenance tools
            'Tv',            // Electronics
            'Sofa',          // Furniture
            'Trees',         // Outdoor equipment
            'Shield',        // Safety equipment
            'FileText',      // Office supplies
            'Package',       // Consumables
            'Gift',          // Guest amenities
        ];
    }
}

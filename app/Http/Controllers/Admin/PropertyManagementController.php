<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Amenity;
use App\Models\User;
use App\Services\AvailabilityService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class PropertyManagementController extends Controller
{
    /**
     * Constructor dengan dependency injection untuk AvailabilityService
     */
    public function __construct(private AvailabilityService $availabilityService)
    {
    }

    /**
     * Display admin properties listing
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Property::class);
        
        $user = $request->user();
        
        $query = Property::query()
            ->with(['owner', 'media', 'bookings' => function ($q) {
                $q->whereIn('booking_status', ['confirmed', 'checked_in']);
            }]);

        // Filter by owner for property owners
        if ($user->role === 'property_owner') {
            $query->byOwner($user->id);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $properties = $query->paginate(15);
        
        return Inertia::render('Admin/Properties/Index', [
            'properties' => $properties,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
            ]
        ]);
    }

    /**
     * Show the form for creating a new property
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', Property::class);
        
        if($request->user()->hasRole('super_admin')){
            $owners = User::where('role', 'property_owner')->get();
        }else{
            $owners = null;
        }
        
        $amenities = Amenity::active()->ordered()->get();
        
        return Inertia::render('Admin/Properties/Create', [
            'amenities' => $amenities,
            'owners' => $owners,
        ]);
    }

    /**
     * Store a newly created property
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Property::class);
        
        $user = $request->user();
        
        $validationRules = [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'address' => 'required|string',
            'maps_link' => 'nullable|string',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'capacity' => 'required|integer|min:1',
            'capacity_max' => 'required|integer|gte:capacity',
            'bedroom_count' => 'required|integer|min:1',
            'bathroom_count' => 'required|integer|min:1',
            'base_rate' => 'required|numeric|min:0',
            'weekend_premium_percent' => 'required|numeric|min:0|max:100',
            'cleaning_fee' => 'required|numeric|min:0',
            'extra_bed_rate' => 'required|numeric|min:0',
            'house_rules' => 'nullable|string',
            'check_in_time' => 'required|date_format:H:i',
            'check_out_time' => 'required|date_format:H:i',
            'min_stay_weekday' => 'required|integer|min:1',
            'min_stay_weekend' => 'required|integer|min:1',
            'min_stay_peak' => 'required|integer|min:1',
            'is_featured' => 'boolean',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string|max:255',
            'amenities' => 'array',
            'amenities.*' => 'exists:amenities,id',
        ];

        // Only super_admin can assign owner_id, property_owner creates for themselves
        if ($user->hasRole('super_admin')) {
            $validationRules['owner_id'] = 'required|string';
        }

        $validated = $request->validate($validationRules);
        
        // Set owner_id based on user role
        if ($user->hasRole('property_owner')) {
            $validated['owner_id'] = $user->id;
        } elseif ($user->hasRole('super_admin')) {
            if ($request->get('owner_id') === 'auto') {
                // Auto-assign to the first available property owner
                $firstOwner = User::hasRole('property_owner')->first();
                $validated['owner_id'] = $firstOwner ? $firstOwner->id : $user->id;
            } else {
                $validated['owner_id'] = $request->get('owner_id');
            }
        } else {
            $validated['owner_id'] = $user->id;
        }
        
        // Generate slug
        $validated['slug'] = Str::slug($validated['name']);

        $property = Property::create($validated);

        // Attach amenities
        if ($request->filled('amenities')) {
            $property->amenities()->attach($request->get('amenities'));
        }

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property created successfully.');
    }

    /**
     * Display the specified property (Admin)
     */
    public function show(Property $property): Response
    {
        $this->authorize('view', $property);

        $property->load([
            'owner',
            'amenities',
            'media' => function ($query) {
                $query->orderBy('display_order');
            },
            'bookings' => function ($query) {
                $query->latest()->limit(10);
            },
            'seasonalRates' => function ($query) {
                $query->where('is_active', true)
                      ->orderBy('priority', 'desc')
                      ->orderBy('start_date', 'asc');
            }
        ]);

        // Calculate property statistics
        $stats = [
            'total_bookings' => $property->bookings()->count(),
            'confirmed_bookings' => $property->bookings()->where('status', 'confirmed')->count(),
            'total_revenue' => $property->bookings()
                ->where('status', '!=', 'cancelled')
                ->sum('total_amount'),
            'average_rating' => $property->bookings()
                ->whereNotNull('guest_rating')
                ->avg('guest_rating'),
            'occupancy_rate' => $this->calculateOccupancyRate($property),
        ];

        return Inertia::render('Admin/Properties/Show', [
            'property' => $property,
            'stats' => $stats,
        ]);
    }

    /**
     * Calculate occupancy rate for property
     */
    private function calculateOccupancyRate(Property $property): float
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $endDate = now()->endOfMonth();
        
        $totalDays = $startDate->diffInDays($endDate);
        $bookedDays = $property->bookings()
            ->where('status', '!=', 'cancelled')
            ->whereBetween('check_in_date', [$startDate, $endDate])
            ->get()
            ->sum(function ($booking) {
                return $booking->check_in_date->diffInDays($booking->check_out_date);
            });
            
        return $totalDays > 0 ? round(($bookedDays / $totalDays) * 100, 2) : 0;
    }

    /**
     * Show the form for editing the specified property
     */
    public function edit(Property $property): Response
    {
        $this->authorize('update', $property);

        $property->load(['amenities', 'media']);
        $amenities = Amenity::active()->ordered()->get();
        
        return Inertia::render('Admin/Properties/Edit', [
            'property' => $property,
            'amenities' => $amenities,
        ]);
    }

    /**
     * Update the specified property
     */
    public function update(Request $request, Property $property): RedirectResponse
    {
        $this->authorize('update', $property);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'address' => 'required|string',
            'maps_link' => 'nullable|string',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'capacity' => 'required|integer|min:1',
            'capacity_max' => 'required|integer|gte:capacity',
            'bedroom_count' => 'required|integer|min:1',
            'bathroom_count' => 'required|integer|min:1',
            'base_rate' => 'required|numeric|min:0',
            'weekend_premium_percent' => 'required|numeric|min:0|max:100',
            'cleaning_fee' => 'required|numeric|min:0',
            'extra_bed_rate' => 'required|numeric|min:0',
            'status' => 'required|in:active,inactive,maintenance',
            'house_rules' => 'nullable|string',
            'check_in_time' => 'required|date_format:H:i',
            'check_out_time' => 'required|date_format:H:i',
            'min_stay_weekday' => 'required|integer|min:1',
            'min_stay_weekend' => 'required|integer|min:1',
            'min_stay_peak' => 'required|integer|min:1',
            'is_featured' => 'boolean',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string',
            'amenities' => 'array',
            'amenities.*' => 'exists:amenities,id',
        ]);

        // Update slug if name changed
        if ($property->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $property->update($validated);

        // Sync amenities
        if ($request->has('amenities')) {
            $property->amenities()->sync($request->get('amenities'));
        }

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property updated successfully.');
    }

    /**
     * Remove the specified property
     */
    public function destroy(Property $property): RedirectResponse
    {
        $this->authorize('delete', $property);

        $property->delete();

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property deleted successfully.');
    }

    /**
     * Property media management
     */
    public function media(Property $property): Response
    {
        $this->authorize('manageMedia', $property);

        $property->load(['media' => function ($query) {
            $query->orderBy('display_order', 'asc')
                  ->orderBy('created_at', 'desc');
        }]);

        return Inertia::render('Admin/Properties/Media', [
            'property' => $property,
        ]);
    }

    /**
     * Bulk update property status
     */
    public function bulkStatus(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', Property::class);

        $request->validate([
            'property_ids' => 'required|array',
            'property_ids.*' => 'exists:properties,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $user = $request->user();
        $propertyIds = $request->get('property_ids');
        $status = $request->get('status');

        $query = Property::whereIn('id', $propertyIds);

        // Filter by owner for property owners
        if ($user->role === 'property_owner') {
            $query->byOwner($user->id);
        }

        $updatedCount = $query->update(['status' => $status]);

        return redirect()->route('admin.properties.index')
            ->with('success', "Successfully updated status for {$updatedCount} properties.");
    }

    /**
     * Toggle featured status
     */
    public function toggleFeatured(Property $property): RedirectResponse
    {
        $this->authorize('update', $property);

        $property->update([
            'is_featured' => !$property->is_featured
        ]);

        $status = $property->is_featured ? 'featured' : 'unfeatured';

        return redirect()->back()
            ->with('success', "Property has been {$status} successfully.");
    }

    /**
     * Clone/Duplicate property
     */
    public function duplicate(Property $property): RedirectResponse
    {
        $this->authorize('create', Property::class);

        $newProperty = $property->replicate();
        $newProperty->name = $property->name . ' (Copy)';
        $newProperty->slug = Str::slug($newProperty->name);
        $newProperty->is_featured = false;
        $newProperty->status = 'inactive';
        $newProperty->save();

        // Copy amenities relationship
        $newProperty->amenities()->attach($property->amenities->pluck('id'));

        return redirect()->route('admin.properties.edit', $newProperty->slug)
            ->with('success', 'Property duplicated successfully. Please review and update the details.');
    }

    /**
     * Property analytics/insights
     */
    public function analytics(Property $property): Response
    {
        $this->authorize('view', $property);

        // Get booking analytics for the last 12 months
        $bookingAnalytics = $this->getBookingAnalytics($property);
        $revenueAnalytics = $this->getRevenueAnalytics($property);
        $occupancyAnalytics = $this->getOccupancyAnalytics($property);

        return Inertia::render('Admin/Properties/Analytics', [
            'property' => $property,
            'analytics' => [
                'bookings' => $bookingAnalytics,
                'revenue' => $revenueAnalytics,
                'occupancy' => $occupancyAnalytics,
            ]
        ]);
    }

    /**
     * Get booking analytics
     */
    private function getBookingAnalytics(Property $property): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        
        return $property->bookings()
            ->where('created_at', '>=', $startDate)
            ->selectRaw('
                DATE_FORMAT(created_at, "%Y-%m") as month,
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = "confirmed" THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled_bookings
            ')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    /**
     * Get revenue analytics
     */
    private function getRevenueAnalytics(Property $property): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        
        return $property->bookings()
            ->where('created_at', '>=', $startDate)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('
                DATE_FORMAT(created_at, "%Y-%m") as month,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_booking_value,
                COUNT(*) as booking_count
            ')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    /**
     * Get occupancy analytics
     */
    private function getOccupancyAnalytics(Property $property): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $endDate = now()->endOfMonth();
        
        $monthlyData = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();
            $daysInMonth = $monthStart->daysInMonth;
            
            $bookedDays = $property->bookings()
                ->where('status', '!=', 'cancelled')
                ->where(function($query) use ($monthStart, $monthEnd) {
                    $query->whereBetween('check_in_date', [$monthStart, $monthEnd])
                          ->orWhereBetween('check_out_date', [$monthStart, $monthEnd])
                          ->orWhere(function($q) use ($monthStart, $monthEnd) {
                              $q->where('check_in_date', '<=', $monthStart)
                                ->where('check_out_date', '>=', $monthEnd);
                          });
                })
                ->get()
                ->sum(function($booking) use ($monthStart, $monthEnd) {
                    $start = max($booking->check_in_date, $monthStart);
                    $end = min($booking->check_out_date, $monthEnd);
                    return $start->diffInDays($end);
                });
            
            $occupancyRate = $daysInMonth > 0 ? round(($bookedDays / $daysInMonth) * 100, 2) : 0;
            
            $monthlyData[] = [
                'month' => $current->format('Y-m'),
                'total_days' => $daysInMonth,
                'booked_days' => $bookedDays,
                'occupancy_rate' => $occupancyRate,
            ];
            
            $current->addMonth();
        }
        
        return $monthlyData;
    }
} 
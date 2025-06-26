<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Amenity;
use App\Models\User;
use App\Services\AvailabilityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PropertyController extends Controller
{
    /**
     * Constructor dengan dependency injection untuk AvailabilityService
     */
    public function __construct(private AvailabilityService $availabilityService)
    {
    }

    /**
     * Display a listing of properties (Public)
     */
    public function index(Request $request): Response
    {
        $query = Property::query()
            ->with([
                'owner', 
                'amenities', 
                'media' => function ($query) {
                    $query->orderBy('display_order', 'asc')->orderBy('created_at', 'desc');
                },
                'featuredImages' => function ($query) {
                    $query->orderBy('display_order', 'asc');
                },
                'seasonalRates' => function ($query) {
                    $query->where('is_active', true)
                          ->orderBy('priority', 'desc');
                }
            ])
            ->active();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Filter by amenities
        if ($request->filled('amenities')) {
            $amenityIds = explode(',', $request->get('amenities'));
            $query->whereHas('amenities', function ($q) use ($amenityIds) {
                $q->whereIn('amenities.id', $amenityIds);
            });
        }

        // Filter by capacity
        if ($request->filled('guests')) {
            $guests = $request->get('guests');
            $query->where('capacity_max', '>=', $guests);
        }

        // Filter by availability (date range)
        if ($request->filled('check_in') && $request->filled('check_out')) {
            $checkIn = $request->get('check_in');
            $checkOut = $request->get('check_out');
            
            // Use AvailabilityService untuk filter availability
            $query = $this->availabilityService->filterPropertiesByAvailability($query, $checkIn, $checkOut);
        }

        // Sort options
        $sortBy = $request->get('sort', 'featured');
        switch ($sortBy) {
            case 'price_low':
                $query->orderBy('base_rate', 'asc');
                break;
            case 'price_high':
                $query->orderBy('base_rate', 'desc');
                break;
            case 'name':
                $query->orderBy('name', 'asc');
                break;
            case 'featured':
            default:
                $query->orderBy('is_featured', 'desc')
                      ->orderBy('sort_order', 'asc');
                break;
        }

        $properties = $query->paginate(12);

        // Calculate current rates for each property
        $checkIn = $request->get('check_in', now()->toDateString());
        $checkOut = $request->get('check_out', now()->addDay()->toDateString());
        $guestCount = $request->get('guests', 2);

        // Transform properties with rate calculation menggunakan AvailabilityService
        $properties->getCollection()->transform(function ($property) use ($checkIn, $checkOut, $guestCount) {
            try {
                $rateCalculation = $this->availabilityService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $property->current_rate_calculation = $rateCalculation;
                $property->current_total_rate = $rateCalculation['total_amount'];
                $property->current_rate_per_night = $rateCalculation['total_amount'] / $rateCalculation['nights'];
                $property->formatted_current_rate = 'Rp ' . number_format($property->current_rate_per_night, 0, ',', '.');
                $property->has_seasonal_rate = $rateCalculation['seasonal_premium'] > 0;
                $property->seasonal_rate_info = $rateCalculation['rate_breakdown']['seasonal_rates_applied'] ?? [];
            } catch (\Exception $e) {
                // Fallback to base rate if calculation fails
                $property->current_total_rate = $property->base_rate;
                $property->current_rate_per_night = $property->base_rate;
                $property->formatted_current_rate = $property->formatted_base_rate;
                $property->has_seasonal_rate = false;
                $property->seasonal_rate_info = [];
            }
            return $property;
        });

        // Re-sort based on current rates if price sorting is requested
        if ($sortBy === 'price_low') {
            $sorted = $properties->getCollection()->sortBy('current_rate_per_night')->values();
            $properties->setCollection($sorted);
        } elseif ($sortBy === 'price_high') {
            $sorted = $properties->getCollection()->sortByDesc('current_rate_per_night')->values();
            $properties->setCollection($sorted);
        }

        // Get filter options
        $amenities = Amenity::active()->ordered()->get();
        
        return Inertia::render('Properties/Index', [
            'properties' => $properties,
            'amenities' => $amenities,
            'filters' => [
                'search' => $request->get('search'),
                'amenities' => $request->get('amenities'),
                'guests' => $request->get('guests'),
                'sort' => $sortBy,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
            ]
        ]);
    }

    /**
     * Display the specified property (Public)
     */
    public function show(Request $request, Property $property): Response
    {
        $property->load([
            'owner',
            'amenities' => function ($query) {
                $query->where('property_amenities.is_available', true);
            },
            'media' => function ($query) {
                $query->orderBy('display_order');
            },
            'seasonalRates' => function ($query) {
                $query->where('is_active', true)
                      ->orderBy('priority', 'desc');
            }
        ]);

        // Get search parameters
        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        $guestCount = $request->get('guests', 2);

        // Calculate current rate if dates are provided menggunakan AvailabilityService
        if ($checkIn && $checkOut) {
            try {
                $rateCalculation = $this->availabilityService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $property->current_rate_calculation = $rateCalculation;
                $property->current_total_rate = $rateCalculation['total_amount'];
                $property->current_rate_per_night = $rateCalculation['total_amount'] / $rateCalculation['nights'];
                $property->formatted_current_rate = 'Rp ' . number_format($property->current_rate_per_night, 0, ',', '.');
                $property->has_seasonal_rate = $rateCalculation['seasonal_premium'] > 0;
                $property->seasonal_rate_info = $rateCalculation['rate_breakdown']['seasonal_rates_applied'] ?? [];
                $property->rate_breakdown = $rateCalculation;
            } catch (\Exception $e) {
                // Fallback to base rate if calculation fails
                $property->current_total_rate = $property->base_rate;
                $property->current_rate_per_night = $property->base_rate;
                $property->formatted_current_rate = $property->formatted_base_rate;
                $property->has_seasonal_rate = false;
                $property->seasonal_rate_info = [];
            }
        } else {
            // Get default seasonal rate info for display
            if ($property->seasonalRates->count() > 0) {
                $property->has_seasonal_rate = true;
                $property->seasonal_rate_info = $property->seasonalRates->map(function ($rate) {
                    return [
                        'name' => $rate->rate_name,
                        'description' => $rate->description,
                        'rate_value' => $rate->rate_value,
                        'rate_type' => $rate->rate_type,
                        'start_date' => $rate->start_date,
                        'end_date' => $rate->end_date,
                    ];
                })->toArray();
            } else {
                $property->has_seasonal_rate = false;
                $property->seasonal_rate_info = [];
            }
        }

        // Get similar properties with rate calculation
        $similarProperties = Property::active()
            ->where('id', '!=', $property->id)
            ->where(function ($query) use ($property) {
                $query->whereBetween('base_rate', [
                    $property->base_rate * 0.7,
                    $property->base_rate * 1.3
                ])
                ->orWhere('capacity', $property->capacity);
            })
            ->with(['media' => function ($query) {
                $query->orderBy('display_order');
            }])
            ->limit(4)
            ->get();

        // Calculate rates for similar properties if dates are provided
        if ($checkIn && $checkOut) {
            $similarProperties->transform(function ($similarProperty) use ($checkIn, $checkOut, $guestCount) {
                try {
                    $rateCalculation = $similarProperty->calculateRate($checkIn, $checkOut, $guestCount);
                    $similarProperty->current_rate_per_night = $rateCalculation['total_amount'] / $rateCalculation['nights'];
                    $similarProperty->formatted_current_rate = 'Rp ' . number_format($similarProperty->current_rate_per_night, 0, ',', '.');
                } catch (\Exception $e) {
                    $similarProperty->formatted_current_rate = $similarProperty->formatted_base_rate;
                }
                return $similarProperty;
            });
        }

        return Inertia::render('Properties/Show', [
            'property' => $property,
            'similarProperties' => $similarProperties,
            'searchParams' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guests' => $guestCount,
            ]
        ]);
    }

    /**
     * Property availability check (API)
     */
    public function availability(Request $request, Property $property): JsonResponse
    {
        $request->validate([
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
        ]);

        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');

        // Gunakan AvailabilityService untuk check availability
        $availability = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut);

        return response()->json($availability);
    }

    /**
     * Calculate property rate (API)
     */
    public function calculateRate(Request $request, Property $property): JsonResponse
    {
        $request->validate([
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guest_count' => 'integer|min:1|max:20',
        ]);

        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        $guestCount = $request->get('guest_count', $property->capacity);

        try {
            // Gunakan AvailabilityService untuk calculate rate dengan formatting
            $result = $this->availabilityService->calculateRateFormatted($property, $checkIn, $checkOut, $guestCount);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to calculate rate: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Property search (API)
     */
    public function search(Request $request): JsonResponse
    {
        $query = Property::query()
            ->with(['coverImage'])
            ->active();

        if ($request->filled('q')) {
            $search = $request->get('q');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $properties = $query->limit(10)->get()->map(function ($property) {
            return [
                'id' => $property->id,
                'name' => $property->name,
                'slug' => $property->slug,
                'address' => $property->address,
                'formatted_base_rate' => $property->formatted_base_rate,
                'cover_image' => $property->coverImage->first()?->url,
            ];
        });

        return response()->json(['properties' => $properties]);
    }

    // ADMIN METHODS (Protected routes)

    /**
     * Display admin properties listing
     */
    public function admin_index(Request $request): Response
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
    public function admin_show(Property $property): Response
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'address' => 'required|string',
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
            'seo_description' => 'nullable|string|max:255',
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
        $property->delete();

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property deleted successfully.');
    }

    /**
     * Property media management
     */
    public function media(Property $property): Response
    {
        $property->load(['media' => function ($query) {
            $query->orderBy('display_order', 'asc')
                  ->orderBy('created_at', 'desc');
        }]);

        return Inertia::render('Admin/Properties/Media', [
            'property' => $property,
        ]);
    }

    // Media management methods moved to MediaController
}

<?php

namespace App\Http\Controllers;

use App\Models\Amenity;
use App\Models\Property;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use App\Services\SeoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    /**
     * Constructor dengan dependency injection untuk services
     */
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService,
        private SeoService $seoService
    ) {}

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
                },
            ])
            ->active();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Filter by amenities
        if ($request->filled('amenities')) {
            $amenityIds = explode(',', $request->input('amenities'));
            $query->whereHas('amenities', function ($q) use ($amenityIds) {
                $q->whereIn('amenities.id', $amenityIds);
            });
        }

        // Filter by capacity
        if ($request->filled('guests')) {
            $guests = $request->input('guests');
            $query->where('capacity_max', '>=', $guests);
        }

        // Filter by availability (date range)
        if ($request->filled('check_in') && $request->filled('check_out')) {
            $checkIn = $request->input('check_in');
            $checkOut = $request->input('check_out');

            // Use AvailabilityService untuk filter availability
            $query = $this->availabilityService->filterPropertiesByAvailability($query, $checkIn, $checkOut);
        }

        // Sort options
        $sortBy = $request->input('sort', 'featured');
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

        $properties = $query->paginate(200);

        // Calculate current rates for each property
        $checkIn = $request->input('check_in', now()->toDateString());
        $checkOut = $request->input('check_out', now()->addDay()->toDateString());
        $guestCount = $request->input('guests', 2);

        // Transform properties with rate calculation menggunakan RateCalculationService
        $properties->getCollection()->transform(function ($property) use ($checkIn, $checkOut, $guestCount) {
            try {
                $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $rateCalculationArray = $rateCalculation->toArray();
                $property->current_rate_calculation = $rateCalculationArray;
                $property->current_total_rate = $rateCalculation->totalAmount;
                $property->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
                $property->formatted_current_rate = 'Rp '.number_format($property->current_rate_per_night, 0, ',', '.');
                $property->has_seasonal_rate = $rateCalculation->seasonalPremium > 0;
                $property->seasonal_rate_info = $rateCalculation->breakdown['rate_breakdown']['seasonal_rates_applied'] ?? [];
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

        // Get filter options (Cached)
        $amenities = Cache::remember('active_amenities_ordered', 86400, function () {
            return Amenity::active()->ordered()->get()->toArray();
        });

        // Cache SEO for Properties Index
        $seoData = Cache::remember('seo_properties_index', 86400, function () {
            return $this->seoService->forPropertiesIndex();
        });

        return Inertia::render('Properties/Index', [
            'properties' => $properties,
            'amenities' => $amenities,
            'filters' => [
                'search' => $request->input('search'),
                'amenities' => $request->input('amenities'),
                'guests' => $request->input('guests'),
                'sort' => $sortBy,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
            ],
            'seo' => $seoData,
            'itemListSchema' => Cache::remember('schema_properties_index', 3600, function () use ($properties) {
                return $this->seoService->propertiesIndexSchema($properties->getCollection());
            }),
            'breadcrumbSchema' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Penginapan Yogyakarta', 'item' => route('properties.index')],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    /**
     * Display the specified property (Public)
     *
     * Route: GET /properties/{property:slug}
     * Property is automatically resolved by Laravel's route model binding
     */
    public function show(Request $request, Property $property): Response
    {
        // Cache the relations load for 1 hour to prevent DB hits on refresh
        $cacheKey = "property_show_v2_{$property->id}_relations";
        /** @var Property $property */
        $property = Cache::remember($cacheKey, 3600, function () use ($property) {
            return $property->load([
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
                },
                'approvedReviews' => function ($query) {
                    $query->latest()->limit(3);
                },
            ])->loadCount('approvedReviews')
                ->loadAvg('approvedReviews as rating_avg', 'rating');
        });

        // Get search parameters
        $checkIn = $request->input('check_in') ?: today()->toDateString();
        $checkOut = $request->input('check_out') ?: today()->addDays($property->min_stay_weekday)->toDateString();
        $guestCount = $request->input('guests', 2);

        // Pre-load 3-month availability and rates data
        $startDate = today()->toDateString();
        $endDate = today()->addMonths(3)->toDateString();

        // Use single source of truth for availability and rates (Cached)
        $availCacheKey = "property_v2_{$property->id}_avail_{$startDate}_{$endDate}";
        $availabilityData = Cache::remember($availCacheKey, 3600, function () use ($property, $startDate, $endDate) {
            return $this->availabilityService->getAvailabilityData($property, $startDate, $endDate);
        });

        // Mapping for backward compatibility with frontend if necessary
        $availabilityAndRates = array_merge($availabilityData, [
            'guest_count' => $guestCount,
            'property_info' => $availabilityData['property'],
            'rates' => $availabilityData['availability_data']['rates'],
        ]);

        // Calculate current rate if dates are provided menggunakan RateCalculationService
        if ($checkIn && $checkOut) {
            try {
                $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $rateCalculationArray = $rateCalculation->toArray();
                $property->current_rate_calculation = $rateCalculationArray;
                $property->current_total_rate = $rateCalculation->totalAmount;
                $property->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
                $property->formatted_current_rate = 'Rp '.number_format($property->current_rate_per_night, 0, ',', '.');
                $property->has_seasonal_rate = $rateCalculation->seasonalPremium > 0;
                $property->seasonal_rate_info = $rateCalculation->breakdown['rate_breakdown']['seasonal_rates_applied'] ?? [];
                $property->rate_breakdown = $rateCalculationArray;
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
                    $property->base_rate * 1.3,
                ])
                    ->orWhere('capacity', $property->capacity);
            })
            ->with([
                'media' => function ($query) {
                    $query->orderBy('display_order');
                },
            ])
            ->limit(4)
            ->get();

        // Calculate rates for similar properties if dates are provided
        if ($checkIn && $checkOut) {
            $similarProperties->transform(function ($similarProperty) use ($checkIn, $checkOut, $guestCount) {
                try {
                    $rateCalculation = $this->rateCalculationService->calculateRate($similarProperty, $checkIn, $checkOut, $guestCount);
                    $similarProperty->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
                    $similarProperty->formatted_current_rate = 'Rp '.number_format($similarProperty->current_rate_per_night, 0, ',', '.');
                } catch (\Exception $e) {
                    $similarProperty->formatted_current_rate = $similarProperty->formatted_base_rate;
                }

                return $similarProperty;
            });
        }

        // Cache heavy SEO and Schema generation
        $seoCacheKey = "property_seo_v2_{$property->id}";
        $seoData = Cache::remember($seoCacheKey, 3600, function () use ($property) {
            $faqs = $this->seoService->getPropertyFaqs($property);
            $breadcrumbs = [
                ['name' => 'Home', 'url' => route('home')],
                ['name' => 'Properties', 'url' => route('properties.index')],
                ['name' => $property->name, 'url' => route('properties.show', $property->slug)],
            ];

            return [
                'seo' => $this->seoService->forProperty($property),
                'schema' => $this->seoService->propertySchema($property),
                'faqSchema' => $this->seoService->faqSchema($faqs),
                'breadcrumbSchema' => $this->seoService->breadcrumbSchema($breadcrumbs),
                'videoSchema' => $this->seoService->videoSchema($property),
                'faqs' => $faqs,
            ];
        });

        return Inertia::render('Properties/Show', [
            'property' => $property,
            'similarProperties' => $similarProperties,
            'searchParams' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guests' => $guestCount,
            ],
            'availabilityData' => $availabilityAndRates,
            'seo' => $seoData['seo'],
            'schema' => $seoData['schema'],
            // GEO: Additional schemas for AI optimization
            'faqSchema' => $seoData['faqSchema'],
            'breadcrumbSchema' => $seoData['breadcrumbSchema'],
            'videoSchema' => $seoData['videoSchema'],
            'faqs' => $seoData['faqs'], // For FAQ component
        ]);
    }

    /**
     * Property availability check (API)
     *
     * Route: GET /api/properties/{property:slug}/availability
     * Property is automatically resolved by Laravel's route model binding
     */
    public function availability(Request $request, Property $property): JsonResponse
    {
        $request->validate([
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
        ]);

        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');

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

        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');
        $guestCount = $request->input('guest_count', $property->capacity);

        try {
            $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);

            return response()->json([
                'success' => true,
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp '.number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'weekend_premium' => 'Rp '.number_format($rateCalculation->weekendPremium, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'cleaning_fee' => 'Rp '.number_format($rateCalculation->cleaningFee, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($rateCalculation->totalAmount, 0, ',', '.'),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to calculate rate: '.$e->getMessage(),
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
            $search = $request->input('q');
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

    /**
     * Get all property coordinates for map display (Cached API)
     *
     * Route: GET /api/properties/map-coordinates
     * Returns cached coordinates of all active properties
     */
    public function mapCoordinates(): JsonResponse
    {
        try {
            // Cache key
            $cacheKey = 'properties_map_coordinates';

            // Cache TTL: 1 hour (3600 seconds)
            $cacheTTL = config('cache.performance.property_cache_ttl', 3600);

            // Get from cache or query database
            $coordinates = Cache::remember($cacheKey, $cacheTTL, function () {
                return Property::active()
                    ->whereNotNull('lat')
                    ->whereNotNull('lng')
                    ->where('lat', '>=', -90)
                    ->where('lat', '<=', 90)
                    ->where('lng', '>=', -180)
                    ->where('lng', '<=', 180)
                    ->select('id', 'name', 'slug', 'address', 'lat', 'lng', 'base_rate', 'capacity', 'capacity_max')
                    ->with([
                        'media' => function ($query) {
                            $query->orderByRaw('CASE WHEN is_featured = 1 THEN 0 ELSE 1 END')
                                ->orderBy('display_order', 'asc')
                                ->orderBy('id', 'asc')
                                ->limit(1);
                        },
                    ])
                    ->get()
                    ->map(function ($property) {
                        $firstMedia = $property->media->first();
                        $imageUrl = null;

                        if ($firstMedia) {
                            try {
                                $imageUrl = $firstMedia->url ?? null;
                            } catch (\Exception $e) {
                                \Log::warning('Error getting media URL', [
                                    'property_id' => $property->id,
                                    'media_id' => $firstMedia->id ?? null,
                                    'error' => $e->getMessage(),
                                ]);
                            }
                        }

                        return [
                            'id' => $property->id,
                            'name' => $property->name,
                            'slug' => $property->slug,
                            'address' => $property->address,
                            'lat' => (float) $property->lat,
                            'lng' => (float) $property->lng,
                            'base_rate' => (float) $property->base_rate,
                            'formatted_base_rate' => 'Rp '.number_format((float) $property->base_rate, 0, ',', '.'),
                            'capacity' => (int) $property->capacity,
                            'capacity_max' => (int) $property->capacity_max,
                            'image_url' => $imageUrl,
                        ];
                    });
            });

            return response()->json([
                'success' => true,
                'count' => $coordinates->count(),
                'properties' => $coordinates,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching map coordinates', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch property coordinates',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all active properties with media and amenities (API)
     */
    public function apiIndex(): JsonResponse
    {
        $properties = Property::active()
            ->with(['media', 'amenities'])
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $properties,
        ]);
    }
}

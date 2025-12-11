<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Amenity;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PropertyController extends Controller
{
    /**
     * Constructor dengan dependency injection untuk services
     */
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService
    ) {
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

       $properties = $query->paginate(200);

        // Calculate current rates for each property
        $checkIn = $request->get('check_in', now()->toDateString());
        $checkOut = $request->get('check_out', now()->addDay()->toDateString());
        $guestCount = $request->get('guests', 2);

        // Transform properties with rate calculation menggunakan RateCalculationService
        $properties->getCollection()->transform(function ($property) use ($checkIn, $checkOut, $guestCount) {
            try {
                $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $rateCalculationArray = $rateCalculation->toArray();
                $property->current_rate_calculation = $rateCalculationArray;
                $property->current_total_rate = $rateCalculation->totalAmount;
                $property->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
                $property->formatted_current_rate = 'Rp ' . number_format($property->current_rate_per_night, 0, ',', '.');
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
            ],
            'seo' => [
                'title' => 'Sewa Homestay Terbaik di Yogyakarta - Homsjogja',
                'description' => 'Temukan homestay terbaik di Yogyakarta untuk liburan Anda. Fasilitas lengkap, lokasi strategis, dan harga terjangkau.',
                'image' => asset('logo.svg'),
            ],
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
        $checkIn = $request->get('check_in') ?: today()->toDateString();
        $checkOut = $request->get('check_out') ?: today()->addDays($property->min_stay_weekday)->toDateString();
        $guestCount = $request->get('guests', 2);

        // Pre-load 3-month availability and rates data
        $startDate = today()->toDateString();
        $endDate = today()->addMonths(3)->toDateString();
        
        // Get comprehensive availability data for 3 months
        $bookedDates = $this->availabilityService->getBookedDatesInRange($property, $startDate, $endDate);
        $bookedPeriods = $this->availabilityService->getBookedPeriodsInRange($property, $startDate, $endDate);
        
        // Pre-calculate rates for the entire 3-month period
        $availabilityAndRates = [
            'success' => true,
            'property_id' => $property->id,
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'guest_count' => $guestCount,
            'booked_dates' => $bookedDates,
            'booked_periods' => $bookedPeriods,
            'rates' => [],
            'property_info' => [
                'base_rate' => $property->base_rate,
                'capacity' => $property->capacity,
                'capacity_max' => $property->capacity_max,
                'cleaning_fee' => $property->cleaning_fee,
                'extra_bed_rate' => $property->extra_bed_rate,
                'weekend_premium_percent' => $property->weekend_premium_percent,
                'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
            ]
        ];

        // Calculate rates for each day in the 3-month period
        try {
            $currentDate = \Carbon\Carbon::parse($startDate);
            $endDateCarbon = \Carbon\Carbon::parse($endDate);
            
            while ($currentDate->lte($endDateCarbon)) {
                $dateStr = $currentDate->format('Y-m-d');
                
                // Skip if date is booked
                if (!in_array($dateStr, $bookedDates)) {
                    try {
                        $nextDate = $currentDate->copy()->addDay();
                        $rateResult = $this->rateCalculationService->calculateRate($property, $dateStr, $nextDate->format('Y-m-d'), $guestCount)->toArray();
                        
                        // Get daily breakdown for this specific date
                        $dailyBreakdown = $rateResult['breakdown']['daily_breakdown'] ?? [];
                        $dateDailyData = $dailyBreakdown[$dateStr] ?? null;
                        
                        // Extract seasonal rate info and amounts from daily breakdown
                        $seasonalRateApplied = null;
                        $weekendPremiumAmount = 0;
                        $seasonalPremiumAmount = 0;
                        $extraBedRate = $property->extra_bed_rate;
                        
                        if ($dateDailyData && isset($dateDailyData['seasonal_rate']) && $dateDailyData['seasonal_rate']) {
                            // Get seasonal rate info from daily breakdown (includes min_stay_nights)
                            $seasonalRateData = $dateDailyData['seasonal_rate'];
                            
                            // Also get description from premiums if available
                            $premiums = $dateDailyData['premiums'] ?? [];
                            $seasonalPremium = array_filter($premiums, fn($p) => ($p['type'] ?? '') === 'seasonal');
                            $seasonalPremium = !empty($seasonalPremium) ? array_values($seasonalPremium)[0] : null;
                            
                            // Get seasonal premium amount
                            if ($seasonalPremium) {
                                $seasonalPremiumAmount = $seasonalPremium['amount'] ?? 0;
                            }
                            
                            $seasonalRateApplied = [
                                [
                                    'name' => $seasonalRateData['name'] ?? '',
                                    'type' => $seasonalRateData['type'] ?? '',
                                    'value' => $seasonalRateData['value'] ?? 0,
                                    'min_stay_nights' => $seasonalRateData['min_stay_nights'] ?? null,
                                    'description' => $seasonalPremium['description'] ?? $seasonalRateData['name'] ?? '',
                                ]
                            ];
                            
                            // Get extra bed rate from seasonal rate if available
                            if (isset($seasonalRateData['extra_bed_rate']) && $seasonalRateData['extra_bed_rate'] !== null) {
                                $extraBedRate = $seasonalRateData['extra_bed_rate'];
                            }
                        } elseif (!empty($rateResult['rate_breakdown']['seasonal_rates_applied'])) {
                            // Fallback to aggregated seasonal rates if daily breakdown not available
                            $seasonalRateApplied = $rateResult['rate_breakdown']['seasonal_rates_applied'];
                            $seasonalPremiumAmount = $rateResult['seasonal_premium'] / $rateResult['nights'];
                        }
                        
                        // Get weekend premium amount from premiums
                        if ($dateDailyData && isset($dateDailyData['premiums'])) {
                            $premiums = $dateDailyData['premiums'];
                            $weekendPremium = array_filter($premiums, fn($p) => ($p['type'] ?? '') === 'weekend');
                            if (!empty($weekendPremium)) {
                                $weekendPremium = array_values($weekendPremium)[0];
                                $weekendPremiumAmount = $weekendPremium['amount'] ?? 0;
                            }
                        }
                        
                        $availabilityAndRates['rates'][$dateStr] = [
                            'base_rate' => $property->base_rate,
                            'final_rate' => $dateDailyData['final_rate'] ?? $property->base_rate,
                            'weekend_premium_amount' => $weekendPremiumAmount,
                            'seasonal_premium_amount' => $seasonalPremiumAmount,
                            'seasonal_rate_applied' => $seasonalRateApplied,
                            'is_weekend' => $currentDate->isWeekend(),
                            'has_seasonal_rate' => $seasonalRateApplied !== null,
                            'extra_bed_rate' => $extraBedRate,
                        ];
                    } catch (\Exception $e) {
                        // Skip if rate calculation fails for this date
                    }
                }
                
                $currentDate->addDay();
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to pre-calculate rates for property show', [
                'property_slug' => $property->slug,
                'error' => $e->getMessage()
            ]);
        }

        // Calculate current rate if dates are provided menggunakan RateCalculationService
        if ($checkIn && $checkOut) {
            try {
                $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
                $rateCalculationArray = $rateCalculation->toArray();
                $property->current_rate_calculation = $rateCalculationArray;
                $property->current_total_rate = $rateCalculation->totalAmount;
                $property->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
                $property->formatted_current_rate = 'Rp ' . number_format($property->current_rate_per_night, 0, ',', '.');
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
                    $rateCalculation = $this->rateCalculationService->calculateRate($similarProperty, $checkIn, $checkOut, $guestCount);
                    $similarProperty->current_rate_per_night = $rateCalculation->totalAmount / $rateCalculation->nights;
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
            ],
            'availabilityData' => $availabilityAndRates,
            'seo' => [
                'title' => $property->name . ' - Homsjogja',
                'description' => Str::limit($property->description, 155, '...') ?: "Book {$property->name} at Homsjogja.",
                'image' => $property->media->first()?->url ?? asset('og-image.jpg'),
            ],
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
                    'base_amount' => 'Rp ' . number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'weekend_premium' => 'Rp ' . number_format($rateCalculation->weekendPremium, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'cleaning_fee' => 'Rp ' . number_format($rateCalculation->cleaningFee, 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($rateCalculation->totalAmount, 0, ',', '.'),
                ]
            ]);
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
                    ->with(['media' => function ($query) {
                        $query->orderByRaw('CASE WHEN is_featured = 1 THEN 0 ELSE 1 END')
                              ->orderBy('display_order', 'asc')
                              ->orderBy('id', 'asc')
                              ->limit(1);
                    }])
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
                            'formatted_base_rate' => 'Rp ' . number_format($property->base_rate, 0, ',', '.'),
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

    // Admin methods have been moved to App\Http\Controllers\Admin\PropertyManagementController
}

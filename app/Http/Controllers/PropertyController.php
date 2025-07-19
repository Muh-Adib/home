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

        $properties = $query->paginate(12);

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
            ]
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
                        $rateResult = $property->calculateRate($dateStr, $nextDate->format('Y-m-d'), $guestCount);
                        
                        $availabilityAndRates['rates'][$dateStr] = [
                            'base_rate' => $rateResult['base_amount'] / $rateResult['nights'],
                            'weekend_premium' => $rateResult['weekend_premium'] > 0,
                            'seasonal_premium' => $rateResult['seasonal_premium'] / $rateResult['nights'], // Send actual amount per night
                            'seasonal_rate_applied' => $rateResult['rate_breakdown']['seasonal_rates_applied'] ?? null,
                            'is_weekend' => $currentDate->isWeekend(),
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
            ],
            'availabilityData' => $availabilityAndRates,
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
            $rateCalculation = $property->calculateRate($checkIn, $checkOut, $guestCount);

            return response()->json([
                'success' => true,
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'calculation' => $rateCalculation,
                'formatted' => [
                    'base_amount' => 'Rp ' . number_format($rateCalculation['base_amount'], 0, ',', '.'),
                    'weekend_premium' => 'Rp ' . number_format($rateCalculation['weekend_premium'], 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($rateCalculation['extra_bed_amount'], 0, ',', '.'),
                    'cleaning_fee' => 'Rp ' . number_format($rateCalculation['cleaning_fee'], 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($rateCalculation['total_amount'], 0, ',', '.'),
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

    // Admin methods have been moved to App\Http\Controllers\Admin\PropertyManagementController
}

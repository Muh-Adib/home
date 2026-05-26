<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API v1 — Availability
 *
 * Handles availability checks for single unit and multi-unit search.
 * Used by AI Agent to verify dates before recommending or quoting.
 */
class AvailabilityApiController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService,
    ) {}

    /**
     * POST /api/v1/availability/check
     *
     * Check availability for a single unit.
     * Accepts unit_slug or unit_id.
     */
    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'unit_slug' => 'required_without:unit_id|string',
            'unit_id' => 'required_without:unit_slug|integer',
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'nullable|integer|min:1|max:50',
        ]);

        $property = $request->filled('unit_slug')
            ? Property::active()->where('slug', $request->input('unit_slug'))->firstOrFail()
            : Property::active()->findOrFail($request->integer('unit_id'));

        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');
        $guests = $request->integer('guests', $property->capacity);

        // Validate guest count
        if ($guests > $property->capacity_max) {
            return response()->json([
                'success' => true,
                'data' => [
                    'unit_id' => $property->id,
                    'unit_name' => $property->name,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'available' => false,
                    'reason' => 'CAPACITY_EXCEEDED',
                    'capacity_info' => [
                        'requested' => $guests,
                        'max_guests' => $property->capacity_max,
                    ],
                ],
                'meta' => $this->meta($request),
            ]);
        }

        $availability = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut, $guests);
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));

        if (! $availability['available']) {
            // Find alternative dates
            $nextAvailable = $this->availabilityService->getNextAvailableDates($property, $nights);

            // Find alternative units
            $alternativeUnits = Property::active()
                ->where('id', '!=', $property->id)
                ->where('capacity_max', '>=', $guests)
                ->availableBetween($checkIn, $checkOut)
                ->limit(3)
                ->get(['id', 'slug', 'name', 'base_rate', 'capacity_max'])
                ->map(function ($alt) use ($checkIn, $checkOut, $guests) {
                    try {
                        $calc = $this->rateCalculationService->calculateRate($alt, $checkIn, $checkOut, $guests);

                        return [
                            'unit_id' => $alt->id,
                            'slug' => $alt->slug,
                            'name' => $alt->name,
                            'available' => true,
                            'total_price' => $calc->totalAmount,
                            'formatted_total' => 'Rp '.number_format($calc->totalAmount, 0, ',', '.'),
                        ];
                    } catch (\Throwable) {
                        return [
                            'unit_id' => $alt->id,
                            'slug' => $alt->slug,
                            'name' => $alt->name,
                            'available' => true,
                            'total_price' => (int) $alt->base_rate * $nights,
                        ];
                    }
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'unit_id' => $property->id,
                    'unit_name' => $property->name,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'available' => false,
                    'reason' => 'BOOKED',
                    'blocked_dates' => $availability['booked_dates'],
                    'alternative_dates_suggestion' => $nextAvailable ? [
                        'next_available' => $nextAvailable,
                    ] : null,
                    'alternative_units' => $alternativeUnits,
                ],
                'meta' => $this->meta($request),
            ]);
        }

        // Available — calculate pricing
        try {
            $calc = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guests);
            $calcArray = $calc->toArray();

            $perNightBreakdown = [];
            foreach ($calcArray['breakdown']['daily_breakdown'] ?? [] as $date => $day) {
                $perNightBreakdown[] = [
                    'date' => $date,
                    'price' => $day['final_rate'],
                    'is_weekend' => in_array($day['day_name'], ['Friday', 'Saturday', 'Sunday']),
                    'note' => ! empty($day['premiums']) ? ($day['premiums'][0]['name'] ?? null) : null,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'unit_id' => $property->id,
                    'unit_name' => $property->name,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'nights' => $calc->nights,
                    'guests' => $guests,
                    'available' => true,
                    'capacity_ok' => true,
                    'per_night_breakdown' => $perNightBreakdown,
                    'total_price' => $calc->totalAmount,
                    'formatted_total' => 'Rp '.number_format($calc->totalAmount, 0, ',', '.'),
                    'currency' => 'IDR',
                ],
                'meta' => $this->meta($request),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INTERNAL_CALCULATION_ERROR',
                    'message' => 'Failed to calculate pricing: '.$e->getMessage(),
                ],
            ], 500);
        }
    }

    /**
     * POST /api/v1/availability/search
     *
     * Search all available units matching criteria.
     * Returns sorted list with match scores.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'required|integer|min:1|max:50',
            'filters' => 'nullable|array',
            'filters.location_preference' => 'nullable|array|max:5',
            'filters.max_price_total' => 'nullable|integer|min:0',
            'filters.must_have_facilities' => 'nullable|array|max:10',
            'filters.suitable_for' => 'nullable|string|max:50',
            'sort_by' => 'nullable|in:best_match,price_asc,price_desc,capacity_desc',
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');
        $guests = $request->integer('guests');
        $filters = $request->input('filters', []);
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));

        $query = Property::active()
            ->with(['media' => fn ($q) => $q->orderBy('display_order')->limit(1), 'amenities'])
            ->where('capacity_max', '>=', $guests)
            ->availableBetween($checkIn, $checkOut);

        // Filter: location preference
        if (! empty($filters['location_preference'])) {
            $locations = $filters['location_preference'];
            $query->where(function ($q) use ($locations) {
                foreach ($locations as $loc) {
                    $q->orWhere('address', 'like', "%{$loc}%")
                        ->orWhere('location', 'like', "%{$loc}%");
                }
            });
        }

        // Filter: required facilities
        if (! empty($filters['must_have_facilities'])) {
            foreach ($filters['must_have_facilities'] as $facility) {
                $query->whereHas('amenities', fn ($q) => $q->where('code', $facility)->where('property_amenities.is_available', true));
            }
        }

        $properties = $query->orderByDesc('is_featured')->orderBy('sort_order')->get();

        // Calculate rates and build matches
        $matches = [];
        foreach ($properties as $property) {
            try {
                $calc = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guests);
                $totalPrice = $calc->totalAmount;

                // Filter by max price
                if (! empty($filters['max_price_total']) && $totalPrice > $filters['max_price_total']) {
                    continue;
                }

                // Calculate match score (0-1)
                $matchScore = $this->calculateMatchScore($property, $guests, $filters);
                $matchReasons = $this->buildMatchReasons($property, $guests, $filters);

                $primaryPhoto = $property->media->first();

                $matches[] = [
                    'unit' => [
                        'id' => $property->id,
                        'slug' => $property->slug,
                        'name' => $property->name,
                        'type' => $property->type ?? 'villa',
                        'address' => $property->address,
                        'capacity' => $property->capacity,
                        'max_guests' => $property->capacity_max,
                        'bedrooms' => $property->bedroom_count,
                        'primary_photo' => $primaryPhoto?->url,
                        'url' => route('properties.show', $property->slug),
                    ],
                    'match_score' => $matchScore,
                    'match_reasons' => $matchReasons,
                    'pricing' => [
                        'total_price' => $totalPrice,
                        'nights' => $nights,
                        'per_night_avg' => (int) ($totalPrice / $nights),
                        'formatted_total' => 'Rp '.number_format($totalPrice, 0, ',', '.'),
                        'formatted_per_night' => 'Rp '.number_format((int) ($totalPrice / $nights), 0, ',', '.'),
                        'has_seasonal_rate' => $calc->seasonalPremium > 0,
                    ],
                    'available' => true,
                ];
            } catch (\Throwable) {
                // Skip properties with calculation errors
                continue;
            }
        }

        // Sort
        $sortBy = $request->input('sort_by', 'best_match');
        usort($matches, match ($sortBy) {
            'price_asc' => fn ($a, $b) => $a['pricing']['total_price'] <=> $b['pricing']['total_price'],
            'price_desc' => fn ($a, $b) => $b['pricing']['total_price'] <=> $a['pricing']['total_price'],
            'capacity_desc' => fn ($a, $b) => $b['unit']['max_guests'] <=> $a['unit']['max_guests'],
            default => fn ($a, $b) => $b['match_score'] <=> $a['match_score'],
        });

        $limit = $request->integer('limit', 5);
        $matches = array_slice($matches, 0, $limit);

        // If no matches, suggest alternatives without filters
        $noMatchAlternatives = [];
        if (empty($matches)) {
            $alternatives = Property::active()
                ->where('capacity_max', '>=', $guests)
                ->availableBetween($checkIn, $checkOut)
                ->limit(3)
                ->get(['id', 'slug', 'name', 'base_rate', 'capacity_max']);

            foreach ($alternatives as $alt) {
                try {
                    $calc = $this->rateCalculationService->calculateRate($alt, $checkIn, $checkOut, $guests);
                    $noMatchAlternatives[] = [
                        'unit_id' => $alt->id,
                        'slug' => $alt->slug,
                        'name' => $alt->name,
                        'total_price' => $calc->totalAmount,
                        'formatted_total' => 'Rp '.number_format($calc->totalAmount, 0, ',', '.'),
                    ];
                } catch (\Throwable) {
                    // skip
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'search_criteria' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'nights' => $nights,
                    'guests' => $guests,
                    'filters' => $filters,
                ],
                'matches' => $matches,
                'total_matches' => count($matches),
                'no_match_alternatives' => $noMatchAlternatives,
            ],
            'meta' => $this->meta($request),
        ]);
    }

    private function calculateMatchScore(Property $property, int $guests, array $filters): float
    {
        $score = 0.5; // Base score

        // Capacity fit (closer to requested = better)
        $capacityRatio = $guests / max($property->capacity_max, 1);
        if ($capacityRatio >= 0.5 && $capacityRatio <= 1.0) {
            $score += 0.2;
        }

        // Featured property bonus
        if ($property->is_featured) {
            $score += 0.1;
        }

        // Facility match bonus
        if (! empty($filters['must_have_facilities'])) {
            $facilityCodes = $property->amenities->pluck('code')->toArray();
            $matched = count(array_intersect($filters['must_have_facilities'], $facilityCodes));
            $score += ($matched / count($filters['must_have_facilities'])) * 0.2;
        }

        return min(1.0, round($score, 2));
    }

    private function buildMatchReasons(Property $property, int $guests, array $filters): array
    {
        $reasons = [];

        $reasons[] = "Kapasitas {$property->capacity_max} tamu (diminta: {$guests})";

        if ($property->is_featured) {
            $reasons[] = 'Unit unggulan Homsjogja';
        }

        if (! empty($filters['must_have_facilities'])) {
            $facilityCodes = $property->amenities->pluck('code')->toArray();
            foreach ($filters['must_have_facilities'] as $facility) {
                if (in_array($facility, $facilityCodes)) {
                    $reasons[] = ucfirst(str_replace('_', ' ', $facility)).' tersedia';
                }
            }
        }

        return $reasons;
    }

    private function meta(Request $request): array
    {
        return [
            'request_id' => $request->header('X-Request-Id', uniqid('req_')),
            'timestamp' => now()->toISOString(),
            'api_version' => 'v1',
        ];
    }
}

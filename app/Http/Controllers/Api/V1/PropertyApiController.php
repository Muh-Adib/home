<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API v1 — Properties
 *
 * Provides property catalog data for AI Agent (Mbak Homs).
 * All endpoints require Bearer token authentication.
 */
class PropertyApiController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService,
    ) {}

    /**
     * GET /api/v1/properties
     *
     * List all active properties with optional filters.
     * Supports: location, min_capacity, max_price_per_night, has_facility, limit, sort_by
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'location' => 'nullable|string',
            'min_capacity' => 'nullable|integer|min:1',
            'max_price_per_night' => 'nullable|integer|min:0',
            'has_facility' => 'nullable|array',
            'has_facility.*' => 'string',
            'suitable_for' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:50',
            'sort_by' => 'nullable|in:best_match,price_asc,price_desc,capacity_desc',
            // Optional date context for rate calculation
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date|after:check_in',
            'guests' => 'nullable|integer|min:1',
        ]);

        $query = Property::active()
            ->with(['media' => fn ($q) => $q->orderBy('display_order')->limit(3), 'amenities'])
            ->select([
                'id', 'name', 'slug', 'type', 'description', 'address', 'location',
                'lat', 'lng', 'capacity', 'capacity_max', 'bedroom_count', 'bathroom_count',
                'base_rate', 'weekend_premium_percent', 'cleaning_fee', 'extra_bed_rate',
                'check_in_time', 'check_out_time', 'min_stay_weekday', 'min_stay_weekend',
                'min_stay_peak', 'is_featured', 'amenities', 'house_rules', 'status',
            ]);

        // Filter: location (partial match on address or location field)
        // Escape LIKE wildcards to prevent unintended pattern matching
        if ($request->filled('location')) {
            $location = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->input('location'));
            $query->where(function ($q) use ($location) {
                $q->where('address', 'like', "%{$location}%")
                    ->orWhere('location', 'like', "%{$location}%");
            });
        }

        // Filter: minimum capacity
        if ($request->filled('min_capacity')) {
            $query->where('capacity_max', '>=', $request->integer('min_capacity'));
        }

        // Filter: max price per night (based on base_rate)
        if ($request->filled('max_price_per_night')) {
            $query->where('base_rate', '<=', $request->integer('max_price_per_night'));
        }

        // Filter: required facilities (via amenities relationship)
        if ($request->filled('has_facility')) {
            $facilities = $request->input('has_facility');
            foreach ($facilities as $facility) {
                $query->whereHas('amenities', fn ($q) => $q->where('code', $facility)->where('property_amenities.is_available', true));
            }
        }

        // Filter: suitable_for (stored in amenities or tags — check amenities name)
        if ($request->filled('suitable_for')) {
            $suitableFor = $request->input('suitable_for');
            $query->whereHas('amenities', fn ($q) => $q->where('suitable_for', 'like', "%{$suitableFor}%"));
        }

        // Sort
        $sortBy = $request->input('sort_by', 'best_match');
        match ($sortBy) {
            'price_asc' => $query->orderBy('base_rate', 'asc'),
            'price_desc' => $query->orderBy('base_rate', 'desc'),
            'capacity_desc' => $query->orderBy('capacity_max', 'desc'),
            default => $query->orderByDesc('is_featured')->orderBy('sort_order'),
        };

        $limit = $request->integer('limit', 20);
        $properties = $query->limit($limit)->get();

        // Optional: calculate rates if dates provided
        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');
        $guests = $request->integer('guests', 2);

        $result = $properties->map(fn ($property) => $this->formatPropertySummary($property, $checkIn, $checkOut, $guests));

        return response()->json([
            'success' => true,
            'data' => [
                'properties' => $result,
                'total' => $result->count(),
                'filter_applied' => array_filter([
                    'location' => $request->input('location'),
                    'min_capacity' => $request->input('min_capacity'),
                    'max_price_per_night' => $request->input('max_price_per_night'),
                    'has_facility' => $request->input('has_facility'),
                    'sort_by' => $sortBy,
                ]),
            ],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * GET /api/v1/properties/{slug}
     *
     * Get full detail of a single property.
     */
    public function show(Request $request, Property $property): JsonResponse
    {
        $property->load([
            'amenities' => fn ($q) => $q->where('property_amenities.is_available', true),
            'media' => fn ($q) => $q->orderBy('display_order'),
            'seasonalRates' => fn ($q) => $q->where('is_active', true)->orderByDesc('priority'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatPropertyDetail($property),
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * Format property for list response (summary)
     */
    private function formatPropertySummary(Property $property, ?string $checkIn, ?string $checkOut, int $guests): array
    {
        $primaryPhoto = $property->media->firstWhere('is_cover', true) ?? $property->media->first();

        $data = [
            'id' => $property->id,
            'slug' => $property->slug,
            'name' => $property->name,
            'type' => $property->type ?? 'villa',
            'location' => [
                'area' => $property->location ?? '',
                'address' => $property->address,
                'lat' => (float) $property->lat,
                'lng' => (float) $property->lng,
            ],
            'capacity' => [
                'bedrooms' => $property->bedroom_count,
                'bathrooms' => $property->bathroom_count,
                'standard' => $property->capacity,
                'max_guests' => $property->capacity_max,
            ],
            'pricing' => [
                'base_per_night' => (int) $property->base_rate,
                'currency' => 'IDR',
                'formatted_base' => 'Rp '.number_format((int) $property->base_rate, 0, ',', '.'),
            ],
            'facilities' => $property->amenities->map(fn ($a) => [
                'code' => $a->code ?? $a->slug ?? $a->name,
                'label' => $a->name,
                'category' => $a->category ?? 'general',
            ])->values()->toArray(),
            'primary_photo' => $primaryPhoto?->url,
            'short_summary' => $property->description ? substr($property->description, 0, 200) : null,
            'url' => route('properties.show', $property->slug),
            'rules' => [
                'check_in' => $property->check_in_time,
                'check_out' => $property->check_out_time,
                'min_stay_weekday' => $property->min_stay_weekday,
                'min_stay_weekend' => $property->min_stay_weekend,
            ],
        ];

        // Add rate calculation if dates provided
        if ($checkIn && $checkOut) {
            try {
                $calc = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guests);
                $data['pricing']['calculated'] = [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'nights' => $calc->nights,
                    'total_amount' => $calc->totalAmount,
                    'formatted_total' => 'Rp '.number_format($calc->totalAmount, 0, ',', '.'),
                    'per_night_avg' => (int) ($calc->totalAmount / $calc->nights),
                    'has_seasonal_rate' => $calc->seasonalPremium > 0,
                ];
            } catch (\Throwable) {
                // Silently skip if calculation fails
            }
        }

        return $data;
    }

    /**
     * Format property for detail response (full)
     */
    private function formatPropertyDetail(Property $property): array
    {
        $data = [
            'id' => $property->id,
            'slug' => $property->slug,
            'name' => $property->name,
            'type' => $property->type ?? 'villa',
            'location' => [
                'area' => $property->location ?? '',
                'address' => $property->address,
                'lat' => (float) $property->lat,
                'lng' => (float) $property->lng,
                'maps_link' => $property->maps_link,
            ],
            'capacity' => [
                'bedrooms' => $property->bedroom_count,
                'bathrooms' => $property->bathroom_count,
                'standard' => $property->capacity,
                'max_guests' => $property->capacity_max,
                'extra_bed_available' => (int) $property->extra_bed_rate > 0,
            ],
            'pricing' => [
                'base_per_night' => (int) $property->base_rate,
                'weekend_premium_percent' => $property->weekend_premium_percent,
                'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                'weekend_premium_fixed' => (int) ($property->weekend_premium_fixed ?? 0),
                'cleaning_fee' => (int) $property->cleaning_fee,
                'extra_bed_rate' => (int) $property->extra_bed_rate,
                'currency' => 'IDR',
                'season_rates_available' => $property->seasonalRates->isNotEmpty(),
                'formatted_base' => 'Rp '.number_format((int) $property->base_rate, 0, ',', '.'),
            ],
            'facilities' => $property->amenities->map(fn ($a) => [
                'code' => $a->code ?? $a->slug ?? $a->name,
                'label' => $a->name,
                'category' => $a->category ?? 'general',
            ])->values()->toArray(),
            'rules' => [
                'smoking_allowed' => false,
                'pets_allowed' => false,
                'events_allowed' => false,
                'check_in' => $property->check_in_time,
                'check_out' => $property->check_out_time,
                'min_stay_weekday' => $property->min_stay_weekday,
                'min_stay_weekend' => $property->min_stay_weekend,
                'min_stay_peak' => $property->min_stay_peak,
                'house_rules' => $property->house_rules,
            ],
            'photos' => $property->media->map(fn ($m) => [
                'url' => $m->url,
                'caption' => $m->caption ?? $m->alt_text ?? null,
                'is_primary' => (bool) $m->is_cover,
            ])->values()->toArray(),
            'description_short' => $property->description ? substr($property->description, 0, 200) : null,
            'description_full' => $property->description,
            'url' => route('properties.show', $property->slug),
            'is_active' => $property->status === 'active',
            'updated_at' => $property->updated_at?->toISOString(),
        ];

        // Add seasonal rates info
        if ($property->seasonalRates->isNotEmpty()) {
            $data['seasonal_rates'] = $property->seasonalRates->map(fn ($r) => [
                'name' => $r->name,
                'start_date' => $r->start_date?->format('Y-m-d'),
                'end_date' => $r->end_date?->format('Y-m-d'),
                'rate_type' => $r->rate_type,
                'rate_value' => $r->rate_value,
                'min_stay_nights' => $r->min_stay_nights,
                'description' => $r->getFormattedRateDescription(),
            ])->values()->toArray();
        }

        return $data;
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

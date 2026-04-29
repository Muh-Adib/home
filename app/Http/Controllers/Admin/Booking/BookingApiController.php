<?php

namespace App\Http\Controllers\Admin\Booking;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CalculateRateRequest;
use App\Http\Requests\Admin\CheckAvailabilityRequest;
use App\Http\Requests\Admin\GetPropertyDateRangeRequest;
use App\Http\Requests\Admin\TimelineDataRequest;
use App\Http\Resources\TimelineBookingResource;
use App\Models\Booking;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Services\AvailabilityService;
use App\Services\BookingQueryService;
use App\Services\RateCalculationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingApiController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService,
        private BookingQueryService $bookingQueryService
    ) {}

    /**
     * Get timeline data for infinite scroll (API endpoint for lazy loading)
     */
    public function timelineData(TimelineDataRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $validated = $request->validated();
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'];

            $query = Booking::query()
                ->select([
                    'id',
                    'booking_number',
                    'property_id',
                    'guest_name',
                    'guest_email',
                    'guest_phone',
                    'check_in',
                    'check_out',
                    'nights',
                    'total_amount',
                    'booking_status',
                    'payment_status',
                    'guest_count',
                    'source',
                    'external_id',
                    'external_reservation_url',
                ])
                ->with(['property:id,name,capacity,base_rate']);

            // Filter by property for property owners
            if ($user->role === 'property_owner') {
                $query->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            if (! empty($validated['property_id'])) {
                $query->where('property_id', $validated['property_id']);
            }

            if (! empty($validated['status']) && $validated['status'] !== 'all') {
                $query->where('booking_status', $validated['status']);
            } else {
                $query->where('booking_status', '!=', 'cancelled');
            }

            $query->where('check_out', '>=', $dateFrom)
                ->where('check_in', '<=', $dateTo);

            $bookings = $query->orderBy('check_in')->get();

            return response()->json([
                'success' => true,
                'bookings' => TimelineBookingResource::collection($bookings),
                'date_range' => ['from' => $dateFrom, 'to' => $dateTo],
                'count' => $bookings->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('[Timeline API] Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch timeline data',
                'message' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function timeline(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->addMonths(2)->endOfMonth()->toDateString());

        $bookings = $this->bookingQueryService->getTimelineBookings(
            startDate: $startDate,
            endDate: $endDate,
            propertyId: $request->input('property_id'),
            status: $request->input('status'),
            user: $request->user()
        );

        return response()->json([
            'bookings' => TimelineBookingResource::collection($bookings),
            'date_range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'bookings' => [],
                'count' => 0,
            ]);
        }

        $user = $request->user();

        $bookings = Booking::query()
            ->select([
                'id',
                'booking_number',
                'guest_name',
                'guest_email',
                'guest_phone',
                'check_in',
                'check_out',
                'total_amount',
                'booking_status',
                'payment_status',
                'property_id',
                'external_reservation_url',
                'created_at',
            ])
            ->with('property:id,name');

        if ($user->role === 'property_owner') {
            $bookings->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        $bookings->where(function ($q) use ($query) {
            $q->where('booking_number', 'LIKE', "%{$query}%")
                ->orWhere('guest_name', 'LIKE', "%{$query}%")
                ->orWhere('guest_email', 'LIKE', "%{$query}%")
                ->orWhere('guest_phone', 'LIKE', "%{$query}%");
        });

        $bookings->where('booking_status', '!=', 'cancelled');

        $results = $bookings->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'bookings' => $results,
            'count' => $results->count(),
        ]);
    }

    public function checkAvailability(CheckAvailabilityRequest $request): JsonResponse
    {
        $property = Property::findOrFail($request->property_id);
        $excludeBookingId = $request->input('exclude_booking_id');

        $availabilityData = $this->availabilityService->checkAvailability(
            $property,
            $request->check_in,
            $request->check_out,
            $excludeBookingId
        );

        return response()->json([
            'available' => $availabilityData['available'],
            'property_id' => $property->id,
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
            'booked_dates' => $availabilityData['booked_dates'] ?? [],
            'booked_periods' => $availabilityData['booked_periods'] ?? [],
        ]);
    }

    public function calculateRate(CalculateRateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                $validated['guest_count']
            );

            return response()->json([
                'success' => true,
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp '.number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($rateCalculation->totalAmount, 0, ',', '.'),
                ],
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID '.($validated['property_id'] ?? 'unknown').' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to calculate rate: '.$e->getMessage(),
            ], 400);
        }
    }

    public function availabilityAndRates(CalculateRateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            $availability = $this->availabilityService->checkAvailability(
                $property,
                $validated['check_in'],
                $validated['check_out']
            );

            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                (int) $validated['guest_count']
            );

            return response()->json([
                'success' => true,
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                    'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                ],
                'date_range' => [
                    'start' => $validated['check_in'],
                    'end' => $validated['check_out'],
                ],
                'guest_count' => (int) $validated['guest_count'],
                'availability' => $availability,
                'booked_dates' => $availability['booked_dates'] ?? [],
                'booked_periods' => $availability['booked_periods'] ?? [],
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp '.number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($rateCalculation->totalAmount, 0, ',', '.'),
                    'per_night' => 'Rp '.number_format(($rateCalculation->totalAmount / max($rateCalculation->nights, 1)), 0, ',', '.'),
                ],
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID '.($validated['property_id'] ?? 'unknown').' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to get availability and rates: '.$e->getMessage(),
            ], 400);
        }
    }

    public function getPropertyDateRange(GetPropertyDateRangeRequest $request): JsonResponse
    {
        $property = Property::findOrFail($request->property_id);

        // Accept both 'start_date'/'end_date' and 'start'/'end' (sent by BookingForm)
        $startDate = $request->input('start_date') ?? $request->input('start', now()->toDateString());
        $endDate   = $request->input('end_date')   ?? $request->input('end',   now()->addMonths(3)->toDateString());

        try {
            $availability = $this->availabilityService->checkAvailability($property, $startDate, $endDate);
            $bookedDates = $this->availabilityService->getBookedDatesInRange($property, $startDate, $endDate);
            $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
                $property->id,
                Carbon::parse($startDate),
                Carbon::parse($endDate)
            );

            return response()->json([
                'success' => true,
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                    'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                ],
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                ],
                'booked_dates' => $bookedDates,
                'availability_data' => $availability,
                'seasonal_rates' => $seasonalRates,
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get property date range data',
            ], 500);
        }
    }
}

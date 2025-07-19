<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Services\RateService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Validator;

/**
 * RateManagementController - Controller untuk mengelola tarif properti
 * 
 * Controller ini menangani:
 * - CRUD seasonal rates
 * - Base rate management
 * - Bulk rate updates
 * - Rate calendar view
 * 
 * Menggunakan RateService untuk semua operasi tarif
 */
class RateManagementController extends Controller
{
    public function __construct(
        private RateService $rateService
    ) {}

    /**
     * Show rate management dashboard
     */
    public function index(Request $request): Response
    {
        $properties = Property::with(['seasonalRates' => function ($query) {
            $query->where('is_active', true)->orderBy('start_date');
        }])->paginate(10);

        return Inertia::render('Admin/RateManagement/Index', [
            'properties' => $properties,
        ]);
    }

    /**
     * Show rate management for specific property
     */
    public function show(Property $property): Response
    {
        $seasonalRates = $this->rateService->getSeasonalRates($property);
        
        // Get rate calendar for current month + next 5 months
        $currentMonth = now()->format('Y-m');
        $rateCalendar = $this->rateService->getRateCalendar($property, $currentMonth, 6);

        return Inertia::render('Admin/RateManagement/Show', [
            'property' => $property,
            'seasonalRates' => $seasonalRates,
            'rateCalendar' => $rateCalendar,
        ]);
    }

    /**
     * Create new seasonal rate
     */
    public function createSeasonalRate(Request $request, Property $property): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
            'rate_type' => 'required|in:fixed,percentage',
            'rate_value' => 'required|numeric|min:0',
            'min_stay_nights' => 'nullable|integer|min:1',
            'applies_to_weekends_only' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $seasonalRate = $this->rateService->createSeasonalRate($property, $validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Seasonal rate created successfully',
                'data' => $seasonalRate,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update seasonal rate
     */
    public function updateSeasonalRate(Request $request, PropertySeasonalRate $seasonalRate): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'rate_type' => 'required|in:fixed,percentage',
            'rate_value' => 'required|numeric|min:0',
            'min_stay_nights' => 'nullable|integer|min:1',
            'applies_to_weekends_only' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updatedRate = $this->rateService->updateSeasonalRate($seasonalRate, $validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Seasonal rate updated successfully',
                'data' => $updatedRate,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete seasonal rate
     */
    public function deleteSeasonalRate(PropertySeasonalRate $seasonalRate): JsonResponse
    {
        try {
            $this->rateService->deleteSeasonalRate($seasonalRate);

            return response()->json([
                'success' => true,
                'message' => 'Seasonal rate deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update base rates
     */
    public function updateBaseRates(Request $request, Property $property): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'base_rate' => 'nullable|numeric|min:0',
            'weekend_premium_percent' => 'nullable|numeric|min:0|max:100',
            'cleaning_fee' => 'nullable|numeric|min:0',
            'extra_bed_rate' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $validator->validated();
            $updatedProperty = $property;

            if (isset($data['base_rate'])) {
                $updatedProperty = $this->rateService->updateBaseRate($updatedProperty, $data['base_rate']);
            }

            if (isset($data['weekend_premium_percent'])) {
                $updatedProperty = $this->rateService->updateWeekendPremium($updatedProperty, $data['weekend_premium_percent']);
            }

            if (isset($data['cleaning_fee'])) {
                $updatedProperty = $this->rateService->updateCleaningFee($updatedProperty, $data['cleaning_fee']);
            }

            if (isset($data['extra_bed_rate'])) {
                $updatedProperty = $this->rateService->updateExtraBedRate($updatedProperty, $data['extra_bed_rate']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Base rates updated successfully',
                'data' => $updatedProperty,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Bulk update rates
     */
    public function bulkUpdateRates(Request $request, Property $property): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'updates' => 'required|array',
            'updates.*.type' => 'required|in:base_rate,weekend_premium,seasonal_rate',
            'updates.*.value' => 'required_unless:updates.*.type,seasonal_rate|numeric|min:0',
            'updates.*.id' => 'nullable|integer|exists:property_seasonal_rates,id',
            'updates.*.data' => 'required_if:updates.*.type,seasonal_rate|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $results = $this->rateService->bulkUpdateRates($property, $request->get('updates'));

            $allSuccess = collect($results)->every(fn($result) => $result['success']);
            $successCount = collect($results)->where('success', true)->count();
            $totalCount = count($results);

            return response()->json([
                'success' => $allSuccess,
                'message' => $allSuccess 
                    ? 'All updates completed successfully'
                    : "Completed {$successCount}/{$totalCount} updates",
                'results' => $results,
            ], $allSuccess ? 200 : 207); // 207 = Multi-Status
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get rate calendar for specific month
     */
    public function getRateCalendar(Request $request, Property $property): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'start_month' => 'required|date_format:Y-m',
            'months_count' => 'nullable|integer|min:1|max:12',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $startMonth = $request->get('start_month');
        $monthsCount = $request->get('months_count', 6);

        $calendar = $this->rateService->getRateCalendar($property, $startMonth, $monthsCount);

        return response()->json([
            'success' => true,
            'data' => $calendar,
        ]);
    }
}
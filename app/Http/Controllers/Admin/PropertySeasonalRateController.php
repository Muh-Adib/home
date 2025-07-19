<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Services\RateCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PropertySeasonalRateController extends Controller
{
    public function __construct(
        private RateCalculationService $rateCalculationService
    ) {}

    /**
     * Display seasonal rates for a property
     */
    public function index(Property $property): Response
    {
        $this->authorize('view', $property);

        $seasonalRates = $property->seasonalRates()
            ->orderBy('priority', 'desc')
            ->orderBy('start_date', 'asc')
            ->get();

        return Inertia::render('Admin/Properties/SeasonalRates/Index', [
            'property' => $property,
            'seasonalRates' => $seasonalRates,
        ]);
    }

    /**
     * Store a newly created seasonal rate
     */
    public function store(Request $request, Property $property): RedirectResponse
    {
        $this->authorize('update', $property);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
            'rate_type' => 'required|in:percentage,fixed,multiplier',
            'rate_value' => 'required|numeric|min:0',
            'min_stay_nights' => 'required|integer|min:1',
            'applies_to_weekends_only' => 'boolean',
            'is_active' => 'boolean',
            'priority' => 'required|integer|min:0|max:100',
            'description' => 'nullable|string',
            'applicable_days' => 'nullable|array',
            'applicable_days.*' => 'integer|min:0|max:6',
        ]);

        $validated['property_id'] = $property->id;
        PropertySeasonalRate::create($validated);

        return redirect()->route('admin.properties.seasonal-rates.index', $property)
            ->with('success', 'Seasonal rate created successfully.');
    }

    /**
     * Update the specified seasonal rate
     */
    public function update(Request $request, Property $property, PropertySeasonalRate $seasonalRate): RedirectResponse
    {
        $this->authorize('update', $property);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'rate_type' => 'required|in:percentage,fixed,multiplier',
            'rate_value' => 'required|numeric|min:0',
            'min_stay_nights' => 'required|integer|min:1',
            'applies_to_weekends_only' => 'boolean',
            'is_active' => 'boolean',
            'priority' => 'required|integer|min:0|max:100',
            'description' => 'nullable|string',
            'applicable_days' => 'nullable|array',
            'applicable_days.*' => 'integer|min:0|max:6',
        ]);

        $seasonalRate->update($validated);

        return redirect()->route('admin.properties.seasonal-rates.index', $property)
            ->with('success', 'Seasonal rate updated successfully.');
    }

    /**
     * Remove the specified seasonal rate
     */
    public function destroy(Property $property, PropertySeasonalRate $seasonalRate): RedirectResponse
    {
        $this->authorize('update', $property);

        $seasonalRate->delete();

        return redirect()->route('admin.properties.seasonal-rates.index', $property)
            ->with('success', 'Seasonal rate deleted successfully.');
    }

    /**
     * Preview rate calculation for date range
     */
    public function preview(Request $request, Property $property)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'guest_count' => 'integer|min:1|max:20',
        ]);

        $guestCount = $request->get('guest_count', $property->capacity);
        
        try {
            $calculation = $this->rateCalculationService->calculateRate(
                $property,
                $request->get('start_date'),
                $request->get('end_date'),
                $guestCount
            );

            return response()->json([
                'success' => true,
                'calculation' => $calculation->toArray(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }
} 

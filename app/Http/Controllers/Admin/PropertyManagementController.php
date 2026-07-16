<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Amenity;
use App\Models\BankAccount;
use App\Models\Income;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\PropertyFinancialService;
use App\Services\PropertyMediaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PropertyManagementController extends Controller
{
    /**
     * Constructor dengan dependency injection untuk AvailabilityService
     */
    public function __construct(
        private AvailabilityService $availabilityService,
        private PropertyMediaService $mediaService,
        private PropertyFinancialService $financialService
    ) {}

    /**
     * Display admin properties listing
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Property::class);

        $user = $request->user();

        $query = Property::query()
            ->with([
                'owner',
                'media',
                'bookings' => function ($q) {
                    $q->whereIn('booking_status', ['confirmed', 'checked_in']);
                },
            ]);

        // Filter by owner for property owners
        if ($user->role === 'property_owner') {
            $query->byOwner($user->id);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Sorting
        if ($request->filled('sort')) {
            $sort = $request->input('sort');
            $sortParts = explode('_', $sort);
            if (count($sortParts) === 2) {
                $field = $sortParts[0];
                $direction = $sortParts[1];

                $allowedFields = ['name', 'address', 'base_rate', 'created_at'];
                $allowedDirections = ['asc', 'desc'];

                if (in_array($field, $allowedFields) && in_array($direction, $allowedDirections)) {
                    $query->orderBy($field, $direction);
                }
            }
        } else {
            // Default sorting by name ascending
            $query->orderBy('name', 'asc');
        }

        $properties = $query->paginate(20);

        return Inertia::render('Admin/Properties/Index', [
            'properties' => $properties,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'sort' => $request->input('sort'),
            ],
        ]);
    }

    /**
     * Show the form for creating a new property
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', Property::class);

        if ($request->user()->hasRole('super_admin')) {
            $owners = User::where('role', 'property_owner')->get();
        } else {
            $owners = null;
        }

        $amenities = Amenity::active()->ordered()->get();
        $bankAccounts = BankAccount::all()->map(function ($acc) {
            return [
                'id' => $acc->id,
                'bank_name' => $acc->bank_name,
                'account_number' => $acc->account_number,
                'account_holder' => $acc->account_holder,
                'label' => $acc->label ?? ($acc->bank_name.' - '.$acc->account_number),
                'payment_method_id' => $acc->payment_method_id,
            ];
        });

        $paymentMethods = PaymentMethod::where('type', 'bank_transfer')->active()->get();

        return Inertia::render('Admin/Properties/Create', [
            'amenities' => $amenities,
            'owners' => $owners,
            'bankAccounts' => $bankAccounts,
            'paymentMethods' => $paymentMethods,
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
            'type' => 'required|in:homestay,villa,apartment,hotel',
            'description' => 'required|string',
            'address' => 'required|string',
            'location' => 'required|in:selatan,utara',
            'maps_link' => 'nullable|string',
            'tiktok_video_url' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) {
                    if ($value && ! preg_match('/(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/(?:@[\w.]+)?\/?video\/(\d+)|(?:https?:\/\/)?(?:vm\.tiktok\.com)\/([\w]+)/i', $value)) {
                        $fail('URL TikTok tidak valid. Format yang didukung: https://www.tiktok.com/@username/video/... atau https://vm.tiktok.com/...');
                    }
                },
            ],
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'capacity' => 'required|integer|min:1',
            'capacity_max' => 'required|integer|gte:capacity',
            'bedroom_count' => 'required|integer|min:1',
            'bathroom_count' => 'required|integer|min:1',
            'base_rate' => 'required|numeric|min:0',
            'weekend_premium_percent' => 'required|numeric|min:0|max:100',
            'weekend_premium_type' => 'required|in:percentage,fixed',
            'weekend_premium_fixed' => 'nullable|numeric|min:0|required_if:weekend_premium_type,fixed',
            'cleaning_fee' => 'nullable|numeric|min:0',
            'extra_bed_rate' => 'required|numeric|min:0',
            'house_rules' => 'nullable|string',
            'check_in_time' => 'required|date_format:H:i',
            'check_out_time' => 'required|date_format:H:i',
            'min_stay_weekday' => 'required|integer|min:1',
            'min_stay_weekend' => 'required|integer|min:1',
            'min_stay_peak' => 'required|integer|min:1',
            'is_featured' => 'boolean',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'ownership_model' => 'required|in:owned,rented,partnership',
            'initial_build_capital' => 'nullable|numeric|min:0',
            'lease_capital' => 'nullable|numeric|min:0',
            'monthly_rent_cost' => 'nullable|numeric|min:0',
            'monthly_mortgage_cost' => 'nullable|numeric|min:0',
            'mortgage_interest_monthly' => 'nullable|numeric|min:0',
            'owner_split_pct' => 'nullable|numeric|min:0|max:100',
            'investor_split_pct' => 'nullable|numeric|min:0|max:100',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string|max:255',
            'amenities' => 'array',
            'amenities.*' => 'exists:amenities,id',
            'current_keybox_code' => 'nullable|string|size:3',
            'checkin_instructions' => 'nullable|array',
            'checkin_instructions.welcome' => 'nullable|string|max:500',
            'checkin_instructions.keybox_location' => 'nullable|string|max:500',
            'checkin_instructions.keybox_code' => 'nullable|string|max:500',
            'checkin_instructions.checkin_time' => 'nullable|string|max:200',
            'checkin_instructions.emergency_contact' => 'nullable|string|max:200',
            'checkin_instructions.wifi_name' => 'nullable|string|max:100',
            'checkin_instructions.wifi_password' => 'nullable|string|max:100',
            'checkin_instructions.additional_info' => 'nullable|array',
            'checkin_instructions.additional_info.*' => 'string|max:300',
            'ical_import_urls' => 'nullable|array',
            'ical_import_urls.*' => 'nullable|url|max:500',
            'files' => 'nullable|array|max:50',
            'files.*' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,mp4,mov,avi,webm',
                'max:102400',
                function ($attribute, $value, $fail) {
                    if ($value->getMimeType() && str_starts_with($value->getMimeType(), 'image/')) {
                        if (! $this->mediaService->isValidImageFile($value)) {
                            $fail('The '.$attribute.' contains invalid or potentially dangerous content.');
                        }
                        $imageInfo = @getimagesize($value->getRealPath());
                        if ($imageInfo) {
                            [$width, $height] = $imageInfo;
                            if ($width < 100 || $height < 100 || $width > 8192 || $height > 8192) {
                                $fail('Images must be between 100x100 and 8192x8192 pixels.');
                            }
                        }
                    }
                },
            ],
        ];

        // Only super_admin can assign owner_id, property_owner creates for themselves
        if ($user->hasRole('super_admin')) {
            $validationRules['owner_id'] = 'required|string';
        }

        $validated = $request->validate($validationRules);
        $validated['cleaning_fee'] = 0;

        // Set owner_id based on user role
        if ($user->hasRole('property_owner')) {
            $validated['owner_id'] = $user->id;
        } elseif ($user->hasRole('super_admin')) {
            if ($request->input('owner_id') === 'auto') {
                // Auto-assign to the first available property owner
                $firstOwner = User::where('role', 'property_owner')->first();
                $validated['owner_id'] = $firstOwner ? $firstOwner->id : $user->id;
            } else {
                $validated['owner_id'] = $request->input('owner_id');
            }
        } else {
            $validated['owner_id'] = $user->id;
        }

        // Generate slug
        $validated['slug'] = Str::slug($validated['name']);

        $property = Property::create($validated);

        // Attach amenities
        if ($request->filled('amenities')) {
            $property->amenities()->attach($request->input('amenities'));
        }

        // Store media files if uploaded
        if ($request->hasFile('files')) {
            try {
                $this->mediaService->storeMedia($request->file('files'), $property);
            } catch (\Exception $e) {
                \Log::error('Failed to upload media during property creation', [
                    'property_id' => $property->id,
                    'error' => $e->getMessage(),
                ]);

                return redirect()->route('admin.properties.index')
                    ->with('success', 'Property created successfully, but some media files failed to upload: '.$e->getMessage());
            }
        }

        // Invalidate map coordinates cache
        Cache::forget('properties_map_coordinates');

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property created successfully.');
    }

    /**
     * Display the specified property (Admin)
     */
    public function show(Property $property): Response
    {
        $this->authorize('view', $property);

        try {
            $property->load([
                'owner',
                'amenities',
                'bankAccount',
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
                },
            ]);

            // Calculate BEP / Cumulative Net Profit
            $allTimeIncome = Income::where('property_id', $property->id)->sum('amount');
            $allTimeExpense = PropertyExpense::where('property_id', $property->id)->sum('amount');

            $firstTxDate = Income::where('property_id', $property->id)->min('income_date')
                ?? (optional($property->created_at)->toDateString() ?? now()->toDateString());
            $monthsSinceStart = max(1, round(Carbon::parse($firstTxDate)->diffInMonths(now())));

            $allTimeRentOrInterest = 0;
            if ($property->ownership_model === 'rented') {
                $allTimeRentOrInterest = $property->monthly_rent_cost * $monthsSinceStart;
            } elseif ($property->ownership_model === 'owned') {
                $allTimeRentOrInterest = $property->mortgage_interest_monthly * $monthsSinceStart;
            }

            $cumulativeProfit = $allTimeIncome - $allTimeExpense - $allTimeRentOrInterest;
            $capital = $property->initial_build_capital + $property->lease_capital;
            $bepPct = $capital > 0 ? ($cumulativeProfit / $capital) * 100 : 0;
            $avgMonthlyProfit = $monthsSinceStart > 0 ? ($cumulativeProfit / $monthsSinceStart) : 0;
            $remainingMonths = ($avgMonthlyProfit > 0 && $cumulativeProfit < $capital) ? round(($capital - $cumulativeProfit) / $avgMonthlyProfit, 1) : 0;

            $bepData = [
                'initial_build_capital' => (int) $property->initial_build_capital,
                'lease_capital' => (int) $property->lease_capital,
                'total_capital' => (int) $capital,
                'cumulative_profit' => (float) $cumulativeProfit,
                'bep_percentage' => round($bepPct, 1),
                'avg_monthly_profit' => round($avgMonthlyProfit, 1),
                'remaining_months' => $remainingMonths,
                'all_time_income' => (float) $allTimeIncome,
                'all_time_expense' => (float) $allTimeExpense,
            ];

            // Calculate property statistics with error handling
            $stats = [
                'total_bookings' => $property->bookings()->count() ?? 0,
                'confirmed_bookings' => $property->bookings()->where('booking_status', 'confirmed')->count() ?? 0,
                'total_revenue' => $property->bookings()
                    ->where('booking_status', '!=', 'cancelled')
                    ->sum('total_amount') ?? 0,
                'average_rating' => $property->reviews()->avg('rating') ?? 0,
                'occupancy_rate' => $this->calculateOccupancyRate($property),
                'bep_data' => $bepData,
            ];

            // Ensure all required data exists with defaults
            $propertyData = [
                'id' => $property->id,
                'name' => $property->name ?? 'Unnamed Property',
                'slug' => $property->slug ?? '',
                'description' => $property->description ?? '',
                'address' => $property->address ?? '',
                'capacity' => $property->capacity ?? 1,
                'capacity_max' => $property->capacity_max ?? $property->capacity ?? 1,
                'bedroom_count' => $property->bedroom_count ?? 1,
                'bathroom_count' => $property->bathroom_count ?? 1,
                'base_rate' => $property->base_rate ?? 0,
                'weekend_premium_percent' => $property->weekend_premium_percent ?? 0,
                'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                'cleaning_fee' => $property->cleaning_fee ?? 0,
                'extra_bed_rate' => $property->extra_bed_rate ?? 0,
                'check_in_time' => $property->check_in_time ?? '15:00',
                'check_out_time' => $property->check_out_time ?? '11:00',
                'min_stay_weekday' => $property->min_stay_weekday ?? 1,
                'min_stay_weekend' => $property->min_stay_weekend ?? 1,
                'min_stay_peak' => $property->min_stay_peak ?? 1,
                'house_rules' => $property->house_rules ?? '',
                'status' => $property->status ?? 'inactive',
                'is_featured' => $property->is_featured ?? false,
                'seo_title' => $property->seo_title ?? '',
                'seo_description' => $property->seo_description ?? '',
                'owner' => $property->owner ?? null,
                'amenities' => $property->getRelation('amenities') ?? [],
                'media' => $property->media ?? [],
                'bookings' => $property->bookings ?? [],
                'seasonalRates' => $property->seasonalRates ?? [],
                'initial_build_capital' => (int) $property->initial_build_capital,
                'lease_capital' => (int) $property->lease_capital,
                'current_keybox_code' => $property->current_keybox_code ?? '',
                'checkin_instructions' => $property->checkin_instructions ?? null,
                'ical_import_urls' => $property->ical_import_urls ?? [],
                'ical_export_token' => $property->ical_export_token ?? '',
                'bank_account_id' => $property->bank_account_id,
                'bank_account' => $property->bankAccount,
            ];

            return Inertia::render('Admin/Properties/Show', [
                'property' => $propertyData,
                'stats' => $stats,
            ]);

        } catch (\Exception $e) {
            // Log error and return with safe defaults
            \Log::error('Error loading property data: '.$e->getMessage());

            return Inertia::render('Admin/Properties/Show', [
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name ?? 'Property',
                    'slug' => $property->slug ?? '',
                    'description' => 'Error loading property details',
                    'address' => $property->address ?? '',
                    'capacity' => 1,
                    'capacity_max' => 1,
                    'bedroom_count' => 1,
                    'bathroom_count' => 1,
                    'base_rate' => 0,
                    'weekend_premium_percent' => 0,
                    'weekend_premium_type' => 'percentage',
                    'weekend_premium_fixed' => 0,
                    'cleaning_fee' => 0,
                    'extra_bed_rate' => 0,
                    'check_in_time' => '15:00',
                    'check_out_time' => '11:00',
                    'min_stay_weekday' => 1,
                    'min_stay_weekend' => 1,
                    'min_stay_peak' => 1,
                    'house_rules' => '',
                    'status' => 'inactive',
                    'is_featured' => false,
                    'seo_title' => '',
                    'seo_description' => '',
                    'owner' => null,
                    'amenities' => [],
                    'media' => [],
                    'bookings' => [],
                    'seasonalRates' => [],
                    'current_keybox_code' => '',
                    'checkin_instructions' => null,
                    'ical_import_urls' => [],
                    'ical_export_token' => '',
                    'bank_account' => null,
                ],
                'stats' => [
                    'total_bookings' => 0,
                    'confirmed_bookings' => 0,
                    'total_revenue' => 0,
                    'average_rating' => 0,
                    'occupancy_rate' => 0,
                ],
            ]);
        }
    }

    /**
     * Financial Dashboard for a property (ROI, BEP, revenue trends).
     * Access: super_admin, property_manager, property_owner (own properties).
     */
    public function financial(Request $request, Property $property): Response
    {
        $this->authorize('viewFinancials', $property);

        $period = $request->input('period', '12m');
        $financialData = $this->financialService->getFinancialData($property, $period);

        return Inertia::render('Admin/Properties/Financial', [
            'property' => [
                'id' => $property->id,
                'name' => $property->name,
                'slug' => $property->slug,
                'address' => $property->address,
                'status' => $property->status,
                'base_rate' => (int) $property->base_rate,
                'ownership_model' => $property->ownership_model,
                'owner_split_pct' => (float) $property->owner_split_pct,
                'investor_split_pct' => (float) $property->investor_split_pct,
                'initial_build_capital' => (int) $property->initial_build_capital,
                'lease_capital' => (int) $property->lease_capital,
                'monthly_rent_cost' => (int) $property->monthly_rent_cost,
                'monthly_mortgage_cost' => (int) $property->monthly_mortgage_cost,
                'mortgage_interest_monthly' => (int) $property->mortgage_interest_monthly,
                'owner' => $property->owner,
            ],
            'financial' => $financialData,
            'period' => $period,
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
            ->where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate])
            ->get()
            ->sum(function ($booking) {
                return $booking->check_in->diffInDays($booking->check_out);
            });

        return $totalDays > 0 ? round(($bookedDays / $totalDays) * 100, 2) : 0;
    }

    /**
     * Show the form for editing the specified property
     */
    public function edit(Request $request, Property $property): Response
    {
        $this->authorize('update', $property);

        $property->load(['amenities', 'media']);
        $amenities = Amenity::active()->ordered()->get();
        $bankAccounts = BankAccount::all()->map(function ($acc) {
            return [
                'id' => $acc->id,
                'bank_name' => $acc->bank_name,
                'account_number' => $acc->account_number,
                'account_holder' => $acc->account_holder,
                'label' => $acc->label ?? ($acc->bank_name.' - '.$acc->account_number),
                'payment_method_id' => $acc->payment_method_id,
            ];
        });

        $paymentMethods = PaymentMethod::where('type', 'bank_transfer')->active()->get();

        // Pass owners for super_admin (same as create)
        $owners = $request->user()->hasRole('super_admin')
            ? User::where('role', 'property_owner')->get()
            : null;

        return Inertia::render('Admin/Properties/Edit', [
            'property' => $property,
            'amenities' => $amenities,
            'owners' => $owners,
            'bankAccounts' => $bankAccounts,
            'paymentMethods' => $paymentMethods,
            'defaultCheckinTemplate' => Property::getDefaultCheckinInstructionsTemplate(),
            'currentKeyboxInfo' => [
                'code' => $property->current_keybox_code,
                'last_updated' => $property->keybox_updated_at,
                'updated_by' => $property->keyboxUpdatedBy?->name,
            ],
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
            'type' => 'required|in:homestay,villa,apartment,hotel',
            'description' => 'required|string',
            'address' => 'required|string',
            'location' => 'required|in:selatan,utara',
            'maps_link' => 'nullable|string',
            'tiktok_video_url' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) {
                    if ($value && ! preg_match('/(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/(?:@[\w.]+)?\/?video\/(\d+)|(?:https?:\/\/)?(?:vm\.tiktok\.com)\/([\w]+)/i', $value)) {
                        $fail('URL TikTok tidak valid. Format yang didukung: https://www.tiktok.com/@username/video/... atau https://vm.tiktok.com/...');
                    }
                },
            ],
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'capacity' => 'required|integer|min:1',
            'capacity_max' => 'required|integer|gte:capacity',
            'bedroom_count' => 'required|integer|min:1',
            'bathroom_count' => 'required|integer|min:1',
            'base_rate' => 'required|numeric|min:0',
            'weekend_premium_percent' => 'required|numeric|min:0|max:100',
            'weekend_premium_type' => 'required|in:percentage,fixed',
            'weekend_premium_fixed' => 'nullable|numeric|min:0|required_if:weekend_premium_type,fixed',
            'cleaning_fee' => 'nullable|numeric|min:0',
            'extra_bed_rate' => 'required|numeric|min:0',
            'status' => 'required|in:active,inactive,maintenance',
            'house_rules' => 'nullable|string',
            'check_in_time' => 'required|date_format:H:i',
            'check_out_time' => 'required|date_format:H:i',
            'min_stay_weekday' => 'required|integer|min:1',
            'min_stay_weekend' => 'required|integer|min:1',
            'min_stay_peak' => 'required|integer|min:1',
            'is_featured' => 'boolean',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'ownership_model' => 'required|in:owned,rented,partnership',
            'initial_build_capital' => 'nullable|numeric|min:0',
            'lease_capital' => 'nullable|numeric|min:0',
            'monthly_rent_cost' => 'nullable|numeric|min:0',
            'monthly_mortgage_cost' => 'nullable|numeric|min:0',
            'mortgage_interest_monthly' => 'nullable|numeric|min:0',
            'owner_split_pct' => 'nullable|numeric|min:0|max:100',
            'investor_split_pct' => 'nullable|numeric|min:0|max:100',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string',
            'amenities' => 'array',
            'amenities.*' => 'exists:amenities,id',
            'current_keybox_code' => 'nullable|string|size:3',
            'checkin_instructions' => 'nullable|array',
            'checkin_instructions.welcome' => 'nullable|string|max:500',
            'checkin_instructions.keybox_location' => 'nullable|string|max:500',
            'checkin_instructions.keybox_code' => 'nullable|string|max:500',
            'checkin_instructions.checkin_time' => 'nullable|string|max:200',
            'checkin_instructions.emergency_contact' => 'nullable|string|max:200',
            'checkin_instructions.wifi_name' => 'nullable|string|max:100',
            'checkin_instructions.wifi_password' => 'nullable|string|max:100',
            'checkin_instructions.additional_info' => 'nullable|array',
            'checkin_instructions.additional_info.*' => 'string|max:300',
            'ical_import_urls' => 'nullable|array',
            'ical_import_urls.*' => 'nullable|url|max:500',
        ]);
        $validated['cleaning_fee'] = 0;

        // Update slug if name changed
        if ($property->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $property->update($validated);

        // Sync amenities
        if ($request->has('amenities')) {
            $property->amenities()->sync($request->input('amenities'));
        }

        // Invalidate map coordinates cache
        Cache::forget('properties_map_coordinates');

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

        // Invalidate map coordinates cache
        Cache::forget('properties_map_coordinates');

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property deleted successfully.');
    }

    /**
     * Property media management
     */
    public function media(Property $property): Response
    {
        $this->authorize('manageMedia', $property);

        $property->load([
            'media' => function ($query) {
                $query->orderBy('display_order', 'asc')
                    ->orderBy('created_at', 'desc');
            },
        ]);

        return Inertia::render('Admin/Properties/Media', [
            'property' => $property,
        ]);
    }

    /**
     * Bulk update property status
     */
    public function bulkStatus(Request $request): RedirectResponse
    {
        $this->authorize('update', Property::class);

        $request->validate([
            'property_ids' => 'required|array',
            'property_ids.*' => 'exists:properties,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $user = $request->user();
        $propertyIds = $request->input('property_ids');
        $status = $request->input('status');

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
            'is_featured' => ! $property->is_featured,
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
        $newProperty->name = $property->name.' (Copy)';
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
            ],
        ]);
    }

    /**
     * Get property stats API endpoint
     * GET /api/admin/properties/{id}/stats
     */
    public function stats(Request $request, int $property): JsonResponse
    {
        $property = Property::findOrFail($property);
        $this->authorize('view', $property);

        try {
            $from = $request->input('from', now()->subDays(30)->toDateString());
            $to = $request->input('to', now()->toDateString());
            $period = $request->input('period', 'day'); // day, week, month

            // Validate period
            if (! in_array($period, ['day', 'week', 'month'])) {
                $period = 'day';
            }

            // Get bookings that overlap with date range
            $bookings = $property->bookings()
                ->where(function ($query) use ($from, $to) {
                    $query->whereBetween('check_in', [$from, $to])
                        ->orWhereBetween('check_out', [$from, $to])
                        ->orWhere(function ($q) use ($from, $to) {
                            $q->where('check_in', '<=', $from)
                                ->where('check_out', '>=', $to);
                        });
                })
                ->get();

            // Calculate KPIs
            $confirmedBookings = $bookings->filter(function ($booking) {
                return in_array($booking->booking_status, ['confirmed', 'checked_in', 'checked_out']) ||
                    ($booking->booking_status === 'cancelled' && in_array($booking->payment_status, ['dp_received', 'fully_paid']));
            });
            $revenueTotal = $confirmedBookings->sum('total_amount');
            $totalBookings = $confirmedBookings->count();
            $averageRating = $confirmedBookings->whereNotNull('guest_rating')->avg('guest_rating') ?? 0;

            // Calculate occupancy rate
            $totalDays = Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1;
            $bookedDays = $confirmedBookings->sum(function ($booking) use ($from, $to) {
                $start = max($booking->check_in, Carbon::parse($from));
                $end = min($booking->check_out, Carbon::parse($to));

                return $start->diffInDays($end);
            });
            $occupancyRate = $totalDays > 0 ? ($bookedDays / $totalDays) * 100 : 0;

            // Generate trend data based on period
            $trend = $this->generateTrendData($bookings, $from, $to, $period);

            // Breakdown by source (if available)
            $breakdown = [
                'source' => [
                    'direct' => $bookings->where('source', 'direct')->count(),
                    'ota' => $bookings->where('source', 'ota')->count(),
                    'walkin' => $bookings->where('source', 'walkin')->count(),
                    'other' => $bookings->whereNotIn('source', ['direct', 'ota', 'walkin'])->count(),
                ],
            ];

            // Recent bookings
            $recentBookings = $bookings->take(10)->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'guest_name' => $booking->guest_name,
                    'check_in' => $booking->check_in->toDateString(),
                    'check_out' => $booking->check_out->toDateString(),
                    'status' => $booking->booking_status,
                    'total_amount' => $booking->total_amount,
                ];
            })->values();

            return response()->json([
                'kpis' => [
                    'revenue_total' => round($revenueTotal, 2),
                    'occupancy_rate' => round($occupancyRate, 2),
                    'total_bookings' => $totalBookings,
                    'average_rating' => round($averageRating, 1),
                ],
                'trend' => $trend,
                'breakdown' => $breakdown,
                'bookings' => $recentBookings,
            ]);
        } catch (\Exception $e) {
            \Log::error('Property stats error', [
                'property_id' => $property->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch property stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate trend data based on period
     */
    private function generateTrendData($bookings, string $from, string $to, string $period): array
    {
        $trend = [];
        $start = Carbon::parse($from);
        $end = Carbon::parse($to);
        $current = $start->copy();

        while ($current <= $end) {
            $periodEnd = match ($period) {
                'week' => $current->copy()->endOfWeek(),
                'month' => $current->copy()->endOfMonth(),
                default => $current->copy()->endOfDay(),
            };

            if ($periodEnd > $end) {
                $periodEnd = $end->copy();
            }

            // Get bookings in this period
            $periodBookings = $bookings->filter(function ($booking) use ($current, $periodEnd) {
                return $booking->check_in <= $periodEnd && $booking->check_out >= $current;
            });

            $confirmedPeriodBookings = $periodBookings->filter(function ($booking) {
                return in_array($booking->booking_status, ['confirmed', 'checked_in', 'checked_out']) ||
                    ($booking->booking_status === 'cancelled' && in_array($booking->payment_status, ['dp_received', 'fully_paid']));
            });

            $revenue = $confirmedPeriodBookings->sum('total_amount');

            // Calculate occupancy for this period
            $periodDays = $current->diffInDays($periodEnd) + 1;
            $bookedDays = $confirmedPeriodBookings->sum(function ($booking) use ($current, $periodEnd) {
                $start = max($booking->check_in, $current);
                $end = min($booking->check_out, $periodEnd);

                return $start->diffInDays($end);
            });
            $occupancy = $periodDays > 0 ? ($bookedDays / $periodDays) * 100 : 0;

            $trend[] = [
                'date' => $current->toDateString(),
                'revenue' => round($revenue, 2),
                'occupancy' => round($occupancy, 2),
            ];

            // Move to next period
            $current = match ($period) {
                'week' => $current->copy()->addWeek()->startOfWeek(),
                'month' => $current->copy()->addMonth()->startOfMonth(),
                default => $current->copy()->addDay(),
            };
        }

        return $trend;
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
                SUM(CASE WHEN booking_status = "confirmed" THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN booking_status = "cancelled" THEN 1 ELSE 0 END) as cancelled_bookings
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
            ->where('booking_status', '!=', 'cancelled')
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
                ->where('booking_status', '!=', 'cancelled')
                ->where(function ($query) use ($monthStart, $monthEnd) {
                    $query->whereBetween('check_in', [$monthStart, $monthEnd])
                        ->orWhereBetween('check_out', [$monthStart, $monthEnd])
                        ->orWhere(function ($q) use ($monthStart, $monthEnd) {
                            $q->where('check_in', '<=', $monthStart)
                                ->where('check_out', '>=', $monthEnd);
                        });
                })
                ->get()
                ->sum(function ($booking) use ($monthStart, $monthEnd) {
                    $start = max($booking->check_in, $monthStart);
                    $end = min($booking->check_out, $monthEnd);

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

    /**
     * Update the color of a property
     */
    public function updateColor(Request $request, Property $property): JsonResponse
    {
        $this->authorize('update', $property);

        $validated = $request->validate([
            'color' => 'required|string|regex:/^#[a-fA-F0-9]{6}$/',
        ]);

        $property->update([
            'color' => $validated['color'],
        ]);

        return response()->json([
            'success' => true,
            'color' => $property->color,
        ]);
    }

    /**
     * Update the short name of a property
     */
    public function updateShortName(Request $request, Property $property): JsonResponse
    {
        $this->authorize('update', $property);

        $validated = $request->validate([
            'short_name' => 'nullable|string|max:50',
        ]);

        $property->update([
            'short_name' => $validated['short_name'],
        ]);

        return response()->json([
            'success' => true,
            'short_name' => $property->short_name,
        ]);
    }
}

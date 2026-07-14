<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\HousekeepingSchedule;
use App\Models\InventoryItem;
use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\User;
use App\Services\CleaningService;
use App\Services\HousekeepingPointService;
use App\Services\ImageService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CleaningDashboardController extends Controller
{
    public function __construct(
        protected CleaningService $cleaningService
    ) {}

    public function index()
    {
        $user = auth()->user();

        // 1. Get Active Inventory Items for the form shortcuts
        $inventoryItems = InventoryItem::select('id', 'name', 'unit')
            ->orderBy('name')
            ->get();

        // 2. Get all properties for shortcut inputs
        $properties = Property::orderBy('name')->get(['id', 'name']);

        // 3. Get low stock items assigned to this specific user (PJ)
        $myLowStockItems = InventoryItem::where('assigned_user_id', $user->id)
            ->get()
            ->filter(function ($it) {
                return (float) $it->current_stock < (float) $it->min_stock;
            })
            ->map(function ($it) {
                return [
                    'id' => $it->id,
                    'name' => $it->name,
                    'unit' => $it->unit,
                    'current_stock' => (float) $it->current_stock,
                    'min_stock' => (float) $it->min_stock,
                ];
            })->values();

        // 4. Properties that checked out today and need cleaning
        $needsCleaning = Booking::whereDate('check_out', today())
            ->where('booking_status', 'checked_out')
            ->where('is_cleaned', false)
            ->with(['property:id,name,address,current_keybox_code,cleaning_points,check_in_time,check_out_time', 'guests'])
            ->get()
            ->map(function ($booking) {
                $stockTemplate = $this->cleaningService->getLastUsageTemplate($booking->property);
                $nextCheckIn = $booking->property->getNextCheckIn();

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'property_address' => $booking->property->address,
                    'guest_name' => $booking->guest_name,
                    'guest_count' => $booking->guest_count,
                    'check_out' => $booking->check_out,
                    'check_out_time' => $booking->property->check_out_time ? Carbon::parse($booking->property->check_out_time)->format('H:i') : '11:00',
                    'current_keybox_code' => $booking->property->current_keybox_code,
                    'cleaning_points' => (int) $booking->property->cleaning_points,
                    'next_checkin' => $nextCheckIn ? array_merge($nextCheckIn, [
                        'check_in_time' => $booking->property->check_in_time ? Carbon::parse($booking->property->check_in_time)->format('H:i') : '14:00',
                    ]) : null,
                    'priority' => $this->calculateCleaningPriority($booking),
                    'stock_template' => $stockTemplate,
                ];
            });

        // 5. Recently cleaned properties
        $recentlyCleaned = Booking::whereDate('cleaned_at', today())
            ->where('is_cleaned', true)
            ->with(['property:id,name,current_keybox_code,keybox_updated_at', 'cleanedBy:id,name'])
            ->latest('cleaned_at')
            ->get();

        // 6. Point System Integrations
        $pointService = app(HousekeepingPointService::class);
        $pointsDetails = $pointService->getMonthlyPointsDetails($user->id, (int) now()->month, (int) now()->year);
        $poolData = $pointService->getMonthlyPool((int) now()->month, (int) now()->year);

        $routine = (float) ($pointsDetails['routine'] ?? 0.0);
        $checkout = (float) ($pointsDetails['cleaning'] ?? 0.0);
        $damage = (float) ($pointsDetails['damage'] ?? 0.0);
        $custom = (float) ($pointsDetails['custom'] ?? 0.0);
        $total = (float) ($pointsDetails['total'] ?? 0.0);
        $sharingPoolBonus = $total * (float) ($poolData['point_rate'] ?? 0.0);

        $pointsSummary = [
            'routine' => $routine,
            'checkout' => $checkout,
            'damage' => $damage,
            'custom' => $custom,
            'sharing_pool' => $sharingPoolBonus,
            'total' => $total,
        ];

        // Remove detailed staff_breakdown and property_details from poolData for security/size in frontend
        unset($poolData['staff_breakdown']);
        unset($poolData['property_details']);

        $routineSchedules = HousekeepingSchedule::where('user_id', $user->id)
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->orderBy('date', 'asc')
            ->get();

        $availableDamages = UnitDamage::where('status', 'pending')
            ->with(['property'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($d) {
                return [
                    'id' => $d->id,
                    'uuid' => $d->uuid,
                    'title' => $d->title,
                    'description' => $d->description,
                    'difficulty' => $d->difficulty ?? 'easy',
                    'property_name' => $d->property->name,
                    'property_address' => $d->property->address,
                    'photo_url' => $d->photo_path ? \Storage::disk('public')->url($d->photo_path) : null,
                    'created_at' => $d->created_at->toIso8601String(),
                ];
            });

        $myActiveDamages = UnitDamage::where('status', 'in_progress')
            ->where('assigned_to', $user->id)
            ->with(['property'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($d) {
                // Get active guest details if checkin exists
                $activeBooking = Booking::where('property_id', $d->property_id)
                    ->where('booking_status', 'checked_in')
                    ->first();

                return [
                    'id' => $d->id,
                    'uuid' => $d->uuid,
                    'title' => $d->title,
                    'description' => $d->description,
                    'difficulty' => $d->difficulty ?? 'easy',
                    'property_name' => $d->property->name,
                    'property_address' => $d->property->address,
                    'photo_url' => $d->photo_path ? \Storage::disk('public')->url($d->photo_path) : null,
                    'created_at' => $d->created_at->toIso8601String(),
                    'guest_name' => $activeBooking ? $activeBooking->guest_name : null,
                    'guest_phone' => $activeBooking ? ($activeBooking->guest_phone ?? $activeBooking->external_phone) : null,
                ];
            });

        $housekeepingStaff = User::where('role', 'housekeeping')->active()->get(['id', 'name']);

        return Inertia::render('Staff/CleaningDashboard', [
            'needsCleaning' => $needsCleaning,
            'recentlyCleaned' => $recentlyCleaned,
            'inventoryItems' => $inventoryItems,
            'properties' => $properties,
            'myLowStockItems' => $myLowStockItems,
            'pointsSummary' => $pointsSummary,
            'activeRoutineSchedules' => $routineSchedules,
            'availableDamages' => $availableDamages,
            'myActiveDamages' => $myActiveDamages,
            'activeStaff' => $housekeepingStaff,
            'stats' => [
                'total_checkout_today' => Booking::whereDate('check_out', today())->count(),
                'cleaned_today' => Booking::whereDate('cleaned_at', today())->count(),
                'pending_cleaning' => $needsCleaning->count(),
                'high_priority' => $needsCleaning->where('priority', 'high')->count(),
            ],
        ]);
    }

    /**
     * Mark as cleaned and update keybox code (frontend input)
     */
    public function markAsCleaned(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        $request->validate([
            'new_keybox_code' => 'required|string|regex:/^\d{3}$/',
            'notes' => 'nullable|string|max:500',
            'stock_usage' => 'nullable|array',
            'stock_usage.*.item_id' => 'required|exists:inventory_items,id',
            'stock_usage.*.quantity' => 'required|numeric|min:0',
            'cleaner_ids' => 'nullable|array',
            'cleaner_ids.*' => 'exists:users,id',
        ]);

        try {
            $this->cleaningService->markAsCleaned(
                $booking,
                $request->input('new_keybox_code'),
                $request->input('stock_usage', []),
                $request->input('notes'),
                auth()->id(),
                $request->input('cleaner_ids', [])
            );

            return redirect()->back()->with(
                'success',
                "Property marked as Ready! Keybox updated to: {$request->input('new_keybox_code')}"
            );

        } catch (\Exception $e) {
            \Log::error('Mark as cleaned failed: '.$e->getMessage());

            return redirect()->back()->with('error', 'Failed to mark as cleaned. Please try again.');
        }
    }

    /**
     * Calculate cleaning priority based on next check-in
     */
    private function calculateCleaningPriority(Booking $booking): string
    {
        $nextBooking = $booking->property->getNextCheckIn();

        if (! $nextBooking) {
            return 'low';
        }

        $hoursUntilNextCheckin = now()->diffInHours($nextBooking['check_in']);

        if ($hoursUntilNextCheckin <= 6) {
            return 'high';
        } elseif ($hoursUntilNextCheckin <= 24) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Get current keybox code for property (for staff reference)
     */
    public function getKeyboxCode(Property $property)
    {
        $this->authorize('view', $property);

        return response()->json([
            'keybox_code' => $property->current_keybox_code,
            'last_updated' => $property->keybox_updated_at,
            'updated_by' => $property->keyboxUpdatedBy?->name,
        ]);
    }

    /**
     * Claim a pending unit damage report.
     */
    public function claimUnitDamage(UnitDamage $unitDamage)
    {
        $unitDamage->update([
            'assigned_to' => auth()->id(),
            'status' => 'in_progress',
        ]);

        return redirect()->back()->with('success', 'Tugas perbaikan kerusakan unit berhasil diambil.');
    }

    /**
     * Resolve a unit damage report and upload completion photo.
     */
    public function resolveUnitDamage(Request $request, UnitDamage $unitDamage)
    {
        $request->validate([
            'completion_notes' => 'nullable|string|max:1000',
            'resolved_photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
            'worker_ids' => 'required|array|min:1',
            'worker_ids.*' => 'required|exists:users,id',
        ]);

        $photoPath = null;
        if ($request->hasFile('resolved_photo')) {
            try {
                $imageService = app(ImageService::class);
                $uploadResult = $imageService->upload($request->file('resolved_photo'), [
                    'directory' => 'damages/completions',
                    'max_width' => 1200,
                    'max_height' => 1200,
                    'quality' => 80,
                ]);

                if ($uploadResult->success) {
                    $photoPath = $uploadResult->path;
                } else {
                    return redirect()->back()->with('error', 'Gagal mengupload/mengkompres foto bukti: '.$uploadResult->error);
                }
            } catch (\Exception $e) {
                \Log::error('Upload completion photo failed: '.$e->getMessage());

                return redirect()->back()->with('error', 'Gagal memproses foto bukti: '.$e->getMessage());
            }
        }

        // Map difficulty to points
        $difficultyPoints = match ($unitDamage->difficulty) {
            'easy' => 2.00,
            'medium' => 5.00,
            'hard' => 10.00,
            default => 2.00,
        };

        $workerIds = $request->input('worker_ids');
        $pointsPerWorker = count($workerIds) > 0 ? ($difficultyPoints / count($workerIds)) : 0.00;

        \DB::transaction(function () use ($unitDamage, $request, $photoPath, $workerIds, $pointsPerWorker) {
            $unitDamage->update([
                'status' => 'resolved',
                'resolved_photo_path' => $photoPath,
                'resolved_by' => auth()->id(),
                'resolved_at' => now(),
                'completion_notes' => $request->input('completion_notes'),
            ]);

            // Clear any old actions for this damage
            $unitDamage->actions()->delete();

            foreach ($workerIds as $wid) {
                $unitDamage->actions()->create([
                    'user_id' => $wid,
                    'action_details' => 'Menyelesaikan perbaikan kerusakan unit: '.$unitDamage->title,
                    'points' => $pointsPerWorker,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Tugas perbaikan unit berhasil diselesaikan.');
    }

    /**
     * Complete a daily routine schedule.
     */
    public function completeRoutineSchedule(HousekeepingSchedule $schedule)
    {
        if ($schedule->user_id !== auth()->id()) {
            abort(403, 'Unauthorized.');
        }

        $schedule->update([
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Jadwal rutin berhasil diselesaikan.');
    }
}

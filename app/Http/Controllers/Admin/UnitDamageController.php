<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\User;
use App\Notifications\NewUnitDamageNotification;
use App\Services\ImageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class UnitDamageController extends Controller
{
    /**
     * Display a listing of unit damages.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Get properties based on user role
        $propertiesQuery = Property::active();
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        $properties = $propertiesQuery->orderBy('name')->get(['id', 'name']);
        $propertyIds = $properties->pluck('id')->toArray();

        // 2. Query unit damages
        $query = UnitDamage::with(['property', 'reporter', 'assignee', 'resolver', 'actions.user'])
            ->whereIn('property_id', $propertyIds);

        // Filters
        if ($request->filled('property_id') && $request->input('property_id') !== 'all') {
            $query->where('property_id', $request->input('property_id'));
        }
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $damages = $query->orderBy('created_at', 'desc')->paginate(15);

        // 3. Get potential staff assignees (super_admin, housekeeping, property_manager)
        $staff = User::whereIn('role', ['super_admin', 'housekeeping', 'property_manager'])
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        return Inertia::render('Admin/UnitDamages/Index', [
            'damages' => $damages,
            'properties' => $properties,
            'staff' => $staff,
            'filters' => [
                'property_id' => $request->input('property_id', 'all'),
                'status' => $request->input('status', 'all'),
            ],
        ]);
    }

    /**
     * Store a newly created unit damage report.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'difficulty' => 'required|string|in:easy,medium,hard',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('damages', 'public');
        }

        $unitDamage = UnitDamage::create([
            'property_id' => $validated['property_id'],
            'reported_by' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'photo_path' => $photoPath,
            'status' => 'pending',
            'difficulty' => $validated['difficulty'],
        ]);

        // Send notifications to all active staff/admins
        $staffUsers = User::whereIn('role', ['housekeeping', 'property_manager', 'front_desk', 'super_admin'])
            ->where('id', '!=', Auth::id())
            ->active()
            ->get();

        foreach ($staffUsers as $staff) {
            $staff->notify(new NewUnitDamageNotification($unitDamage, Auth::user()));
        }

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Laporan kerusakan unit berhasil dicatat.');
    }

    /**
     * Assign a unit damage task to staff.
     */
    public function assign(Request $request, UnitDamage $unitDamage): RedirectResponse
    {
        $validated = $request->validate([
            'assigned_to' => 'nullable|string',
        ]);

        $assignedTo = $request->input('assigned_to');

        if ($assignedTo === 'unassigned' || empty($assignedTo)) {
            $unitDamage->update([
                'assigned_to' => null,
                'status' => 'pending',
            ]);
        } else {
            // Ensure the user exists
            $userExists = User::where('id', $assignedTo)->exists();
            if (! $userExists) {
                return redirect()->back()->with('error', 'Staff tidak ditemukan.');
            }

            $unitDamage->update([
                'assigned_to' => $assignedTo,
                'status' => 'in_progress',
            ]);
        }

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Tugas perbaikan berhasil diperbarui.');
    }

    public function resolve(Request $request, UnitDamage $unitDamage): RedirectResponse
    {
        $validated = $request->validate([
            'resolved_notes' => 'nullable|string|max:1000',
            'resolved_photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'worker_ids' => 'required|array|min:1',
            'worker_ids.*' => 'required|exists:users,id',
        ]);

        $photoPath = $unitDamage->resolved_photo_path;
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
                }
            } catch (\Exception $e) {
                \Log::warning('Admin resolve photo upload failed: '.$e->getMessage());
            }
        }

        $difficultyPoints = match ($unitDamage->difficulty) {
            'easy' => 2.00,
            'medium' => 5.00,
            'hard' => 10.00,
            default => 2.00,
        };

        $workerIds = $request->input('worker_ids');
        $pointsPerWorker = count($workerIds) > 0 ? ($difficultyPoints / count($workerIds)) : 0.00;

        \DB::transaction(function () use ($unitDamage, $validated, $photoPath, $workerIds, $pointsPerWorker) {
            $unitDamage->update([
                'status' => 'resolved',
                'resolved_by' => Auth::id(),
                'resolved_at' => now(),
                'resolved_notes' => $validated['resolved_notes'] ?? null,
                'completion_notes' => $validated['resolved_notes'] ?? null,
                'resolved_photo_path' => $photoPath,
            ]);

            // Clear old actions
            $unitDamage->actions()->delete();

            foreach ($workerIds as $wid) {
                $unitDamage->actions()->create([
                    'user_id' => $wid,
                    'action_details' => 'Menyelesaikan perbaikan kerusakan unit: '.$unitDamage->title,
                    'points' => $pointsPerWorker,
                ]);
            }
        });

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Kerusakan berhasil diselesaikan dengan catatan tindakan.');
    }

    /**
     * Delete a unit damage report.
     */
    public function destroy(UnitDamage $unitDamage): RedirectResponse
    {
        if ($unitDamage->photo_path) {
            Storage::disk('public')->delete($unitDamage->photo_path);
        }

        $unitDamage->delete();

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Laporan kerusakan unit berhasil dihapus.');
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\User;
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
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('damages', 'public');
        }

        UnitDamage::create([
            'property_id' => $validated['property_id'],
            'reported_by' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'photo_path' => $photoPath,
            'status' => 'pending',
        ]);

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Laporan kerusakan unit berhasil dicatat.');
    }

    /**
     * Assign a unit damage task to staff.
     */
    public function assign(Request $request, UnitDamage $unitDamage): RedirectResponse
    {
        $validated = $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $assignedTo = $validated['assigned_to'] ?? Auth::id();

        $unitDamage->update([
            'assigned_to' => $assignedTo,
            'status' => 'in_progress',
        ]);

        return redirect()->route('admin.unit-damages.index')
            ->with('success', 'Tugas perbaikan berhasil ditugaskan.');
    }

    public function resolve(Request $request, UnitDamage $unitDamage): RedirectResponse
    {
        $validated = $request->validate([
            'resolved_notes' => 'nullable|string|max:1000',
            'actions' => 'required|array|min:1',
            'actions.*.user_id' => 'required|exists:users,id',
            'actions.*.action_details' => 'required|string|max:255',
            'actions.*.points' => 'required|integer|min:0',
        ]);

        \DB::transaction(function () use ($unitDamage, $validated) {
            $unitDamage->update([
                'status' => 'resolved',
                'resolved_by' => Auth::id(),
                'resolved_at' => now(),
                'resolved_notes' => $validated['resolved_notes'] ?? null,
            ]);

            foreach ($validated['actions'] as $action) {
                $unitDamage->actions()->create([
                    'user_id' => $action['user_id'],
                    'action_details' => $action['action_details'],
                    'points' => $action['points'],
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

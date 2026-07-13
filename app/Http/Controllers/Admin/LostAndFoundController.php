<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\LostAndFound;
use App\Models\Property;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LostAndFoundController extends Controller
{
    /**
     * Display a listing of lost and found items.
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

        // 2. Query lost and found items
        $query = LostAndFound::with(['property', 'booking'])
            ->whereIn('property_id', $propertyIds);

        // Filters
        if ($request->filled('property_id') && $request->input('property_id') !== 'all') {
            $query->where('property_id', $request->input('property_id'));
        }
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $items = $query->orderBy('found_date', 'desc')->paginate(15);

        return Inertia::render('Admin/LostAndFounds/Index', [
            'items' => $items,
            'properties' => $properties,
            'filters' => [
                'property_id' => $request->input('property_id', 'all'),
                'status' => $request->input('status', 'all'),
            ],
        ]);
    }

    /**
     * Store a newly created lost and found item.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'booking_id' => 'nullable|exists:bookings,id',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'found_date' => 'required|date',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('lost_and_founds', 'public');
        }

        LostAndFound::create([
            'property_id' => $validated['property_id'],
            'booking_id' => $validated['booking_id'] ?? null,
            'item_name' => $validated['item_name'],
            'description' => $validated['description'] ?? null,
            'found_date' => $validated['found_date'],
            'photo_path' => $photoPath,
            'status' => 'found',
        ]);

        return redirect()->route('admin.lost-and-founds.index')
            ->with('success', 'Barang tertinggal berhasil dicatat.');
    }

    /**
     * Mark an item as claimed/returned.
     */
    public function claim(Request $request, LostAndFound $lostAndFound): RedirectResponse
    {
        $validated = $request->validate([
            'claimed_by_name' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $lostAndFound->update([
            'status' => 'claimed',
            'claimed_by_name' => $validated['claimed_by_name'],
            'claimed_at' => now(),
            'notes' => $validated['notes'] ?? $lostAndFound->notes,
        ]);

        return redirect()->route('admin.lost-and-founds.index')
            ->with('success', 'Barang tertinggal berhasil diklaim/dikembalikan.');
    }

    /**
     * Suggest potential bookings that checked out around the found date.
     */
    public function suggestBookings(Request $request): JsonResponse
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'found_date' => 'required|date',
        ]);

        $propertyId = $request->input('property_id');
        $foundDate = Carbon::parse($request->input('found_date'));

        // Search bookings that checked out between foundDate - 3 days and foundDate + 1 day
        $startDate = $foundDate->copy()->subDays(3)->startOfDay();
        $endDate = $foundDate->copy()->addDay()->endOfDay();

        $bookings = Booking::where('property_id', $propertyId)
            ->where('booking_status', 'confirmed')
            ->whereBetween('check_out', [$startDate, $endDate])
            ->orderBy('check_out', 'desc')
            ->get(['id', 'booking_number', 'guest_name', 'check_in', 'check_out']);

        return response()->json($bookings);
    }

    /**
     * Delete a lost and found record.
     */
    public function destroy(LostAndFound $lostAndFound): RedirectResponse
    {
        if ($lostAndFound->photo_path) {
            Storage::disk('public')->delete($lostAndFound->photo_path);
        }

        $lostAndFound->delete();

        return redirect()->route('admin.lost-and-founds.index')
            ->with('success', 'Catatan barang tertinggal berhasil dihapus.');
    }
}

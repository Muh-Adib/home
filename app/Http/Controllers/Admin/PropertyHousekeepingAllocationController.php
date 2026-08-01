<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\PropertyHousekeepingAllocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PropertyHousekeepingAllocationController extends Controller
{
    /**
     * Store or update Housekeeping North percentage allocations for a property.
     */
    public function store(Request $request, Property $property): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'allocations' => 'required|array',
            'allocations.*.user_id' => 'required|exists:users,id',
            'allocations.*.percentage' => 'required|numeric|min:0|max:100',
        ]);

        // Calculate sum of percentages
        $totalPercentage = (float) collect($validated['allocations'])->sum('percentage');

        // Validation Rule: Sum of percentage allocations must equal 100.0%
        if (! empty($validated['allocations']) && abs($totalPercentage - 100.0) > 0.01) {
            return back()->withErrors([
                'allocations' => "Total alokasi persentase Housekeeping untuk properti {$property->name} harus 100% (saat ini: {$totalPercentage}%).",
            ]);
        }

        // Save allocations in database
        foreach ($validated['allocations'] as $item) {
            $pct = (float) $item['percentage'];
            if ($pct > 0) {
                PropertyHousekeepingAllocation::updateOrCreate(
                    [
                        'property_id' => $property->id,
                        'user_id' => $item['user_id'],
                    ],
                    [
                        'percentage' => $pct,
                    ]
                );
            } else {
                PropertyHousekeepingAllocation::where('property_id', $property->id)
                    ->where('user_id', $item['user_id'])
                    ->delete();
            }
        }

        return redirect()->back()->with('success', "Alokasi persentase HK untuk properti {$property->name} berhasil disimpan.");
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Services\ICalService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ICalController extends Controller
{
    protected ICalService $icalService;

    public function __construct(ICalService $icalService)
    {
        $this->icalService = $icalService;
    }

    /**
     * Export property bookings to iCal format
     */
    public function export(string $slug, string $token)
    {
        $property = Property::where('slug', $slug)
            ->where('ical_export_token', $token)
            ->firstOrFail();

        $content = $this->icalService->generateForProperty($property);

        return response($content)
            ->header('Content-Type', 'text/calendar; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="' . $slug . '.ics"');
    }

    /**
     * Trigger manual sync for a property (Admin)
     */
    public function sync(Property $property)
    {
        $result = $this->icalService->syncFromExternal($property);

        if ($result['success']) {
            return back()->with('success', 'iCal synchronization successful. ' . $result['count'] . ' external entries processed.');
        }

        return back()->with('error', 'iCal synchronization failed: ' . $result['message']);
    }
}

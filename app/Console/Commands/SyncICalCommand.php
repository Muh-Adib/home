<?php

namespace App\Console\Commands;

use App\Models\Property;
use App\Services\ICalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncICalCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ical:sync {property? : Optional property ID to sync specific property}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync iCal feeds for all properties (or specific one)';

    /**
     * Execute the console command.
     */
    public function handle(ICalService $iCalService)
    {
        $propertyId = $this->argument('property');

        $query = Property::query()
            ->whereNotNull('ical_import_urls')
            ->where('ical_import_urls', '!=', '[]');

        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        $properties = $query->get();

        $this->info("Found {$properties->count()} properties to sync.");

        foreach ($properties as $property) {
            $this->info("Syncing property: {$property->name} (ID: {$property->id})...");

            try {
                $result = $iCalService->syncFromExternal($property);

                if ($result['success']) {
                    $this->info("  Success! Synced {$result['count']} bookings.");
                    Log::info("iCal Sync Success for Property {$property->id}: {$result['count']} bookings.");
                } else {
                    $this->error("  Failed: {$result['message']}");
                    Log::error("iCal Sync Failed for Property {$property->id}: {$result['message']}");
                }
            } catch (\Exception $e) {
                $this->error("  Error: {$e->getMessage()}");
                Log::error("iCal Sync Exception for Property {$property->id}: {$e->getMessage()}");
            }
        }

        $this->info('Sync completed.');
    }
}

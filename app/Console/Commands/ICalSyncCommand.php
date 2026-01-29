<?php

namespace App\Console\Commands;

use App\Models\Property;
use App\Services\ICalService;
use Illuminate\Console\Command;

class ICalSyncCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ical:sync {property_id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize external iCal feeds for properties';

    /**
     * Execute the console command.
     */
    public function handle(ICalService $icalService)
    {
        $propertyId = $this->argument('property_id');

        if ($propertyId) {
            $property = Property::findOrFail($propertyId);
            $this->syncProperty($property, $icalService);
        } else {
            $properties = Property::whereNotNull('ical_import_urls')->get();
            $this->info('Starting iCal sync for ' . $properties->count() . ' properties...');

            foreach ($properties as $property) {
                $this->syncProperty($property, $icalService);
            }
        }

        $this->info('iCal synchronization completed.');
    }

    private function syncProperty(Property $property, ICalService $icalService)
    {
        $this->info('Syncing property: ' . $property->name);
        $result = $icalService->syncFromExternal($property);

        if ($result['success']) {
            $this->info('Success: ' . $result['count'] . ' external entries synced.');
        } else {
            $this->error('Failed: ' . $result['message']);
        }
    }
}

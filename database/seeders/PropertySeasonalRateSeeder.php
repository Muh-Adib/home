<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PropertySeasonalRate;
use App\Models\Property;

class PropertySeasonalRateSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = date('Y');
        $nextYear = $currentYear + 1;
        
        $properties = Property::all();

        $seasonalRates = [
            [
                'name' => 'Christmas & New Year Peak',
                'start_date' => "{$currentYear}-12-20",
                'end_date' => "{$nextYear}-01-05",
                'rate_type' => 'percentage',
                'rate_value' => 100,
                'priority' => 100,
                'min_stay_nights' => 5,
                'description' => 'Peak season during Christmas and New Year holidays',
            ],
            [
                'name' => 'Eid Al-Fitr Season',
                'start_date' => "{$nextYear}-04-08",
                'end_date' => "{$nextYear}-04-15",
                'rate_type' => 'percentage',
                'rate_value' => 75,
                'priority' => 90,
                'min_stay_nights' => 3,
                'description' => 'High demand during Eid Al-Fitr holidays',
            ],
        ];

        foreach ($properties as $property) {
            foreach ($seasonalRates as $rateData) {
                $exists = PropertySeasonalRate::where('property_id', $property->id)
                    ->where('start_date', $rateData['start_date'])
                    ->where('end_date', $rateData['end_date'])
                    ->exists();

                if (!$exists) {
                    PropertySeasonalRate::create([
                        'property_id' => $property->id,
                        'name' => $rateData['name'],
                        'start_date' => $rateData['start_date'],
                        'end_date' => $rateData['end_date'],
                        'rate_type' => $rateData['rate_type'],
                        'rate_value' => $rateData['rate_value'],
                        'priority' => $rateData['priority'],
                        'min_stay_nights' => $rateData['min_stay_nights'],
                        'is_active' => true,
                        'description' => $rateData['description'],
                    ]);
                }
            }
        }
    }
} 

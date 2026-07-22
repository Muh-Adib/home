<?php

use App\Models\Property;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate ical_export_token for existing properties that don't have one
        Property::whereNull('ical_export_token')
            ->orWhere('ical_export_token', '')
            ->chunkById(100, function ($properties) {
                foreach ($properties as $property) {
                    $property->ical_export_token = Str::random(32);
                    $property->save();
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is data-only, no structural changes to reverse
        // If needed, you could set tokens back to null, but that's typically not desired
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Property;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Find a fallback user to act as the owner (usually ID 1 or first admin/user)
        $owner = User::whereIn('role', ['super_admin', 'property_owner'])->first() ?? User::first();
        $ownerId = $owner ? $owner->id : 1;

        // Insert Dapur if it does not exist
        if (!Property::where('slug', 'dapur')->exists()) {
            Property::create([
                'owner_id' => $ownerId,
                'name' => 'Dapur',
                'slug' => 'dapur',
                'type' => 'operational',
                'description' => 'Area operasional dapur umum / internal.',
                'address' => 'Operational Area',
                'capacity' => 0,
                'capacity_max' => 0,
                'bedroom_count' => 0,
                'bathroom_count' => 0,
                'base_rate' => 0,
                'status' => 'inactive',
            ]);
        }

        // Insert Laundry if it does not exist
        if (!Property::where('slug', 'laundry')->exists()) {
            Property::create([
                'owner_id' => $ownerId,
                'name' => 'Laundry',
                'slug' => 'laundry',
                'type' => 'operational',
                'description' => 'Area operasional laundry internal.',
                'address' => 'Operational Area',
                'capacity' => 0,
                'capacity_max' => 0,
                'bedroom_count' => 0,
                'bathroom_count' => 0,
                'base_rate' => 0,
                'status' => 'inactive',
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Property::whereIn('slug', ['dapur', 'laundry'])->forceDelete();
    }
};

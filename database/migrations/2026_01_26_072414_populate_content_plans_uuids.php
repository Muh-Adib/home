<?php

use App\Models\ContentPlan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        ContentPlan::whereNull('uuid')->chunk(100, function ($plans) {
            foreach ($plans as $plan) {
                $plan->update(['uuid' => (string) Str::uuid()]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to reverse this without losing data integrity
    }
};

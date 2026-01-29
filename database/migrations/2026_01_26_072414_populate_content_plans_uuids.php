<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \App\Models\ContentPlan::whereNull('uuid')->chunk(100, function ($plans) {
            foreach ($plans as $plan) {
                $plan->update(['uuid' => (string) \Illuminate\Support\Str::uuid()]);
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

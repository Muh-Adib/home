<?php

use App\Models\ContentPlan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('content_plans', 'uuid')) {
            Schema::table('content_plans', function (Blueprint $table) {
                $table->string('uuid')->unique()->after('id')->nullable();
            });

            // Populate existing records with unique strings
            ContentPlan::all()->each(function ($plan) {
                $plan->update(['uuid' => (string) Str::uuid()]);
            });

            Schema::table('content_plans', function (Blueprint $table) {
                $table->string('uuid')->nullable(false)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('content_plans', function (Blueprint $table) {
            $table->dropColumn('uuid');
        });
    }
};

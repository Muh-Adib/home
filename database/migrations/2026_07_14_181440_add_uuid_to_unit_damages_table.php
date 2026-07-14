<?php

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
        if (! Schema::hasColumn('unit_damages', 'uuid')) {
            Schema::table('unit_damages', function (Blueprint $table) {
                $table->string('uuid')->unique()->after('id')->nullable();
            });

            // Populate UUIDs for existing records
            $damages = DB::table('unit_damages')->get();
            foreach ($damages as $damage) {
                DB::table('unit_damages')
                    ->where('id', $damage->id)
                    ->update(['uuid' => (string) Str::uuid()]);
            }

            Schema::table('unit_damages', function (Blueprint $table) {
                $table->string('uuid')->nullable(false)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('unit_damages', 'uuid')) {
            Schema::table('unit_damages', function (Blueprint $table) {
                $table->dropColumn('uuid');
            });
        }
    }
};

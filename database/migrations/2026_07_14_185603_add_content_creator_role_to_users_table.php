<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'property_owner', 'property_manager', 'front_desk', 'housekeeping', 'finance', 'guest', 'content_creator') NOT NULL DEFAULT 'guest'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'property_owner', 'property_manager', 'front_desk', 'housekeeping', 'finance', 'guest') NOT NULL DEFAULT 'guest'");
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the table with new enum values
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't support MODIFY COLUMN, so we'll handle this in the application layer
            // The validation will be handled in the controller
            return;
        }
        
        // For MySQL/PostgreSQL
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_type ENUM('dp', 'remaining', 'full', 'refund', 'penalty', 'additional', 'damage', 'cleaning', 'extra_service')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        
        // Revert back to original enum values
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_type ENUM('dp', 'remaining', 'full', 'refund', 'penalty')");
    }
};

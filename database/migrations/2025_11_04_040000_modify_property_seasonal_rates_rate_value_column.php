<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Mengubah tipe kolom rate_value dari decimal(8,2) menjadi decimal(15,2)
     * untuk menampung nilai hingga 9999999999999.99 (triliunan rupiah)
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite tidak mendukung MODIFY, perlu recreate table
            $this->modifyColumnForSqlite('up');
        } else {
            // MySQL, PostgreSQL, dll mendukung MODIFY/ALTER COLUMN
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE property_seasonal_rates MODIFY rate_value DECIMAL(15, 2) NOT NULL');
            } else {
                // PostgreSQL dan database lain
                DB::statement('ALTER TABLE property_seasonal_rates ALTER COLUMN rate_value TYPE DECIMAL(15, 2)');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite tidak mendukung MODIFY, perlu recreate table
            $this->modifyColumnForSqlite('down');
        } else {
            // MySQL, PostgreSQL, dll mendukung MODIFY/ALTER COLUMN
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE property_seasonal_rates MODIFY rate_value DECIMAL(8, 2) NOT NULL');
            } else {
                // PostgreSQL dan database lain
                DB::statement('ALTER TABLE property_seasonal_rates ALTER COLUMN rate_value TYPE DECIMAL(8, 2)');
            }
        }
    }

    /**
     * Handle column modification for SQLite
     */
    private function modifyColumnForSqlite(string $direction): void
    {
        $newPrecision = $direction === 'up' ? 15 : 8;

        // Step 1: Create new table with modified column
        // SQLite stores enum as VARCHAR, boolean as INTEGER (0/1)
        DB::statement("
            CREATE TABLE property_seasonal_rates_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                rate_type VARCHAR(255) NOT NULL DEFAULT 'percentage',
                rate_value DECIMAL({$newPrecision}, 2) NOT NULL,
                min_stay_nights INTEGER NOT NULL DEFAULT 1,
                applies_to_weekends_only INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                priority INTEGER NOT NULL DEFAULT 0,
                description TEXT,
                applicable_days TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        ");

        // Step 2: Copy data from old table
        DB::statement("
            INSERT INTO property_seasonal_rates_new 
            SELECT 
                id, property_id, name, start_date, end_date, rate_type, 
                rate_value, min_stay_nights, applies_to_weekends_only, 
                is_active, priority, description, applicable_days, 
                created_at, updated_at
            FROM property_seasonal_rates
        ");

        // Step 3: Drop old table
        DB::statement('DROP TABLE property_seasonal_rates');

        // Step 4: Rename new table
        DB::statement('ALTER TABLE property_seasonal_rates_new RENAME TO property_seasonal_rates');

        // Step 5: Recreate indexes (dengan nama yang sesuai)
        // Check if indexes exist before creating to avoid errors
        try {
            DB::statement('CREATE INDEX property_seasonal_rates_property_id_start_date_end_date_index ON property_seasonal_rates(property_id, start_date, end_date)');
        } catch (\Exception $e) {
            // Index might already exist, continue
        }
        
        try {
            DB::statement('CREATE INDEX property_seasonal_rates_property_id_is_active_priority_index ON property_seasonal_rates(property_id, is_active, priority)');
        } catch (\Exception $e) {
            // Index might already exist, continue
        }
    }
};


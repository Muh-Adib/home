<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Safe production migration: alter articles.status enum.
 *
 * Why raw SQL instead of Blueprint::change()?
 * - Blueprint::change() on enum triggers a full column rebuild in some drivers.
 * - Raw MODIFY COLUMN is a single DDL statement; MySQL/MariaDB is safe if
 *   all existing values are already included in the new enum definition.
 * - We sanitise orphaned values BEFORE altering to prevent strict-mode errors.
 */
return new class extends Migration
{
    /**
     * Full target enum values (order matters for the SQL).
     */
    private const VALUES = ['idea', 'researching', 'outlining', 'writing', 'draft', 'reviewing', 'scheduled', 'published', 'archived'];

    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        // 1. Sanitise: remap any legacy values not in the new set → 'draft'
        $valid = implode(',', array_map(fn ($v) => "'$v'", self::VALUES));

        DB::statement("UPDATE articles SET status = 'draft' WHERE status NOT IN ($valid)");

        // 2. Alter the column with the full enum definition (Skiped for SQLite)
        if ($driver === 'mysql') {
            $enumList = implode("','", self::VALUES);
            DB::statement("ALTER TABLE articles MODIFY COLUMN status ENUM('{$enumList}') NOT NULL DEFAULT 'idea'");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            // Restore the previous, shorter enum (adjust if yours was different)
            DB::statement("ALTER TABLE articles MODIFY COLUMN status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft'");
        }
    }
};

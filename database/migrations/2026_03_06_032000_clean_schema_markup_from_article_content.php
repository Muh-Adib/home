<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cleanup migration: strip any JSON-LD schema markup blocks that were accidentally
 * stored inside the article `content` column by the AI generator.
 *
 * Also removes the stale `schema_markup` key from `generation_metadata` JSON,
 * since schema is now generated automatically on-the-fly by SeoService.
 */
return new class extends Migration {
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        // 1. Strip ```json ... ``` blocks from `content` using DB-level REGEXP_REPLACE (MySQL 8+)
        //    Falls back to PHP-level cleanup for SQLite (local dev / testing).
        if ($driver === 'mysql') {
            // Remove ```json ... ``` or ``` ... ``` blocks containing @context schema.org
            DB::statement("
                UPDATE articles
                SET content = TRIM(REGEXP_REPLACE(
                    content,
                    '```(json)?[[:space:]]*\\\\{[^`]+\\\\}[[:space:]]*```',
                    ''
                ))
                WHERE content REGEXP '```(json)?[[:space:]]*\\\\{'
            ");
        } else {
            // SQLite / other: PHP-level cleanup
            DB::table('articles')
                ->whereNotNull('content')
                ->lazyById()
                ->each(function ($row) {
                    $cleaned = trim(preg_replace('/```(?:json)?\s*\{[^`]+\}\s*```/is', '', $row->content ?? ''));
                    if ($cleaned !== $row->content) {
                        DB::table('articles')
                            ->where('id', $row->id)
                            ->update(['content' => $cleaned]);
                    }
                });
        }

        // 2. Remove `schema_markup` key from generation_metadata JSON (PHP-level, safe for all drivers)
        DB::table('articles')
            ->whereNotNull('generation_metadata')
            ->lazyById()
            ->each(function ($row) {
                $meta = json_decode($row->generation_metadata, true);
                if (is_array($meta) && array_key_exists('schema_markup', $meta)) {
                    unset($meta['schema_markup']);
                    DB::table('articles')
                        ->where('id', $row->id)
                        ->update(['generation_metadata' => empty($meta) ? null : json_encode($meta)]);
                }
            });
    }

    public function down(): void
    {
        // Irreversible cleanup — no rollback needed.
    }
};

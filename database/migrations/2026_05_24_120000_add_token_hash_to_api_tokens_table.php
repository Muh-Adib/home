<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            // Add hashed token column for secure lookup
            $table->string('token_hash', 64)->nullable()->after('token');
            $table->index('token_hash');
        });

        // Backfill: hash existing plaintext tokens.
        // Only hash tokens that look like full raw tokens (not previews ending in '...').
        // Tokens stored as previews (after the security fix) cannot be backfilled —
        // those tokens must be regenerated via admin panel.
        DB::table('api_tokens')
            ->where('token', 'not like', '%...')
            ->get()
            ->each(function ($row) {
                DB::table('api_tokens')
                    ->where('id', $row->id)
                    ->update(['token_hash' => hash('sha256', $row->token)]);
            });

        // Make token_hash required after backfill.
        // Tokens that couldn't be backfilled (previews) get a placeholder hash
        // so the NOT NULL constraint can be applied. Those tokens are effectively
        // invalidated — they won't match any real token lookup.
        DB::table('api_tokens')
            ->whereNull('token_hash')
            ->update(['token_hash' => hash('sha256', 'INVALIDATED_'.uniqid())]);

        Schema::table('api_tokens', function (Blueprint $table) {
            $table->string('token_hash', 64)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            $table->dropIndex(['token_hash']);
            $table->dropColumn('token_hash');
        });
    }
};

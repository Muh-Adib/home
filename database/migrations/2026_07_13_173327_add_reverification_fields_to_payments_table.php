<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('reverification_status', 20)->default('pending'); // pending, accepted, rejected
            $table->foreignId('reverified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reverified_at')->nullable();
            $table->text('reverification_notes')->nullable();
            $table->string('reverification_action')->nullable(); // tindak lanjut notes/action
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['reverified_by']);
            $table->dropColumn([
                'reverification_status',
                'reverified_by',
                'reverified_at',
                'reverification_notes',
                'reverification_action',
            ]);
        });
    }
};

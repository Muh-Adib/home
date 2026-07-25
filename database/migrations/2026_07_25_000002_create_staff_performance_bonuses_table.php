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
        Schema::create('staff_performance_bonuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('month');
            $table->integer('year');
            $table->string('role');
            $table->decimal('housekeeping_bonus', 15, 2)->default(0);
            $table->decimal('frontdesk_first_night_bonus', 15, 2)->default(0);
            $table->decimal('frontdesk_next_nights_bonus_share', 15, 2)->default(0);
            $table->decimal('kpi_performance_bonus', 15, 2)->default(0);
            $table->decimal('total_bonus', 15, 2)->default(0);
            $table->json('details')->nullable();
            $table->string('status')->default('draft'); // draft, finalized
            $table->timestamp('finalized_at')->nullable();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'month', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_performance_bonuses');
    }
};

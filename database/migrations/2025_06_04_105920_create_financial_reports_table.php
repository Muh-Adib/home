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
        Schema::create('financial_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->nullable()->constrained()->onDelete('cascade'); // NULL for consolidated reports
            $table->enum('report_type', ['daily', 'weekly', 'monthly', 'yearly', 'custom']);
            $table->string('report_period', 50); // e.g., "2024-01", "2024-Q1"
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('total_revenue', 15, 2)->default(0);
            $table->decimal('total_expenses', 15, 2)->default(0);
            $table->decimal('net_profit', 15, 2); // Will be calculated in application
            $table->decimal('occupancy_rate', 5, 2)->default(0); // Percentage
            $table->decimal('adr', 12, 2)->default(0); // Average Daily Rate
            $table->decimal('revpar', 12, 2)->default(0); // Revenue Per Available Room
            $table->integer('booking_count')->default(0);
            $table->integer('guest_count')->default(0);
            $table->json('report_data')->nullable(); // Detailed breakdown
            $table->timestamp('generated_at');
            $table->foreignId('generated_by')->constrained('users');
            $table->timestamps();

            // Indexes
            $table->index(['property_id', 'report_type', 'start_date']);
            $table->index(['report_type', 'start_date']);
            $table->index('generated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_reports');
    }
};

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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_number', 50)->unique(); // Generated booking number
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->string('guest_name');
            $table->string('guest_email');
            $table->string('guest_phone', 20);
            $table->string('guest_country', 100)->default('Indonesia');
            $table->string('guest_id_number', 50)->nullable(); // ID/Passport number
            $table->enum('guest_gender', ['male', 'female'])->nullable();
            $table->integer('guest_count');
            $table->integer('guest_male')->default(0);
            $table->integer('guest_female')->default(0);
            $table->integer('guest_children')->default(0);
            $table->enum('relationship_type', ['keluarga', 'teman', 'kolega', 'pasangan', 'campuran']);
            $table->date('check_in');
            $table->date('check_out');
            $table->integer('nights'); // Will be calculated in application
            $table->decimal('base_amount', 12, 2); // Property base cost
            $table->decimal('extra_bed_amount', 12, 2)->default(0); // Extra bed charges
            $table->decimal('service_amount', 12, 2)->default(0); // Additional services
            $table->decimal('tax_amount', 12, 2)->default(0); // Tax amount
            $table->decimal('total_amount', 12, 2); // Total booking amount
            $table->integer('dp_percentage')->default(0); // Down payment percentage
            $table->decimal('dp_amount', 12, 2)->default(0); // Down payment amount
            $table->decimal('dp_paid_amount', 12, 2)->default(0); // Actually paid DP
            $table->decimal('remaining_amount', 12, 2); // Will be calculated in application
            $table->enum('payment_status', ['dp_pending', 'dp_received', 'fully_paid', 'overdue', 'refunded'])->default('dp_pending');
            $table->enum('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])->default('pending_verification');
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->datetime('dp_deadline')->nullable();
            $table->text('special_requests')->nullable();
            $table->text('internal_notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users');
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users'); // Admin who created booking
            $table->enum('source', ['direct', 'phone', 'walk_in', 'ota'])->default('direct');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['property_id', 'check_in', 'check_out']);
            $table->index(['booking_status', 'payment_status']);
            $table->index('guest_email');
            $table->index(['check_in', 'check_out']);
            $table->index('booking_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};

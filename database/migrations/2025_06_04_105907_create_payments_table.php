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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_number', 50)->unique(); // Generated payment number
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->foreignId('payment_method_id')->nullable()->constrained('payment_methods')->onDelete('set null');
            $table->decimal('amount', 12, 2);
            $table->enum('payment_type', ['dp', 'remaining', 'full', 'refund', 'penalty']);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'credit_card', 'e_wallet', 'other']);
            $table->datetime('payment_date');
            $table->datetime('due_date')->nullable();
            $table->string('reference_number', 100)->nullable(); // Bank reference, etc.
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('account_name')->nullable();
            $table->enum('payment_status', ['pending', 'verified', 'failed', 'cancelled'])->default('pending');
            $table->text('verification_notes')->nullable();
            $table->text('description')->nullable();
            $table->string('attachment_path', 500)->nullable(); // Payment proof
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->timestamp('verified_at')->nullable();
            $table->string('gateway_transaction_id')->nullable(); // For payment gateway
            $table->json('gateway_response')->nullable(); // Gateway response data
            $table->timestamps();

            // Indexes
            $table->index(['booking_id', 'payment_status']);
            $table->index('payment_date');
            $table->index(['payment_method', 'payment_status']);
            $table->index('payment_number');
            $table->index('payment_method_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

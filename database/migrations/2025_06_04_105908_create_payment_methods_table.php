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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->unique(); // e.g. 'bca', 'mandiri', 'ovo'
            $table->enum('type', ['bank_transfer', 'e_wallet', 'credit_card', 'cash']);
            $table->string('icon', 10)->nullable(); // emoji icon
            $table->text('description')->nullable();
            $table->string('account_number', 100)->nullable();
            $table->string('account_name')->nullable();
            $table->string('bank_name')->nullable(); // for bank transfers
            $table->string('qr_code')->nullable(); // for QR code payments
            $table->json('instructions')->nullable(); // array of instructions
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Indexes
            $table->index(['type', 'is_active']);
            $table->index('sort_order');
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('property_linked'); // property_linked | standalone_savings
            $table->foreignId('property_id')->nullable()->constrained('properties')->nullOnDelete();
            $table->decimal('balance', 18, 2)->default(0);
            $table->boolean('is_savings')->default(false);
            $table->boolean('auto_deduct_from_monthly_report')->default(false);
            $table->decimal('savings_monthly_amount', 15, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->index(['type', 'property_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};




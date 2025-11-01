<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_allocation_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('wallet_id')->nullable()->constrained('wallets')->nullOnDelete();
            $table->string('name'); // Tabungan Iklan, THR, Tabungan Sewa
            $table->enum('mode', ['percentage', 'fixed']);
            $table->decimal('value', 15, 2); // jika percentage: 0-100
            $table->boolean('active')->default(true);
            $table->unsignedTinyInteger('priority')->default(10);
            $table->timestamps();
            $table->index(['property_id','active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_allocation_rules');
    }
};




<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->nullable()->unique();
            $table->string('unit')->default('pcs');
            $table->string('image_path')->nullable(); // Path foto item
            $table->string('category')->nullable();
            $table->decimal('average_unit_cost', 15, 4)->default(0);
            $table->decimal('last_unit_cost', 15, 4)->default(0);
            $table->timestamps();
            $table->index(['category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};

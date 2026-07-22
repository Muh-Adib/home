<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->date('usage_date');
            $table->decimal('quantity_used', 15, 4);
            $table->decimal('unit_cost_snapshot', 15, 4)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['inventory_item_id', 'property_id', 'usage_date'], 'uniq_item_property_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_usages');
    }
};

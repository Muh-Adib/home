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
        Schema::create('inventory_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->string('icon', 100)->nullable(); // Icon class
            $table->string('color', 7)->default('#3b82f6'); // Hex color for UI
            
            // Category types for property management
            $table->enum('category_type', [
                'cleaning_supplies', // Cleaning materials and tools
                'guest_amenities', // Items provided to guests
                'kitchen_supplies', // Kitchen equipment and utensils
                'bathroom_supplies', // Bathroom amenities and supplies
                'maintenance_tools', // Maintenance and repair tools
                'linens_towels', // Bedding, towels, linens
                'electronics', // TV, AC remote, etc.
                'furniture', // Movable furniture items
                'outdoor_equipment', // Garden, pool, BBQ equipment
                'safety_equipment', // First aid, fire safety, security
                'office_supplies', // Administrative supplies
                'consumables' // Items that get consumed (toiletries, snacks)
            ])->default('consumables');
            
            // Hierarchy support
            $table->foreignId('parent_id')->nullable()->constrained('inventory_categories')->onDelete('cascade');
            $table->integer('sort_order')->default(0);
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // Tracking settings for this category
            $table->boolean('track_expiry')->default(false); // Track expiration dates
            $table->boolean('track_serial')->default(false); // Track serial numbers
            $table->boolean('auto_reorder')->default(false); // Auto reorder when low stock
            $table->integer('default_min_stock')->default(0); // Default minimum stock level
            $table->boolean('requires_maintenance')->default(false);
            
            $table->timestamps();
            
            // Indexes
            $table->index(['category_type', 'is_active']);
            $table->index(['parent_id', 'sort_order']);
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_categories');
    }
};

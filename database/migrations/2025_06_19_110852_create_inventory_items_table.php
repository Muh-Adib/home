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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('inventory_categories')->onDelete('cascade');
            
            $table->string('code', 50)->unique(); // Item code/SKU
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();
            
            // Item specifications
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('size', 50)->nullable(); // Size/dimension
            $table->string('color', 50)->nullable();
            $table->string('material', 100)->nullable();
            
            // Unit and packaging
            $table->string('unit', 20)->default('pcs'); // pcs, kg, liter, meter, box, etc.
            $table->decimal('unit_cost', 10, 2)->default(0); // Cost per unit
            $table->decimal('selling_price', 10, 2)->default(0); // For items sold to guests
            
            // Stock management settings
            $table->integer('min_stock_level')->default(0); // Minimum stock before reorder
            $table->integer('max_stock_level')->default(0); // Maximum stock to maintain
            $table->integer('reorder_point')->default(0); // When to reorder
            $table->integer('reorder_quantity')->default(0); // How much to reorder
            
            // Tracking flags (inherited from category but can be overridden)
            $table->boolean('track_expiry')->default(false);
            $table->boolean('track_serial')->default(false);
            $table->boolean('track_location')->default(true); // Track which property/room
            $table->boolean('is_consumable')->default(false); // Gets consumed and needs replacement
            $table->boolean('requires_maintenance')->default(false); // Needs regular maintenance
            
            // Maintenance settings
            $table->integer('maintenance_interval_days')->nullable(); // Days between maintenance
            $table->text('maintenance_instructions')->nullable();
            
            // Supplier information
            $table->string('primary_supplier', 255)->nullable();
            $table->string('supplier_item_code', 100)->nullable();
            $table->integer('lead_time_days')->default(7); // Days to deliver
            
            // Status and visibility
            $table->boolean('is_active')->default(true);
            $table->boolean('is_visible_to_guests')->default(false); // Show in guest amenities
            
            // Photos and documentation
            $table->json('photos')->nullable(); // Array of photo URLs
            $table->text('usage_instructions')->nullable();
            $table->text('safety_notes')->nullable();
            
            // Lifecycle tracking
            $table->date('discontinued_at')->nullable(); // When item was discontinued
            $table->text('replacement_item')->nullable(); // What replaces this item
            
            // SEO and search
            $table->json('tags')->nullable(); // Search tags
            $table->string('barcode', 100)->nullable(); // Barcode for scanning
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['category_id', 'is_active']);
            $table->index(['code', 'is_active']);
            $table->index('is_active');
            $table->index('barcode');
            $table->index(['track_expiry', 'is_active']);
            $table->index(['is_consumable', 'is_active']);
            $table->index(['requires_maintenance', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};

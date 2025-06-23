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
        Schema::create('inventory_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            
            // Location information
            $table->string('location')->nullable(); // Room, storage area, etc.
            $table->text('location_details')->nullable(); // Specific details about location
            
            // Stock quantities
            $table->integer('quantity')->default(0);
            $table->integer('reserved_quantity')->default(0);
            
            // Item identification
            $table->string('serial_number')->nullable(); // For serialized items
            $table->string('asset_tag')->nullable(); // Property asset tag
            
            // Condition and status
            $table->enum('condition_status', [
                'excellent', 'good', 'fair', 'needs_repair', 'damaged', 'under_maintenance'
            ])->default('excellent');
            
            $table->enum('status', [
                'in_stock', 'reserved', 'in_use', 'maintenance', 'disposed', 'lost'
            ])->default('in_stock');
            
            // Expiry tracking
            $table->date('expiry_date')->nullable();
            
            // Purchase information
            $table->decimal('unit_cost_at_purchase', 10, 2)->default(0);
            $table->date('purchase_date')->nullable();
            $table->string('purchase_order_ref')->nullable();
            $table->text('purchase_notes')->nullable();
            
            // Maintenance tracking
            $table->date('last_maintenance_date')->nullable();
            $table->date('next_maintenance_date')->nullable();
            $table->text('maintenance_notes')->nullable();
            
            // Usage tracking
            $table->integer('usage_count')->default(0);
            $table->datetime('last_used_at')->nullable();
            $table->text('usage_notes')->nullable();
            
            // Photos and documentation
            $table->json('photos')->nullable(); // Array of photo URLs
            
            // Audit fields
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['item_id', 'property_id']);
            $table->index(['status', 'condition_status']);
            $table->index(['expiry_date']);
            $table->index(['serial_number']);
            $table->index(['asset_tag']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_stocks');
    }
};

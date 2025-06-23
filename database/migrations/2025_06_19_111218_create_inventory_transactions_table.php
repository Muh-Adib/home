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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('stock_id')->nullable()->constrained('inventory_stocks')->onDelete('set null');
            
            $table->string('transaction_number', 50)->unique(); // Generated transaction number
            
            // Transaction types
            $table->enum('transaction_type', [
                'stock_in', // Adding stock (purchase, return, found)
                'stock_out', // Removing stock (usage, lost, disposed)
                'transfer', // Moving between properties/locations
                'adjustment', // Stock count adjustment
                'reservation', // Reserving stock
                'unreservation', // Releasing reservation
                'maintenance_in', // Taking item for maintenance
                'maintenance_out', // Returning from maintenance
                'damage', // Reporting damaged items
                'disposal' // Disposing items
            ]);
            
            // Quantities
            $table->integer('quantity')->default(0); // Positive for in, negative for out
            $table->integer('quantity_before')->default(0); // Stock before transaction
            $table->integer('quantity_after')->default(0); // Stock after transaction
            
            // Cost information
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 10, 2)->default(0);
            
            // Transaction details
            $table->text('reason')->nullable(); // Reason for transaction
            $table->text('notes')->nullable(); // Additional notes
            $table->string('reference_number', 100)->nullable(); // PO, Invoice, etc.
            
            // Source/Destination for transfers
            $table->foreignId('from_property_id')->nullable()->constrained('properties')->onDelete('set null');
            $table->string('from_location', 100)->nullable();
            $table->foreignId('to_property_id')->nullable()->constrained('properties')->onDelete('set null');
            $table->string('to_location', 100)->nullable();
            
            // Related entities
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->onDelete('set null'); // If related to booking
            $table->foreignId('cleaning_task_id')->nullable()->constrained('cleaning_tasks')->onDelete('set null'); // If related to cleaning
            
            // User tracking
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->datetime('approved_at')->nullable();
            
            // Status
            $table->enum('status', [
                'pending', 
                'approved', 
                'completed', 
                'cancelled'
            ])->default('completed');
            
            // Expiry date for items with expiry tracking
            $table->date('expiry_date')->nullable();
            
            // Serial number for serialized items
            $table->string('serial_number', 100)->nullable();
            
            // Photos for documentation
            $table->json('photos')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['item_id', 'property_id']);
            $table->index(['transaction_type', 'status']);
            $table->index(['created_by', 'created_at']);
            $table->index(['booking_id', 'transaction_type']);
            $table->index(['cleaning_task_id', 'transaction_type']);
            $table->index(['from_property_id', 'to_property_id']);
            $table->index('transaction_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};

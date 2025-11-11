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
        Schema::table('property_expenses', function (Blueprint $table) {
            // Add receipt_number column if it doesn't exist
            if (!Schema::hasColumn('property_expenses', 'receipt_number')) {
                $table->string('receipt_number', 100)->nullable()->after('vendor_name');
            }

            // Add payment_method column if it doesn't exist
            if (!Schema::hasColumn('property_expenses', 'payment_method')) {
                $table->string('payment_method', 50)->nullable()->after('receipt_number');
            }

            // Add created_by column if it doesn't exist
            // Note: Migration original menggunakan 'recorded_by', 
            // tapi model dan controller menggunakan 'created_by'
            if (!Schema::hasColumn('property_expenses', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('payment_method');
                $table->index('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            if (Schema::hasColumn('property_expenses', 'created_by')) {
                $table->dropIndex(['created_by']);
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }

            if (Schema::hasColumn('property_expenses', 'payment_method')) {
                $table->dropColumn('payment_method');
            }

            if (Schema::hasColumn('property_expenses', 'receipt_number')) {
                $table->dropColumn('receipt_number');
            }
        });
    }
};







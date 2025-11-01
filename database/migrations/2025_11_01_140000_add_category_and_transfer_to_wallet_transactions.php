<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            // Add category for better categorization
            $table->string('category')->nullable()->after('direction');
            
            // Add related_transaction_id for wallet transfers (to link the pair)
            $table->foreignId('related_transaction_id')->nullable()->after('reference_id')
                ->constrained('wallet_transactions')->nullOnDelete();
            
            // Add indexes for better query performance
            $table->index('category');
            $table->index('related_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropIndex(['related_transaction_id']);
            $table->dropConstrainedForeignId('related_transaction_id');
            $table->dropColumn('category');
        });
    }
};

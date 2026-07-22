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
        Schema::create('monthly_property_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('period_month', 7); // e.g. 2026-06
            $table->enum('status', ['draft', 'finalized'])->default('draft');

            // Metrics
            $table->integer('occupancy_nights')->default(0);
            $table->integer('reservation_count')->default(0);

            // Financial Summary
            $table->decimal('total_omset', 15, 2)->default(0);
            $table->decimal('ops_fee_per_night', 15, 2)->default(100000);
            $table->decimal('total_ops_fee', 15, 2)->default(0);

            $table->decimal('total_fix_cost', 15, 2)->default(0);
            $table->decimal('total_add_cost', 15, 2)->default(0);
            $table->decimal('total_var_cost', 15, 2)->default(0);
            $table->decimal('total_expense_and_ops', 15, 2)->default(0);

            $table->decimal('net_profit_loss', 15, 2)->default(0);

            // Profit Split & Allocations
            $table->decimal('investor_share_percent', 5, 2)->default(60.00);
            $table->decimal('investor_share_amount', 15, 2)->default(0);
            $table->decimal('management_share_percent', 5, 2)->default(40.00);
            $table->decimal('management_share_amount', 15, 2)->default(0);
            $table->decimal('zakat_percent', 5, 2)->default(2.50);
            $table->decimal('zakat_amount', 15, 2)->default(0);

            // Closing / Tutup Buku Mutation Reference
            $table->foreignId('target_wallet_id')->nullable()->constrained('wallets')->nullOnDelete();
            $table->foreignId('wallet_transaction_id')->nullable()->constrained('wallet_transactions')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['property_id', 'period_month']);
        });

        Schema::create('monthly_settlement_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_settlement_id')->constrained('monthly_property_settlements')->cascadeOnDelete();
            $table->enum('type', ['omset', 'fix_cost', 'add_cost', 'var_cost']);
            $table->date('date')->nullable();
            $table->string('item_name', 150);
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('notes', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_settlement_items');
        Schema::dropIfExists('monthly_property_settlements');
    }
};

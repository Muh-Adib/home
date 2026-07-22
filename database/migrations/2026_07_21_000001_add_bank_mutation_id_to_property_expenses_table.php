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
            $table->foreignId('bank_mutation_id')->nullable()->after('wallet_id')->constrained('bank_mutations')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->dropForeign(['bank_mutation_id']);
            $table->dropColumn('bank_mutation_id');
        });
    }
};

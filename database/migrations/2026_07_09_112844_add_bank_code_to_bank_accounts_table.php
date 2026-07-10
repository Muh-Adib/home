<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->string('bank_code', 20)->nullable()->after('bank_name');
        });

        // Populate existing accounts
        DB::table('bank_accounts')->where('bank_name', 'like', '%Mandiri%')->update(['bank_code' => 'mandiri']);
        DB::table('bank_accounts')->where('bank_name', 'like', '%BCA%')->update(['bank_code' => 'bca']);
        DB::table('bank_accounts')->where('bank_name', 'like', '%BNI%')->update(['bank_code' => 'bni']);
        DB::table('bank_accounts')->where('bank_name', 'like', '%BRI%')->update(['bank_code' => 'bri']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropColumn('bank_code');
        });
    }
};

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
        Schema::create('gowa_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Identifier (e.g., 'default')
            $table->string('url'); // GOWA server URL
            $table->string('username'); // Basic auth username
            $table->text('password'); // Basic auth password (encrypted)
            $table->string('whatsapp_number'); // Nomor WA yang digunakan
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gowa_configs');
    }
};

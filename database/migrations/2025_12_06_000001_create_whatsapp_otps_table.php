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
        Schema::create('whatsapp_otps', function (Blueprint $table) {
            $table->id();
            $table->string('phone'); // Nomor telepon (format: 628xxx)
            $table->string('otp_code', 6); // 6 digit OTP
            $table->timestamp('expires_at'); // Waktu kadaluarsa
            $table->boolean('is_verified')->default(false);
            $table->integer('attempts')->default(0); // Jumlah percobaan verifikasi
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index('phone');
            $table->index(['phone', 'is_verified']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_otps');
    }
};

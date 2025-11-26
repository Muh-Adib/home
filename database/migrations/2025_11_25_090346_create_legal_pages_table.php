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
        Schema::create('legal_pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->index(); // Tidak unique, bisa berubah untuk archived
            $table->string('type'); // tos, privacy, cookies, refund, faq
            $table->string('version'); // V 1.0.0, V 1.0.1, dst
            $table->longText('content');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Untuk archive
            
            // Index untuk performa query
            $table->index(['slug', 'deleted_at']); // Untuk ambil active version
            $table->index(['type', 'deleted_at']); // Untuk group by type
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('legal_pages');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->enum('intent_type', ['booking_ready', 'researching', 'pricing_check', 'faq_only'])->default('researching');
            $table->string('intent_summary', 500)->nullable();
            $table->json('units_inquired')->nullable(); // array of slugs
            $table->date('preferred_check_in')->nullable();
            $table->date('preferred_check_out')->nullable();
            $table->integer('guests')->nullable();
            $table->json('tags')->nullable(); // ['family', 'weekend', 'mid_budget']
            $table->enum('urgency', ['urgent', 'this_week', 'this_month', 'flexible'])->default('flexible');
            $table->enum('persona_tag', ['family', 'couple', 'group', 'business', 'unknown'])->default('unknown');
            $table->enum('channel', ['web_chat', 'whatsapp', 'instagram'])->default('web_chat');
            $table->string('conversation_id', 100)->nullable();
            $table->enum('status', ['new', 'contacted', 'converted', 'lost'])->default('new');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'urgency']);
            $table->index('phone');
            $table->index('captured_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_leads');
    }
};

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
        Schema::create('whatsapp_bot_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->nullOnDelete();
            $table->string('from_number', 20)->comment('Sender WhatsApp number');
            $table->string('to_number', 20)->comment('Recipient WhatsApp number');
            $table->tinyInteger('direction')->unsigned()->default(1)->comment('1-Inbound (vendor to bot), 2-Outbound (bot to vendor)');
            $table->text('message_body');
            $table->string('wa_message_id')->nullable()->comment('WhatsApp message ID from provider');
            $table->tinyInteger('status')->unsigned()->default(1)->comment('1-Received, 2-Processed, 3-Failed, 4-Ignored');
            $table->text('parsed_intent')->nullable()->comment('Bot-parsed intent/action from inbound message');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_bot_logs');
    }
};

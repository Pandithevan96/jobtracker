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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->comment('Recipient user if applicable');
            $table->tinyInteger('channel')->unsigned()->default(1)->comment('1-WhatsApp, 2-SMS, 3-Email, 4-Push');
            $table->tinyInteger('type')->unsigned()->default(1)->comment('1-Delay Alert, 2-Status Update, 3-DC Generated, 4-Rejection Alert, 5-General');
            $table->string('recipient_number', 20)->nullable()->comment('Phone number for WhatsApp/SMS');
            $table->string('recipient_email')->nullable();
            $table->text('message');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Pending, 2-Sent, 3-Failed, 4-Delivered');
            $table->text('error_message')->nullable()->comment('Error detail if status is Failed');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

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
        Schema::create('subscription_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('razorpay_invoice_id')->unique()->comment('Razorpay invoice/payment ID');
            $table->string('razorpay_payment_id')->nullable()->comment('Razorpay payment capture ID');
            $table->decimal('amount', 10, 2)->comment('Amount in INR');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Pending, 2-Paid, 3-Failed, 4-Refunded');
            $table->tinyInteger('plan')->unsigned()->comment('1-Free, 2-Factory, 3-Industrial');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->json('razorpay_payload')->nullable()->comment('Full Razorpay webhook payload for audit');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_invoices');
    }
};

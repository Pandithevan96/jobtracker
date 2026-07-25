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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('razorpay_subscription_id')->unique()->comment('Razorpay subscription object ID');
            $table->string('razorpay_plan_id')->comment('Razorpay plan ID mapped to Factory/Industrial');
            $table->tinyInteger('plan')->unsigned()->default(1)->comment('1-Free, 2-Factory, 3-Industrial');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Active, 2-Halted, 3-Cancelled, 4-Expired, 5-Pending');
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

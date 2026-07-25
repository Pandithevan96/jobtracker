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
        Schema::create('quality_rejections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_order_id')->constrained('job_orders')->cascadeOnDelete();
            $table->foreignId('reported_by')->constrained('users')->restrictOnDelete();
            $table->decimal('rejected_qty', 10, 2)->comment('Number of rejected/scrap pieces');
            $table->decimal('accepted_qty', 10, 2)->comment('Number of accepted finished pieces');
            $table->tinyInteger('rejection_type')->unsigned()->default(1)->comment('1-Scrap, 2-Rework, 3-Short Supply');
            $table->text('rejection_reason')->nullable();
            $table->string('photo_path')->nullable()->comment('Photo evidence of rejection');
            $table->tinyInteger('status')->unsigned()->default(1)->comment('1-Open, 2-Acknowledged by Vendor, 3-Rework Dispatched, 4-Closed');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_rejections');
    }
};

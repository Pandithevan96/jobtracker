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
        Schema::create('job_order_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_order_id')->constrained('job_orders')->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->tinyInteger('from_status')->unsigned()->nullable()->comment('1-Draft, 2-Material Out, 3-WIP, 4-Ready, 5-Dispatched Back, 6-Completed, 7-Cancelled');
            $table->tinyInteger('to_status')->unsigned()->comment('1-Draft, 2-Material Out, 3-WIP, 4-Ready, 5-Dispatched Back, 6-Completed, 7-Cancelled');
            $table->tinyInteger('changed_via')->unsigned()->default(1)->comment('1-Web, 2-PWA, 3-WhatsApp Bot, 4-QR Scan');
            $table->string('photo_proof_path')->nullable()->comment('Vendor-uploaded photo proof of finished parts');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_order_status_logs');
    }
};

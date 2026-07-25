<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_order_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_order_id');
            $table->unsignedBigInteger('user_id');
            $table->text('note');
            // 1 = Principal/Admin, 2 = Vendor
            $table->tinyInteger('author_role')->default(1);
            $table->timestamps();

            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['job_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_order_notes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drawing_extracted_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->onDelete('set null');
            
            $table->string('drawing_path');
            $table->json('extracted_specs')->nullable();
            $table->json('confidence_scores')->nullable();
            $table->string('status')->default('pending'); // pending, extracted, failed
            $table->timestamp('extracted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drawing_extracted_specs');
    }
};

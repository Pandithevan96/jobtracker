<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_performance_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('vendor_id')->constrained('vendors')->onDelete('cascade');

            $table->float('overall_score', 5, 2)->default(100.00); // 0.00 to 100.00
            $table->float('on_time_delivery_score', 5, 2)->default(100.00);
            $table->float('quality_yield_score', 5, 2)->default(100.00);
            $table->float('capacity_utilization_score', 5, 2)->default(100.00);
            $table->json('process_type_breakdown')->nullable(); // scores grouped by process_type
            $table->integer('total_jobs_completed')->default(0);
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();

            $table->unique(['workspace_id', 'vendor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_performance_scores');
    }
};

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
        Schema::create('material_anomalies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('job_order_id')->constrained('job_orders')->cascadeOnDelete();
            $table->decimal('dispatched_qty', 10, 2);
            $table->decimal('returned_qty', 10, 2);
            $table->decimal('scrap_qty', 10, 2);
            $table->decimal('rework_qty', 10, 2);
            $table->decimal('implied_wip_qty', 10, 2);
            $table->decimal('variance_qty', 10, 2);
            $table->decimal('variance_pct', 5, 2);
            $table->string('status', 30)->default('anomaly'); // anomaly, balanced, pending
            $table->boolean('resolved')->default(false);
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('detected_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_anomalies');
    }
};

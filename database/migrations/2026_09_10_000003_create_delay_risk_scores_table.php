<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delay_risk_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('job_order_id')->constrained('job_orders')->onDelete('cascade');
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->onDelete('set null');
            
            $table->float('risk_score', 5, 2)->default(0.00); // 0.00 to 100.00
            $table->enum('risk_level', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->float('delay_probability', 4, 3)->default(0.000); // 0.000 to 1.000
            $table->integer('estimated_delay_days')->default(0);
            $table->json('risk_factors')->nullable(); // array of human-readable risk factors
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();

            $table->unique(['workspace_id', 'job_order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delay_risk_scores');
    }
};

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
        Schema::create('job_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('order_number', 50)->unique()->comment('System-generated unique job order number e.g. JO-2026-00001');
            $table->string('part_name');
            $table->string('part_number')->nullable()->comment('Internal part/drawing number');
            $table->text('description')->nullable();
            $table->string('process_type', 100)->nullable()->comment('e.g. Machining, Welding, Plating, Assembly');
            $table->decimal('quantity_sent', 10, 2)->comment('Raw material quantity dispatched to vendor');
            $table->string('uom', 20)->default('Nos')->comment('Unit of Measure: Nos, Kg, Ltrs, Mtrs');
            $table->date('due_date');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Draft, 2-Material Out, 3-WIP, 4-Ready, 5-Dispatched Back, 6-Completed, 7-Cancelled');
            $table->tinyInteger('priority')->unsigned()->default(2)->comment('1-Low, 2-Normal, 3-High, 4-Urgent');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_orders');
    }
};

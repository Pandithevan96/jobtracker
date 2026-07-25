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
        Schema::create('material_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_order_id')->constrained('job_orders')->cascadeOnDelete();
            $table->foreignId('reconciled_by')->constrained('users')->restrictOnDelete();

            // ITC-04 audit: dispatched = finished_received + scrap + shortage
            $table->decimal('qty_dispatched', 10, 2)->comment('Raw material sent to vendor');
            $table->decimal('qty_finished_received', 10, 2)->default(0)->comment('Finished/processed parts received back');
            $table->decimal('qty_scrap', 10, 2)->default(0)->comment('Scrap/waste returned by vendor');
            $table->decimal('qty_rejected', 10, 2)->default(0)->comment('Rejected pieces returned');
            $table->decimal('qty_shortage', 10, 2)->default(0)->comment('Unaccounted shortage (dispatched - received - scrap - rejected)');

            $table->tinyInteger('is_balanced')->unsigned()->default(0)->comment('0-Unbalanced, 1-Balanced');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_reconciliations');
    }
};

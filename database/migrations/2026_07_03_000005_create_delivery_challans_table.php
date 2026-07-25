<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('job_order_id')->constrained('job_orders')->restrictOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('challan_number', 50)->unique()->comment('Auto-generated e.g. DC-202607-0001');
            $table->string('qr_code')->unique()->comment('Auto-generated e.g. QR-XXXXXXXXXXXXXXXX');
            $table->tinyInteger('type')->unsigned()->default(1)->comment('1-Outward, 2-Inward');
            $table->tinyInteger('status')->unsigned()->default(1)
                ->comment('1-Issued, 2-Dispatched, 3-Acknowledged, 4-Completed, 5-Cancelled');
            $table->date('dispatch_date')->nullable();
            $table->date('estimated_delivery')->nullable();
            $table->string('vehicle_number', 20)->nullable();
            $table->string('driver_name')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('acknowledged_at')->nullable()->comment('When vendor scanned/acknowledged receipt');
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_challans');
    }
};
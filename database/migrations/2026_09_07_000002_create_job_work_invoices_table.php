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
        Schema::create('job_work_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->restrictOnDelete();
            $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->nullOnDelete();
            $table->foreignId('delivery_challan_id')->nullable()->constrained('delivery_challans')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->string('invoice_number', 50)->comment('Vendor Tax Invoice Number');
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('sac_code', 20)->default('9988')->comment('SAC code for job work machining/processing');

            $table->decimal('taxable_amount', 12, 2)->default(0.00)->comment('Labor/processing charges (excluding material value)');
            $table->decimal('gst_rate', 5, 2)->default(12.00)->comment('Total GST Rate % e.g. 12.00%');
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('igst_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00)->comment('Taxable Amount + GST');

            $table->tinyInteger('payment_status')->unsigned()->default(1)->index()
                ->comment('1-Unpaid, 2-Partially Paid, 3-Paid');
            $table->decimal('amount_paid', 12, 2)->default(0.00);

            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('job_work_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('job_work_invoices')->cascadeOnDelete();
            $table->string('service_description');
            $table->string('sac_code', 20)->default('9988');
            $table->decimal('quantity', 10, 2)->default(1.00);
            $table->string('uom', 20)->default('Nos');
            $table->decimal('rate', 10, 2)->default(0.00);
            $table->decimal('taxable_amount', 12, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_work_invoice_items');
        Schema::dropIfExists('job_work_invoices');
    }
};

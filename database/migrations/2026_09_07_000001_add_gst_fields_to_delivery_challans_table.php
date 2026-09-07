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
        Schema::table('delivery_challans', function (Blueprint $table) {
            $table->foreignId('parent_challan_id')->nullable()->after('vendor_id')
                ->constrained('delivery_challans')->nullOnDelete()
                ->comment('Original Outward DC being referenced (for Inward Return DCs)');
            $table->string('purpose_of_movement', 255)->nullable()->after('type')
                ->comment('e.g. Sent for job work, Returned after job work, Sent for testing');
            $table->string('eway_bill_number', 50)->nullable()->after('vehicle_number')
                ->comment('GST E-Way Bill Number for goods transit');
            $table->string('transporter_id', 50)->nullable()->after('driver_name')
                ->comment('Transporter GSTIN / Transporter ID');
            $table->string('vendor_dc_number', 50)->nullable()->after('challan_number')
                ->comment('Vendor outward DC number when receiving inward return');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_challans', function (Blueprint $table) {
            $table->dropForeign(['parent_challan_id']);
            $table->dropColumn([
                'parent_challan_id',
                'purpose_of_movement',
                'eway_bill_number',
                'transporter_id',
                'vendor_dc_number',
            ]);
        });
    }
};

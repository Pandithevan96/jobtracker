<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challan_id')->constrained('delivery_challans')->cascadeOnDelete();
            $table->string('part_name');
            $table->string('part_number', 100)->nullable();
            $table->string('hsn_code', 20)->nullable()->comment('HSN/SAC code for GST compliance');
            $table->decimal('quantity', 10, 2);
            $table->string('uom', 20)->default('Nos')->comment('Unit of Measure: Nos, Kg, Ltrs, Mtrs');
            $table->decimal('unit_value', 10, 2)->nullable()->comment('Rate per unit (for value declaration on DC)');
            $table->decimal('total_value', 12, 2)->nullable()->comment('quantity * unit_value');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challan_items');
    }
};
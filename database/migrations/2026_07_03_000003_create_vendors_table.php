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
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->comment('Linked user account if vendor registered');
            $table->string('shop_name');
            $table->string('contact_person')->nullable();
            $table->string('phone', 20);
            $table->string('whatsapp_number', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('gstin', 15)->nullable()->comment('Vendor GST Identification Number');
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('pincode', 10)->nullable();
            $table->string('qr_token', 64)->unique()->comment('Unique token for QR code scan-to-acknowledge');
            $table->tinyInteger('preferred_language')->unsigned()->default(1)->comment('1-English, 2-Tamil');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Active, 2-Inactive, 3-Suspended');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};

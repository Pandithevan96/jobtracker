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
        Schema::create('workspaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique()->comment('URL-friendly workspace identifier');
            $table->string('gstin', 15)->nullable()->comment('GST Identification Number');
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('pincode', 10)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('logo_path')->nullable();
            $table->tinyInteger('plan')->unsigned()->default(1)->comment('1-Free, 2-Factory, 3-Industrial');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Active, 2-Suspended, 3-Cancelled');
            $table->unsignedInteger('dc_count_this_month')->default(0)->comment('DC usage counter for Free plan limit (50/month)');
            $table->timestamp('dc_count_reset_at')->nullable()->comment('When the monthly DC counter was last reset');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workspaces');
    }
};

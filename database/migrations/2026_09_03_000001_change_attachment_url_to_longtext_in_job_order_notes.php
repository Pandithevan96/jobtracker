<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_order_notes', function (Blueprint $table) {
            $table->longText('attachment_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('job_order_notes', function (Blueprint $table) {
            $table->string('attachment_url', 255)->nullable()->change();
        });
    }
};

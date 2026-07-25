<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            // Store comma-separated relative paths of uploaded drawings/documents
            $table->text('drawing_urls')->nullable()->after('notes')
                  ->comment('JSON array of uploaded drawing/document paths');
        });
    }

    public function down(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropColumn('drawing_urls');
        });
    }
};

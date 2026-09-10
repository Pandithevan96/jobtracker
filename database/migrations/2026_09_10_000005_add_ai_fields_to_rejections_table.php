<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quality_rejections', function (Blueprint $table) {
            $table->json('ai_defect_tags')->nullable()->after('rejection_reason');
            $table->string('ai_suggested_category')->nullable()->after('ai_defect_tags'); // scrap, rework
            $table->float('ai_confidence', 5, 2)->nullable()->after('ai_suggested_category');
            $table->boolean('ai_reviewed')->default(false)->after('ai_confidence');
        });
    }

    public function down(): void
    {
        Schema::table('quality_rejections', function (Blueprint $table) {
            $table->dropColumn(['ai_defect_tags', 'ai_suggested_category', 'ai_confidence', 'ai_reviewed']);
        });
    }
};

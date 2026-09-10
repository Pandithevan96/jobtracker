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
        Schema::table('workspaces', function (Blueprint $table) {
            if (!Schema::hasColumn('workspaces', 'material_loss_tolerance_pct')) {
                $table->decimal('material_loss_tolerance_pct', 5, 2)->default(2.00)->after('dc_count_this_month');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            if (Schema::hasColumn('workspaces', 'material_loss_tolerance_pct')) {
                $table->dropColumn('material_loss_tolerance_pct');
            }
        });
    }
};

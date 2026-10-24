<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->timestamp('read_at')->nullable()->after('sent_at')->index();
        });

        // Older records already marked sent/delivered have historically been
        // treated as read by the UI, so retain that behavior during migration.
        DB::table('notifications')
            ->whereIn('status', [2, 4])
            ->update(['read_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['read_at']);
            $table->dropColumn('read_at');
        });
    }
};

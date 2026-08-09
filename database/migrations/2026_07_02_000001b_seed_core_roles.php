<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Insert the 3 core roles required for the application.
     * This runs immediately after the role table is created.
     */
    public function up(): void
    {
        DB::table('role')->insert([
            ['id' => 1, 'name' => 'Admin',     'description' => 'System administrator',           'status' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'Principal', 'description' => 'Factory / OEM owner',             'status' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'Vendor',    'description' => 'Sub-contractor / job-work vendor','status' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('role')->whereIn('id', [1, 2, 3])->delete();
    }
};

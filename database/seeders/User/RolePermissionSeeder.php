<?php

namespace Database\Seeders\User;

use App\Models\User\RolePermission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        RolePermission::query()->delete();
        DB::statement('ALTER TABLE role_permission AUTO_INCREMENT = 1');

        $permissions = [];

        // -------------------------------------------------------------------------
        // Role 1 (System Admin) - Full access on all 8 modules
        // -------------------------------------------------------------------------
        for ($i = 1; $i <= 8; $i++) {
            $permissions[] = [
                'role_id'     => 1,
                'module_id'   => $i,
                'can_access'  => true,
                'can_view'    => true,
                'can_create'  => true,
                'can_edit'    => true,
                'can_delete'  => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }

        // -------------------------------------------------------------------------
        // Role 2 (Principal) - Full access on all 8 modules (except subscription deletion usually, but let's give full dashboard control)
        // -------------------------------------------------------------------------
        for ($i = 1; $i <= 8; $i++) {
            $permissions[] = [
                'role_id'     => 2,
                'module_id'   => $i,
                'can_access'  => true,
                'can_view'    => true,
                'can_create'  => true,
                'can_edit'    => true,
                'can_delete'  => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }

        // -------------------------------------------------------------------------
        // Role 3 (Vendor) - Read/Status-only access
        // -------------------------------------------------------------------------
        // 1. Dashboard (Read only)
        $permissions[] = [
            'role_id'     => 3,
            'module_id'   => 1,
            'can_access'  => true,
            'can_view'    => true,
            'can_create'  => false,
            'can_edit'    => false,
            'can_delete'  => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];
        // 2. Job Orders (Access, View, Edit status)
        $permissions[] = [
            'role_id'     => 3,
            'module_id'   => 4,
            'can_access'  => true,
            'can_view'    => true,
            'can_create'  => false,
            'can_edit'    => true, // to update WIP/Ready status
            'can_delete'  => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];
        // 3. Delivery Challans (Access, View, Edit to acknowledge receipt)
        $permissions[] = [
            'role_id'     => 3,
            'module_id'   => 5,
            'can_access'  => true,
            'can_view'    => true,
            'can_create'  => false,
            'can_edit'    => true, // to scan/acknowledge receipt
            'can_delete'  => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];

        // Bulk insert
        RolePermission::insert($permissions);
    }
}

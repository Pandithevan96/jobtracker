<?php

namespace Database\Seeders\User;

use App\Models\User\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'id' => 1,
                'name' => 'System Admin',
                'description' => 'Super Administrator with full access to manage workspaces, billing, and system configuration.',
                'status' => Role::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'Principal',
                'description' => 'Workspace owner / Lead manufacturer managing vendors, job orders, and delivery challans.',
                'status' => Role::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'name' => 'Vendor',
                'description' => 'Subcontractor job work unit executing machining, welding, etc.',
                'status' => Role::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['id' => $role['id']], $role);
        }
    }
}

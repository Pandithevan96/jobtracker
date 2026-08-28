<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        // 1. Ensure core modules exist in the `module` table
        $modules = [
            [
                'id'          => 1,
                'name'        => 'Dashboard',
                'description' => 'Main performance and statistics dashboard.',
                'pathname'    => '/admin/dashboard',
                'icon'        => 'LayoutDashboard',
                'order'       => 1,
                'status'      => 1,
            ],
            [
                'id'          => 2,
                'name'        => 'Workspace Management',
                'description' => 'Create and configure tenant workspaces.',
                'pathname'    => '/admin/workspaces',
                'icon'        => 'Building',
                'order'       => 2,
                'status'      => 1,
            ],
            [
                'id'          => 3,
                'name'        => 'Vendor Management',
                'description' => 'Manage subcontractor vendor profiles.',
                'pathname'    => '/admin/vendors',
                'icon'        => 'Users',
                'order'       => 3,
                'status'      => 1,
            ],
            [
                'id'          => 4,
                'name'        => 'Job Order Management',
                'description' => 'Create, list, and update status of job orders.',
                'pathname'    => '/admin/job-orders',
                'icon'        => 'ClipboardList',
                'order'       => 4,
                'status'      => 1,
            ],
            [
                'id'          => 5,
                'name'        => 'Delivery Challan Management',
                'description' => 'Issue and verify GST outward/inward delivery challans.',
                'pathname'    => '/admin/challans',
                'icon'        => 'FileText',
                'order'       => 5,
                'status'      => 1,
            ],
            [
                'id'          => 6,
                'name'        => 'Quality Rejections',
                'description' => 'Track rejected goods and scrap reworks.',
                'pathname'    => '/admin/rejections',
                'icon'        => 'AlertTriangle',
                'order'       => 6,
                'status'      => 1,
            ],
            [
                'id'          => 7,
                'name'        => 'Material Reconciliations',
                'description' => 'ITC-04 raw material vs finished goods reconciliation.',
                'pathname'    => '/admin/reconciliations',
                'icon'        => 'RefreshCw',
                'order'       => 7,
                'status'      => 1,
            ],
            [
                'id'          => 8,
                'name'        => 'Subscription Management',
                'description' => 'Manage Razorpay subscription plans.',
                'pathname'    => '/admin/subscriptions',
                'icon'        => 'CreditCard',
                'order'       => 8,
                'status'      => 1,
            ],
        ];

        foreach ($modules as $mod) {
            DB::table('module')->updateOrInsert(
                ['id' => $mod['id']],
                array_merge($mod, [
                    'updated_at' => $now,
                    'created_at' => $now,
                ])
            );
        }

        // 2. Ensure System Admin (role_id = 1) and Principal (role_id = 2) have full access to all 8 modules
        foreach ([1, 2] as $roleId) {
            for ($i = 1; $i <= 8; $i++) {
                DB::table('role_permission')->updateOrInsert(
                    ['role_id' => $roleId, 'module_id' => $i],
                    [
                        'can_access' => true,
                        'can_view'   => true,
                        'can_create' => true,
                        'can_edit'   => true,
                        'can_delete' => true,
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            }
        }

        // 3. Grant Vendor (role_id = 3) read access to Workspace Management (module_id = 2)
        DB::table('role_permission')->updateOrInsert(
            ['role_id' => 3, 'module_id' => 2],
            [
                'can_access' => true,
                'can_view'   => true,
                'can_create' => false,
                'can_edit'   => false,
                'can_delete' => false,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        // 4. Grant Vendor (role_id = 3) read access to Vendor Management (module_id = 3)
        DB::table('role_permission')->updateOrInsert(
            ['role_id' => 3, 'module_id' => 3],
            [
                'can_access' => true,
                'can_view'   => true,
                'can_create' => false,
                'can_edit'   => false,
                'can_delete' => false,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        // 5. Grant Vendor (role_id = 3) view/acknowledge access to Quality Rejections (module_id = 6)
        DB::table('role_permission')->updateOrInsert(
            ['role_id' => 3, 'module_id' => 6],
            [
                'can_access' => true,
                'can_view'   => true,
                'can_create' => false,
                'can_edit'   => true,
                'can_delete' => false,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('role_permission')
            ->where('role_id', 3)
            ->whereIn('module_id', [2, 3, 6])
            ->delete();
    }
};

<?php

namespace Database\Seeders\User;

use App\Models\User\Module;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ModuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Module::query()->delete();
        DB::statement('ALTER TABLE module AUTO_INCREMENT = 1');

        $modules = [
            [
                'id' => 1,
                'name' => 'Dashboard',
                'description' => 'Main performance and statistics dashboard.',
                'pathname' => '/admin/dashboard',
                'icon' => 'LayoutDashboard',
                'order' => 1,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'Workspace Management',
                'description' => 'Create and configure tenant workspaces.',
                'pathname' => '/admin/workspaces',
                'icon' => 'Building',
                'order' => 2,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'name' => 'Vendor Management',
                'description' => 'Manage subcontractor vendor profiles.',
                'pathname' => '/admin/vendors',
                'icon' => 'Users',
                'order' => 3,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'name' => 'Job Order Management',
                'description' => 'Create, list, and update status of job orders.',
                'pathname' => '/admin/job-orders',
                'icon' => 'ClipboardList',
                'order' => 4,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 5,
                'name' => 'Delivery Challan Management',
                'description' => 'Issue and verify GST outward/inward delivery challans.',
                'pathname' => '/admin/challans',
                'icon' => 'FileText',
                'order' => 5,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 6,
                'name' => 'Quality Rejections',
                'description' => 'Track rejected goods and scrap reworks.',
                'pathname' => '/admin/rejections',
                'icon' => 'AlertTriangle',
                'order' => 6,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 7,
                'name' => 'Material Reconciliations',
                'description' => 'ITC-04 raw material vs finished goods reconciliation.',
                'pathname' => '/admin/reconciliations',
                'icon' => 'RefreshCw',
                'order' => 7,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 8,
                'name' => 'Subscription Management',
                'description' => 'Manage Razorpay subscription plans.',
                'pathname' => '/admin/subscriptions',
                'icon' => 'CreditCard',
                'order' => 8,
                'status' => Module::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($modules as $module) {
            Module::create($module);
        }
    }
}

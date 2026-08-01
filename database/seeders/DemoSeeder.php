<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User\User;
use App\Models\Workspace\Workspace;
use App\Models\Vendor\Vendor;
use App\Models\Job\JobOrder;
use App\Models\Job\JobOrderStatusLog;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ---------------------------------------------------------------------
        // 1. Create the 4 Registered User Accounts
        // ---------------------------------------------------------------------
        $user1 = User::firstOrCreate(
            ['email' => 'user1@jobtrack.com'],
            [
                'name'     => 'User 1 (Titan Works)',
                'password' => Hash::make('password123'),
                'role_id'  => 2, // Principal
                'status'   => 1,
            ]
        );

        $user2 = User::firstOrCreate(
            ['email' => 'user2@jobtrack.com'],
            [
                'name'     => 'User 2 (Precision Tech)',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
                'status'   => 1,
            ]
        );

        $user3 = User::firstOrCreate(
            ['email' => 'user3@jobtrack.com'],
            [
                'name'     => 'User 3 (Sri Krishna Tools)',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
                'status'   => 1,
            ]
        );

        $user4 = User::firstOrCreate(
            ['email' => 'user4@jobtrack.com'],
            [
                'name'     => 'User 4 (Apex Enterprise)',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
                'status'   => 1,
            ]
        );

        // Also ensure legacy test accounts if present
        $dwayne = User::where('email', 'dwaynedevaq96@gmail.com')->first();
        if ($dwayne) {
            $dwayne->update(['password' => Hash::make('password123')]);
        }

        // ---------------------------------------------------------------------
        // 2. Create 1 Workspace for Each User (as Owner/Principal)
        // ---------------------------------------------------------------------
        $ws1 = Workspace::firstOrCreate(
            ['owner_id' => $user1->id],
            [
                'name'    => 'Titan Works Ltd',
                'slug'    => 'titan-works-ltd',
                'city'    => 'Chennai',
                'phone'   => '9876543211',
                'plan'    => Workspace::PLAN_FREE,
                'status'  => Workspace::STATUS_ACTIVE,
            ]
        );

        $ws2 = Workspace::firstOrCreate(
            ['owner_id' => $user2->id],
            [
                'name'    => 'Precision Tech Dynamics',
                'slug'    => 'precision-tech-dynamics',
                'city'    => 'Coimbatore',
                'phone'   => '9876543212',
                'plan'    => Workspace::PLAN_FREE,
                'status'  => Workspace::STATUS_ACTIVE,
            ]
        );

        $ws3 = Workspace::firstOrCreate(
            ['owner_id' => $user3->id],
            [
                'name'    => 'Sri Krishna Heat Treatment',
                'slug'    => 'sri-krishna-heat-treatment',
                'city'    => 'Coimbatore',
                'phone'   => '9876543213',
                'plan'    => Workspace::PLAN_FREE,
                'status'  => Workspace::STATUS_ACTIVE,
            ]
        );

        $ws4 = Workspace::firstOrCreate(
            ['owner_id' => $user4->id],
            [
                'name'    => 'Apex Enterprise',
                'slug'    => 'apex-enterprise',
                'city'    => 'Trichy',
                'phone'   => '9876543214',
                'plan'    => Workspace::PLAN_FREE,
                'status'  => Workspace::STATUS_ACTIVE,
            ]
        );

        // ---------------------------------------------------------------------
        // 3. Link Vendor Relationships according to Flow Diagram:
        //    User 1 (Principal) -> User 2 (Vendor)
        //    User 1 (Principal) -> User 3 (Vendor)
        //    User 4 (Principal) -> User 3 (Vendor)
        // ---------------------------------------------------------------------

        // --- Workspace 1 (User 1) Vendors ---
        // Vendor A: User 2
        $vendor1_2 = Vendor::firstOrCreate(
            ['workspace_id' => $ws1->id, 'user_id' => $user2->id],
            [
                'shop_name'      => 'Precision Tech Vendor Unit',
                'contact_person' => 'User 2 Admin',
                'email'          => 'user2@jobtrack.com',
                'phone'          => '9876543212',
                'status'         => Vendor::STATUS_ACTIVE,
            ]
        );
        $ws1->members()->syncWithoutDetaching([
            $user2->id => [
                'role'   => Workspace::MEMBER_ROLE_VENDOR,
                'status' => Workspace::MEMBER_STATUS_ACTIVE,
            ],
        ]);

        // Vendor B: User 3
        $vendor1_3 = Vendor::firstOrCreate(
            ['workspace_id' => $ws1->id, 'user_id' => $user3->id],
            [
                'shop_name'      => 'Sri Krishna Heat Treatment Unit',
                'contact_person' => 'User 3 Admin',
                'email'          => 'user3@jobtrack.com',
                'phone'          => '9876543213',
                'status'         => Vendor::STATUS_ACTIVE,
            ]
        );
        $ws1->members()->syncWithoutDetaching([
            $user3->id => [
                'role'   => Workspace::MEMBER_ROLE_VENDOR,
                'status' => Workspace::MEMBER_STATUS_ACTIVE,
            ],
        ]);

        // --- Workspace 4 (User 4) Vendor ---
        // Vendor C: User 3
        $vendor4_3 = Vendor::firstOrCreate(
            ['workspace_id' => $ws4->id, 'user_id' => $user3->id],
            [
                'shop_name'      => 'Sri Krishna Heat Treatment (Apex Branch)',
                'contact_person' => 'User 3 Admin',
                'email'          => 'user3@jobtrack.com',
                'phone'          => '9876543213',
                'status'         => Vendor::STATUS_ACTIVE,
            ]
        );
        $ws4->members()->syncWithoutDetaching([
            $user3->id => [
                'role'   => Workspace::MEMBER_ROLE_VENDOR,
                'status' => Workspace::MEMBER_STATUS_ACTIVE,
            ],
        ]);

        // ---------------------------------------------------------------------
        // 4. Create Job Orders for Vendors from Principals
        // ---------------------------------------------------------------------

        // Job Order 1: User 1 -> User 2
        $jo1 = JobOrder::create([
            'workspace_id'  => $ws1->id,
            'vendor_id'     => $vendor1_2->id,
            'created_by'    => $user1->id,
            'part_name'     => 'CNC Shaft Pins M12 x 150mm',
            'part_number'   => 'JO-PART-101',
            'description'   => 'CNC Turning & Precision Grinding',
            'process_type'  => 'Machining & Grinding',
            'quantity_sent' => 500,
            'uom'           => 'Pcs',
            'due_date'      => date('Y-m-d', strtotime('+14 days')),
            'status'        => JobOrder::STATUS_MATERIAL_OUT,
            'priority'      => JobOrder::PRIORITY_NORMAL,
            'notes'         => 'Dispatch raw material EN8 D-Bar Stock',
        ]);
        JobOrderStatusLog::create([
            'job_order_id' => $jo1->id,
            'changed_by'   => $user1->id,
            'to_status'    => JobOrder::STATUS_MATERIAL_OUT,
            'changed_via'  => JobOrderStatusLog::VIA_WEB,
            'notes'        => 'Job Order created and dispatched to User 2.',
        ]);

        // Job Order 2: User 1 -> User 3
        $jo2 = JobOrder::create([
            'workspace_id'  => $ws1->id,
            'vendor_id'     => $vendor1_3->id,
            'created_by'    => $user1->id,
            'part_name'     => 'Hard Chrome Shaft Rods Ø25mm',
            'part_number'   => 'JO-PART-102',
            'description'   => 'Heat Treatment & Hard Chrome Plating',
            'process_type'  => 'Heat Treatment',
            'quantity_sent' => 300,
            'uom'           => 'Nos',
            'due_date'      => date('Y-m-d', strtotime('+20 days')),
            'status'        => JobOrder::STATUS_MATERIAL_OUT,
            'priority'      => JobOrder::PRIORITY_HIGH,
            'notes'         => '50 Micron plating thickness certificate required',
        ]);
        JobOrderStatusLog::create([
            'job_order_id' => $jo2->id,
            'changed_by'   => $user1->id,
            'to_status'    => JobOrder::STATUS_MATERIAL_OUT,
            'changed_via'  => JobOrderStatusLog::VIA_WEB,
            'notes'        => 'Job Order created and dispatched to User 3.',
        ]);

        // Job Order 3: User 4 -> User 3
        $jo3 = JobOrder::create([
            'workspace_id'  => $ws4->id,
            'vendor_id'     => $vendor4_3->id,
            'created_by'    => $user4->id,
            'part_name'     => 'Titanium Turbine Flange M16',
            'part_number'   => 'JO-PART-401',
            'description'   => '5-Axis CNC Milling & Tempering',
            'process_type'  => '5-Axis Milling',
            'quantity_sent' => 120,
            'uom'           => 'Pcs',
            'due_date'      => date('Y-m-d', strtotime('+10 days')),
            'status'        => JobOrder::STATUS_MATERIAL_OUT,
            'priority'      => JobOrder::PRIORITY_URGENT,
            'notes'         => 'Urgent defense order component',
        ]);
        JobOrderStatusLog::create([
            'job_order_id' => $jo3->id,
            'changed_by'   => $user4->id,
            'to_status'    => JobOrder::STATUS_MATERIAL_OUT,
            'changed_via'  => JobOrderStatusLog::VIA_WEB,
            'notes'        => 'Job Order created and dispatched to User 3.',
        ]);
    }
}

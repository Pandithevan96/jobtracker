<?php

namespace Database\Seeders;

use App\Models\User\User;
use App\Models\Workspace\Workspace;
use App\Models\Vendor\Vendor;
use App\Models\Job\JobOrder;
use App\Models\Job\JobOrderStatusLog;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class JobOrderDemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create or fetch Principal User (dwaynedevaq96@gmail.com)
        $principal = User::firstOrCreate(
            ['email' => 'dwaynedevaq96@gmail.com'],
            [
                'name'               => 'Dwayne Dev',
                'phone'              => '9876543210',
                'password'           => Hash::make('password'),
                'role_id'            => User::ROLE_PRINCIPAL,
                'status'             => User::STATUS_ACTIVE,
                'preferred_language' => User::LANG_ENGLISH,
                'plan'               => User::PLAN_INDUSTRIAL,
            ]
        );

        // 2. Create or fetch Vendor User account (codifieddude@gmail.com)
        $vendorUser = User::firstOrCreate(
            ['email' => 'codifieddude@gmail.com'],
            [
                'name'               => 'Codified Dude',
                'phone'              => '9123456789',
                'password'           => Hash::make('password'),
                'role_id'            => User::ROLE_VENDOR,
                'status'             => User::STATUS_ACTIVE,
                'preferred_language' => User::LANG_ENGLISH,
            ]
        );

        // 3. Create or fetch Principal Workspace
        $workspace = Workspace::firstOrCreate(
            ['owner_id' => $principal->id],
            [
                'name'    => 'Dwayne Precision Engineering',
                'slug'    => 'dwayne-precision-engineering',
                'gstin'   => '33AAAAA0000A1Z5',
                'address' => '123 Industrial Estate',
                'city'    => 'Chennai',
                'state'   => 'Tamil Nadu',
                'pincode' => '600028',
                'phone'   => '9876543210',
                'plan'    => Workspace::PLAN_INDUSTRIAL,
                'status'  => Workspace::STATUS_ACTIVE,
            ]
        );

        // Attach principal as Principal in workspace_users pivot
        $workspace->members()->syncWithoutDetaching([
            $principal->id => [
                'role'   => Workspace::MEMBER_ROLE_PRINCIPAL,
                'status' => Workspace::MEMBER_STATUS_ACTIVE,
            ],
        ]);

        // Attach vendor user as Vendor in workspace_users pivot
        $workspace->members()->syncWithoutDetaching([
            $vendorUser->id => [
                'role'   => Workspace::MEMBER_ROLE_VENDOR,
                'status' => Workspace::MEMBER_STATUS_ACTIVE,
            ],
        ]);

        // 4. Create Vendor record linked to vendorUser and workspace
        $vendor = Vendor::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'email'        => 'codifieddude@gmail.com',
            ],
            [
                'user_id'            => $vendorUser->id,
                'shop_name'          => 'Codified Machine Tools',
                'contact_person'     => 'Codified Dude',
                'phone'              => '9123456789',
                'whatsapp_number'    => '9123456789',
                'gstin'              => '33BBBCC1111B1Z2',
                'address'            => '45 Vendor Park',
                'city'               => 'Coimbatore',
                'pincode'            => '641001',
                'preferred_language' => Vendor::LANG_ENGLISH,
                'status'             => Vendor::STATUS_ACTIVE,
            ]
        );

        // Ensure user_id is linked
        if ($vendor->user_id !== $vendorUser->id) {
            $vendor->update(['user_id' => $vendorUser->id]);
        }

        // 5. Create Demo Job Order assigned to Codified Dude vendor
        $jobOrder = JobOrder::create([
            'workspace_id'  => $workspace->id,
            'vendor_id'     => $vendor->id,
            'created_by'    => $principal->id,
            'part_name'     => 'Camshaft Gear Wheel (Precision Cut)',
            'part_number'   => 'CGW-2026-X9',
            'description'   => 'Precision CNC milling and hardening for high-torque automotive engine camshafts.',
            'process_type'  => 'CNC Milling & Heat Treatment',
            'quantity_sent' => 150,
            'uom'           => 'Nos',
            'due_date'      => now()->addDays(7)->format('Y-m-d'),
            'status'        => JobOrder::STATUS_MATERIAL_OUT,
            'priority'      => JobOrder::PRIORITY_HIGH,
            'notes'         => 'High priority order. Verify tolerances before heat treatment dispatch.',
        ]);

        // 6. Log status change
        JobOrderStatusLog::create([
            'job_order_id' => $jobOrder->id,
            'changed_by'   => $principal->id,
            'from_status'  => null,
            'to_status'    => JobOrder::STATUS_MATERIAL_OUT,
            'changed_via'  => JobOrderStatusLog::VIA_WEB,
            'notes'        => 'Job Order created and dispatched to vendor.',
        ]);

        // 7. Dispatch Notification so it appears in notification logs
        NotificationService::dispatchJobOrderCreated($jobOrder->fresh(['vendor']), $principal);
    }
}

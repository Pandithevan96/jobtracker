<?php

use App\Models\User\RolePermission;
use App\Models\User\User;
use App\Helpers\HelperFunction;

// Check what's in role_permission table for Principal (role_id=2)
$perms = RolePermission::where('role_id', 2)->orderBy('module_id')->get();

echo "=== Role 2 (Principal) Permissions in DB ===" . PHP_EOL;
if ($perms->isEmpty()) {
    echo "  !! NO PERMISSIONS FOUND for role_id=2 !!" . PHP_EOL;
} else {
    foreach ($perms as $p) {
        echo "  module_id={$p->module_id} can_access={$p->can_access} can_view={$p->can_view} can_create={$p->can_create} can_edit={$p->can_edit} can_delete={$p->can_delete}" . PHP_EOL;
    }
}

echo PHP_EOL . "=== Role 3 (Vendor) Permissions in DB ===" . PHP_EOL;
$vendorPerms = RolePermission::where('role_id', 3)->orderBy('module_id')->get();
if ($vendorPerms->isEmpty()) {
    echo "  !! NO PERMISSIONS FOUND for role_id=3 !!" . PHP_EOL;
} else {
    foreach ($vendorPerms as $p) {
        echo "  module_id={$p->module_id} can_access={$p->can_access} can_view={$p->can_view}" . PHP_EOL;
    }
}

echo PHP_EOL . "=== Principal User Token/Auth Check ===" . PHP_EOL;
$u = User::where('email', 'dwaynedevaq96@gmail.com')->first();
echo "  user id={$u->id} role_id={$u->role_id}" . PHP_EOL;
echo "  Personal tokens count: " . $u->tokens()->count() . PHP_EOL;

<?php

$principal = \App\Models\User\User::where('email', 'dwaynedevaq96@gmail.com')->first();
$vendor    = \App\Models\User\User::where('email', 'dwaynedeva1996@gmail.com')->first();

echo "=== Users ===" . PHP_EOL;
echo "Principal: id={$principal->id} email={$principal->email} role_id={$principal->role_id}" . PHP_EOL;
echo "Vendor:    id={$vendor->id}    email={$vendor->email}    role_id={$vendor->role_id}" . PHP_EOL;

echo PHP_EOL . "=== Principal's Workspaces ===" . PHP_EOL;
$workspaces = \App\Models\Workspace\Workspace::where('owner_id', $principal->id)->get();
foreach ($workspaces as $ws) {
    echo "  Workspace id={$ws->id} name={$ws->name}" . PHP_EOL;

    $vendors = \App\Models\Vendor\Vendor::where('workspace_id', $ws->id)->get();
    foreach ($vendors as $v) {
        echo "    Vendor id={$v->id} shop_name={$v->shop_name} email={$v->email} user_id={$v->user_id}" . PHP_EOL;
    }
}

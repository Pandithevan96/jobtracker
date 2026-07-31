<?php

$vendorUser = \App\Models\User\User::where('email', 'dwaynedeva1996@gmail.com')->first();

// Vendor record in the principal's workspace that matches this email
$vendorRecord = \App\Models\Vendor\Vendor::where('email', 'dwaynedeva1996@gmail.com')
    ->where('workspace_id', 1)
    ->first();

if (!$vendorRecord) {
    echo "ERROR: Vendor record not found!" . PHP_EOL;
    return;
}

$vendorRecord->user_id = $vendorUser->id;
$vendorRecord->save();

echo "SUCCESS: Linked vendor record!" . PHP_EOL;
echo "  Vendor id={$vendorRecord->id} shop={$vendorRecord->shop_name}" . PHP_EOL;
echo "  Linked to user_id={$vendorRecord->user_id} ({$vendorUser->email})" . PHP_EOL;

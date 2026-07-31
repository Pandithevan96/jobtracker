<?php

$v = \App\Models\Vendor\Vendor::with('user', 'workspace')->find(1);

echo "=== Final Verification ===" . PHP_EOL;
echo "Vendor id:       {$v->id}" . PHP_EOL;
echo "Shop name:       {$v->shop_name}" . PHP_EOL;
echo "Vendor email:    {$v->email}" . PHP_EOL;
echo "Workspace:       id={$v->workspace->id} name={$v->workspace->name}" . PHP_EOL;
echo "Workspace owner: id={$v->workspace->owner_id}" . PHP_EOL;
echo "Linked user_id:  {$v->user_id}" . PHP_EOL;
echo "Linked user:     {$v->user->email} (role_id={$v->user->role_id})" . PHP_EOL;

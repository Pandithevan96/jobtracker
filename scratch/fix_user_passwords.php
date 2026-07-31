<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User\User;

$users = User::all();
echo "Found " . count($users) . " users in database.\n";

foreach ($users as $user) {
    echo "Updating user: " . $user->email . "\n";
    // Using raw DB update to guarantee clean Bcrypt string without double casting
    \Illuminate\Support\Facades\DB::table('users')
        ->where('id', $user->id)
        ->update([
            'password' => \Illuminate\Support\Facades\Hash::make('Deva@12345'),
        ]);
}

echo "ALL USER PASSWORDS RESET TO 'Deva@12345' WITH VALID BCRYPT HASHES!\n";

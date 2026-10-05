<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\User\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

$users = User::all();
echo 'Found '.count($users)." users in database.\n";

foreach ($users as $user) {
    echo 'Updating user: '.$user->email."\n";
    // Using raw DB update to guarantee clean Bcrypt string without double casting
    DB::table('users')
        ->where('id', $user->id)
        ->update([
            'password' => Hash::make('Deva@12345'),
        ]);
}

echo "ALL USER PASSWORDS RESET TO 'Deva@12345' WITH VALID BCRYPT HASHES!\n";

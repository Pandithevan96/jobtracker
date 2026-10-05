<?php

use App\Models\User\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

try {
    $user = User::first();
    echo 'User: '.$user->email."\n";
    $token = $user->createToken('auth_token')->plainTextToken;
    echo 'SANCTUM TOKEN: '.$token."\n";
} catch (Throwable $e) {
    echo 'ERROR: '.$e->getMessage()."\n";
}

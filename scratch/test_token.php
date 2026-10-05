<?php

use App\Models\User\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

try {
    $user = User::first();
    echo 'Found user: '.$user->email."\n";
    $token = $user->createToken('test_token')->accessToken;
    echo 'SUCCESS TOKEN: '.substr($token, 0, 30)."...\n";
} catch (Throwable $e) {
    echo 'ERROR: '.$e->getMessage()."\n";
    echo 'FILE: '.$e->getFile().':'.$e->getLine()."\n";
    echo $e->getTraceAsString()."\n";
}

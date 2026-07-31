<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $user = \App\Models\User\User::first();
    echo "User: " . $user->email . "\n";
    $token = $user->createToken('auth_token')->plainTextToken;
    echo "SANCTUM TOKEN: " . $token . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

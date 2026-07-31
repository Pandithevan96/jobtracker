<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$request = Request::create('/api/v1/auth/register', 'POST', [
    'name' => 'Test Direct User',
    'email' => 'direct_test_' . rand(1000, 9999) . '@gmail.com',
    'phone' => '9876543210',
    'password' => 'Test@1234',
    'password_confirmation' => 'Test@1234',
    'gender' => 1,
    'role' => 2
]);

try {
    $controller = new \App\Http\Controllers\Auth\AuthController();
    $response = $controller->register($request);
    echo "STATUS CODE: " . $response->getStatusCode() . "\n";
    echo "CONTENT: " . $response->getContent() . "\n";
} catch (\Throwable $e) {
    echo "EXCEPTION THROWN: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}

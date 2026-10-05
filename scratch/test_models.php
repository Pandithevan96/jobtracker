<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$key = env('GEMINI_API_KEY') ?: config('services.gemini.api_key');
if (!$key) {
    echo "No API key found.";
    exit;
}
$ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models?key=' . $key);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);

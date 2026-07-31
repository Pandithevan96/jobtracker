<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

echo "Testing Carbon methods:\n";
try {
    echo "toIso8601String: " . now()->toIso8601String() . "\n";
} catch (\Throwable $e) {
    echo "toIso8601String ERROR: " . $e->getMessage() . "\n";
}

try {
    echo "toISOString: " . now()->toISOString() . "\n";
} catch (\Throwable $e) {
    echo "toISOString ERROR: " . $e->getMessage() . "\n";
}

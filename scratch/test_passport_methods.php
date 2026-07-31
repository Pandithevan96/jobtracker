<?php

require __DIR__ . '/../vendor/autoload.php';

echo "Checking Passport methods:\n";
$methods = get_class_methods(\Laravel\Passport\Passport::class);
foreach ($methods as $m) {
    if (str_contains(strtolower($m), 'key') || str_contains(strtolower($m), 'client')) {
        echo "- " . $m . "\n";
    }
}

<?php
require __DIR__ . '/../vendor/autoload.php';

try {
    $im = new \Imagick();
    $im->setResolution(150, 150);
    // Create a simple image blob test
    $im->newImage(100, 100, new \ImagickPixel('white'));
    $im->setImageFormat('jpeg');
    $blob = $im->getImageBlob();
    echo "Imagick JPEG creation success! Blob bytes: " . strlen($blob) . "\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

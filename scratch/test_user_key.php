<?php
$key = 'AQ.AbBRN6K9v5zIKUul1FsXljk5BedGgSNtvHwaMd3mE1pEeogwpQ';

$ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models?key=' . $key);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo "MODELS:\n";
echo $response;
echo "\n\n";

$ch2 = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $key);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode([
    'contents' => [
        ['parts' => [['text' => 'Hello']]]
    ]
]));
$response2 = curl_exec($ch2);
echo "GENERATE CONTENT WITH gemini-1.5-flash:\n";
echo $response2;
echo "\n\n";

$ch3 = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' . $key);
curl_setopt($ch3, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch3, CURLOPT_POST, true);
curl_setopt($ch3, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch3, CURLOPT_POSTFIELDS, json_encode([
    'contents' => [
        ['parts' => [['text' => 'Hello']]]
    ]
]));
$response3 = curl_exec($ch3);
echo "GENERATE CONTENT WITH gemini-1.5-flash-latest:\n";
echo $response3;
echo "\n";

<?php
$key = 'AQ.AbBRN6K9v5zIKUul1FsXljk5BedGgSNtvHwaMd3mE1pEeogwpQ';

$ch = curl_init('https://generativelanguage.googleapis.com/v1/models?key=' . $key);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo "MODELS V1:\n";
echo $response;
echo "\n\n";

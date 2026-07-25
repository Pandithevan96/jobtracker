<?php

$privateKey = null;
if (file_exists(storage_path('oauth-private.key'))) {
    $privateKey = str_replace(["\r\n", "\r"], "\n", file_get_contents(storage_path('oauth-private.key')));
}

$publicKey = null;
if (file_exists(storage_path('oauth-public.key'))) {
    $publicKey = str_replace(["\r\n", "\r"], "\n", file_get_contents(storage_path('oauth-public.key')));
}

return [

    /*
    |--------------------------------------------------------------------------
    | Passport Guard
    |--------------------------------------------------------------------------
    */
    'guard' => 'web',

    'middleware' => [],

    /*
    |--------------------------------------------------------------------------
    | Encryption Keys
    |--------------------------------------------------------------------------
    */
    'private_key' => env('PASSPORT_PRIVATE_KEY', $privateKey),

    'public_key' => env('PASSPORT_PUBLIC_KEY', $publicKey),

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    */
    'connection' => env('PASSPORT_CONNECTION'),

];

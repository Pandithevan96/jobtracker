<?php

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
    'private_key' => env('PASSPORT_PRIVATE_KEY', file_exists(storage_path('oauth-private.key')) ? storage_path('oauth-private.key') : null),

    'public_key' => env('PASSPORT_PUBLIC_KEY', file_exists(storage_path('oauth-public.key')) ? storage_path('oauth-public.key') : null),

    /*
    |--------------------------------------------------------------------------
    | Passport Client Credentials
    |--------------------------------------------------------------------------
    */
    'personal_access_client' => [
        'id' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_ID', '019f978e-eeb7-7398-ad9c-35fa42b797bb'),
        'secret' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET', '$2y$12$daDB5mAeJaAC.KoLCdRiMOG8v7p2SLzWjgapmwI7w4i4a0IjYyxv2'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    */
    'connection' => env('PASSPORT_CONNECTION'),

];

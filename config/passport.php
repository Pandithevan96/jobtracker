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
    | If PASSPORT_PRIVATE_KEY / PASSPORT_PUBLIC_KEY env vars are set, Passport
    | uses those values. Otherwise we load the key contents directly as strings
    | using file_get_contents so League OAuth2 bypasses filesystem permission checks.
    */
    'private_key' => env('PASSPORT_PRIVATE_KEY', file_exists(storage_path('oauth-private.key')) ? file_get_contents(storage_path('oauth-private.key')) : null),

    'public_key' => env('PASSPORT_PUBLIC_KEY', file_exists(storage_path('oauth-public.key')) ? file_get_contents(storage_path('oauth-public.key')) : null),

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    */
    'connection' => env('PASSPORT_CONNECTION'),

];

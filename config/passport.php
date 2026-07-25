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
    | uses those values as the raw PEM key content.
    | If they are null, Passport automatically reads the key files from:
    |   storage/oauth-private.key  and  storage/oauth-public.key
    */
    'private_key' => env('PASSPORT_PRIVATE_KEY'),

    'public_key' => env('PASSPORT_PUBLIC_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    */
    'connection' => env('PASSPORT_CONNECTION'),

];

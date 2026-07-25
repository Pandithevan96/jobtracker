<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication Routes
    |--------------------------------------------------------------------------
    |
    | Public routes (no auth required)
    |
    */
    Route::prefix('auth')->group(function () {
        Route::post('register',         'AAuthController@register');
        Route::post('login',            'AuthController@login');
    });

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Passport token required)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout',          'AuthController@logout');
            Route::post('me',              'AuthController@me');
            Route::post('change-password', 'AuthController@changePassword');
        });

    });

});
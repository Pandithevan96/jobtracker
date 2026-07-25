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
        Route::post('register',         'App\Http\Controllers\Auth\AuthController@register');
        Route::post('login',            'App\Http\Controllers\Auth\AuthController@login');
    });

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Passport token required)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout',          'App\Http\Controllers\Auth\AuthController@logout');
            Route::post('me',              'App\Http\Controllers\Auth\AuthController@me');
            Route::post('change-password', 'App\Http\Controllers\Auth\AuthController@changePassword');
        });

    });

});
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
        Route::post('register','Auth\AuthController@register');
        Route::post('login','Auth\AuthController@login');
    });

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Passport token required)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout','Auth\AuthController@logout');
            Route::post('me','Auth\AuthController@me');
            Route::post('change-password','Auth\AuthController@changePassword');
        });

    });

});
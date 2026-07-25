<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    
    $name = 'Deva';
    $age = 25;
    return view('welcome' ,compact('name', 'age'));
});

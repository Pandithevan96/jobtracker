<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('api')
                ->namespace('App\Http\Controllers')
                ->prefix('api')
                ->group(base_path('routes/api.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
        // Temporarily expose exception details for diagnostics
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message'  => $e->getMessage(),
                    'class'    => get_class($e),
                    'file'     => $e->getFile(),
                    'line'     => $e->getLine(),
                    'trace'    => array_slice(array_map(fn($t) => ($t['file'] ?? '') . ':' . ($t['line'] ?? ''), $e->getTrace()), 0, 8),
                ], 500);
            }
        });
    })->create();
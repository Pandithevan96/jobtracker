<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
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
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($request->is('api/*') && $response->getStatusCode() === 500) {
                $payload = [
                    'status' => 'error',
                    'message' => config('app.debug')
                        ? $e->getMessage()
                        : 'An unexpected server error occurred. Please try again.',
                ];

                if (config('app.debug')) {
                    $payload += [
                        'exception' => get_class($e),
                        'file' => $e->getFile().':'.$e->getLine(),
                        'trace' => array_slice(array_map(fn ($t) => ($t['file'] ?? '').':'.($t['line'] ?? '').' ('.($t['function'] ?? '').')', $e->getTrace()), 0, 10),
                    ];
                }

                return response()->json($payload, 500);
            }

            return $response;
        });
    })->create();

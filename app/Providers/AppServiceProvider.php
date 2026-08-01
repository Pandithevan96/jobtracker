<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Render terminates SSL at its load balancer and forwards plain
        // HTTP internally, so Laravel doesn't know the original request
        // was HTTPS unless told explicitly. Without this, asset()/@vite()
        // generate http:// URLs even on an https:// page, which browsers
        // block as "mixed content".
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
#!/bin/bash
set -e

# Clear any stale cached configuration, routes, or services
php artisan config:clear || true
php artisan cache:clear || true

# Run database migrations (fresh tables if first deploy, safe incremental otherwise)
php artisan migrate --force

# Seed required lookup data (roles, modules, permissions) - idempotent
php artisan db:seed --class="Database\Seeders\User\RoleSeeder" --force
php artisan db:seed --class="Database\Seeders\User\ModuleSeeder" --force
php artisan db:seed --class="Database\Seeders\User\RolePermissionSeeder" --force

# Execute CMD process (php artisan serve)
exec "$@"

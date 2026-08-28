#!/bin/bash
set -e

# Clear any stale cached configuration, routes, views, or services
php artisan config:clear || true
php artisan cache:clear || true
php artisan view:clear || true
php artisan route:clear || true

# Run database migrations
php artisan migrate --force

# Execute CMD process
exec "$@"

#!/bin/bash
set -e

# Clear any stale cached configuration, routes, or services
php artisan config:clear || true
php artisan cache:clear || true

# Run database migrations
php artisan migrate --force

# Execute CMD process
exec "$@"

#!/bin/bash
set -e

# Clear any stale cached configuration, routes, or services
php artisan config:clear || true
php artisan cache:clear || true

# Run fresh database migrations on startup
php artisan migrate:fresh --force

# Execute CMD process
exec "$@"

#!/bin/bash
set -e

# Clear any stale cached configuration, routes, or services
php artisan config:clear || true
php artisan cache:clear || true

# Generate Passport encryption keys if missing
if [ ! -f storage/oauth-private.key ]; then
    echo "Generating Passport encryption keys..."
    php artisan passport:keys --force
fi

# Ensure storage directory permissions
chmod -R 777 storage/ bootstrap/cache/

# Execute Laravel native HTTP server directly (bypassing Apache mpm_prefork worker crashes)
exec php artisan serve --host=0.0.0.0 --port=80

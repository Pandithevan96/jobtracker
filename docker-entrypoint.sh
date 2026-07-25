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

# Ensure www-data (Apache) owns the storage directory and oauth keys
chown -R www-data:www-data storage/ bootstrap/cache/
chmod 600 storage/oauth-private.key || true
chmod 644 storage/oauth-public.key || true

# Execute main process (Apache)
exec "$@"

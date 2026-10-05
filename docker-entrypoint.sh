#!/bin/bash
set -e

# Clear any stale cached configuration, routes, views, or services
php artisan config:clear || true
php artisan cache:clear || true
php artisan view:clear || true
php artisan route:clear || true

# Run database migrations
php artisan migrate --force

# Create supervisor log directory
mkdir -p /var/log/supervisor

# Render passes a PORT env var (usually 10000). Nginx must listen on it.
if [ -n "$PORT" ]; then
    sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/nginx.conf
fi


# Execute CMD (supervisord) which manages php-serve + reverb + nginx
exec "$@"

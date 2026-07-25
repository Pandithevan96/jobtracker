#!/bin/bash
set -e

# Generate Passport encryption keys if missing
if [ ! -f storage/oauth-private.key ]; then
    echo "Generating Passport encryption keys..."
    php artisan passport:keys --force
fi

# Execute main process (Apache)
exec "$@"

FROM php:8.3-cli

# Install system dependencies & PHP extensions required by Laravel
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    zip \
    unzip \
    git \
    libzip-dev \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd zip bcmath mbstring

# Install Node.js (LTS) & npm — needed to build the Vite/React frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /var/www/html

# Copy project files
COPY . /var/www/html

# Make docker-entrypoint.sh executable
RUN chmod +x /var/www/html/docker-entrypoint.sh

# Install Composer dependencies
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Install frontend dependencies & build production assets (generates
# public/build/manifest.json, which resources/views/index.blade.php
# requires via @vite(...) — without this step the app 500s with
# ViteManifestNotFoundException).
RUN npm install
RUN npm run build

# Set permissions for storage & cache
RUN chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=80"]
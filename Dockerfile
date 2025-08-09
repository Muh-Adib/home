# Multi-stage Dockerfile untuk Nixpacks Deployment
# Property Management System - Laravel 12 + React + WebSocket
# Optimized untuk Dokploy dengan Redis dan DB terpisah

# Build stage untuk Node.js dependencies dan assets
FROM node:20-alpine AS node-builder

WORKDIR /app

# Install git untuk dependencies yang memerlukan
RUN apk add --no-cache git python3 make g++

# Copy package files untuk better layer caching
COPY package*.json ./

# Install Node dependencies dengan error handling
RUN echo "=== Installing Node dependencies ===" && \
    npm cache clean --force && \
    npm ci --legacy-peer-deps --verbose || npm install --legacy-peer-deps --verbose

# Install Laravel Echo Server globally untuk WebSocket support
RUN npm install -g laravel-echo-server@1.6.3

# Copy konfigurasi build files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY components.json ./

# Copy source code untuk building
COPY resources/ ./resources/
COPY public/ ./public/

# Build frontend assets
RUN echo "=== Building frontend assets ===" && \
    npm run build && \
    echo "=== Build completed ===" && \
    ls -la public/build/

# Production PHP stage dengan Nixpacks compatibility
FROM php:8.3-fpm-alpine AS php-stage

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    wget \
    bash \
    git \
    netcat-openbsd \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    icu-dev \
    oniguruma-dev \
    mysql-client \
    postgresql-client \
    postgresql-dev \
    autoconf \
    g++ \
    make \
    pcre-dev \
    nodejs \
    npm \
    sqlite \
    sqlite-dev \
    pkgconfig \
    coreutils

# Install PHP extensions yang diperlukan
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        pdo_sqlite \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Install Redis extension untuk koneksi ke external Redis
RUN pecl install redis && \
    docker-php-ext-enable redis && \
    php -m | grep redis

# Clean up build tools
RUN apk del autoconf g++ make pcre-dev postgresql-dev sqlite-dev

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Laravel Echo Server globally dalam production container
RUN npm install -g laravel-echo-server@1.6.3 pm2

# Create application user
RUN addgroup -g 1000 www && \
    adduser -u 1000 -G www -s /bin/sh -D www

# Set working directory
WORKDIR /var/www/html

# Copy application code dengan proper ownership
COPY --chown=www:www . .

# Copy built assets dari node stage
COPY --from=node-builder /app/public/build ./public/build

# Install PHP dependencies (production optimized)
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist && \
    composer dump-autoload --optimize

# Create required directories dengan proper permissions
RUN mkdir -p \
    storage/logs \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/app/public \
    bootstrap/cache \
    /var/log/supervisor \
    /var/log/nginx \
    /var/cache/nginx \
    /var/run/php \
    /var/run/laravel-echo-server \
    database/echo-server && \
    chown -R www:www storage bootstrap/cache database && \
    chmod -R 755 storage bootstrap/cache database

# Copy configuration files
COPY dokploy/config/nginx.conf /etc/nginx/nginx.conf
COPY dokploy/config/mime.types /etc/nginx/mime.types
COPY dokploy/config/fastcgi_params /etc/nginx/fastcgi_params
COPY dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY dokploy/config/php-fpm.conf /etc/php-fpm.conf

# Copy Laravel Echo Server configuration
COPY laravel-echo-server.dokploy.json /var/www/html/laravel-echo-server.dokploy.json

# Copy safe startup script
COPY dokploy/scripts/safe-startup.sh /usr/local/bin/safe-startup.sh
RUN chmod +x /usr/local/bin/safe-startup.sh

# Setup environment template
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate application key
RUN php artisan key:generate --force || echo "Key generation skipped"

# Create storage link
RUN php artisan storage:link || echo "Storage link failed, continuing..."

# Set final permissions
RUN chown -R www:www /var/www/html && \
    chmod -R 755 /var/www/html/storage && \
    chmod -R 755 /var/www/html/bootstrap/cache && \
    chmod -R 755 /var/www/html/database && \
    chmod +x /var/www/html/artisan

# Expose HTTP dan WebSocket ports
EXPOSE 80 3000 6001

# Health check yang comprehensive
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health && curl -f http://localhost:6001/socket.io/ || exit 1

# Start dengan safe startup script
CMD ["/usr/local/bin/safe-startup.sh"]

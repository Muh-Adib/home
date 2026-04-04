# Multi-stage Dockerfile untuk Nixpacks Deployment
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket
# Optimized untuk Dokploy dengan Redis dan DB terpisah

# 1) Build stage for frontend assets
FROM node:20-alpine AS node-builder

WORKDIR /app

RUN apk add --no-cache git python3 make g++

# Cache deps
COPY package*.json ./

# Install Node dependencies dengan error handling
RUN echo "=== Installing Node dependencies ===" && \
    npm cache clean --force && \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Build inputs
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY components.json ./

# Source for build
COPY resources/ ./resources/
COPY public/ ./public/

# Build assets
RUN npm run build && \
    ls -la public/build/

# Production PHP stage dengan Nixpacks compatibility
FROM php:8.4-fpm-alpine AS php-stage

# Install system dependencies (including ImageMagick + WebP support for image processing)
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
    coreutils \
    libwebp \
    libwebp-dev \
    imagemagick \
    imagemagick-dev

# PHP extensions + Redis + Imagick in single step to avoid BuildKit cache issues
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
    opcache && \
    pecl install redis imagick && \
    docker-php-ext-enable redis imagick && \
    php -m | grep -q redis && \
    php -m | grep -q imagick

# Cleanup build tools
RUN apk del autoconf g++ make pcre-dev postgresql-dev sqlite-dev || true

# Workdir consistent with Nixpacks configs (nginx root and supervisor use /app)
WORKDIR /app

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy composer files first to leverage cache
COPY composer.json composer.lock ./

# Install PHP dependencies (production optimized, no scripts/autoloader yet)
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist

# Copy application code
COPY . .

# Copy built assets from node stage
COPY --from=node-builder /app/public/build ./public/build
COPY --from=node-builder /app/bootstrap/ssr ./bootstrap/ssr

# ✅ FIX: Copy node_modules for SSR runtime (React and dependencies)
# SSR needs access to node_modules at runtime to resolve imports
COPY --from=node-builder /app/node_modules ./node_modules

# Generate optimized autoloader (skip artisan scripts that require DB during build)
RUN composer dump-autoload --optimize --no-scripts

# Create application user first
RUN addgroup -g 1000 www && \
    adduser -u 1000 -G www -s /bin/sh -D www

# Ensure required directories and permissions
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

# Copy safe startup script and echo config generator
COPY dokploy/scripts/safe-startup.sh /usr/local/bin/safe-startup.sh
COPY dokploy/scripts/generate-echo-config-simple.sh /usr/local/bin/generate-echo-config-simple.sh
RUN chmod +x /usr/local/bin/safe-startup.sh /usr/local/bin/generate-echo-config-simple.sh

# Setup environment template
#RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate application key (only if vendor exists)
#RUN if [ -d "vendor" ]; then php artisan key:generate --force || echo "Key generation skipped"; else echo "Vendor directory not found, skipping key generation"; fi

# Create storage link (only if vendor exists)
# RUN if [ -d "vendor" ]; then php artisan storage:link || echo "Storage link failed, continuing..."; else echo "Vendor directory not found, skipping storage link"; fi

# Set final permissions
RUN chown -R www:www /app && \
    chmod -R 755 /app/storage && \
    chmod -R 755 /app/bootstrap/cache && \
    chmod -R 755 /app/database && \
    chmod +x /app/artisan

# Expose HTTP dan WebSocket ports
EXPOSE 80 3000 6001

# Healthcheck via Nginx root
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost/health || exit 1

# Start dengan safe startup script
CMD ["/usr/local/bin/safe-startup.sh"]
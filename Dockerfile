# Multi-stage Dockerfile for Laravel + Nginx + Supervisor + WebSocket (Dokploy)
# Uses Node builder for assets and PHP 8.3 FPM with PECL Redis extension

# 1) Build stage for frontend assets
FROM node:20-alpine AS node-builder

WORKDIR /app

RUN apk add --no-cache git python3 make g++

# Cache deps
COPY package*.json ./
RUN npm cache clean --force && \
    npm ci --legacy-peer-deps --verbose || npm install --legacy-peer-deps --verbose

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

# 2) Production stage with PHP + Nginx + Supervisor
FROM php:8.3-fpm-alpine AS php-stage

# System deps (include Node for npx laravel-echo-server)
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
    pkgconfig

# PHP extensions
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

# Install and enable Redis extension (safe)
RUN pecl install redis && \
    docker-php-ext-enable redis && \
    php -m | grep -q redis

# Cleanup build tools
RUN apk del autoconf g++ make pcre-dev postgresql-dev sqlite-dev || true

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Workdir consistent with Nixpacks configs (nginx root and supervisor use /app)
WORKDIR /app

# Copy application code
COPY . .

# Copy built assets from node stage
COPY --from=node-builder /app/public/build ./public/build

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
    /run \
    /var/run/php && \
    chmod -R 755 storage bootstrap/cache || true

# Install PHP dependencies (production)
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist && \
    composer dump-autoload --optimize

# Place Nginx and Supervisor configs from dokploy/config
COPY dokploy/config/nginx.conf /etc/nginx/nginx.conf
COPY dokploy/config/mime.types /etc/nginx/mime.types
COPY dokploy/config/fastcgi_params /etc/nginx/fastcgi_params
COPY dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# We keep php-fpm runtime config under repo path as referenced by supervisor
# (supervisor runs: php-fpm -F --fpm-config /app/dokploy/config/php-fpm.conf)

# Correct startup script from dokploy (not docker/)
COPY dokploy/scripts/startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

# Expose HTTP and WebSocket ports
EXPOSE 80 6001

# Healthcheck via Nginx root
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Entrypoint runs Supervisor which starts php-fpm, nginx, and websocket
CMD ["/usr/local/bin/startup.sh"]
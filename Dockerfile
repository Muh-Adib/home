# Property Management System Dockerfile
# Multi-stage build for optimal production image

# Build stage for Node.js dependencies and assets
FROM node:20-alpine AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY components.json ./

# Install dependencies with fallback strategy
RUN npm cache clean --force || true \
    && (npm ci --legacy-peer-deps || npm install --legacy-peer-deps) \
    && npm list || echo "Some dependency warnings, continuing..."

# Copy source code
COPY resources/ ./resources/
COPY public/ ./public/

# Build assets
RUN npm run build

# Production PHP stage
FROM php:8.3-fpm-alpine AS php-base

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    oniguruma-dev \
    icu-dev \
    postgresql-dev \
    mysql-client \
    postgresql-client \
    redis \
    supervisor \
    nginx

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create application user
RUN addgroup -g 1000 www && \
    adduser -u 1000 -G www -s /bin/sh -D www

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json ./
COPY composer.lock ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Copy application code
COPY . .

# Copy built assets from node stage
COPY --from=node-builder /app/public/build ./public/build

# Set proper permissions
RUN chown -R www:www /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Create required directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/php \
    && mkdir -p /var/www/html/storage/logs \
    && mkdir -p /var/www/html/storage/framework/cache \
    && mkdir -p /var/www/html/storage/framework/sessions \
    && mkdir -p /var/www/html/storage/framework/views

# Copy configuration files if they exist
RUN if [ -f docker/php/php.ini ]; then cp docker/php/php.ini /usr/local/etc/php/conf.d/custom.ini; fi
RUN if [ -f docker/php/opcache.ini ]; then cp docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini; fi
RUN if [ -f docker/nginx/nginx.conf ]; then cp docker/nginx/nginx.conf /etc/nginx/nginx.conf; fi
RUN if [ -f docker/nginx/default.conf ]; then cp docker/nginx/default.conf /etc/nginx/http.d/default.conf; fi
RUN if [ -f docker/supervisor/supervisord.conf ]; then cp docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf; fi

# Optimize Laravel for production (with error handling)
RUN php artisan config:cache || echo "Config cache failed, continuing..." \
    && php artisan route:cache || echo "Route cache failed, continuing..." \
    && php artisan view:cache || echo "View cache failed, continuing..."

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose ports
EXPOSE 80 443

# Switch to non-root user
USER www

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
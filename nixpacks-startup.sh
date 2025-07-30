#!/bin/bash

# Nixpacks Startup Script untuk Laravel Application
# Property Management System - Laravel 12 + React 18 + WebSocket

set -e

# Color codes untuk logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main startup function
main() {
    log_info "=== Laravel Nixpacks Production Startup ==="
    log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
    log_info "=================================================="
    
    # Setup environment
    setup_environment
    
    # Wait for external services
    wait_for_services
    
    # Setup Laravel
    setup_laravel
    
    # Start services
    start_services
    
    log_success "Application startup completed successfully!"
    
    # Keep container running
    wait
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment..."
    
    # Set default values if not provided
    export APP_ENV=${APP_ENV:-production}
    export APP_DEBUG=${APP_DEBUG:-false}
    export APP_URL=${APP_URL:-http://localhost:8080}
    export DB_CONNECTION=${DB_CONNECTION:-mysql}
    export DB_HOST=${DB_HOST:-localhost}
    export DB_PORT=${DB_PORT:-3306}
    export DB_DATABASE=${DB_DATABASE:-laravel}
    export DB_USERNAME=${DB_USERNAME:-root}
    export DB_PASSWORD=${DB_PASSWORD:-}
    export REDIS_HOST=${REDIS_HOST:-localhost}
    export REDIS_PORT=${REDIS_PORT:-6379}
    export REDIS_PASSWORD=${REDIS_PASSWORD:-}
    export BROADCAST_DRIVER=${BROADCAST_DRIVER:-redis}
    export CACHE_DRIVER=${CACHE_DRIVER:-redis}
    export QUEUE_CONNECTION=${QUEUE_CONNECTION:-redis}
    export SESSION_DRIVER=${SESSION_DRIVER:-redis}
    
    log_success "Environment setup completed"
}

# Wait for external services
wait_for_services() {
    log_info "Waiting for external services..."
    
    # Wait for database
    if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
        log_info "Waiting for database at $DB_HOST:$DB_PORT..."
        while ! nc -z "$DB_HOST" "$DB_PORT"; do
            log_warning "Database not ready, waiting..."
            sleep 2
        done
        log_success "Database is ready!"
    fi
    
    # Wait for Redis
    if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then
        log_info "Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
        while ! nc -z "$REDIS_HOST" "$REDIS_PORT"; do
            log_warning "Redis not ready, waiting..."
            sleep 2
        done
        log_success "Redis is ready!"
    fi
}

# Setup Laravel application
setup_laravel() {
    log_info "Setting up Laravel application..."
    
    # Create required directories
    mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views storage/app/public bootstrap/cache
    
    # Set permissions
    chmod -R 755 storage bootstrap/cache
    
    # Run migrations
    log_info "Running database migrations..."
    php artisan migrate --force || log_warning "Migrations failed, continuing..."
    
    # Setup storage link
    log_info "Setting up storage link..."
    php artisan storage:link || log_warning "Storage link failed, continuing..."
    
    # Clear and cache config
    log_info "Caching configuration..."
    php artisan config:cache || log_warning "Config cache failed"
    php artisan route:cache || log_warning "Route cache failed"
    php artisan view:cache || log_warning "View cache failed"
    
    log_success "Laravel setup completed"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Start PHP-FPM
    log_info "Starting PHP-FPM..."
    php-fpm -D || log_error "Failed to start PHP-FPM"
    
    # Start Nginx
    log_info "Starting Nginx..."
    nginx -g "daemon off;" &
    
    # Start Laravel Echo Server if Redis is available
    if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then
        log_info "Starting Laravel Echo Server..."
        laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json &
    fi
    
    # Start queue workers
    log_info "Starting queue workers..."
    php artisan queue:work redis --sleep=3 --tries=3 --timeout=90 &
    
    # Start scheduler
    log_info "Starting scheduler..."
    while true; do
        php artisan schedule:run --verbose --no-interaction
        sleep 60
    done &
    
    log_success "All services started"
    
    # Wait for nginx to be ready
    log_info "Waiting for application to be ready..."
    sleep 5
    
    # Test application
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_success "Application is ready to serve requests"
    else
        log_warning "Application health check failed, but continuing..."
    fi
}

# Handle signals
trap 'log_info "Shutting down..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@" 
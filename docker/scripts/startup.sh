#!/bin/bash

# Enhanced Production Startup Script untuk Dokploy Laravel App
# Property Management System - Laravel 12 + React 18 + WebSocket
# Optimized untuk Production Environment dengan External Services

set -euo pipefail

# Color codes untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Function untuk wait sampai service ready dengan timeout
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=${4:-30}
    local attempt=1
    
    log_info "Waiting for $service_name at $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "$service_name at $host:$port tidak ready setelah $max_attempts attempts"
    return 1
}

# Function untuk test database connection
test_database_connection() {
    log_info "Testing database connection..."
    
    if php artisan migrate:status >/dev/null 2>&1; then
        log_success "Database connection successful!"
        return 0
    else
        log_error "Database connection failed!"
        return 1
    fi
}

# Function untuk test Redis connection
test_redis_connection() {
    log_info "Testing Redis connection..."
    
    if php artisan tinker --execute="Redis::ping();" >/dev/null 2>&1; then
        log_success "Redis connection successful!"
        return 0
    else
        log_warning "Redis connection failed, aplikasi akan berjalan tanpa Redis cache"
        return 1
    fi
}

# Function untuk run migrations dengan error handling
run_migrations() {
    log_info "Running database migrations..."
    
    if php artisan migrate --force; then
        log_success "Migrations completed successfully"
        return 0
    else
        log_error "Migrations failed!"
        return 1
    fi
}

# Function untuk clear dan rebuild cache
rebuild_cache() {
    log_info "Clearing application cache..."
    
    # Clear all caches
    php artisan cache:clear || log_warning "Cache clear failed"
    php artisan config:clear || log_warning "Config clear failed"
    php artisan route:clear || log_warning "Route clear failed"
    php artisan view:clear || log_warning "View clear failed"
    
    log_info "Rebuilding production cache..."
    
    # Rebuild cache untuk production
    php artisan config:cache || log_warning "Config cache failed"
    php artisan route:cache || log_warning "Route cache failed"
    php artisan view:cache || log_warning "View cache failed"
    php artisan event:cache || log_warning "Event cache failed"
    
    log_success "Cache rebuild completed"
}

# Function untuk setup storage
setup_storage() {
    log_info "Setting up storage..."
    
    # Create required directories
    mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views storage/app/public
    
    # Setup storage link
    php artisan storage:link || log_warning "Storage link already exists or failed"
    
    # Set proper permissions
    chown -R www:www storage bootstrap/cache database
    chmod -R 755 storage bootstrap/cache database
    
    log_success "Storage setup completed"
}

# Function untuk setup Laravel Echo Server
setup_echo_server() {
    log_info "Configuring Laravel Echo Server..."
    
    ECHO_CONFIG="/var/www/html/laravel-echo-server.dokploy.json"
    
    if [ -n "${APP_URL:-}" ]; then
        # Update authHost di Laravel Echo Server config
        AUTH_HOST=$(echo "$APP_URL" | sed 's|/$||') # Remove trailing slash
        sed -i "s|\"authHost\": \".*\"|\"authHost\": \"${AUTH_HOST}\"|" "$ECHO_CONFIG"
        log_info "Laravel Echo Server authHost updated to: $AUTH_HOST"
    fi
    
    # Pastikan database directory untuk Echo Server exists
    mkdir -p /var/www/html/database/echo-server
    chown -R www:www /var/www/html/database/echo-server
    
    # Set proper permissions untuk Echo Server config
    chown www:www "$ECHO_CONFIG"
    chmod 644 "$ECHO_CONFIG"
    
    log_success "Laravel Echo Server configured"
}

# Function untuk setup queue
setup_queue() {
    log_info "Setting up queue tables..."
    
    # Create Laravel required job tables untuk queue jika belum ada
    php artisan queue:table --create || log_warning "Queue table already exists or creation failed"
    php artisan migrate --force || log_warning "Queue migration failed"
    
    log_success "Queue setup completed"
}

# Function untuk optimize production
optimize_production() {
    log_info "Running production optimizations..."
    
    # Optimize for production
    php artisan optimize || log_warning "Optimization failed"
    
    # Clear and rebuild cache
    rebuild_cache
    
    log_success "Production optimization completed"
}

# Function untuk test application readiness
test_application() {
    log_info "Testing application readiness..."
    
    sleep 5
    
    if curl -f http://localhost/health >/dev/null 2>&1; then
        log_success "Application is ready to serve requests"
        return 0
    else
        log_warning "Application health check failed, but continuing startup"
        return 1
    fi
}

# Function untuk check dan kill existing processes
cleanup_existing_processes() {
    log_info "Cleaning up existing processes..."
    
    # Kill existing nginx processes
    pkill -f nginx || true
    sleep 2
    
    # Kill existing php-fpm processes
    pkill -f php-fpm || true
    sleep 2
    
    # Kill existing laravel-echo-server processes
    pkill -f laravel-echo-server || true
    sleep 2
    
    log_success "Process cleanup completed"
}

# Function untuk setup log directories
setup_logs() {
    log_info "Setting up log directories..."
    
    # Create log directories
    mkdir -p /var/log/supervisor /var/log/nginx /var/log/php-fpm
    
    # Set proper permissions
    chown -R www:www /var/log/supervisor
    chmod -R 755 /var/log/supervisor
    
    # Create log files jika belum ada
    touch /var/log/supervisor/supervisord.log
    touch /var/log/supervisor/php-fpm.log
    touch /var/log/supervisor/nginx.log
    touch /var/log/supervisor/echo-server.log
    
    # Set permissions untuk log files
    chown www:www /var/log/supervisor/*.log
    chmod 644 /var/log/supervisor/*.log
    
    log_success "Log directories setup completed"
}

# Main execution
main() {
    echo "=== Laravel Dokploy Production Startup Script ==="
    echo "Property Management System - Laravel 12 + React 18 + WebSocket"
    echo "=================================================="
    
    # Set environment variables dengan defaults
    export DB_HOST=${DB_HOST:-homsjogja-db-xsjalx}
    export DB_PORT=${DB_PORT:-3306}
    export DB_DATABASE=${DB_DATABASE:-homs-db}
    export DB_USERNAME=${DB_USERNAME:-homs-user}
    export DB_PASSWORD=${DB_PASSWORD:-jD8-AKHx2gFCQ5gx3ouRJ}
    export REDIS_HOST=${REDIS_HOST:-homsjogja-redis-qmihbb}
    export REDIS_PORT=${REDIS_PORT:-6379}
    export REDIS_PASSWORD=${REDIS_PASSWORD:-5vlcwpzc45g9mtho}
    export REDIS_DB=${REDIS_DB:-0}
    
    # Setup log directories
    setup_logs
    
    # Cleanup existing processes
    cleanup_existing_processes
    
    # Setup dynamic URL configuration
    log_info "Setting up Dynamic Environment Configuration"
    
    # Update .env file dengan dynamic values
    if [ -f .env ]; then
        # Update database configuration
        sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST}/" .env
        sed -i "s/DB_PORT=.*/DB_PORT=${DB_PORT}/" .env
        sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE}/" .env
        sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME}/" .env
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env

        # Update Redis configuration
        sed -i "s/REDIS_HOST=.*/REDIS_HOST=${REDIS_HOST}/" .env
        sed -i "s/REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" .env
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
        sed -i "s/REDIS_DB=.*/REDIS_DB=${REDIS_DB}/" .env

        # Update broadcasting configuration
        sed -i "s/BROADCAST_DRIVER=.*/BROADCAST_DRIVER=redis/" .env
        sed -i "s/BROADCAST_CONNECTION=.*/BROADCAST_CONNECTION=default/" .env
        sed -i "s/CACHE_DRIVER=.*/CACHE_DRIVER=redis/" .env
        sed -i "s/SESSION_DRIVER=.*/SESSION_DRIVER=redis/" .env
        sed -i "s/QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/" .env

        # Dynamic URL configuration - sangat penting untuk deployment
        if [ -n "${APP_URL:-}" ]; then
            log_info "Setting dynamic APP_URL to: $APP_URL"
            sed -i "s|APP_URL=.*|APP_URL=${APP_URL}|" .env
            
            # Update asset URL untuk static files
            if ! grep -q "ASSET_URL" .env; then
                echo "ASSET_URL=${APP_URL}" >> .env
            else
                sed -i "s|ASSET_URL=.*|ASSET_URL=${APP_URL}|" .env
            fi
            
            # Update Vite configuration untuk production
            if ! grep -q "VITE_APP_URL" .env; then
                echo "VITE_APP_URL=${APP_URL}" >> .env
            else
                sed -i "s|VITE_APP_URL=.*|VITE_APP_URL=${APP_URL}|" .env
            fi
            
            # Update mail domain berdasarkan APP_URL
            DOMAIN=$(echo "$APP_URL" | sed 's|https\?://||' | sed 's|/.*||')
            sed -i "s/MAIL_FROM_ADDRESS=.*/MAIL_FROM_ADDRESS=noreply@${DOMAIN}/" .env
            log_info "Mail domain set to: noreply@$DOMAIN"
            
            export APP_URL="${APP_URL}"
        else
            log_warning "APP_URL tidak di-set, menggunakan default"
        fi

        # Update cache drivers untuk external services
        sed -i "s/CACHE_DRIVER=.*/CACHE_DRIVER=redis/" .env
        sed -i "s/SESSION_DRIVER=.*/SESSION_DRIVER=redis/" .env
        sed -i "s/QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/" .env
        
        # Enable broadcasting untuk WebSocket
        sed -i "s/BROADCAST_CONNECTION=.*/BROADCAST_CONNECTION=redis/" .env
        if ! grep -q "BROADCAST_DRIVER" .env; then
            echo "BROADCAST_DRIVER=redis" >> .env
        else
            sed -i "s/BROADCAST_DRIVER=.*/BROADCAST_DRIVER=redis/" .env
        fi
    fi

    log_info "Environment Configuration:"
    log_info "APP_URL: ${APP_URL:-not set}"
    log_info "Database: $DB_HOST:$DB_PORT ($DB_DATABASE)"
    log_info "Redis: $REDIS_HOST:$REDIS_PORT"

    # Wait for external services (dengan timeout)
    log_info "Waiting for External Services"
    wait_for_service "$DB_HOST" "$DB_PORT" "Database" || log_warning "Continuing without DB connectivity check..."
    wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis" || log_warning "Continuing without Redis connectivity check..."

    # Setup storage
    setup_storage

    # Test database connection
    if test_database_connection; then
        # Run migrations jika diperlukan
        run_migrations
        
        # Setup queue
        setup_queue
        
        # Setup Laravel Echo Server
        setup_echo_server
        
        # Optimize for production
        optimize_production
    else
        log_error "Database connection failed, cannot proceed with migrations"
        # Continue anyway untuk development/testing
    fi

    # Test Redis connection
    test_redis_connection

    # Set proper permissions
    log_info "Setting Final Permissions"
    chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
    chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database

    # Start PHP-FPM in background
    log_info "Starting PHP-FPM"
    php-fpm -D

    # Start nginx in background
    log_info "Starting Nginx"
    nginx

    # Test aplikasi readiness
    test_application

    # Start supervisor untuk manage processes (including Laravel Echo Server)
    log_info "Starting Supervisor dengan WebSocket Support"
    log_success "Application startup completed successfully!"
    
    log_info "Services Status:"
    log_info "- PHP-FPM: Running"
    log_info "- Nginx: Running" 
    log_info "- Laravel Echo Server: Will start via Supervisor"
    log_info "- Queue Workers: Will start via Supervisor"
    log_info "- Database: $DB_HOST:$DB_PORT"
    log_info "- Redis: $REDIS_HOST:$REDIS_PORT"
    log_info "- WebSocket: http://localhost:6001"

    # Start supervisor in foreground untuk keep container running
    exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf -n
}

# Trap untuk cleanup jika script di-interrupt
trap 'log_error "Startup script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
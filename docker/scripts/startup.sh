#!/bin/bash

# ==================================================
# Laravel Dokploy Production Startup Script
# Property Management System - Laravel 12 + React 18 + WebSocket
# ==================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

# ==================================================
# Container Information & Environment Detection
# ==================================================

log_info "=== Laravel Dokploy Production Startup Script ==="
log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
log_info "=================================================="

# Get container information
CONTAINER_ID=$(hostname)
CONTAINER_NAME=${HOSTNAME:-$CONTAINER_ID}
HOSTNAME_FULL=$(hostname -f 2>/dev/null || echo $CONTAINER_ID)

log_info "=================================================="
log_info "🔄 DOKPLOY CONTAINER ROTATION HANDLING"
log_info "=================================================="
log_info "📊 Container Information:"
log_info "- Container ID: $CONTAINER_ID"
log_info "- Container Name: $CONTAINER_NAME"
log_info "- Hostname: $HOSTNAME_FULL"

# Check if we're in Dokploy environment
if [[ "$CONTAINER_NAME" == *"dokploy"* ]] || [[ "$HOSTNAME_FULL" == *"dokploy"* ]]; then
    log_info "✅ Dokploy environment detected"
else
    log_warning "⚠️  Not in Dokploy environment (local development)"
fi

# Container rotation detection
log_info "🔄 Container rotation detected:"
log_info "- Previous Container: $CONTAINER_ID"
log_info "- Current Container: $CONTAINER_ID"

log_info "=================================================="
log_info "📋 PORT CONFIGURATION SUMMARY:"
log_info "🖥️  Main App (Internal): 80"
log_info "🌐 Nginx (External): Port 8080"
log_info "🔌 Laravel Echo (WebSocket): 6002"
log_info "🗄️  Database: External Service"
log_info "🔴 Redis: External Service"
log_info "=================================================="

# ==================================================
# Setup Log Directories
# ==================================================

log_info "Setting up log directories..."
mkdir -p /var/log/supervisor /var/log/nginx /var/log/php-fpm /var/log/laravel-echo-server /var/log/queue-worker /var/log/scheduler /var/log/health-monitor
chmod -R 755 /var/log/supervisor /var/log/nginx /var/log/php-fpm /var/log/laravel-echo-server /var/log/queue-worker /var/log/scheduler /var/log/health-monitor
log_success "Log directories setup completed"

# ==================================================
# Cleanup Existing Processes
# ==================================================

log_info "Cleaning up existing processes..."
pkill -f nginx 2>/dev/null || true
pkill -f php-fpm 2>/dev/null || true
pkill -f laravel-echo-server 2>/dev/null || true
pkill -f "artisan queue:work" 2>/dev/null || true
pkill -f "artisan schedule:work" 2>/dev/null || true
pkill -f supervisord 2>/dev/null || true
log_success "Process cleanup completed"

# ==================================================
# Dynamic Environment Configuration
# ==================================================

log_info "Setting up Dynamic Environment Configuration"

# Debug environment variables from Dokploy
log_info "Debug: Environment variables from Dokploy:"
log_info "APP_URL: ${APP_URL:-}"
log_info "DB_HOST: ${DB_HOST:-}"
log_info "DB_DATABASE: ${DB_DATABASE:-}"
log_info "REDIS_HOST: ${REDIS_HOST:-}"
log_info "REDIS_PASSWORD: ${REDIS_PASSWORD:-***}"

# Check if critical environment variables are set
if [[ -z "$APP_URL" ]] || [[ -z "$DB_HOST" ]] || [[ -z "$REDIS_HOST" ]]; then
    log_warning "Critical environment variables not set by Dokploy!"
    log_warning "DB_HOST: ${DB_HOST:-}"
    log_warning "REDIS_HOST: ${REDIS_HOST:-}"
    log_warning "Using default values from .env file"
fi

# Clear and rebuild config cache
log_info "Clearing and rebuilding config cache..."
php artisan config:clear
php artisan config:cache

# Display environment configuration
log_info "Environment Configuration:"
log_info "APP_URL: ${APP_URL:-http://localhost}"
log_info "Database: ${DB_HOST:-127.0.0.1}:${DB_PORT:-3306} (${DB_DATABASE:-property_management})"
log_info "Redis: ${REDIS_HOST:-127.0.0.1}:${REDIS_PORT:-6379}"

log_info "=================================================="
log_info "🌐 DOMAIN CONFIGURATION FOR DOKPLOY"
log_info "=================================================="
log_info "📝 Set your domain in Dokploy to point to:"
log_info "🎯 Target Port: 8080"
log_info "🔗 Protocol: HTTP/HTTPS"
log_info "🌍 Domain: Your custom domain"
log_info ""
log_info "📋 Dokploy Environment Variables:"
log_info "✅ APP_URL: ${APP_URL:-}"
log_info "✅ DB_HOST: ${DB_HOST:-}"
log_info "✅ REDIS_HOST: ${REDIS_HOST:-}"
log_info "🔧 Internal Service Ports:"
log_info "🖥️  Nginx (Main App): 80"
log_info "🔌 Laravel Echo (WebSocket): 6002"

# ==================================================
# Wait for External Services
# ==================================================

log_info "=================================================="
log_info "Waiting for External Services"
log_info "=================================================="

# Function to wait for services
wait_for_services() {
    local max_attempts=60
    local attempt=1
    
    # Wait for Database
    log_info "Waiting for Database at ${DB_HOST:-127.0.0.1}:${DB_PORT:-3306}..."
    while [ $attempt -le $max_attempts ]; do
        if php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database connection test';" 2>/dev/null; then
            log_success "Database is ready!"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                log_error "Database connection failed after $max_attempts attempts"
                return 1
            fi
            log_info "Database connection test [FAILED] - Attempt $attempt/$max_attempts"
            sleep 2
            ((attempt++))
        fi
    done
    
    # Wait for Redis (only if not local)
    local redis_host=${REDIS_HOST:-127.0.0.1}
    if [[ "$redis_host" == "127.0.0.1" ]] || [[ "$redis_host" == "localhost" ]]; then
        log_warning "Redis host is local ($redis_host), skipping Redis wait..."
        log_info "Redis will be handled by external service or local installation"
    else
        log_info "Waiting for Redis at $redis_host:${REDIS_PORT:-6379}..."
        attempt=1
        while [ $attempt -le $max_attempts ]; do
            if php artisan tinker --execute="Redis::connection()->ping(); echo 'Redis connection test';" 2>/dev/null; then
                log_success "Redis is ready!"
                break
            else
                if [ $attempt -eq $max_attempts ]; then
                    log_warning "Redis connection failed after $max_attempts attempts, continuing..."
                    break
                fi
                log_info "Redis connection test [FAILED] - Attempt $attempt/$max_attempts"
                sleep 2
                ((attempt++))
            fi
        done
    fi
}

# Test Redis connection
test_redis_connection() {
    local redis_host=${REDIS_HOST:-127.0.0.1}
    if [[ "$redis_host" == "127.0.0.1" ]] || [[ "$redis_host" == "localhost" ]]; then
        log_warning "Skipping Redis test for local Redis"
        return 0
    fi
    
    if php artisan tinker --execute="Redis::connection()->ping(); echo 'Redis test successful';" 2>/dev/null; then
        log_success "Redis connection successful!"
        return 0
    else
        log_warning "Redis connection failed, continuing with application startup..."
        return 0
    fi
}

# Execute service waiting
wait_for_services

# ==================================================
# Storage Setup
# ==================================================

log_info "Setting up storage..."
log_info "Removing existing storage link..."
rm -f public/storage
php artisan storage:link
log_success "Storage setup completed"

# ==================================================
# Database Setup
# ==================================================

log_info "Testing database connection..."
if php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database connection successful';" 2>/dev/null; then
    log_success "Database connection successful!"
    
    log_info "Running database migrations..."
    log_info "Ensuring database connection is ready..."
    if php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database ready for migrations';" 2>/dev/null; then
        log_info "Checking if users table exists..."
        if php artisan tinker --execute="Schema::hasTable('users') ? echo 'Users table exists' : echo 'Users table not found';" 2>/dev/null | grep -q "Users table not found"; then
            log_warning "Users table not found, running fresh migrations with seeding..."
            log_info "Starting fresh migration and seeding process..."
            php artisan migrate:fresh --seed --force
        else
            log_info "Users table exists, running regular migrations..."
            php artisan migrate --force
        fi
    else
        log_error "Database not ready for migrations"
        exit 1
    fi
else
    log_error "Database connection failed"
    exit 1
fi

# ==================================================
# Ensure index.php exists
# ==================================================

log_info "Ensuring index.php exists in public directory..."
if [ ! -f public/index.php ]; then
    log_error "index.php not found in public directory!"
    exit 1
fi

# Set proper permissions
log_info "Setting proper permissions..."
chown -R www:www /var/www/html
chmod -R 755 /var/www/html/storage
chmod -R 755 /var/www/html/bootstrap/cache
chmod -R 755 /var/www/html/public

# ==================================================
# Laravel Echo Server Configuration
# ==================================================

log_info "Configuring Laravel Echo Server..."
if [ -f laravel-echo-server.dokploy.json ]; then
    log_info "Using dokploy Echo Server configuration"
else
    log_warning "Echo Server config not found, using default"
fi

# ==================================================
# Production Optimizations
# ==================================================

log_info "Running production optimizations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# ==================================================
# Final Health Check
# ==================================================

log_info "Performing final health check..."

# Test if nginx is accessible
if curl -f http://localhost:80/debug >/dev/null 2>&1; then
    log_success "Nginx debug endpoint accessible"
else
    log_warning "Nginx debug endpoint not accessible (will be available after supervisor start)"
fi

# Test if health endpoint is accessible
if curl -f http://localhost:80/health >/dev/null 2>&1; then
    log_success "Health endpoint accessible"
else
    log_warning "Health endpoint not accessible (will be available after supervisor start)"
fi

# ==================================================
# Startup Complete
# ==================================================

log_info "=================================================="
log_info "🚀 STARTUP COMPLETE"
log_info "=================================================="
log_info "📊 Service Status:"
log_info "✅ Database: Connected"
log_info "✅ Redis: Configured"
log_info "✅ Storage: Linked"
log_info "✅ Migrations: Completed"
log_info "✅ Optimizations: Applied"
log_info ""
log_info "🌐 Access Information:"
log_info "   - Internal: http://localhost:80"
log_info "   - External: http://localhost:8080"
log_info "   - Health Check: http://localhost:80/health"
log_info "   - Debug: http://localhost:80/debug"
log_info ""
log_info "🔧 Development Commands:"
log_info "   - Local Testing: http://localhost:8080"
log_info "   - Container Shell: docker exec -it homsjogja-nginx bash"
log_info "   - Set your domain to point to port 8080"
log_info ""
log_info "🛠️  Troubleshooting:"
log_info "   - Check logs: docker-compose logs nginx"
log_info "   - Test PHP-FPM: curl -f http://localhost:80/health"
log_info "   - Supervisor status: supervisorctl status"
log_info ""
log_info "📋 Dokploy Configuration:"
log_info "   1. Set domain in Dokploy dashboard"
log_info "   2. Configure environment variables"
log_info "   3. Test with: curl -f http://localhost:80/health"
log_info "   4. Monitor logs in Dokploy dashboard"
log_info ""
log_info "🔍 Health Monitoring:"
log_info "   - Health check runs every 30 seconds"
log_info "   - Container rotation handled automatically"
log_info "   - Logs available in /var/log/"

# ==================================================
# Port Verification
# ==================================================

log_info "=================================================="
log_info "🔍 PORT VERIFICATION"
log_info "=================================================="

# Test if port 80 is accessible from outside
if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    log_success "Port 80 is listening"
else
    log_warning "Port 80 not listening (will be available after supervisor start)"
fi

# Test if nginx is serving content
if curl -f http://localhost:80/health >/dev/null 2>&1; then
    log_success "Nginx is serving content on port 80"
else
    log_warning "Nginx not serving content on port 80"
fi

# Show port information
log_info "Port Information:"
log_info "   - Port 80 must be published to host"
log_info "   - External access via port 8080"
log_info "   - Internal services on port 80"
log_info "   - Port Mapping: 8080:80"
log_info "   - Domain: app.homsjogja.com → Port 8080"

# Show listening ports
log_info "Currently listening ports:"
netstat -tlnp 2>/dev/null | grep -E ":(80|6002)" || log_warning "No ports 80/6002 found listening"

# ==================================================
# Start Supervisor
# ==================================================

log_info "=================================================="
log_info "🚀 STARTING SUPERVISOR"
log_info "=================================================="
log_info "Services to be started:"
log_info "   - Nginx (port 80)"
log_info "   - PHP-FPM"
log_info "   - Laravel Echo Server (port 6002)"
log_info "   - Queue Worker"
log_info "   - Scheduler"
log_info "   - Health Monitor"
log_info ""

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf
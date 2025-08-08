#!/bin/bash

set -e

echo "🚀 Starting Property Management System..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function untuk log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function untuk error
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Function untuk success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function untuk warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check environment variables
log "Checking environment configuration..."

# Required environment variables
REQUIRED_VARS=(
    "APP_KEY"
    "DB_HOST"
    "DB_DATABASE"
    "DB_USERNAME"
    "DB_PASSWORD"
    "REDIS_HOST"
    "REDIS_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        error "Missing required environment variable: $var"
    fi
done

success "Environment variables validated"

# Create required directories
log "Creating required directories..."
mkdir -p \
    /var/log/supervisor \
    /var/log/nginx \
    /var/cache/nginx \
    /var/run/php \
    /var/run/laravel-echo-server \
    /var/www/html/storage/logs \
    /var/www/html/storage/framework/cache \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/views \
    /var/www/html/bootstrap/cache

# Set permissions
log "Setting proper permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Database migration
log "Running database migrations..."
php artisan migrate --force || warning "Migration failed, continuing..."

# Cache optimization
log "Optimizing Laravel caches..."
php artisan config:cache --force
php artisan route:cache --force
php artisan view:cache --force

success "Laravel optimization completed"

# Test external services
log "Testing external services..."

# Test database connection
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    success "Database connection successful"
else
    warning "Database connection failed - will retry later"
fi

# Test Redis connection
if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    success "Redis connection successful"
else
    warning "Redis connection failed - will retry later"
fi

# Start supervisor
log "Starting supervisor..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf

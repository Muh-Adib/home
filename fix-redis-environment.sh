#!/bin/bash

# ==================================================
# Fix Redis Environment Variables Script
# Property Management System - Laravel 12 + React 18 + WebSocket
# ==================================================

set -e

# Color codes untuk output
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

log_info "=== Fix Redis Environment Variables Script ==="
log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
log_info "=================================================="

# Check if we're in a Docker container
if [ -f /.dockerenv ]; then
    log_info "Running inside Docker container"
else
    log_info "Running on host system"
fi

# Check current environment variables
log_info "Current Environment Variables:"
log_info "APP_URL: ${{project.APP_URL}}"
log_info "DB_HOST: ${{project.DB_HOST}}"
log_info "DB_DATABASE: ${{project.DB_DATABASE}}"
log_info "REDIS_HOST: ${{project.REDIS_HOST}}"
log_info "REDIS_PASSWORD: ${${{project.REDIS_PASSWORD}}:0:4}***"

# Check if .env file exists
if [ -f ".env" ]; then
    log_success ".env file exists"
    log_info "Current .env Redis configuration:"
    log_info "REDIS_HOST: $(grep REDIS_HOST .env | cut -d'=' -f2)"
    log_info "REDIS_PORT: $(grep REDIS_PORT .env | cut -d'=' -f2)"
    log_info "REDIS_PASSWORD: $(grep REDIS_PASSWORD .env | cut -d'=' -f2)"
else
    log_warning ".env file not found"
fi

# Create or update .env file with correct Redis configuration
log_info "Setting up .env file with correct Redis configuration..."

# Check if environment variables are set by Dokploy
if [ ! -z "${{project.REDIS_HOST}}" ]; then
    log_info "Dokploy Redis configuration detected:"
    log_info "REDIS_HOST: ${{project.REDIS_HOST}}"
    log_info "REDIS_PORT: ${{project.REDIS_PORT}}"
    log_info "REDIS_PASSWORD: ${${{project.REDIS_PASSWORD}}:0:4}***"
    
    # Update .env file with Dokploy values
    if [ -f ".env" ]; then
        sed -i "s|REDIS_HOST=.*|REDIS_HOST=${{project.REDIS_HOST}}|g" .env
        if [ ! -z "${{project.REDIS_PORT}}" ]; then
            sed -i "s|REDIS_PORT=.*|REDIS_PORT=${{project.REDIS_PORT}}|g" .env
        fi
        if [ ! -z "${{project.REDIS_PASSWORD}}" ]; then
            sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${{project.REDIS_PASSWORD}}|g" .env
        fi
        if [ ! -z "${{project.REDIS_USERNAME}}" ]; then
            sed -i "s|REDIS_USERNAME=.*|REDIS_USERNAME=${{project.REDIS_USERNAME}}|g" .env
        fi
        log_success "Updated .env with Dokploy Redis configuration"
    else
        log_error ".env file not found, cannot update"
        exit 1
    fi
else
    log_warning "No Dokploy Redis configuration detected"
    log_info "Using default Redis configuration (127.0.0.1:6379)"
    
    # Set default Redis configuration
    if [ -f ".env" ]; then
        sed -i "s|REDIS_HOST=.*|REDIS_HOST=127.0.0.1|g" .env
        sed -i "s|REDIS_PORT=.*|REDIS_PORT=6379|g" .env
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=null|g" .env
        sed -i "s|REDIS_USERNAME=.*|REDIS_USERNAME=|g" .env
        log_success "Updated .env with default Redis configuration"
    else
        log_error ".env file not found, cannot update"
        exit 1
    fi
fi

# Clear Laravel config cache
log_info "Clearing Laravel config cache..."
php artisan config:clear
php artisan config:cache
log_success "Config cache cleared and rebuilt"

# Test Redis connection
log_info "Testing Redis connection..."
REDIS_HOST_FROM_ENV=$(grep REDIS_HOST .env | cut -d'=' -f2)

if [ "$REDIS_HOST_FROM_ENV" = "127.0.0.1" ] || [ "$REDIS_HOST_FROM_ENV" = "localhost" ]; then
    log_warning "Redis host is local (127.0.0.1), skipping Redis test..."
    log_info "Redis will be handled by external service or local installation"
else
    log_info "Testing Redis connection to $REDIS_HOST_FROM_ENV..."
    
    # Test Redis connection with timeout
    if timeout 10s php artisan tinker --execute="try { \$redis = new Redis(); \$redis->connect(config('database.redis.default.host'), config('database.redis.default.port'), 5); if(config('database.redis.default.password')) { \$redis->auth(config('database.redis.default.password')); } \$redis->ping(); echo 'Redis OK'; } catch (Exception \$e) { echo 'Redis Error: ' . \$e->getMessage(); }" 2>/dev/null | grep -q "Redis OK"; then
        log_success "Redis connection successful!"
    else
        log_warning "Redis connection failed, but continuing..."
        log_info "Application will work without Redis (some features may be limited)"
    fi
fi

# Show final configuration
log_info "Final Redis Configuration:"
log_info "REDIS_HOST: $(grep REDIS_HOST .env | cut -d'=' -f2)"
log_info "REDIS_PORT: $(grep REDIS_PORT .env | cut -d'=' -f2)"
log_info "REDIS_PASSWORD: $(grep REDIS_PASSWORD .env | cut -d'=' -f2)"
log_info "REDIS_USERNAME: $(grep REDIS_USERNAME .env | cut -d'=' -f2)"

log_success "Redis environment configuration completed!"
log_info "=================================================="
log_info "🎯 NEXT STEPS:"
log_info "1. Restart your Docker container"
log_info "2. Check container logs for Redis connection"
log_info "3. If Redis is external, ensure it's accessible"
log_info "4. Test application functionality"
log_info "==================================================" 
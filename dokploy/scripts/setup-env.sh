#!/bin/bash

# 🌍 ENVIRONMENT VARIABLES SETUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket

set -e

# Colors for output
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

log_info "🌍 Setting up environment variables..."

# Check if we're in the right directory
if [ ! -f "dokploy/README.md" ]; then
    log_error "Script harus dijalankan dari root project directory"
    exit 1
fi

# Create .env file from template
log_info "📋 Creating .env file from template..."
if [ -f "dokploy/config/env.nixpacks.template" ]; then
    cp dokploy/config/env.nixpacks.template .env
    log_success "✅ .env file created from template"
else
    log_error "❌ Template file not found: dokploy/config/env.nixpacks.template"
    exit 1
fi

# Function to update .env file
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        # Update existing value
        sed -i "s/^${key}=.*/${key}=${value}/" .env
        log_success "✅ Updated ${key}"
    else
        # Add new value
        echo "${key}=${value}" >> .env
        log_success "✅ Added ${key}"
    fi
}

# Update critical environment variables
log_info "🔧 Updating critical environment variables..."

# Generate APP_KEY if not exists
if ! grep -q "^APP_KEY=base64:" .env; then
    APP_KEY=$(php artisan key:generate --show 2>/dev/null || echo "base64:$(openssl rand -base64 32)")
    update_env "APP_KEY" "$APP_KEY"
fi

# Update database configuration
update_env "DB_HOST" "homsjogja-mysql-7hwczo"
update_env "DB_DATABASE" "homsjogja"
update_env "DB_USERNAME" "homsjogja"
update_env "DB_PASSWORD" "hhmnyxuowt41ghk0"

# Update Redis configuration
update_env "REDIS_HOST" "homsjogja-redis-kqzqov"
update_env "REDIS_PASSWORD" "tzwr97nbicqh5w6e"

# Update application configuration
update_env "APP_NAME" "HomsJogja"
update_env "APP_ENV" "production"
update_env "APP_DEBUG" "false"

# Update broadcasting configuration
update_env "BROADCAST_DRIVER" "redis"
update_env "CACHE_DRIVER" "redis"
update_env "QUEUE_CONNECTION" "redis"
update_env "SESSION_DRIVER" "redis"

log_success "🎉 Environment variables setup completed!"

echo ""
echo "📋 ENVIRONMENT VARIABLES SETUP:"
echo "✅ .env file created from template"
echo "✅ Critical variables updated"
echo "✅ Database configuration set"
echo "✅ Redis configuration set"
echo "✅ Application configuration set"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Review .env file and update values as needed"
echo "2. Set environment variables in Dokploy dashboard"
echo "3. Deploy to Dokploy platform"
echo "4. Verify deployment with: ./dokploy/scripts/check-deployment.sh"
echo ""
echo "📚 Documentation: ./dokploy/docs/ENVIRONMENT-VARIABLES-GUIDE.md"

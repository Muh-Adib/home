#!/bin/bash

# 🔍 ENVIRONMENT VARIABLES VALIDATION SCRIPT
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

echo "🔍 Validating environment variables..."

# Required environment variables
REQUIRED_VARS=(
    "APP_NAME"
    "APP_ENV"
    "APP_DEBUG"
    "APP_URL"
    "APP_KEY"
    "DB_CONNECTION"
    "DB_HOST"
    "DB_PORT"
    "DB_DATABASE"
    "DB_USERNAME"
    "DB_PASSWORD"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "REDIS_PORT"
    "REDIS_DB"
    "BROADCAST_DRIVER"
    "CACHE_DRIVER"
    "SESSION_DRIVER"
    "QUEUE_CONNECTION"
)

# Check each required variable
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
        log_error "❌ Missing: $var"
    else
        log_success "✅ Found: $var"
    fi
done

# Check APP_KEY format
if [ -n "$APP_KEY" ]; then
    if [[ "$APP_KEY" =~ ^base64: ]]; then
        log_success "✅ APP_KEY format is correct"
    else
        log_error "❌ APP_KEY format is incorrect (should start with 'base64:')"
    fi
fi

# Check database connection
log_info "🗄️ Testing database connection..."
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    log_success "✅ Database connection successful"
else
    log_error "❌ Database connection failed"
fi

# Check Redis connection
log_info "🔴 Testing Redis connection..."
if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    log_success "✅ Redis connection successful"
else
    log_error "❌ Redis connection failed"
fi

# Summary
echo ""
if [ ${#missing_vars[@]} -eq 0 ]; then
    log_success "🎉 All required environment variables are set!"
else
    log_error "❌ Missing ${#missing_vars[@]} environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📋 Please set these variables in Dokploy Dashboard:"
    echo "   1. Go to your project in Dokploy"
    echo "   2. Open 'Environment Variables' tab"
    echo "   3. Add each missing variable"
    echo "   4. Format: KEY=value (no spaces around =)"
    echo "   5. Save and redeploy"
fi

echo ""
echo "📊 ENVIRONMENT SUMMARY:"
echo "- Total required variables: ${#REQUIRED_VARS[@]}"
echo "- Found variables: $((${#REQUIRED_VARS[@]} - ${#missing_vars[@]}))"
echo "- Missing variables: ${#missing_vars[@]}"
echo "- Database connection: $(php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo "- Redis connection: $(php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1 && echo "✅" || echo "❌")"

#!/bin/bash

# 🚀 DEPLOYMENT STATUS CHECKER
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

echo "🚀 Checking deployment status..."

# Check if we're in the right directory
if [ ! -f "nixpacks.toml" ]; then
    log_error "Script harus dijalankan dari root project directory"
    exit 1
fi

# Check Supervisor status
log_info "📋 Checking Supervisor status..."
if command -v supervisorctl &> /dev/null; then
    supervisorctl status
    log_success "✅ Supervisor is running"
else
    log_warning "⚠️ Supervisor not found"
fi

# Check Nginx status
log_info "🌐 Checking Nginx status..."
if curl -s http://localhost/health > /dev/null 2>&1; then
    log_success "✅ Nginx is responding"
else
    log_error "❌ Nginx is not responding"
fi

# Check WebSocket status
log_info "🔌 Checking WebSocket status..."
if curl -s http://localhost:6001 > /dev/null 2>&1; then
    log_success "✅ WebSocket server is running"
else
    log_warning "⚠️ WebSocket server not responding"
fi

# Check Laravel application
log_info "🔧 Checking Laravel application..."
if php artisan --version > /dev/null 2>&1; then
    log_success "✅ Laravel application is accessible"
else
    log_error "❌ Laravel application not accessible"
fi

# Check database connection
log_info "🗄️ Checking database connection..."
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    log_success "✅ Database connection successful"
else
    log_error "❌ Database connection failed"
fi

# Check Redis connection
log_info "🔴 Checking Redis connection..."
if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    log_success "✅ Redis connection successful"
else
    log_error "❌ Redis connection failed"
fi

# Check file permissions
log_info "🔐 Checking file permissions..."
if [ -w "storage/logs" ] && [ -w "bootstrap/cache" ]; then
    log_success "✅ File permissions are correct"
else
    log_warning "⚠️ File permissions may need adjustment"
fi

# Check build assets
log_info "📦 Checking build assets..."
if [ -d "public/build" ] && [ "$(ls -A public/build 2>/dev/null)" ]; then
    log_success "✅ React build assets found"
else
    log_warning "⚠️ React build assets not found"
fi

# Check environment variables
log_info "🌍 Checking environment variables..."
if [ -f ".env" ]; then
    log_success "✅ .env file exists"
else
    log_warning "⚠️ .env file not found"
fi

# Check logs
log_info "📝 Checking logs..."
if [ -f "storage/logs/laravel.log" ]; then
    log_success "✅ Laravel logs exist"
    echo "Last 5 log entries:"
    tail -5 storage/logs/laravel.log
else
    log_warning "⚠️ Laravel logs not found"
fi

echo ""
log_success "🎉 Deployment status check completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Check Supervisor status for service health"
echo "- Verify all services are running (4/4)"
echo "- Monitor logs for any errors"
echo "- Test application functionality"

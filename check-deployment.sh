#!/bin/bash

# Deployment Status Checker untuk Nixpacks
# Property Management System - Laravel 12 + React + WebSocket

set -e

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

# Function untuk success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function untuk warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function untuk error
error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔍 Deployment Status Checker"
echo "============================"
echo ""

# Check 1: Supervisor Status
log "Checking Supervisor status..."
if command -v supervisorctl &> /dev/null; then
    if supervisorctl status > /dev/null 2>&1; then
        success "Supervisor is running"
        echo "Service Status:"
        supervisorctl status | while read line; do
            if [[ $line == *"RUNNING"* ]]; then
                echo -e "  ${GREEN}✅ $line${NC}"
            else
                echo -e "  ${RED}❌ $line${NC}"
            fi
        done
    else
        error "Supervisor is not running"
    fi
else
    error "Supervisor is not installed"
fi
echo ""

# Check 2: Nginx Status
log "Checking Nginx status..."
if pgrep nginx > /dev/null; then
    success "Nginx is running"
    echo "Nginx processes:"
    ps aux | grep nginx | grep -v grep
else
    error "Nginx is not running"
fi
echo ""

# Check 3: PHP-FPM Status
log "Checking PHP-FPM status..."
if pgrep php-fpm > /dev/null; then
    success "PHP-FPM is running"
    echo "PHP-FPM processes:"
    ps aux | grep php-fpm | grep -v grep
else
    error "PHP-FPM is not running"
fi
echo ""

# Check 4: WebSocket Server Status
log "Checking WebSocket server status..."
if pgrep -f "laravel-echo-server" > /dev/null; then
    success "WebSocket server is running"
    echo "WebSocket processes:"
    ps aux | grep laravel-echo-server | grep -v grep
else
    error "WebSocket server is not running"
fi
echo ""

# Check 5: Laravel Queue Worker Status
log "Checking Laravel Queue Worker status..."
if pgrep -f "queue:work" > /dev/null; then
    success "Laravel Queue Worker is running"
    echo "Queue Worker processes:"
    ps aux | grep "queue:work" | grep -v grep
else
    error "Laravel Queue Worker is not running"
fi
echo ""

# Check 6: Port Availability
log "Checking port availability..."
PORTS=("80" "9000" "6001")
for port in "${PORTS[@]}"; do
    if netstat -tuln | grep ":$port " > /dev/null; then
        success "Port $port is listening"
    else
        error "Port $port is not listening"
    fi
done
echo ""

# Check 7: Laravel Application
log "Checking Laravel application..."
if [ -f "/var/www/html/artisan" ]; then
    success "Laravel artisan found"
    
    # Check if Laravel can run commands
    if php /var/www/html/artisan --version > /dev/null 2>&1; then
        success "Laravel artisan is working"
    else
        error "Laravel artisan is not working"
    fi
else
    error "Laravel artisan not found"
fi
echo ""

# Check 8: Environment Variables
log "Checking critical environment variables..."
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
    if [ -n "${!var}" ]; then
        success "$var is set"
    else
        error "$var is not set"
    fi
done
echo ""

# Check 9: Database Connection
log "Testing database connection..."
if php /var/www/html/artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    success "Database connection successful"
else
    error "Database connection failed"
fi
echo ""

# Check 10: Redis Connection
log "Testing Redis connection..."
if php /var/www/html/artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    success "Redis connection successful"
else
    error "Redis connection failed"
fi
echo ""

# Check 11: WebSocket Connection
log "Testing WebSocket connection..."
if curl -f http://localhost:6001 > /dev/null 2>&1; then
    success "WebSocket server is responding"
else
    error "WebSocket server is not responding"
fi
echo ""

# Check 12: File Permissions
log "Checking file permissions..."
if [ -w "/var/www/html/storage" ] && [ -w "/var/www/html/bootstrap/cache" ]; then
    success "Storage and cache directories are writable"
else
    error "Storage or cache directories are not writable"
fi
echo ""

# Check 13: Build Assets
log "Checking React build assets..."
if [ -d "/var/www/html/public/build" ] && [ "$(ls -A /var/www/html/public/build)" ]; then
    success "React build assets found"
else
    error "React build assets not found"
fi
echo ""

# Check 14: Log Files
log "Checking log files..."
LOG_DIRS=(
    "/var/log/supervisor"
    "/var/log/nginx"
    "/var/www/html/storage/logs"
)

for dir in "${LOG_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        success "Log directory exists: $dir"
        echo "  Recent logs:"
        ls -la "$dir" | head -5
    else
        error "Log directory missing: $dir"
    fi
done
echo ""

# Summary
echo "📊 DEPLOYMENT SUMMARY"
echo "====================="
echo ""

# Count running services
RUNNING_SERVICES=0
TOTAL_SERVICES=4

if pgrep nginx > /dev/null; then ((RUNNING_SERVICES++)); fi
if pgrep php-fpm > /dev/null; then ((RUNNING_SERVICES++)); fi
if pgrep -f "laravel-echo-server" > /dev/null; then ((RUNNING_SERVICES++)); fi
if pgrep -f "queue:work" > /dev/null; then ((RUNNING_SERVICES++)); fi

if [ $RUNNING_SERVICES -eq $TOTAL_SERVICES ]; then
    success "All services are running ($RUNNING_SERVICES/$TOTAL_SERVICES)"
else
    warning "Some services are not running ($RUNNING_SERVICES/$TOTAL_SERVICES)"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Check logs if any services failed: tail -f /var/log/supervisor/supervisord.log"
echo "2. Restart services if needed: supervisorctl restart all"
echo "3. Test application endpoints"
echo "4. Monitor performance and logs"
echo ""

echo "🔧 TROUBLESHOOTING COMMANDS:"
echo "supervisorctl status                    # Check all service status"
echo "supervisorctl restart all              # Restart all services"
echo "tail -f /var/log/supervisor/*.log     # Monitor supervisor logs"
echo "tail -f /var/www/html/storage/logs/laravel.log  # Monitor Laravel logs"
echo "curl http://localhost/health           # Test health endpoint"
echo "curl http://localhost:6001             # Test WebSocket server"

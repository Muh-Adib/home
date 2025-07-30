# 🚀 Production Startup Script - Enhanced Version

## Property Management System - Laravel 12 + React 18 + WebSocket

Dokumentasi untuk startup script yang telah dioptimasi untuk lingkungan production.

---

## 🚨 **Improvements yang Telah Dibuat**

### ✅ **Enhanced Error Handling**
- **Strict error handling** - `set -euo pipefail`
- **Color-coded logging** - Info, Success, Warning, Error
- **Function-based architecture** - Modular dan maintainable
- **Graceful degradation** - Continue jika service tidak tersedia

### ✅ **Production Optimizations**
- **Timeout handling** - Service connection dengan timeout
- **Cache optimization** - Proper cache clearing dan rebuilding
- **Storage setup** - Automatic directory creation dan permissions
- **Queue setup** - Job tables creation

### ✅ **Better Logging & Monitoring**
- **Structured logging** - Consistent format dengan colors
- **Service status tracking** - Real-time status monitoring
- **Health checks** - Application readiness verification
- **Error reporting** - Detailed error messages

---

## 📁 **Files yang Diperbaiki**

### **1. `docker/scripts/startup.sh`**
```bash
# Enhanced dengan:
- Color-coded logging system
- Function-based architecture
- Production error handling
- Service health checks
- Cache optimization
- Storage setup automation
```

---

## 🔧 **Key Features**

### **1. Color-Coded Logging**
```bash
log_info()    # Blue - Information messages
log_success() # Green - Success messages  
log_warning() # Yellow - Warning messages
log_error()   # Red - Error messages
```

### **2. Service Health Checks**
```bash
# Database connection test
test_database_connection()

# Redis connection test  
test_redis_connection()

# Application readiness test
test_application()
```

### **3. Production Optimizations**
```bash
# Cache optimization
rebuild_cache()

# Storage setup
setup_storage()

# Queue setup
setup_queue()

# Laravel Echo Server setup
setup_echo_server()
```

---

## 🚀 **Startup Flow**

### **1. Environment Setup**
```bash
# Set environment variables
export DB_HOST=${DB_HOST:-homsjogja-db-xsjalx}
export DB_PORT=${DB_PORT:-3306}
export DB_DATABASE=${DB_DATABASE:-homs-db}
# ... other variables

# Update .env file dengan dynamic values
sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST}/" .env
# ... other configurations
```

### **2. Service Health Checks**
```bash
# Wait for external services
wait_for_service "$DB_HOST" "$DB_PORT" "Database"
wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"

# Test connections
test_database_connection()
test_redis_connection()
```

### **3. Application Setup**
```bash
# Setup storage
setup_storage()

# Run migrations
run_migrations()

# Setup queue
setup_queue()

# Setup Laravel Echo Server
setup_echo_server()

# Optimize for production
optimize_production()
```

### **4. Service Startup**
```bash
# Start PHP-FPM
php-fpm -D

# Start Nginx
nginx

# Test application
test_application()

# Start Supervisor
exec /usr/bin/supervisord
```

---

## 📊 **Production Features**

### **1. Error Handling**
```bash
# Strict error handling
set -euo pipefail

# Trap untuk cleanup
trap 'log_error "Startup script interrupted"; exit 1' INT TERM

# Function-based error handling
if test_database_connection; then
    run_migrations
else
    log_error "Database connection failed"
fi
```

### **2. Service Monitoring**
```bash
# Service health checks
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=${4:-30}
    
    while [ $attempt -le $max_attempts ]; do
        if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log_success "$service_name is ready!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
}
```

### **3. Cache Optimization**
```bash
rebuild_cache() {
    # Clear all caches
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    
    # Rebuild cache untuk production
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
}
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Failed**
```bash
# Check database connectivity
wait_for_service "$DB_HOST" "$DB_PORT" "Database"

# Test connection
test_database_connection()

# Check logs
docker logs homsjogja-container
```

#### **2. Redis Connection Failed**
```bash
# Check Redis connectivity
wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"

# Test connection
test_redis_connection()

# Continue without Redis
log_warning "Redis connection failed, aplikasi akan berjalan tanpa Redis cache"
```

#### **3. Application Health Check Failed**
```bash
# Test application readiness
test_application()

# Check service status
docker exec homsjogja-container ps aux

# Check nginx status
docker exec homsjogja-container nginx -t
```

---

## 📋 **Environment Variables**

### **Required Variables**
```env
# Database Configuration
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ

# Redis Configuration
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PORT=6379
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_DB=0

# Application Configuration
APP_URL=http://localhost:8080
APP_ENV=production
APP_DEBUG=false
```

### **Optional Variables**
```env
# Cache Configuration
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Broadcasting Configuration
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default

# Mail Configuration
MAIL_FROM_ADDRESS=noreply@domain.com
MAIL_FROM_NAME="Property Management System"
```

---

## 🎯 **Success Indicators**

### **✅ Startup Success**
- ✅ **All services connected** - Database, Redis, WebSocket
- ✅ **Migrations completed** - All tables created
- ✅ **Cache optimized** - Production cache built
- ✅ **Services started** - PHP-FPM, Nginx, Supervisor
- ✅ **Application ready** - Health check passed

### **✅ Production Ready**
- ✅ **Error handling** - Graceful degradation
- ✅ **Logging system** - Structured logging
- ✅ **Health monitoring** - Service status tracking
- ✅ **Performance optimized** - Cache dan optimizations
- ✅ **Security hardened** - Production configurations

---

## 🔧 **Additional Features**

### **1. Dynamic Configuration**
```bash
# Update APP_URL dynamically
if [ -n "${APP_URL:-}" ]; then
    sed -i "s|APP_URL=.*|APP_URL=${APP_URL}|" .env
    
    # Update related configurations
    echo "ASSET_URL=${APP_URL}" >> .env
    echo "VITE_APP_URL=${APP_URL}" >> .env
    
    # Update mail domain
    DOMAIN=$(echo "$APP_URL" | sed 's|https\?://||' | sed 's|/.*||')
    sed -i "s/MAIL_FROM_ADDRESS=.*/MAIL_FROM_ADDRESS=noreply@${DOMAIN}/" .env
fi
```

### **2. Storage Setup**
```bash
setup_storage() {
    # Create required directories
    mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views storage/app/public
    
    # Setup storage link
    php artisan storage:link
    
    # Set proper permissions
    chown -R www:www storage bootstrap/cache database
    chmod -R 755 storage bootstrap/cache database
}
```

### **3. Laravel Echo Server Setup**
```bash
setup_echo_server() {
    ECHO_CONFIG="/var/www/html/laravel-echo-server.production.json"
    
    if [ -n "${APP_URL:-}" ]; then
        AUTH_HOST=$(echo "$APP_URL" | sed 's|/$||')
        sed -i "s|\"authHost\": \".*\"|\"authHost\": \"${AUTH_HOST}\"|" "$ECHO_CONFIG"
    fi
    
    mkdir -p /var/www/html/database/echo-server
    chown -R www:www /var/www/html/database/echo-server
}
```

---

## 📚 **Reference**

### **Bash Scripting Best Practices**
```bash
# Error handling
set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function-based architecture
function_name() {
    local var=$1
    # function logic
}

# Trap untuk cleanup
trap 'cleanup_function' INT TERM
```

### **Laravel Production Commands**
```bash
# Cache optimization
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Storage setup
php artisan storage:link

# Queue setup
php artisan queue:table
php artisan migrate

# Production optimization
php artisan optimize
```

### **Docker Commands**
```bash
# Build image
docker build -f Dockerfile.dokploy -t homsjogja-app .

# Run container
docker run -d --name homsjogja-container -p 8080:80 homsjogja-app

# Check logs
docker logs homsjogja-container

# Execute commands
docker exec homsjogja-container php artisan migrate --force
```

---

## 🎉 **Ready for Production!**

Startup script telah dioptimasi untuk production dengan:
- ✅ **Enhanced error handling** - Strict error handling dan graceful degradation
- ✅ **Production optimizations** - Cache optimization dan performance tuning
- ✅ **Better logging** - Color-coded structured logging
- ✅ **Service monitoring** - Health checks dan status tracking
- ✅ **Security hardening** - Production configurations dan permissions

**📅 Last Updated**: 2025  
**🔄 Version**: 2.0  
**👤 Maintained By**: Development Team 
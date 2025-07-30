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
    
    # Fix Redis configuration untuk Laravel Echo Server
    log_info "Fixing Laravel Echo Server Redis configuration..."
    
    # Update Redis config dengan proper format
    cat > "$ECHO_CONFIG" << 'EOF'
{
    "authHost": "http://localhost:8080",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "homsjogja",
            "key": "homsjogja_websocket_key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "homsjogja-redis-qmihbb",
            "port": 6379,
            "password": "5vlcwpzc45g9mtho",
            "keyPrefix": "laravel_database_",
            "db": 0
        }
    },
    "devMode": false,
    "host": "localhost",
    "port": 6002,
    "protocol": "http",
    "socketio": {
        "transports": ["websocket", "polling"],
        "allowEIO3": true,
        "cors": {
            "origin": "*",
            "methods": ["GET", "POST"],
            "credentials": true
        },
        "pingTimeout": 60000,
        "pingInterval": 25000,
        "maxHttpBufferSize": 1048576,
        "allowUpgrades": true,
        "upgradeTimeout": 30000,
        "compression": true,
        "httpCompression": true,
        "cookie": {
            "name": "laravel_echo_server",
            "httpOnly": true,
            "secure": false,
            "sameSite": "lax"
        }
    },
    "sslCertPath": "",
    "sslKeyPath": "",
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "*",
        "allowMethods": "GET,POST,PUT,DELETE,OPTIONS",
        "allowHeaders": "Origin,Content-Type,X-Auth-Token,X-Requested-With,Accept,Authorization,X-CSRF-TOKEN,X-Socket-Id,Cookie"
    },
    "referrers": [],
    "subscribers": {
        "http": true,
        "redis": true
    }
}
EOF
    
    # Update authHost jika APP_URL tersedia
    if [ -n "${APP_URL:-}" ]; then
        AUTH_HOST=$(echo "$APP_URL" | sed 's|/$||')
        sed -i "s|\"authHost\": \".*\"|\"authHost\": \"${AUTH_HOST}\"|" "$ECHO_CONFIG"
        log_info "Laravel Echo Server authHost updated to: $AUTH_HOST"
    fi
    
    log_success "Laravel Echo Server configured"
}

# Function untuk setup queue
setup_queue() {
    log_info "Setting up queue tables..."
    
    # Check if queue table exists, if not create it
    if ! php artisan migrate:status | grep -q "jobs"; then
        log_info "Creating jobs table..."
        php artisan make:migration create_jobs_table --create=jobs || log_warning "Jobs migration already exists"
        php artisan migrate --force || log_warning "Jobs migration failed"
    else
        log_info "Jobs table already exists"
    fi
    
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
    
    # Debug: Check if nginx is running
    log_info "Debug: Checking nginx process..."
    ps aux | grep nginx || log_warning "No nginx process found"
    
    # Debug: Check if php-fpm is running
    log_info "Debug: Checking php-fpm process..."
    ps aux | grep php-fpm || log_warning "No php-fpm process found"
    
    # Debug: Check port usage
    log_info "Debug: Checking port usage..."
    netstat -tlnp | grep :8080 || log_warning "Port 8080 not in use"
    netstat -tlnp | grep :9000 || log_warning "Port 9000 not in use"
    
    # Debug: Check nginx configuration
    log_info "Debug: Testing nginx configuration..."
    nginx -t || log_error "Nginx configuration test failed"
    
    # Debug: Check nginx error log
    log_info "Debug: Checking nginx error log..."
    if [ -f /var/log/nginx/error.log ]; then
        tail -10 /var/log/nginx/error.log
    else
        log_warning "Nginx error log not found"
    fi
    
    # Debug: Check nginx access log
    log_info "Debug: Checking nginx access log..."
    if [ -f /var/log/nginx/access.log ]; then
        tail -5 /var/log/nginx/access.log
    else
        log_warning "Nginx access log not found"
    fi
    
    # Debug: Check if nginx is listening
    log_info "Debug: Testing nginx directly..."
    curl -v http://localhost:8080/health 2>&1 || log_warning "Direct nginx test failed"
    
    # Wait for nginx to start
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            log_success "Application is ready to serve requests"
            return 0
        fi
        
        log_info "Waiting for application to be ready... (attempt $attempt/$max_attempts)"
        
        # Debug: Check process status every 5 attempts
        if [ $((attempt % 5)) -eq 0 ]; then
            log_info "Debug: Process status check..."
            ps aux | grep -E "(nginx|php-fpm)" | head -5
            netstat -tlnp | grep -E "(8080|9000)" || log_warning "No processes on expected ports"
        fi
        
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_error "Application failed to start within $max_attempts seconds"
    
    # Final debug: Show all relevant logs
    log_error "Final debug information:"
    log_error "=== Process Status ==="
    ps aux | grep -E "(nginx|php-fpm)" || log_error "No nginx/php-fpm processes found"
    
    log_error "=== Port Status ==="
    netstat -tlnp | grep -E "(8080|9000)" || log_error "No processes on expected ports"
    
    log_error "=== Nginx Configuration ==="
    nginx -t || log_error "Nginx configuration is invalid"
    
    log_error "=== Recent Logs ==="
    if [ -f /var/log/nginx/error.log ]; then
        tail -20 /var/log/nginx/error.log
    fi
    
    return 1
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
    
    # Check if port 8080 is still in use
    if netstat -tlnp 2>/dev/null | grep -q ":8080 "; then
        log_warning "Port 8080 is still in use, trying to kill process"
        fuser -k 8080/tcp || true
        sleep 3
    fi
    
    # Check if port 6002 is still in use
    if netstat -tlnp 2>/dev/null | grep -q ":6002 "; then
        log_warning "Port 6002 is still in use, trying to kill process"
        fuser -k 6002/tcp || true
        sleep 3
    fi
    
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
    
    # Create PHP-FPM log directory
    mkdir -p /var/log/php-fpm
    chown www:www /var/log/php-fpm
    chmod 755 /var/log/php-fpm
    
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

    # Debug: Check file permissions and structure
    log_info "Debug: Checking file permissions and structure..."
    
    # Check if public directory exists
    if [ -d "/var/www/html/public" ]; then
        log_success "Public directory exists"
        ls -la /var/www/html/public/ | head -5
    else
        log_error "Public directory not found"
    fi
    
    # Check if index.php exists
    if [ -f "/var/www/html/public/index.php" ]; then
        log_success "index.php exists"
    else
        log_error "index.php not found"
    fi
    
    # Check nginx configuration file
    log_info "Debug: Checking nginx configuration files..."
    if [ -f "/etc/nginx/http.d/default.conf" ]; then
        log_success "Nginx config file exists at /etc/nginx/http.d/default.conf"
        cat /etc/nginx/http.d/default.conf | head -10
    elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
        log_success "Nginx config file exists at /etc/nginx/conf.d/default.conf"
        cat /etc/nginx/conf.d/default.conf | head -10
    else
        log_warning "Nginx config file not found at expected locations"
        # Check alternative locations
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            log_success "Nginx config found at /etc/nginx/sites-enabled/default"
        elif [ -f "/etc/nginx/nginx.conf" ]; then
            log_success "Nginx config found at /etc/nginx/nginx.conf"
        else
            log_error "No nginx config files found"
            # List all nginx config files
            log_info "Debug: Searching for nginx config files..."
            find /etc/nginx -name "*.conf" 2>/dev/null || log_warning "No nginx config files found in /etc/nginx"
        fi
    fi
    
    # Check if nginx config is valid
    log_info "Debug: Testing nginx configuration..."
    nginx -t || log_error "Nginx configuration test failed"
    
    # Check nginx error log directory
    if [ -d "/var/log/nginx" ]; then
        log_success "Nginx log directory exists"
        ls -la /var/log/nginx/
    else
        log_error "Nginx log directory not found"
    fi
    
    # Check PHP-FPM configuration
    log_info "Debug: Checking PHP-FPM configuration..."
    php-fpm -t || log_error "PHP-FPM configuration test failed"
    
    # Check if PHP-FPM socket/port is available (will be empty before startup)
    log_info "Debug: Checking PHP-FPM socket/port..."
    netstat -tlnp | grep :9000 || log_warning "PHP-FPM not listening on port 9000 (normal before startup)"
    
    # Test PHP-FPM directly (simplified test)
    log_info "Debug: Testing PHP-FPM directly..."
    echo "<?php echo 'PHP-FPM is working'; ?>" > /tmp/test.php
    log_info "Created test PHP file at /tmp/test.php"
    
    # Start PHP-FPM in background
    log_info "Starting PHP-FPM"
    php-fpm -D || log_error "Failed to start PHP-FPM"
    
    # Debug: Check if PHP-FPM started
    sleep 2
    if pgrep php-fpm > /dev/null; then
        log_success "PHP-FPM started successfully"
    else
        log_error "PHP-FPM failed to start"
        ps aux | grep php-fpm || log_error "No PHP-FPM process found"
    fi
    
    log_info "Starting Nginx"
    nginx || log_error "Failed to start Nginx"
    
    # Debug: Check if Nginx started
    sleep 2
    if pgrep nginx > /dev/null; then
        log_success "Nginx started successfully"
    else
        log_error "Nginx failed to start"
        ps aux | grep nginx || log_error "No Nginx process found"
    fi

    # Test aplikasi readiness
    test_application

    # Start supervisor untuk manage processes (including Laravel Echo Server)
    log_info "Starting Supervisor dengan WebSocket Support"
    
    # Debug: Check if supervisor is already running
    log_info "Debug: Checking supervisor status..."
    if pgrep supervisord > /dev/null; then
        log_warning "Supervisor is already running, stopping it first"
        pkill supervisord || true
        sleep 3
    fi
    
    # Debug: Check supervisor configuration
    log_info "Debug: Testing supervisor configuration..."
    if [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
        log_success "Supervisor config file exists"
        head -20 /etc/supervisor/conf.d/supervisord.conf
    else
        log_error "Supervisor config file not found"
    fi
    
    # Start supervisor in foreground untuk keep container running
    log_success "Application startup completed successfully!"
    log_info "Services Status:"
    log_info "- PHP-FPM: Running"
    log_info "- Nginx: Running"
    log_info "- Laravel Echo Server: Will start via Supervisor"
    log_info "- Queue Workers: Will start via Supervisor"
    log_info "- Database: $DB_HOST:$DB_PORT"
    log_info "- Redis: $REDIS_HOST:$REDIS_PORT"
    log_info "- WebSocket: http://localhost:6002"
    
    # Start supervisor dengan delay untuk memastikan semua service siap
    sleep 5
    exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
}

# Trap untuk cleanup jika script di-interrupt
trap 'log_error "Startup script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
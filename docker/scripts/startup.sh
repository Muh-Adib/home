#!/bin/bash

# ==================================================
# Laravel Dokploy Production Startup Script
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

# Main startup function
main() {
    log_info "=== Laravel Dokploy Production Startup Script ==="
    log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
    log_info "=================================================="
    
    # Setup log directories
    setup_logs
    
    # Cleanup existing processes
    cleanup_existing_processes
    
    # Setup dynamic environment configuration
    setup_environment
    
    # Wait for external services
    wait_for_services
    
    # Setup storage and database
    setup_storage
    test_database_connection
    run_migrations
    setup_queue
    
    # Configure Laravel Echo Server
    setup_echo_server
    
    # Run production optimizations
    run_production_optimizations
    
    # Test Redis connection
    test_redis_connection
    
    # Set final permissions
    set_final_permissions
    
    # Start Supervisor (mengelola semua service)
    start_supervisor
}

# Setup log directories
setup_logs() {
    log_info "Setting up log directories..."
    
    # Create required log directories
    mkdir -p /var/log/supervisor
    mkdir -p /var/log/nginx
    mkdir -p /var/log/php-fpm
    mkdir -p /var/cache/nginx
    
    # Set proper permissions
    chown -R root:root /var/log/supervisor
    chown -R nginx:nginx /var/log/nginx
    chown -R root:root /var/log/php-fpm
    chmod -R 755 /var/log/supervisor
    chmod -R 755 /var/log/nginx
    chmod -R 755 /var/log/php-fpm
    
    log_success "Log directories setup completed"
}

# Cleanup existing processes
cleanup_existing_processes() {
    log_info "Cleaning up existing processes..."
    # Kill existing processes lebih keras
    pkill -9 nginx || true
    pkill -9 php-fpm || true
    sleep 2
    log_success "Process cleanup completed"
}

# Setup dynamic environment configuration
setup_environment() {
    log_info "Setting up Dynamic Environment Configuration"
    
    # Update APP_URL if provided
    if [ ! -z "$APP_URL" ]; then
        log_info "Setting dynamic APP_URL to: $APP_URL"
        sed -i "s|APP_URL=.*|APP_URL=$APP_URL|g" .env
        
        # Update mail domain
        MAIL_DOMAIN=$(echo $APP_URL | sed 's|https://||' | sed 's|http://||')
        log_info "Mail domain set to: noreply@$MAIL_DOMAIN"
        sed -i "s|MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=noreply@$MAIL_DOMAIN|g" .env
    fi
    
    # Log environment configuration
    log_info "Environment Configuration:"
    log_info "APP_URL: $(grep APP_URL .env | cut -d'=' -f2)"
    log_info "Database: $(grep DB_HOST .env | cut -d'=' -f2):$(grep DB_PORT .env | cut -d'=' -f2) ($(grep DB_DATABASE .env | cut -d'=' -f2))"
    log_info "Redis: $(grep REDIS_HOST .env | cut -d'=' -f2):$(grep REDIS_PORT .env | cut -d'=' -f2)"
}

# Wait for external services
wait_for_services() {
    log_info "Waiting for External Services"
    
    # Wait for database
    log_info "Waiting for Database at $(grep DB_HOST .env | cut -d'=' -f2):$(grep DB_PORT .env | cut -d'=' -f2)..."
    until php artisan tinker --execute="echo 'Database connection test';" 2>/dev/null; do
        log_info "Database not ready, waiting..."
        sleep 5
    done
    log_success "Database is ready!"
    
    # Wait for Redis
    log_info "Waiting for Redis at $(grep REDIS_HOST .env | cut -d'=' -f2):$(grep REDIS_PORT .env | cut -d'=' -f2)..."
    until php artisan tinker --execute="echo Redis::connection()->ping();" 2>/dev/null; do
        log_info "Redis not ready, waiting..."
        sleep 5
    done
    log_success "Redis is ready!"
}

# Setup storage
setup_storage() {
    log_info "Setting up storage..."
    
    # Create storage link
    php artisan storage:link || log_warning "Storage link already exists"
    
    log_success "Storage setup completed"
}

# Test database connection
test_database_connection() {
    log_info "Testing database connection..."
    
    if php artisan tinker --execute="echo 'Database connection successful';" 2>/dev/null; then
        log_success "Database connection successful!"
    else
        log_error "Database connection failed!"
        exit 1
    fi
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    php artisan migrate --force || log_warning "Migrations failed or nothing to migrate"
    
    log_success "Migrations completed successfully"
}

# Setup queue tables
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

# Configure Laravel Echo Server
setup_echo_server() {
    log_info "Configuring Laravel Echo Server..."
    
    ECHO_CONFIG="/var/www/html/laravel-echo-server.dokploy.json"
    
    # Update authHost if APP_URL is provided
    if [ ! -z "$APP_URL" ]; then
        log_info "Laravel Echo Server authHost updated to: $APP_URL"
        sed -i "s|\"authHost\": \".*\"|\"authHost\": \"$APP_URL\"|g" "$ECHO_CONFIG"
    fi
    
    # Fix Redis configuration untuk Laravel Echo Server
    log_info "Fixing Laravel Echo Server Redis configuration..."
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
    
    # Update authHost if APP_URL is provided
    if [ ! -z "$APP_URL" ]; then
        log_info "Laravel Echo Server authHost updated to: $APP_URL"
        sed -i "s|\"authHost\": \".*\"|\"authHost\": \"$APP_URL\"|g" "$ECHO_CONFIG"
    fi
    
    log_success "Laravel Echo Server configured"
}

# Run production optimizations
run_production_optimizations() {
    log_info "Running production optimizations..."
    
    # Cache configuration
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
    
    # Clear application cache first
    log_info "Clearing application cache..."
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    
    # Rebuild production cache
    log_info "Rebuilding production cache..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
    
    log_success "Cache rebuild completed"
    log_success "Production optimization completed"
}

# Test Redis connection
test_redis_connection() {
    log_info "Testing Redis connection..."
    
    if php artisan tinker --execute="echo Redis::connection()->ping();" 2>/dev/null; then
        log_success "Redis connection successful!"
    else
        log_error "Redis connection failed!"
        exit 1
    fi
}

# Set final permissions
set_final_permissions() {
    log_info "Setting Final Permissions"
    
    # Debug: Check file permissions and structure
    log_info "Debug: Checking file permissions and structure..."
    
    # Check public directory
    if [ -d "/var/www/html/public" ]; then
        log_success "Public directory exists"
        ls -la /var/www/html/public | head -5
    else
        log_error "Public directory not found"
    fi
    
    # Check index.php
    if [ -f "/var/www/html/public/index.php" ]; then
        log_success "index.php exists"
    else
        log_error "index.php not found"
    fi
    
    # Check nginx configuration files
    log_info "Debug: Checking nginx configuration files..."
    if [ -f "/etc/nginx/http.d/default.conf" ]; then
        log_success "Nginx config file exists at /etc/nginx/http.d/default.conf"
        head -10 /etc/nginx/http.d/default.conf
    elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
        log_success "Nginx config file exists at /etc/nginx/conf.d/default.conf"
        head -10 /etc/nginx/conf.d/default.conf
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
    
    # Test nginx configuration
    log_info "Debug: Testing nginx configuration..."
    nginx -t || log_error "Nginx configuration test failed"
    
    # Check nginx log directory
    if [ -d "/var/log/nginx" ]; then
        log_success "Nginx log directory exists"
        ls -la /var/log/nginx
    else
        log_error "Nginx log directory not found"
    fi
    
    # Check PHP-FPM configuration
    log_info "Debug: Checking PHP-FPM configuration..."
    php-fpm -t || log_error "PHP-FPM configuration test failed"
    
    # Check supervisor configuration
    log_info "Debug: Testing supervisor configuration..."
    if [ -f "/etc/supervisor.d/supervisord.conf" ]; then
        log_success "Supervisor config file exists at /etc/supervisor.d/supervisord.conf"
        head -20 /etc/supervisor.d/supervisord.conf
    elif [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
        log_success "Supervisor config file exists at /etc/supervisor/conf.d/supervisord.conf"
        head -20 /etc/supervisor/conf.d/supervisord.conf
    else
        log_error "Supervisor config file not found"
        # List all supervisor config files
        log_info "Debug: Searching for supervisor config files..."
        find /etc -name "*supervisor*" -type f 2>/dev/null || log_warning "No supervisor config files found"
    fi
}

# Start Supervisor (mengelola semua service)
start_supervisor() {
    log_info "Starting Supervisor dengan WebSocket Support"
    
    # Debug: Check supervisor status
    log_info "Debug: Checking supervisor status..."
    
    # Debug: Test supervisor configuration
    log_info "Debug: Testing supervisor configuration..."
    if [ -f "/etc/supervisor.d/supervisord.conf" ]; then
        log_success "Supervisor config file exists at /etc/supervisor.d/supervisord.conf"
        head -20 /etc/supervisor.d/supervisord.conf
    elif [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
        log_success "Supervisor config file exists at /etc/supervisor/conf.d/supervisord.conf"
        head -20 /etc/supervisor/conf.d/supervisord.conf
    else
        log_error "Supervisor config file not found"
        # List all supervisor config files
        log_info "Debug: Searching for supervisor config files..."
        find /etc -name "*supervisor*" -type f 2>/dev/null || log_warning "No supervisor config files found"
    fi
    
    log_success "Application startup completed successfully!"
    
    # Log services status
    log_info "Services Status:"
    log_info "- PHP-FPM: Will start via Supervisor"
    log_info "- Nginx: Will start via Supervisor"
    log_info "- Laravel Echo Server: Will start via Supervisor"
    log_info "- Queue Workers: Will start via Supervisor"
    log_info "- Database: $(grep DB_HOST .env | cut -d'=' -f2):$(grep DB_PORT .env | cut -d'=' -f2)"
    log_info "- Redis: $(grep REDIS_HOST .env | cut -d'=' -f2):$(grep REDIS_PORT .env | cut -d'=' -f2)"
    log_info "- WebSocket: http://localhost:6002"
    
    # Start supervisor dengan delay untuk memastikan semua service siap
    sleep 5
    exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf
}

# Run main function
main "$@"
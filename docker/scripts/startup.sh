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

# Handle Dokploy container rotation
handle_dokploy_rotation() {
    log_info "=================================================="
    log_info "🔄 DOKPLOY CONTAINER ROTATION HANDLING"
    log_info "=================================================="
    
    # Get current container info
    CONTAINER_ID=$(hostname)
    CONTAINER_NAME=$(cat /proc/1/cgroup | grep -o 'docker/[^/]*' | head -1 | cut -d'/' -f2)
    
    log_info "📊 Container Information:"
    log_info "   - Container ID: $CONTAINER_ID"
    log_info "   - Container Name: $CONTAINER_NAME"
    log_info "   - Hostname: $(hostname)"
    
    # Check if we're in Dokploy environment
    if [ -n "$DOKPLOY_ENV" ] || [ -n "$DOKPLOY_APP_ID" ]; then
        log_info "✅ Running in Dokploy environment"
        log_info "   - Dokploy App ID: $DOKPLOY_APP_ID"
        log_info "   - Dokploy Environment: $DOKPLOY_ENV"
        
        # Set persistent service discovery
        log_info "🔧 Setting up persistent service discovery..."
        
        # Create service identifier file
        echo "$CONTAINER_ID" > /tmp/current_container_id
        echo "$(date)" > /tmp/container_start_time
        
        log_info "   - Service ID: $CONTAINER_ID"
        log_info "   - Start Time: $(date)"
        
    else
        log_info "⚠️  Not in Dokploy environment (local development)"
    fi
    
    # Check for previous container logs
    if [ -f "/tmp/previous_container_id" ]; then
        PREVIOUS_ID=$(cat /tmp/previous_container_id)
        log_info "🔄 Container rotation detected:"
        log_info "   - Previous Container: $PREVIOUS_ID"
        log_info "   - Current Container: $CONTAINER_ID"
    fi
    
    # Save current container ID for next rotation
    echo "$CONTAINER_ID" > /tmp/previous_container_id
    
    log_info "=================================================="
}

# Main startup function
main() {
    log_info "=== Laravel Dokploy Production Startup Script ==="
    log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
    log_info "=================================================="
    
    # Handle Dokploy container rotation
    handle_dokploy_rotation
    
    # Display port configuration summary
    log_info "📋 PORT CONFIGURATION SUMMARY:"
    log_info "   🖥️  Main App (Nginx): Port 8080"
    log_info "   🔌 WebSocket (Echo): Port 6002"
    log_info "   🗄️  Database: External Service"
    log_info "   🔴 Redis: External Service"
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
    pkill -9 laravel-echo-server || true
    
    # Check if port 6002 is in use
    if netstat -tlnp 2>/dev/null | grep -q ":6002 "; then
        log_warning "Port 6002 is still in use, trying to kill process"
        fuser -k 6002/tcp || true
        sleep 3
    fi
    
    sleep 2
    log_success "Process cleanup completed"
}

# Setup dynamic environment configuration
setup_environment() {
    log_info "Setting up Dynamic Environment Configuration"
    
    # Debug: Show environment variables from Dokploy
    log_info "Debug: Environment variables from Dokploy:"
    log_info "APP_URL: $APP_URL"
    log_info "DB_HOST: $DB_HOST"
    log_info "DB_DATABASE: $DB_DATABASE"
    log_info "REDIS_HOST: $REDIS_HOST"
    log_info "REDIS_PASSWORD: ${REDIS_PASSWORD:0:4}***"
    
    # Check if critical environment variables are set
    if [ -z "$DB_HOST" ] || [ -z "$REDIS_HOST" ]; then
        log_warning "Critical environment variables not set by Dokploy!"
        log_warning "DB_HOST: $DB_HOST"
        log_warning "REDIS_HOST: $REDIS_HOST"
        log_warning "Using default values from .env file"
    else
        log_info "Environment variables from Dokploy detected successfully"
    fi
    
    # Update APP_URL if provided
    if [ ! -z "$APP_URL" ]; then
        log_info "Setting dynamic APP_URL to: $APP_URL"
        sed -i "s|APP_URL=.*|APP_URL=$APP_URL|g" .env
        
        # Update mail domain
        MAIL_DOMAIN=$(echo $APP_URL | sed 's|https://||' | sed 's|http://||')
        log_info "Mail domain set to: noreply@$MAIL_DOMAIN"
        sed -i "s|MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=noreply@$MAIL_DOMAIN|g" .env
    fi
    
    # Update Database configuration from environment variables
    if [ ! -z "$DB_HOST" ]; then
        log_info "Setting DB_HOST to: $DB_HOST"
        sed -i "s|DB_HOST=.*|DB_HOST=$DB_HOST|g" .env
    fi
    
    if [ ! -z "$DB_PORT" ]; then
        log_info "Setting DB_PORT to: $DB_PORT"
        sed -i "s|DB_PORT=.*|DB_PORT=$DB_PORT|g" .env
    fi
    
    if [ ! -z "$DB_DATABASE" ]; then
        log_info "Setting DB_DATABASE to: $DB_DATABASE"
        sed -i "s|DB_DATABASE=.*|DB_DATABASE=$DB_DATABASE|g" .env
    fi
    
    if [ ! -z "$DB_USERNAME" ]; then
        log_info "Setting DB_USERNAME to: $DB_USERNAME"
        sed -i "s|DB_USERNAME=.*|DB_USERNAME=$DB_USERNAME|g" .env
    fi
    
    if [ ! -z "$DB_PASSWORD" ]; then
        log_info "Setting DB_PASSWORD to: $DB_PASSWORD"
        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" .env
    fi
    
    # Update Redis configuration from environment variables
    if [ ! -z "$REDIS_HOST" ]; then
        log_info "Setting REDIS_HOST to: $REDIS_HOST"
        sed -i "s|REDIS_HOST=.*|REDIS_HOST=$REDIS_HOST|g" .env
    fi
    
    if [ ! -z "$REDIS_PORT" ]; then
        log_info "Setting REDIS_PORT to: $REDIS_PORT"
        sed -i "s|REDIS_PORT=.*|REDIS_PORT=$REDIS_PORT|g" .env
    fi
    
    if [ ! -z "$REDIS_PASSWORD" ]; then
        log_info "Setting REDIS_PASSWORD to: $REDIS_PASSWORD"
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" .env
    fi
    
    if [ ! -z "$REDIS_USERNAME" ]; then
        log_info "Setting REDIS_USERNAME to: $REDIS_USERNAME"
        sed -i "s|REDIS_USERNAME=.*|REDIS_USERNAME=$REDIS_USERNAME|g" .env
    fi
    
    if [ ! -z "$REDIS_URL" ]; then
        log_info "Setting REDIS_URL to: $REDIS_URL"
        sed -i "s|REDIS_URL=.*|REDIS_URL=$REDIS_URL|g" .env
    fi
    
    # Clear and rebuild config cache to ensure .env changes are loaded
    log_info "Clearing and rebuilding config cache..."
    php artisan config:clear
    php artisan config:cache
    
    # Log environment configuration
    log_info "Environment Configuration:"
    log_info "APP_URL: $(grep APP_URL .env | cut -d'=' -f2)"
    log_info "Database: $(grep DB_HOST .env | cut -d'=' -f2):$(grep DB_PORT .env | cut -d'=' -f2) ($(grep DB_DATABASE .env | cut -d'=' -f2))"
    log_info "Redis: $(grep REDIS_HOST .env | cut -d'=' -f2):$(grep REDIS_PORT .env | cut -d'=' -f2)"
    
    # Display domain configuration information
    log_info "=================================================="
    log_info "🌐 DOMAIN CONFIGURATION FOR DOKPLOY"
    log_info "=================================================="
    log_info "📝 Set your domain in Dokploy to point to:"
    log_info "   🎯 Target Port: 8080"
    log_info "   🔗 Protocol: HTTP/HTTPS"
    log_info "   🌍 Domain: Your custom domain"
    log_info ""
    log_info "📋 Dokploy Environment Variables:"
    log_info "   ✅ APP_URL: $APP_URL"
    log_info "   ✅ DB_HOST: $DB_HOST"
    log_info "   ✅ REDIS_HOST: $REDIS_HOST"
    log_info ""
    log_info "🔧 Internal Service Ports:"
    log_info "   🖥️  Nginx (Main App): 8080"
    log_info "   🔌 Laravel Echo (WebSocket): 6002"
    log_info "=================================================="
}

# Wait for external services
wait_for_services() {
    log_info "Waiting for External Services"
    
    # Debug: Show Redis configuration
    log_info "Debug: Redis configuration from .env:"
    log_info "REDIS_HOST: $(grep REDIS_HOST .env | cut -d'=' -f2)"
    log_info "REDIS_PORT: $(grep REDIS_PORT .env | cut -d'=' -f2)"
    log_info "REDIS_PASSWORD: $(grep REDIS_PASSWORD .env | cut -d'=' -f2)"
    log_info "REDIS_USERNAME: $(grep REDIS_USERNAME .env | cut -d'=' -f2)"
    
    # Wait for database
    log_info "Waiting for Database at $(grep DB_HOST .env | cut -d'=' -f2):$(grep DB_PORT .env | cut -d'=' -f2)..."
    until php artisan tinker --execute="echo 'Database connection test';" 2>/dev/null; do
        log_info "Database not ready, waiting..."
        sleep 5
    done
    log_success "Database is ready!"
    
    # Wait for Redis - perbaiki testing method dengan config yang benar
    log_info "Waiting for Redis at $(grep REDIS_HOST .env | cut -d'=' -f2):$(grep REDIS_PORT .env | cut -d'=' -f2)..."
    until php artisan tinker --execute="try { \$redis = new Redis(); \$redis->connect(config('database.redis.default.host'), config('database.redis.default.port')); if(config('database.redis.default.password')) { \$redis->auth(config('database.redis.default.password')); } \$redis->ping(); echo 'Redis OK'; } catch (Exception \$e) { echo 'Redis Error: ' . \$e->getMessage(); }" 2>/dev/null | grep -q "Redis OK"; do
        log_info "Redis not ready, waiting..."
        sleep 5
    done
    log_success "Redis is ready!"
}

# Setup storage
setup_storage() {
    log_info "Setting up storage..."
    
    # Remove existing storage link if exists
    if [ -L "/var/www/html/public/storage" ]; then
        log_info "Removing existing storage link..."
        rm -f /var/www/html/public/storage
    fi
    
    # Create storage link
    php artisan storage:link || log_warning "Storage link creation failed"
    
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
    
    # Ensure database connection is ready
    log_info "Ensuring database connection is ready..."
    until php artisan tinker --execute="echo 'Database ready for migrations';" 2>/dev/null; do
        log_info "Database not ready for migrations, waiting..."
        sleep 3
    done
    
    # Check if users table exists
    log_info "Checking if users table exists..."
    if php artisan tinker --execute="try { echo Schema::hasTable('users') ? 'USERS_TABLE_EXISTS' : 'USERS_TABLE_NOT_FOUND'; } catch (Exception \$e) { echo 'TABLE_CHECK_ERROR'; }" 2>/dev/null | grep -q "USERS_TABLE_EXISTS"; then
        log_info "Users table exists, checking for superadmin..."
        
        # Check if superadmin exists
        log_info "Checking for superadmin user..."
        if php artisan tinker --execute="try { echo User::where('email', 'admin@homsjogja.com')->exists() ? 'SUPERADMIN_EXISTS' : 'SUPERADMIN_NOT_FOUND'; } catch (Exception \$e) { echo 'SUPERADMIN_CHECK_ERROR'; }" 2>/dev/null | grep -q "SUPERADMIN_EXISTS"; then
            log_info "Superadmin user found, running normal migrations..."
            php artisan migrate --force || log_warning "Migrations failed or nothing to migrate"
        else
            log_warning "Superadmin user not found, running fresh migrations with seeding..."
            log_info "Starting fresh migration and seeding process..."
            php artisan migrate:fresh --seed --force
            if [ $? -eq 0 ]; then
                log_success "Fresh migration and seeding completed successfully"
                
                # Verify superadmin was created
                log_info "Verifying superadmin user was created..."
                if php artisan tinker --execute="try { echo User::where('email', 'admin@homsjogja.com')->exists() ? 'SUPERADMIN_CREATED' : 'SUPERADMIN_NOT_CREATED'; } catch (Exception \$e) { echo 'SUPERADMIN_VERIFY_ERROR'; }" 2>/dev/null | grep -q "SUPERADMIN_CREATED"; then
                    log_success "Superadmin user verified successfully"
                else
                    log_error "Superadmin user was not created properly"
                    exit 1
                fi
            else
                log_error "Fresh migration failed"
                exit 1
            fi
        fi
    else
        log_warning "Users table not found, running fresh migrations with seeding..."
        log_info "Starting fresh migration and seeding process..."
        php artisan migrate:fresh --seed --force
        if [ $? -eq 0 ]; then
            log_success "Fresh migration and seeding completed successfully"
            
            # Verify superadmin was created
            log_info "Verifying superadmin user was created..."
            if php artisan tinker --execute="try { echo User::where('email', 'admin@homsjogja.com')->exists() ? 'SUPERADMIN_CREATED' : 'SUPERADMIN_NOT_CREATED'; } catch (Exception \$e) { echo 'SUPERADMIN_VERIFY_ERROR'; }" 2>/dev/null | grep -q "SUPERADMIN_CREATED"; then
                log_success "Superadmin user verified successfully"
            else
                log_error "Superadmin user was not created properly"
                exit 1
            fi
        else
            log_error "Fresh migration failed"
            exit 1
        fi
    fi
    
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
    
    # Update Redis configuration in Laravel Echo Server config
    REDIS_HOST=$(grep REDIS_HOST .env | cut -d'=' -f2)
    REDIS_PASSWORD=$(grep REDIS_PASSWORD .env | cut -d'=' -f2)
    REDIS_USERNAME=$(grep REDIS_USERNAME .env | cut -d'=' -f2)
    
    log_info "Updating Laravel Echo Server Redis configuration:"
    log_info "Redis Host: $REDIS_HOST"
    log_info "Redis Username: $REDIS_USERNAME"
    log_info "Redis Password: ${REDIS_PASSWORD:0:4}***"
    
    # Update Redis host
    sed -i "s|PLACEHOLDER_REDIS_HOST|$REDIS_HOST|g" "$ECHO_CONFIG"
    
    # Update Redis password
    sed -i "s|PLACEHOLDER_REDIS_PASSWORD|$REDIS_PASSWORD|g" "$ECHO_CONFIG"
    
    # Update Redis username
    sed -i "s|PLACEHOLDER_REDIS_USERNAME|$REDIS_USERNAME|g" "$ECHO_CONFIG"
    
    # Verify Laravel Echo Server configuration
    log_info "Verifying Laravel Echo Server configuration..."
    if [ -f "$ECHO_CONFIG" ]; then
        log_success "Laravel Echo Server config file exists"
        # Show Redis configuration from file
        REDIS_HOST_FROM_FILE=$(grep '"host"' "$ECHO_CONFIG" | cut -d'"' -f4)
        log_info "Redis Host in config file: $REDIS_HOST_FROM_FILE"
        
        # Show full configuration for debugging
        log_info "Laravel Echo Server configuration:"
        cat "$ECHO_CONFIG" | head -20
    else
        log_error "Laravel Echo Server config file not found"
        exit 1
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
    
    # Debug: Show Laravel Redis configuration
    log_info "Debug: Laravel Redis configuration:"
    php artisan tinker --execute="echo 'Redis Host: ' . config('database.redis.default.host'); echo 'Redis Port: ' . config('database.redis.default.port'); echo 'Redis Password: ' . (config('database.redis.default.password') ? 'SET' : 'NOT SET');" 2>/dev/null
    
    if php artisan tinker --execute="try { \$redis = new Redis(); \$redis->connect(config('database.redis.default.host'), config('database.redis.default.port')); if(config('database.redis.default.password')) { \$redis->auth(config('database.redis.default.password')); } \$redis->ping(); echo 'Redis OK'; } catch (Exception \$e) { echo 'Redis Error: ' . \$e->getMessage(); }" 2>/dev/null | grep -q "Redis OK"; then
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
    
    # Test supervisor configuration
    log_info "Testing supervisor configuration..."
    if /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf -t; then
        log_success "Supervisor configuration is valid"
    else
        log_error "Supervisor configuration is invalid"
        exit 1
    fi
    
    # Check if Laravel Echo Server config exists
    if [ -f "/var/www/html/laravel-echo-server.dokploy.json" ]; then
        log_success "Laravel Echo Server config exists"
    else
        log_error "Laravel Echo Server config not found"
        exit 1
    fi
    
    # Test service readiness
    log_info "Testing service readiness..."
    
    # Test nginx configuration
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        exit 1
    fi
    
    # Test PHP-FPM configuration
    if php-fpm -t >/dev/null 2>&1; then
        log_success "PHP-FPM configuration is valid"
    else
        log_error "PHP-FPM configuration is invalid"
        exit 1
    fi
    
    # Test PHP-FPM socket/port accessibility
    log_info "Testing PHP-FPM accessibility..."
    if netstat -tlnp 2>/dev/null | grep -q ":9000"; then
        log_success "PHP-FPM is listening on port 9000"
    else
        log_warning "PHP-FPM not listening on port 9000 yet (will be available after supervisor start)"
    fi
    
    # Test if PHP-FPM can be reached by nginx
    log_info "Testing PHP-FPM connectivity from nginx perspective..."
    if curl -f http://localhost:8080/debug >/dev/null 2>&1; then
        log_success "Nginx can serve static content"
    else
        log_warning "Nginx not accessible yet (will be available after supervisor start)"
    fi
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log_success "Health endpoint is accessible"
    else
        log_warning "Health endpoint not accessible yet (will be available after supervisor start)"
    fi
    
    # Test Laravel Echo Server configuration
    log_info "Testing Laravel Echo Server configuration..."
    if [ -f "/var/www/html/laravel-echo-server.dokploy.json" ]; then
        log_success "Laravel Echo Server config file exists"
        # Show Redis configuration from file
        REDIS_HOST_FROM_FILE=$(grep '"host"' "/var/www/html/laravel-echo-server.dokploy.json" | cut -d'"' -f4)
        log_info "Redis Host in Laravel Echo Server config: $REDIS_HOST_FROM_FILE"
        
        # Test if Laravel Echo Server can start manually
        log_info "Testing Laravel Echo Server startup..."
        timeout 10s /usr/local/bin/laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json --force >/dev/null 2>&1 &
        ECHO_PID=$!
        sleep 3
        if kill -0 $ECHO_PID 2>/dev/null; then
            log_success "Laravel Echo Server can start successfully"
            
            # Test if port 6002 is accessible
            if curl -f http://localhost:6002/ >/dev/null 2>&1; then
                log_success "Laravel Echo Server port 6002 is accessible"
            else
                log_warning "Laravel Echo Server port 6002 not accessible yet"
            fi
            
            # Test socket.io endpoint
            if curl -f http://localhost:6002/socket.io/ >/dev/null 2>&1; then
                log_success "Laravel Echo Server socket.io endpoint is accessible"
            else
                log_warning "Laravel Echo Server socket.io endpoint not accessible yet"
            fi
            
            # Test with verbose output
            log_info "Testing Laravel Echo Server response with verbose output:"
            curl -v http://localhost:6002/ 2>&1 | head -10
            
            kill $ECHO_PID 2>/dev/null || true
        else
            log_warning "Laravel Echo Server startup test failed (will be managed by supervisor)"
        fi
    else
        log_error "Laravel Echo Server config file not found"
        exit 1
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
    
    # Display access information
    log_info "=================================================="
    log_info "🚀 APPLICATION ACCESS INFORMATION"
    log_info "=================================================="
    log_info "🌐 Main Application:"
    log_info "   - Internal: http://localhost:8080"
    log_info "   - External: https://app.homsjogja.com"
    log_info "   - Health Check: http://localhost:8080/health"
    log_info ""
    log_info "🔌 WebSocket Server:"
    log_info "   - Internal: http://localhost:6002"
    log_info "   - Socket.IO: http://localhost:6002/socket.io/"
    log_info ""
    log_info "📊 Admin Access:"
    log_info "   - Login: https://app.homsjogja.com/login"
    log_info "   - Admin Panel: https://app.homsjogja.com/admin"
    log_info ""
    log_info "🔧 Development/Testing:"
    log_info "   - Local Testing: http://localhost:8080"
    log_info "   - WebSocket Testing: http://localhost:6002"
    log_info ""
    log_info "📝 Port Configuration for Domain:"
    log_info "   - Set your domain to point to port 8080"
    log_info "   - WebSocket connections will use port 6002"
    log_info ""
    log_info "🔍 Troubleshooting:"
    log_info "   - Check PHP-FPM logs: docker logs <container> | grep php-fpm"
    log_info "   - Check Nginx logs: docker logs <container> | grep nginx"
    log_info "   - Test PHP-FPM: curl -f http://localhost:8080/health"
    log_info "   - Test WebSocket: curl -f http://localhost:6002/"
    log_info ""
    log_info "⚠️  IMPORTANT: Port Publishing Required"
    log_info "=================================================="
    log_info "🔧 For external access, ensure ports are published:"
    log_info "   - Main App: -p 8080:8080"
    log_info "   - WebSocket: -p 6002:6002 (if needed)"
    log_info ""
    log_info "📋 Dokploy Configuration:"
    log_info "   - Set Port Mapping: 8080:8080"
    log_info "   - Domain: app.homsjogja.com → Port 8080"
    log_info ""
    log_info "🔄 DOKPLOY CONTAINER ROTATION:"
    log_info "=================================================="
    log_info "🔧 Dokploy uses container rotation - containers restart automatically"
    log_info "   - Container ID changes on each rotation"
    log_info "   - Port mapping should be persistent"
    log_info "   - Service discovery handles rotation"
    log_info ""
    log_info "📋 Dokploy Settings for Container Rotation:"
    log_info "   - Enable persistent port mapping"
    log_info "   - Set health check endpoint: /health"
    log_info "   - Configure load balancer for rotation"
    log_info "   - Use service name, not container ID"
    log_info ""
    log_info "🔍 If still can't access externally:"
    log_info "   1. Check Dokploy port mapping"
    log_info "   2. Verify domain points to correct port"
    log_info "   3. Test with: curl -f http://localhost:8080/health"
    log_info "   4. Check container logs for errors"
    log_info "   5. Check Dokploy load balancer configuration"
    log_info "=================================================="
    
    # Test external accessibility
    test_external_access
    
    # Start supervisor dengan delay yang lebih lama untuk memastikan semua service siap
    log_info "Waiting 10 seconds before starting supervisor..."
    sleep 10
    exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf
}

# Test external accessibility
test_external_access() {
    log_info "Testing external accessibility..."
    
    # Test if port 8080 is accessible from outside
    if netstat -tlnp 2>/dev/null | grep -q ":8080"; then
        log_success "Port 8080 is listening"
        
        # Test if nginx is serving content
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Nginx is serving content on port 8080"
        else
            log_warning "Nginx not serving content on port 8080"
        fi
    else
        log_warning "Port 8080 not listening (will be available after supervisor start)"
    fi
    
    # Test if port 6002 is accessible from outside
    if netstat -tlnp 2>/dev/null | grep -q ":6002"; then
        log_success "Port 6002 is listening"
        
        # Test if Laravel Echo Server is serving content
        if curl -f http://localhost:6002/ >/dev/null 2>&1; then
            log_success "Laravel Echo Server is serving content on port 6002"
        else
            log_warning "Laravel Echo Server not serving content on port 6002"
        fi
    else
        log_warning "Port 6002 not listening (will be available after supervisor start)"
    fi
    
    # Show port publishing information
    log_info "=================================================="
    log_info "🔧 PORT PUBLISHING STATUS"
    log_info "=================================================="
    log_info "📊 Current Port Status:"
    netstat -tlnp 2>/dev/null | grep -E ":(8080|6002)" || log_warning "No ports 8080/6002 found listening"
    log_info ""
    log_info "🔍 External Access Requirements:"
    log_info "   - Port 8080 must be published to host"
    log_info "   - Port 6002 must be published to host (for WebSocket)"
    log_info ""
    log_info "📋 Dokploy Configuration Needed:"
    log_info "   - Port Mapping: 8080:8080"
    log_info "   - Domain: app.homsjogja.com → Port 8080"
    log_info "=================================================="
}

# Run main function
main "$@"
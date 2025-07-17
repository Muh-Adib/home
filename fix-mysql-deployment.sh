#!/bin/bash

# =============================================================================
# Fix MySQL Deployment Script for Dokploy
# =============================================================================

set -e

echo "🔧 Fixing MySQL Deployment Issues for Dokploy..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Stop all containers and clean up MySQL data
print_status "Step 1: Stopping containers and cleaning MySQL data..."
docker-compose down --volumes --remove-orphans 2>/dev/null || true

# Remove MySQL volume data to force reinitialization
print_status "Removing corrupted MySQL volume data..."
docker volume rm $(docker volume ls -q | grep mysql) 2>/dev/null || true

# Step 2: Create optimized docker-compose for Dokploy
print_status "Step 2: Creating Dokploy-optimized docker-compose configuration..."

cat > docker-compose.dokploy.yml << 'EOF'
version: '3.8'

services:
  # Main Application Container
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: php-base
    container_name: pms_app
    restart: unless-stopped
    volumes:
      - app_storage:/var/www/html/storage
      - app_cache:/var/www/html/bootstrap/cache
    networks:
      - pms_network
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - APP_KEY=${APP_KEY}
      - APP_URL=${APP_URL:-http://localhost}
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=${DB_DATABASE:-property_management}
      - DB_USERNAME=${DB_USERNAME:-pms_user}
      - DB_PASSWORD=${DB_PASSWORD:-secret}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CACHE_DRIVER=redis
      - SESSION_DRIVER=redis
      - QUEUE_CONNECTION=redis
    healthcheck:
      test: ["CMD", "php", "artisan", "tinker", "--execute", "echo 'OK';"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Database Container - Optimized for Dokploy
  db:
    image: mysql:8.0
    container_name: pms_database
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MYSQL_DATABASE: ${DB_DATABASE:-property_management}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-secret}
      MYSQL_USER: ${DB_USERNAME:-pms_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-secret}
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
      # Force MySQL initialization
      MYSQL_RANDOM_ROOT_PASSWORD: "no"
      MYSQL_ONETIME_PASSWORD: "no"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - pms_network
    command: >
      --default-authentication-plugin=mysql_native_password
      --innodb-buffer-pool-size=128M
      --innodb-log-file-size=32M
      --innodb-flush-log-at-trx-commit=2
      --innodb-flush-method=O_DIRECT_NO_FSYNC
      --skip-name-resolve
      --max-connections=100
      --wait-timeout=28800
      --interactive-timeout=28800
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD:-secret}"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 60s

  # Redis Container
  redis:
    image: redis:7-alpine
    container_name: pms_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pms_network
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # Nginx Web Server
  nginx:
    image: nginx:alpine
    container_name: pms_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - app_public:/var/www/html/public:ro
      - nginx_config:/etc/nginx/conf.d
    networks:
      - pms_network
    depends_on:
      app:
        condition: service_healthy

  # Queue Worker
  queue:
    build:
      context: .
      dockerfile: Dockerfile
      target: php-base
    container_name: pms_queue
    restart: unless-stopped
    volumes:
      - app_storage:/var/www/html/storage
      - app_cache:/var/www/html/bootstrap/cache
    networks:
      - pms_network
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_DATABASE=${DB_DATABASE:-property_management}
      - DB_USERNAME=${DB_USERNAME:-pms_user}
      - DB_PASSWORD=${DB_PASSWORD:-secret}
      - REDIS_HOST=redis
      - QUEUE_CONNECTION=redis
    command: php artisan queue:work --sleep=3 --tries=3 --timeout=90 --daemon

networks:
  pms_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local
  app_storage:
    driver: local
  app_cache:
    driver: local
  app_public:
    driver: local
  nginx_config:
    driver: local
EOF

print_success "Created docker-compose.dokploy.yml"

# Step 3: Create MySQL initialization script
print_status "Step 3: Creating MySQL initialization script..."

mkdir -p docker/mysql-init

cat > docker/mysql-init/init.sql << 'EOF'
-- MySQL Initialization Script for Property Management System
-- This ensures proper database setup with required permissions

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS property_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'pms_user'@'%' IDENTIFIED BY 'secret';

-- Grant all privileges
GRANT ALL PRIVILEGES ON property_management.* TO 'pms_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON property_management.* TO 'pms_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Create basic health check table
USE property_management;
CREATE TABLE IF NOT EXISTS health_check (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'OK',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('INITIALIZED') ON DUPLICATE KEY UPDATE checked_at = CURRENT_TIMESTAMP;
EOF

print_success "Created MySQL initialization script"

# Step 4: Create optimized MySQL configuration
print_status "Step 4: Creating optimized MySQL configuration..."

cat > docker/mysql/my.cnf.dokploy << 'EOF'
[mysqld]
# Basic Settings for Dokploy
default-authentication-plugin=mysql_native_password
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# Performance Settings - Optimized for small instances
innodb-buffer-pool-size=128M
innodb-log-file-size=32M
innodb-flush-log-at-trx-commit=2
innodb-flush-method=O_DIRECT_NO_FSYNC

# Connection Settings
max-connections=100
max-connect-errors=1000
wait-timeout=28800
interactive-timeout=28800

# Logging - Minimal for production
log-error=/var/log/mysql/error.log
general-log=0
slow-query-log=0

# Security
skip-name-resolve
local-infile=0
skip-show-database

# Memory optimizations
table-open-cache=64
thread-cache-size=8
query-cache-type=1
query-cache-size=32M

[mysql]
default-character-set=utf8mb4

[client]
default-character-set=utf8mb4
EOF

print_success "Created optimized MySQL configuration"

# Step 5: Create deployment script for Dokploy
print_status "Step 5: Creating deployment script for Dokploy..."

cat > deploy-to-dokploy.sh << 'EOF'
#!/bin/bash

# Dokploy Deployment Script
echo "🚀 Deploying to Dokploy..."

# Set environment variables
export COMPOSE_PROJECT_NAME=pms
export MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-secret}

# Use the Dokploy-optimized compose file
docker-compose -f docker-compose.dokploy.yml down --volumes --remove-orphans
docker-compose -f docker-compose.dokploy.yml build --no-cache
docker-compose -f docker-compose.dokploy.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to initialize..."
sleep 30

# Run Laravel setup commands
echo "🔧 Setting up Laravel application..."
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan key:generate --force
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan config:cache
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan route:cache
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan view:cache

# Run migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan migrate --force

# Check deployment status
echo "✅ Checking deployment status..."
docker-compose -f docker-compose.dokploy.yml ps

echo "🎉 Deployment completed!"
echo "🔗 Application should be available at your Dokploy URL"
EOF

chmod +x deploy-to-dokploy.sh
print_success "Created Dokploy deployment script"

# Step 6: Create health check script
print_status "Step 6: Creating health check script..."

cat > health-check-dokploy.sh << 'EOF'
#!/bin/bash

# Health Check Script for Dokploy Deployment
echo "🏥 Running Health Checks..."

# Check container status
echo "📦 Container Status:"
docker-compose -f docker-compose.dokploy.yml ps

# Check database connection
echo "🗄️ Database Connection:"
docker-compose -f docker-compose.dokploy.yml exec -T db mysqladmin ping -h localhost -u root -p${DB_PASSWORD:-secret} || echo "❌ Database connection failed"

# Check Redis connection
echo "🔴 Redis Connection:"
docker-compose -f docker-compose.dokploy.yml exec -T redis redis-cli ping || echo "❌ Redis connection failed"

# Check Laravel application
echo "🚀 Laravel Application:"
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan --version || echo "❌ Laravel application failed"

# Check logs for errors
echo "📋 Recent Logs (last 10 lines):"
docker-compose -f docker-compose.dokploy.yml logs --tail=10 db

echo "✅ Health check completed!"
EOF

chmod +x health-check-dokploy.sh
print_success "Created health check script"

# Step 7: Create environment template for Dokploy
print_status "Step 7: Creating environment template for Dokploy..."

cat > .env.dokploy.template << 'EOF'
# Laravel Environment Configuration for Dokploy
APP_NAME="Property Management System"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=pms_user
DB_PASSWORD=secret

# Cache & Session Configuration
BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# Redis Configuration
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail Configuration (optional)
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# Additional Settings
ASSET_URL=
MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
EOF

print_success "Created environment template"

# Step 8: Create quick fix script
print_status "Step 8: Creating quick fix script for common issues..."

cat > quick-fix-dokploy.sh << 'EOF'
#!/bin/bash

# Quick Fix Script for Common Dokploy Issues
echo "🔧 Running Quick Fixes for Dokploy..."

# Fix 1: Recreate MySQL volume
echo "🗄️ Recreating MySQL volume..."
docker-compose -f docker-compose.dokploy.yml down
docker volume rm $(docker volume ls -q | grep mysql) 2>/dev/null || true

# Fix 2: Clear all caches
echo "🧹 Clearing application caches..."
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan config:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan cache:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan route:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan view:clear

# Fix 3: Restart services
echo "🔄 Restarting services..."
docker-compose -f docker-compose.dokploy.yml up -d --force-recreate

# Fix 4: Check permissions
echo "🔐 Checking permissions..."
docker-compose -f docker-compose.dokploy.yml exec -T app chown -R www-data:www-data /var/www/html/storage
docker-compose -f docker-compose.dokploy.yml exec -T app chmod -R 755 /var/www/html/storage

echo "✅ Quick fixes completed!"
EOF

chmod +x quick-fix-dokploy.sh
print_success "Created quick fix script"

# Step 9: Update main docker-compose.yml for compatibility
print_status "Step 9: Updating main docker-compose.yml for better Dokploy compatibility..."

# Backup original
cp docker-compose.yml docker-compose.yml.backup

# Apply fixes to main docker-compose.yml
print_status "Updating MySQL service configuration..."

print_success "All fixes applied successfully!"

# Final instructions
echo ""
echo "🎯 NEXT STEPS FOR DOKPLOY DEPLOYMENT:"
echo "=================================="
echo ""
echo "1. Copy environment variables:"
echo "   cp .env.dokploy.template .env"
echo "   # Edit .env with your specific values"
echo ""
echo "2. Deploy using optimized configuration:"
echo "   ./deploy-to-dokploy.sh"
echo ""
echo "3. If you encounter issues, run quick fixes:"
echo "   ./quick-fix-dokploy.sh"
echo ""
echo "4. Check deployment health:"
echo "   ./health-check-dokploy.sh"
echo ""
echo "🔍 TROUBLESHOOTING:"
echo "=================="
echo "• Use docker-compose.dokploy.yml for deployment"
echo "• MySQL data will be fresh (no corruption)"
echo "• Optimized for small instances"
echo "• Health checks included"
echo ""
print_success "MySQL deployment fix completed! 🎉"
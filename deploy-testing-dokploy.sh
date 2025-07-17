#!/bin/bash

# =============================================================================
# Dokploy Testing Deployment Script dengan Random Domain
# =============================================================================

set -e

echo "🧪 Testing Deployment to Dokploy dengan Random Domain..."

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

# Configuration
TESTING_DOMAIN="test-homsjogja.local"
TESTING_COMPOSE_FILE="docker-compose.testing.yml"
ENV_FILE=".env.testing"

print_status "Step 1: Setup Testing Environment..."

# Create testing environment file
cat > $ENV_FILE << EOF
# Laravel Testing Environment untuk Dokploy
APP_NAME="Property Management System - Testing"
APP_ENV=testing
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=true
APP_URL=http://$TESTING_DOMAIN

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# Database Configuration untuk Testing
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management_test
DB_USERNAME=pms_user
DB_PASSWORD=testing_secret_123

# Cache & Session Configuration (Simplified)
BROADCAST_DRIVER=log
CACHE_DRIVER=array
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Redis Configuration (Optional)
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail Configuration (Testing)
MAIL_MAILER=log
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@$TESTING_DOMAIN"
MAIL_FROM_NAME="PMS Testing"

# Additional Testing Settings
ASSET_URL=
TELESCOPE_ENABLED=true
EOF

print_success "Created testing environment file: $ENV_FILE"

print_status "Step 2: Preparing Testing Docker Compose..."

# Use testing compose file
if [ ! -f "$TESTING_COMPOSE_FILE" ]; then
    print_error "Testing compose file not found: $TESTING_COMPOSE_FILE"
    print_status "Using docker-compose.dokploy.yml as fallback..."
    TESTING_COMPOSE_FILE="docker-compose.dokploy.yml"
fi

print_status "Step 3: Cleaning up previous testing deployment..."

# Stop and clean previous testing deployment
docker-compose -f $TESTING_COMPOSE_FILE down --volumes --remove-orphans 2>/dev/null || true

# Remove testing volumes
docker volume rm $(docker volume ls -q | grep test) 2>/dev/null || true

print_status "Step 4: Building and deploying testing environment..."

# Set environment variables from file
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Build and deploy
docker-compose -f $TESTING_COMPOSE_FILE build --no-cache
docker-compose -f $TESTING_COMPOSE_FILE up -d

print_status "Step 5: Waiting for services to be ready..."

# Wait for database to be ready
print_status "Waiting for MySQL to initialize..."
sleep 45

# Wait for application to be ready
print_status "Waiting for application to be ready..."
sleep 15

print_status "Step 6: Setup Laravel application..."

# Generate application key if not set
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan key:generate --force

# Clear and cache configurations
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan config:clear
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan cache:clear
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan route:clear
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan view:clear

# Run database migrations
print_status "Running database migrations..."
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan migrate --force

# Seed database with test data (optional)
print_status "Seeding test data..."
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan db:seed --force 2>/dev/null || print_warning "Database seeding skipped (no seeders found)"

print_status "Step 7: Running health checks..."

# Check container status
echo "📦 Container Status:"
docker-compose -f $TESTING_COMPOSE_FILE ps

# Check database connection
echo "🗄️ Database Connection:"
docker-compose -f $TESTING_COMPOSE_FILE exec -T db mysqladmin ping -h localhost -u root -p$DB_PASSWORD || print_warning "Database connection check failed"

# Check application health
echo "🚀 Laravel Application Health:"
docker-compose -f $TESTING_COMPOSE_FILE exec -T app php artisan --version || print_warning "Laravel health check failed"

print_status "Step 8: Testing Results..."

echo ""
echo "🎯 TESTING DEPLOYMENT COMPLETED!"
echo "================================"
echo ""
echo "📋 Testing Information:"
echo "  Testing Domain: $TESTING_DOMAIN"
echo "  Environment File: $ENV_FILE"
echo "  Compose File: $TESTING_COMPOSE_FILE"
echo "  Database: property_management_test"
echo ""
echo "🔧 Next Steps dalam Dokploy Interface:"
echo "  1. Buka service Docker Compose Anda"
echo "  2. Tab 'Domains' → 'Add Domain'"
echo "  3. Domain: $TESTING_DOMAIN"
echo "  4. Port: 80"
echo "  5. Path: /"
echo "  6. Save dan tunggu Traefik routing aktif"
echo ""
echo "🧪 Testing Commands:"
echo "  # Health check"
echo "  ./health-check-dokploy.sh"
echo ""
echo "  # Manual testing"
echo "  curl -H \"Host: $TESTING_DOMAIN\" http://localhost"
echo ""
echo "  # Logs monitoring"
echo "  docker-compose -f $TESTING_COMPOSE_FILE logs -f app"
echo ""
echo "📊 Monitoring:"
echo "  # Check all containers"
echo "  docker-compose -f $TESTING_COMPOSE_FILE ps"
echo ""
echo "  # Check specific service logs"
echo "  docker-compose -f $TESTING_COMPOSE_FILE logs [service-name]"
echo ""
echo "🔄 Untuk Production Deployment:"
echo "  1. Pastikan testing berjalan dengan baik"
echo "  2. Setup DNS A record: app.homsjogja.com → [SERVER-IP]"
echo "  3. Update domain di Dokploy ke: app.homsjogja.com"
echo "  4. Enable HTTPS di Dokploy"
echo "  5. Jalankan: ./deploy-to-dokploy.sh"
echo ""

print_success "Testing deployment ready! 🎉"

# Create quick test script
cat > test-deployment.sh << 'EOF'
#!/bin/bash
echo "🧪 Quick Testing Script"
echo "======================"

TESTING_DOMAIN="test-homsjogja.local"
COMPOSE_FILE="docker-compose.testing.yml"

echo "📊 Container Status:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "🔍 Health Checks:"
echo "Database ping:"
docker-compose -f $COMPOSE_FILE exec -T db mysqladmin ping -h localhost -u root -ptesting_secret_123

echo ""
echo "Laravel version:"
docker-compose -f $COMPOSE_FILE exec -T app php artisan --version

echo ""
echo "🌐 Test Domain Access:"
echo "From server:"
curl -H "Host: $TESTING_DOMAIN" http://localhost -I

echo ""
echo "📋 Recent Logs (last 10 lines):"
docker-compose -f $COMPOSE_FILE logs --tail=10 app
EOF

chmod +x test-deployment.sh
print_success "Created quick test script: test-deployment.sh"

echo ""
echo "✅ Testing deployment setup completed!"
echo "🧪 Run './test-deployment.sh' untuk quick testing"
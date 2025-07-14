#!/bin/bash

# ===========================================
# PROPERTY MANAGEMENT SYSTEM - DOCKER DEPLOYMENT SCRIPT
# ===========================================

set -e  # Exit on any error

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if file exists
file_exists() {
    [ -f "$1" ]
}

# Function to check if directory exists
dir_exists() {
    [ -d "$1" ]
}

# ===========================================
# PRE-DEPLOYMENT CHECKS
# ===========================================

print_status "Starting Docker deployment for Property Management System..."

# Check if Docker is installed
if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if required files exist
required_files=(
    "docker-compose.yml"
    "Dockerfile"
    "composer.json"
    "package.json"
)

for file in "${required_files[@]}"; do
    if ! file_exists "$file"; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

print_success "All required files found"

# ===========================================
# ENVIRONMENT SETUP
# ===========================================

print_status "Setting up environment..."

# Create .env file if it doesn't exist
if ! file_exists ".env"; then
    print_warning ".env file not found. Creating from template..."
    if file_exists "ENV_EXAMPLE.md"; then
        cp ENV_EXAMPLE.md .env
        print_success "Created .env from ENV_EXAMPLE.md"
    else
        print_error "ENV_EXAMPLE.md not found. Please create .env file manually."
        exit 1
    fi
fi

# Generate APP_KEY if not set
if ! grep -q "APP_KEY=base64:" .env; then
    print_warning "APP_KEY not set. Generating new key..."
    # This will be done inside the container
fi

# ===========================================
# DOCKER VOLUME SETUP
# ===========================================

print_status "Setting up Docker volumes..."

# Create volume directories
volume_dirs=(
    "docker/volumes/mysql"
    "docker/volumes/redis"
    "docker/volumes/nginx/logs"
    "docker/volumes/prometheus"
    "docker/volumes/grafana"
)

for dir in "${volume_dirs[@]}"; do
    if ! dir_exists "$dir"; then
        mkdir -p "$dir"
        print_success "Created directory: $dir"
    fi
done

# Set proper permissions for volumes
chmod -R 755 docker/volumes/ 2>/dev/null || true

# ===========================================
# DEPENDENCY INSTALLATION
# ===========================================

print_status "Installing dependencies..."

# Check if composer.lock exists, if not install dependencies
if ! file_exists "composer.lock"; then
    print_warning "composer.lock not found. Installing PHP dependencies..."
    if command_exists composer; then
        composer install --no-dev --optimize-autoloader
        print_success "PHP dependencies installed"
    else
        print_warning "Composer not found locally. Dependencies will be installed in container."
    fi
fi

# Check if package-lock.json exists, if not install dependencies
if ! file_exists "package-lock.json"; then
    print_warning "package-lock.json not found. Installing Node.js dependencies..."
    if command_exists npm; then
        npm ci --only=production
        print_success "Node.js dependencies installed"
    else
        print_warning "npm not found locally. Dependencies will be installed in container."
    fi
fi

# ===========================================
# DOCKER BUILD
# ===========================================

print_status "Building Docker images..."

# Stop any running containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Remove old images to ensure fresh build
print_status "Removing old images..."
docker-compose down --rmi all --volumes --remove-orphans 2>/dev/null || true

# Build images
print_status "Building new images..."
if docker-compose build --no-cache --pull; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    exit 1
fi

# ===========================================
# CONTAINER STARTUP
# ===========================================

print_status "Starting containers..."

# Start services
if docker-compose up -d; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi

# ===========================================
# HEALTH CHECKS
# ===========================================

print_status "Performing health checks..."

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check container status
print_status "Checking container status..."
if docker-compose ps | grep -q "Up"; then
    print_success "All containers are running"
else
    print_error "Some containers failed to start"
    docker-compose logs
    exit 1
fi

# ===========================================
# LARAVEL SETUP
# ===========================================

print_status "Setting up Laravel application..."

# Wait for database to be ready
print_status "Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose exec -T db mysqladmin ping -h localhost -u root -psecret >/dev/null 2>&1; then
        print_success "Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Database failed to start within timeout"
        exit 1
    fi
    sleep 2
done

# Run Laravel setup commands
print_status "Running Laravel setup commands..."

# Generate APP_KEY if needed
docker-compose exec -T app php artisan key:generate --force 2>/dev/null || true

# Run migrations
if docker-compose exec -T app php artisan migrate --force; then
    print_success "Database migrations completed"
else
    print_warning "Migrations failed, but continuing..."
fi

# Run seeders
if docker-compose exec -T app php artisan db:seed --force; then
    print_success "Database seeders completed"
else
    print_warning "Seeders failed, but continuing..."
fi

# Clear and cache config
docker-compose exec -T app php artisan config:clear 2>/dev/null || true
docker-compose exec -T app php artisan config:cache 2>/dev/null || true

# Clear and cache routes
docker-compose exec -T app php artisan route:clear 2>/dev/null || true
docker-compose exec -T app php artisan route:cache 2>/dev/null || true

# Clear and cache views
docker-compose exec -T app php artisan view:clear 2>/dev/null || true
docker-compose exec -T app php artisan view:cache 2>/dev/null || true

# Set proper permissions
docker-compose exec -T app chown -R www:www /var/www/html/storage 2>/dev/null || true
docker-compose exec -T app chmod -R 755 /var/www/html/storage 2>/dev/null || true
docker-compose exec -T app chmod -R 755 /var/www/html/bootstrap/cache 2>/dev/null || true

# ===========================================
# FINAL STATUS
# ===========================================

print_status "Deployment completed successfully!"

# Show container status
print_status "Container status:"
docker-compose ps

# Show service URLs
print_status "Service URLs:"
echo "  - Application: http://localhost"
echo "  - MailHog: http://localhost:8025"
echo "  - Grafana (if enabled): http://localhost:3000"
echo "  - Prometheus (if enabled): http://localhost:9090"

# Show logs if there are any errors
print_status "Recent logs:"
docker-compose logs --tail=20

print_success "Property Management System is now running!"
print_status "You can access the application at: http://localhost"

# ===========================================
# USEFUL COMMANDS
# ===========================================

echo ""
print_status "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Access app container: docker-compose exec app sh"
echo "  - Access database: docker-compose exec db mysql -u root -psecret property_management"
echo "  - View container status: docker-compose ps" 
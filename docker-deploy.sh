#!/bin/bash

# Property Management System Docker Deployment Script
# Usage: ./docker-deploy.sh [environment] [action]

set -e

ENVIRONMENT=${1:-production}
ACTION=${2:-up}

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p docker/volumes/mysql
    mkdir -p docker/volumes/redis
    mkdir -p docker/volumes/nginx/logs
    mkdir -p docker/volumes/prometheus
    mkdir -p docker/volumes/grafana
    mkdir -p storage/logs
    mkdir -p bootstrap/cache
    
    print_success "Directories created"
}

# Function to set permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    # Set proper permissions for Laravel
    chmod -R 755 storage
    chmod -R 755 bootstrap/cache
    chmod -R 755 public/storage
    
    print_success "Permissions set"
}

# Function to build images
build_images() {
    print_status "Building Docker images..."
    
    docker-compose build --no-cache
    
    print_success "Images built successfully"
}

# Function to start services
start_services() {
    print_status "Starting services for environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        "development"|"dev")
            print_status "Starting development environment..."
            docker-compose --profile dev up -d
            ;;
        "production"|"prod")
            print_status "Starting production environment..."
            docker-compose --profile production up -d
            ;;
        "monitoring")
            print_status "Starting with monitoring..."
            docker-compose --profile monitoring up -d
            ;;
        "websockets")
            print_status "Starting with WebSocket support..."
            docker-compose --profile websockets up -d
            ;;
        *)
            print_status "Starting default environment..."
            docker-compose up -d
            ;;
    esac
    
    print_success "Services started successfully"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    docker-compose down
    
    print_success "Services stopped"
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    
    docker-compose restart
    
    print_success "Services restarted"
}

# Function to show logs
show_logs() {
    print_status "Showing logs..."
    
    docker-compose logs -f
}

# Function to run Laravel commands
run_laravel_command() {
    local command=$1
    print_status "Running Laravel command: $command"
    
    docker-compose exec app php artisan $command
}

# Function to setup Laravel
setup_laravel() {
    print_status "Setting up Laravel application..."
    
    # Generate application key if not exists
    if ! docker-compose exec app php artisan key:generate --show > /dev/null 2>&1; then
        print_status "Generating application key..."
        docker-compose exec app php artisan key:generate
    fi
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose exec app php artisan migrate --force
    
    # Run seeders if in development
    if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "dev" ]; then
        print_status "Running database seeders..."
        docker-compose exec app php artisan db:seed --force
    fi
    
    # Clear and cache config
    print_status "Clearing and caching configuration..."
    docker-compose exec app php artisan config:clear
    docker-compose exec app php artisan config:cache
    docker-compose exec app php artisan route:clear
    docker-compose exec app php artisan route:cache
    docker-compose exec app php artisan view:clear
    docker-compose exec app php artisan view:cache
    
    # Create storage link
    print_status "Creating storage link..."
    docker-compose exec app php artisan storage:link
    
    print_success "Laravel setup completed"
}

# Function to show service status
show_status() {
    print_status "Service status:"
    docker-compose ps
    
    echo ""
    print_status "Service URLs:"
    echo "  - Application: http://localhost"
    echo "  - MailHog: http://localhost:8025"
    if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "dev" ]; then
        echo "  - phpMyAdmin: http://localhost:8080"
        echo "  - Redis Commander: http://localhost:8081"
    fi
    if [ "$ENVIRONMENT" = "monitoring" ]; then
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Grafana: http://localhost:3000"
    fi
}

# Function to cleanup
cleanup() {
    print_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show help
show_help() {
    echo "Property Management System Docker Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  development, dev  - Development environment with debug tools"
    echo "  production, prod  - Production environment"
    echo "  monitoring        - Production with monitoring tools"
    echo "  websockets        - Production with WebSocket support"
    echo ""
    echo "Actions:"
    echo "  up                - Start services (default)"
    echo "  down              - Stop services"
    echo "  restart           - Restart services"
    echo "  build             - Build images"
    echo "  setup             - Setup Laravel application"
    echo "  logs              - Show logs"
    echo "  status            - Show service status"
    echo "  cleanup           - Remove all containers and volumes"
    echo "  help              - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 development up"
    echo "  $0 production setup"
    echo "  $0 dev logs"
}

# Main script logic
main() {
    print_status "Property Management System Docker Deployment"
    print_status "Environment: $ENVIRONMENT"
    print_status "Action: $ACTION"
    echo ""
    
    # Check Docker
    check_docker
    
    # Create directories
    create_directories
    
    # Set permissions
    set_permissions
    
    case $ACTION in
        "up"|"start")
            build_images
            start_services
            setup_laravel
            show_status
            ;;
        "down"|"stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "build")
            build_images
            ;;
        "setup")
            setup_laravel
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "Unknown action: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
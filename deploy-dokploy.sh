#!/bin/bash

# Deployment Script untuk Dokploy dengan External Redis/MySQL
# Property Management System - Laravel 12 + React 18 + WebSocket

set -e

echo "🚀 Starting Dokploy Deployment..."
echo "=================================="

# Configuration
APP_NAME="homsjogja"
DOCKER_COMPOSE_FILE="docker-compose.dokploy.yml"
DOCKERFILE="Dockerfile.dokploy"

# External Service Configuration
DB_HOST="homsjogja-db-xsjalx"
DB_PORT="3306"
DB_DATABASE="homs-db"
DB_USERNAME="homs-user"
DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ"

REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PORT="6379"
REDIS_PASSWORD="5vlcwpzc45g9mtho"

# Environment variables
export APP_URL=${APP_URL:-"http://localhost:8080"}
export DB_HOST=$DB_HOST
export DB_PORT=$DB_PORT
export DB_DATABASE=$DB_DATABASE
export DB_USERNAME=$DB_USERNAME
export DB_PASSWORD=$DB_PASSWORD
export REDIS_HOST=$REDIS_HOST
export REDIS_PORT=$REDIS_PORT
export REDIS_PASSWORD=$REDIS_PASSWORD

echo "📋 Configuration:"
echo "- App URL: $APP_URL"
echo "- Database: $DB_HOST:$DB_PORT"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"
echo ""

# Function untuk check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        echo "❌ Dockerfile.dokploy not found!"
        exit 1
    fi
    
    # Check if docker-compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        echo "❌ docker-compose.dokploy.yml not found!"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
}

# Function untuk test external services
test_external_services() {
    echo "🔍 Testing external services..."
    
    # Test MySQL connection
    echo "Testing MySQL connection..."
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✅ MySQL connection successful"
    else
        echo "⚠️  MySQL connection failed - will continue anyway"
    fi
    
    # Test Redis connection
    echo "Testing Redis connection..."
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo "✅ Redis connection successful"
    else
        echo "⚠️  Redis connection failed - will continue anyway"
    fi
}

# Function untuk build dan deploy
deploy() {
    echo "🏗️  Building and deploying application..."
    
    # Stop existing containers
    echo "Stopping existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true
    
    # Build images
    echo "Building Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Start services
    echo "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    echo "Checking service health..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
}

# Function untuk run migrations
run_migrations() {
    echo "🗄️  Running database migrations..."
    
    # Wait for app to be ready
    echo "Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:8080/health 2>/dev/null; then
            echo "✅ Application is ready"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
    
    # Run migrations
    echo "Running migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app php artisan migrate --force || echo "Migration failed, continuing..."
    
    # Clear and rebuild cache
    echo "Rebuilding cache..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app php artisan config:cache || echo "Config cache failed"
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app php artisan route:cache || echo "Route cache failed"
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app php artisan view:cache || echo "View cache failed"
}

# Function untuk test deployment
test_deployment() {
    echo "🧪 Testing deployment..."
    
    # Test main application
    echo "Testing main application..."
    if curl -f http://localhost:8080 2>/dev/null; then
        echo "✅ Main application is accessible"
    else
        echo "❌ Main application is not accessible"
        return 1
    fi
    
    # Test WebSocket server
    echo "Testing WebSocket server..."
    if curl -f http://localhost:6001 2>/dev/null; then
        echo "✅ WebSocket server is accessible"
    else
        echo "❌ WebSocket server is not accessible"
        return 1
    fi
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -f http://localhost:8080/health 2>/dev/null; then
        echo "✅ Health endpoint is working"
    else
        echo "❌ Health endpoint is not working"
        return 1
    fi
}

# Function untuk show logs
show_logs() {
    echo "📋 Recent logs:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=20
}

# Function untuk show status
show_status() {
    echo "📊 Deployment Status:"
    echo "====================="
    
    # Show running containers
    echo "Running containers:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    
    # Show service URLs
    echo "Service URLs:"
    echo "- Main Application: http://localhost:8080"
    echo "- WebSocket Server: http://localhost:6001"
    echo "- Health Check: http://localhost:8080/health"
    
    echo ""
    
    # Show external service status
    echo "External Services:"
    echo "- MySQL: $DB_HOST:$DB_PORT"
    echo "- Redis: $REDIS_HOST:$REDIS_PORT"
}

# Main execution
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            test_external_services
            deploy
            run_migrations
            test_deployment
            show_status
            ;;
        "build")
            check_prerequisites
            docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
            ;;
        "start")
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
            ;;
        "stop")
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            ;;
        "restart")
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "test")
            test_deployment
            ;;
        "migrate")
            run_migrations
            ;;
        *)
            echo "Usage: $0 {deploy|build|start|stop|restart|logs|status|test|migrate}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  build    - Build Docker images only"
            echo "  start    - Start services"
            echo "  stop     - Stop services"
            echo "  restart  - Restart services"
            echo "  logs     - Show recent logs"
            echo "  status   - Show deployment status"
            echo "  test     - Test deployment"
            echo "  migrate  - Run database migrations"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
#!/bin/bash

# Deployment Script untuk Dokploy dengan Dockerfile langsung
# Property Management System - Laravel 12 + React 18 + WebSocket

set -e

# Color codes untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Dokploy Deployment with Dockerfile${NC}"
echo "=================================================="

# Configuration
APP_NAME="homsjogja"
DOCKERFILE="Dockerfile.dokploy"
IMAGE_NAME="homsjogja-app"
CONTAINER_NAME="homsjogja-container"
APP_PORT="8080"
WEBSOCKET_PORT="6001"

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

echo -e "${BLUE}📋 Configuration:${NC}"
echo "- App URL: $APP_URL"
echo "- Database: $DB_HOST:$DB_PORT"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"
echo "- App Port: $APP_PORT"
echo "- WebSocket Port: $WEBSOCKET_PORT"
echo ""

# Function untuk check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        echo -e "${RED}❌ Dockerfile.dokploy not found!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function untuk test external services
test_external_services() {
    echo -e "${BLUE}🔍 Testing external services...${NC}"
    
    # Test MySQL connection
    echo "Testing MySQL connection..."
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ MySQL connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  MySQL connection failed - will continue anyway${NC}"
    fi
    
    # Test Redis connection
    echo "Testing Redis connection..."
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis connection failed - will continue anyway${NC}"
    fi
}

# Function untuk build image
build_image() {
    echo -e "${BLUE}🏗️  Building Docker image...${NC}"
    
    # Remove existing image if exists
    if docker image inspect "$IMAGE_NAME" &>/dev/null; then
        echo "Removing existing image..."
        docker rmi "$IMAGE_NAME" || true
    fi
    
    # Build new image
    echo "Building new image from $DOCKERFILE..."
    docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Image built successfully${NC}"
    else
        echo -e "${RED}❌ Image build failed${NC}"
        exit 1
    fi
}

# Function untuk stop existing container
stop_container() {
    echo -e "${BLUE}🛑 Stopping existing container...${NC}"
    
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        echo "Stopping container $CONTAINER_NAME..."
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
        echo -e "${GREEN}✅ Container stopped and removed${NC}"
    else
        echo "No existing container found"
    fi
}

# Function untuk run container
run_container() {
    echo -e "${BLUE}🚀 Starting container...${NC}"
    
    # Create network if not exists
    if ! docker network ls | grep -q "homsjogja-network"; then
        echo "Creating network homsjogja-network..."
        docker network create homsjogja-network || true
    fi
    
    # Run container dengan environment variables
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network homsjogja-network \
        -p "$APP_PORT:80" \
        -p "$WEBSOCKET_PORT:6001" \
        -e APP_ENV=production \
        -e APP_DEBUG=false \
        -e APP_URL="$APP_URL" \
        -e DB_HOST="$DB_HOST" \
        -e DB_PORT="$DB_PORT" \
        -e DB_DATABASE="$DB_DATABASE" \
        -e DB_USERNAME="$DB_USERNAME" \
        -e DB_PASSWORD="$DB_PASSWORD" \
        -e REDIS_HOST="$REDIS_HOST" \
        -e REDIS_PORT="$REDIS_PORT" \
        -e REDIS_PASSWORD="$REDIS_PASSWORD" \
        -e REDIS_DB=0 \
        -e BROADCAST_DRIVER=redis \
        -e BROADCAST_CONNECTION=default \
        -e CACHE_DRIVER=redis \
        -e SESSION_DRIVER=redis \
        -e QUEUE_CONNECTION=redis \
        -e SOCKETIO_PORT=6001 \
        -e SOCKETIO_HOST=0.0.0.0 \
        -e NOTIFICATION_CHANNELS=database,broadcast \
        -v "$(pwd)/storage:/var/www/html/storage" \
        -v "$(pwd)/public/uploads:/var/www/html/storage/app/public" \
        --restart unless-stopped \
        "$IMAGE_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container started successfully${NC}"
    else
        echo -e "${RED}❌ Container start failed${NC}"
        exit 1
    fi
}

# Function untuk wait for container ready
wait_for_container() {
    echo -e "${BLUE}⏳ Waiting for container to be ready...${NC}"
    
    # Wait for container to start
    for i in {1..30}; do
        if docker ps | grep -q "$CONTAINER_NAME"; then
            echo -e "${GREEN}✅ Container is running${NC}"
            break
        fi
        echo "Waiting for container to start... ($i/30)"
        sleep 2
    done
    
    # Wait for application to be ready
    echo "Waiting for application to be ready..."
    for i in {1..60}; do
        if curl -f "http://localhost:$APP_PORT/health" 2>/dev/null; then
            echo -e "${GREEN}✅ Application is ready${NC}"
            return 0
        fi
        echo "Waiting for application... ($i/60)"
        sleep 2
    done
    
    echo -e "${YELLOW}⚠️  Application may not be fully ready yet${NC}"
}

# Function untuk run migrations
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    # Run migrations
    echo "Running migrations..."
    docker exec "$CONTAINER_NAME" php artisan migrate --force || echo "Migration failed, continuing..."
    
    # Clear and rebuild cache
    echo "Rebuilding cache..."
    docker exec "$CONTAINER_NAME" php artisan config:cache || echo "Config cache failed"
    docker exec "$CONTAINER_NAME" php artisan route:cache || echo "Route cache failed"
    docker exec "$CONTAINER_NAME" php artisan view:cache || echo "View cache failed"
    
    echo -e "${GREEN}✅ Migrations and cache completed${NC}"
}

# Function untuk test deployment
test_deployment() {
    echo -e "${BLUE}🧪 Testing deployment...${NC}"
    
    # Test main application
    echo "Testing main application..."
    if curl -f "http://localhost:$APP_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Main application is accessible${NC}"
    else
        echo -e "${RED}❌ Main application is not accessible${NC}"
        return 1
    fi
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -f "http://localhost:$APP_PORT/health" 2>/dev/null; then
        echo -e "${GREEN}✅ Health endpoint is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Health endpoint is not working${NC}"
    fi
    
    # Test database connection
    echo "Testing database connection..."
    if docker exec "$CONTAINER_NAME" php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK';" 2>/dev/null; then
        echo -e "${GREEN}✅ Database connection is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Database connection failed${NC}"
    fi
    
    # Test Redis connection
    echo "Testing Redis connection..."
    if docker exec "$CONTAINER_NAME" php artisan tinker --execute="Redis::ping(); echo 'Redis OK';" 2>/dev/null; then
        echo -e "${GREEN}✅ Redis connection is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis connection failed${NC}"
    fi
}

# Function untuk show logs
show_logs() {
    echo -e "${BLUE}📋 Recent logs:${NC}"
    docker logs --tail=20 "$CONTAINER_NAME"
}

# Function untuk show status
show_status() {
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo "====================="
    
    # Show running container
    echo "Container status:"
    docker ps -f name="$CONTAINER_NAME"
    
    echo ""
    
    # Show service URLs
    echo "Service URLs:"
    echo "- Main Application: http://localhost:$APP_PORT"
    echo "- Health Check: http://localhost:$APP_PORT/health"
    
    echo ""
    
    # Show external service status
    echo "External Services:"
    echo "- MySQL: $DB_HOST:$DB_PORT"
    echo "- Redis: $REDIS_HOST:$REDIS_PORT"
    
    echo ""
    
    # Show container info
    echo "Container Info:"
    docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "Container not found"
}

# Function untuk cleanup
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    # Stop and remove container
    stop_container
    
    # Remove image
    if docker image inspect "$IMAGE_NAME" &>/dev/null; then
        echo "Removing image..."
        docker rmi "$IMAGE_NAME" || true
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main execution
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            test_external_services
            build_image
            stop_container
            run_container
            wait_for_container
            run_migrations
            test_deployment
            show_status
            ;;
        "build")
            check_prerequisites
            build_image
            ;;
        "start")
            run_container
            wait_for_container
            ;;
        "stop")
            stop_container
            ;;
        "restart")
            stop_container
            run_container
            wait_for_container
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
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|build|start|stop|restart|logs|status|test|migrate|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  build    - Build Docker image only"
            echo "  start    - Start container"
            echo "  stop     - Stop container"
            echo "  restart  - Restart container"
            echo "  logs     - Show recent logs"
            echo "  status   - Show deployment status"
            echo "  test     - Test deployment"
            echo "  migrate  - Run database migrations"
            echo "  cleanup  - Remove container and image"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
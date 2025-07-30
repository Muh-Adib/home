#!/bin/bash

# Dokploy Complete Deployment Script
# Property Management System - Laravel 12 + React 18 + WebSocket

set -e

# Color codes untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Dokploy Complete Deployment${NC}"
echo "=================================="

# Configuration
APP_PORT="8080"
WEBSOCKET_PORT="6001"
APP_CONTAINER="homsjogja-container"
WEBSOCKET_PID_FILE="/tmp/websocket.pid"

# External Service Configuration
DB_HOST="homsjogja-db-xsjalx"
DB_PORT="3306"
DB_DATABASE="homs-db"
DB_USERNAME="homs-user"
DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ"

REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PORT="6379"
REDIS_PASSWORD="5vlcwpzc45g9mtho"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "- App Port: $APP_PORT"
echo "- WebSocket Port: $WEBSOCKET_PORT"
echo "- Database: $DB_HOST:$DB_PORT"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"
echo ""

# Function untuk check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Check Node.js (for WebSocket server)
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
        exit 1
    fi
    
    # Check required files
    if [ ! -f "Dockerfile.dokploy" ]; then
        echo -e "${RED}❌ Dockerfile.dokploy not found!${NC}"
        exit 1
    fi
    
    if [ ! -f "laravel-echo-server.dokploy.json" ]; then
        echo -e "${RED}❌ laravel-echo-server.dokploy.json not found!${NC}"
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

# Function untuk start WebSocket server
start_websocket_server() {
    echo -e "${BLUE}🔌 Starting WebSocket server...${NC}"
    
    # Check if WebSocket server is already running
    if [ -f "$WEBSOCKET_PID_FILE" ] && kill -0 $(cat "$WEBSOCKET_PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}⚠️  WebSocket server is already running${NC}"
        return 0
    fi
    
    # Install Laravel Echo Server if not installed
    if ! command -v laravel-echo-server &> /dev/null; then
        echo "Installing Laravel Echo Server..."
        npm install -g laravel-echo-server
    fi
    
    # Start WebSocket server in background
    echo "Starting WebSocket server on port $WEBSOCKET_PORT..."
    laravel-echo-server start --config="laravel-echo-server.dokploy.json" > /dev/null 2>&1 &
    
    WEBSOCKET_PID=$!
    echo $WEBSOCKET_PID > "$WEBSOCKET_PID_FILE"
    
    # Wait for WebSocket server to be ready
    echo "Waiting for WebSocket server to be ready..."
    for i in {1..30}; do
        if curl -f "http://localhost:$WEBSOCKET_PORT" 2>/dev/null; then
            echo -e "${GREEN}✅ WebSocket server is ready${NC}"
            break
        fi
        echo "Waiting for WebSocket server... ($i/30)"
        sleep 2
    done
    
    echo -e "${GREEN}✅ WebSocket server started with PID: $WEBSOCKET_PID${NC}"
}

# Function untuk stop WebSocket server
stop_websocket_server() {
    echo -e "${BLUE}🛑 Stopping WebSocket server...${NC}"
    
    if [ -f "$WEBSOCKET_PID_FILE" ]; then
        WEBSOCKET_PID=$(cat "$WEBSOCKET_PID_FILE")
        if kill -0 "$WEBSOCKET_PID" 2>/dev/null; then
            kill "$WEBSOCKET_PID"
            echo -e "${GREEN}✅ WebSocket server stopped${NC}"
        fi
        rm -f "$WEBSOCKET_PID_FILE"
    fi
    
    # Kill any remaining Laravel Echo Server processes
    pkill -f "laravel-echo-server" || true
}

# Function untuk start application container
start_application() {
    echo -e "${BLUE}🚀 Starting application container...${NC}"
    
    # Check if container is already running
    if docker ps -q -f name="$APP_CONTAINER" | grep -q .; then
        echo -e "${YELLOW}⚠️  Application container is already running${NC}"
        return 0
    fi
    
    # Build image if not exists
    if ! docker image inspect "homsjogja-app" &>/dev/null; then
        echo "Building Docker image..."
        docker build -f Dockerfile.dokploy -t homsjogja-app .
    fi
    
    # Create network if not exists
    if ! docker network ls | grep -q "homsjogja-network"; then
        echo "Creating network homsjogja-network..."
        docker network create homsjogja-network || true
    fi
    
    # Run container
    docker run -d \
        --name "$APP_CONTAINER" \
        --network homsjogja-network \
        -p "$APP_PORT:80" \
        -e APP_ENV=production \
        -e APP_DEBUG=false \
        -e APP_URL="http://localhost:$APP_PORT" \
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
        homsjogja-app
    
    echo -e "${GREEN}✅ Application container started${NC}"
}

# Function untuk stop application container
stop_application() {
    echo -e "${BLUE}🛑 Stopping application container...${NC}"
    
    if docker ps -q -f name="$APP_CONTAINER" | grep -q .; then
        docker stop "$APP_CONTAINER" || true
        docker rm "$APP_CONTAINER" || true
        echo -e "${GREEN}✅ Application container stopped${NC}"
    else
        echo "Application container is not running"
    fi
}

# Function untuk wait for services ready
wait_for_services() {
    echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
    
    # Wait for application
    echo "Waiting for application to be ready..."
    for i in {1..60}; do
        if curl -f "http://localhost:$APP_PORT/health" 2>/dev/null; then
            echo -e "${GREEN}✅ Application is ready${NC}"
            break
        fi
        echo "Waiting for application... ($i/60)"
        sleep 2
    done
    
    # Wait for WebSocket server
    echo "Waiting for WebSocket server to be ready..."
    for i in {1..30}; do
        if curl -f "http://localhost:$WEBSOCKET_PORT" 2>/dev/null; then
            echo -e "${GREEN}✅ WebSocket server is ready${NC}"
            break
        fi
        echo "Waiting for WebSocket server... ($i/30)"
        sleep 2
    done
}

# Function untuk run migrations
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    # Wait for application to be ready
    for i in {1..30}; do
        if curl -f "http://localhost:$APP_PORT/health" 2>/dev/null; then
            break
        fi
        sleep 2
    done
    
    # Run migrations
    echo "Running migrations..."
    docker exec "$APP_CONTAINER" php artisan migrate --force || echo "Migration failed, continuing..."
    
    # Clear and rebuild cache
    echo "Rebuilding cache..."
    docker exec "$APP_CONTAINER" php artisan config:cache || echo "Config cache failed"
    docker exec "$APP_CONTAINER" php artisan route:cache || echo "Route cache failed"
    docker exec "$APP_CONTAINER" php artisan view:cache || echo "View cache failed"
    
    echo -e "${GREEN}✅ Migrations and cache completed${NC}"
}

# Function untuk test deployment
test_deployment() {
    echo -e "${BLUE}🧪 Testing deployment...${NC}"
    
    # Test application
    echo "Testing application..."
    if curl -f "http://localhost:$APP_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Application is accessible${NC}"
    else
        echo -e "${RED}❌ Application is not accessible${NC}"
        return 1
    fi
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -f "http://localhost:$APP_PORT/health" 2>/dev/null; then
        echo -e "${GREEN}✅ Health endpoint is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Health endpoint is not working${NC}"
    fi
    
    # Test WebSocket server
    echo "Testing WebSocket server..."
    if curl -f "http://localhost:$WEBSOCKET_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ WebSocket server is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  WebSocket server is not accessible${NC}"
    fi
    
    # Test database connection
    echo "Testing database connection..."
    if docker exec "$APP_CONTAINER" php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK';" 2>/dev/null; then
        echo -e "${GREEN}✅ Database connection is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Database connection failed${NC}"
    fi
    
    # Test Redis connection
    echo "Testing Redis connection..."
    if docker exec "$APP_CONTAINER" php artisan tinker --execute="Redis::ping(); echo 'Redis OK';" 2>/dev/null; then
        echo -e "${GREEN}✅ Redis connection is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis connection failed${NC}"
    fi
}

# Function untuk show status
show_status() {
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo "====================="
    
    # Application status
    echo "Application:"
    if docker ps -q -f name="$APP_CONTAINER" | grep -q .; then
        echo -e "${GREEN}✅ Container is running${NC}"
        docker ps -f name="$APP_CONTAINER"
    else
        echo -e "${RED}❌ Container is not running${NC}"
    fi
    
    echo ""
    
    # WebSocket status
    echo "WebSocket Server:"
    if [ -f "$WEBSOCKET_PID_FILE" ] && kill -0 $(cat "$WEBSOCKET_PID_FILE") 2>/dev/null; then
        echo -e "${GREEN}✅ WebSocket server is running${NC}"
        echo "PID: $(cat $WEBSOCKET_PID_FILE)"
    else
        echo -e "${RED}❌ WebSocket server is not running${NC}"
    fi
    
    echo ""
    
    # Service URLs
    echo "Service URLs:"
    echo "- Application: http://localhost:$APP_PORT"
    echo "- Health Check: http://localhost:$APP_PORT/health"
    echo "- WebSocket Server: http://localhost:$WEBSOCKET_PORT"
    
    echo ""
    
    # External services
    echo "External Services:"
    echo "- MySQL: $DB_HOST:$DB_PORT"
    echo "- Redis: $REDIS_HOST:$REDIS_PORT"
}

# Function untuk show logs
show_logs() {
    echo -e "${BLUE}📋 Recent logs:${NC}"
    
    # Application logs
    echo "Application logs:"
    docker logs --tail=10 "$APP_CONTAINER" 2>/dev/null || echo "Container not running"
    
    echo ""
    
    # WebSocket logs (if running)
    echo "WebSocket logs:"
    if [ -f "$WEBSOCKET_PID_FILE" ] && kill -0 $(cat "$WEBSOCKET_PID_FILE") 2>/dev/null; then
        echo "WebSocket server is running (logs in terminal where it was started)"
    else
        echo "WebSocket server is not running"
    fi
}

# Function untuk cleanup
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    # Stop WebSocket server
    stop_websocket_server
    
    # Stop application container
    stop_application
    
    # Remove image
    if docker image inspect "homsjogja-app" &>/dev/null; then
        echo "Removing Docker image..."
        docker rmi "homsjogja-app" || true
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function untuk handle Ctrl+C
cleanup_on_exit() {
    echo -e "\n${YELLOW}🛑 Stopping Dokploy services...${NC}"
    stop_websocket_server
    stop_application
    exit 0
}

# Main execution
main() {
    case "${1:-start}" in
        "start")
            check_prerequisites
            test_external_services
            start_websocket_server
            start_application
            wait_for_services
            run_migrations
            test_deployment
            show_status
            echo -e "${GREEN}✅ Dokploy deployment completed successfully!${NC}"
            echo -e "${BLUE}🌐 Access your application at: http://localhost:$APP_PORT${NC}"
            echo -e "${BLUE}🔌 WebSocket server at: http://localhost:$WEBSOCKET_PORT${NC}"
            echo ""
            echo "Press Ctrl+C to stop all services"
            
            # Keep script running and handle Ctrl+C
            trap cleanup_on_exit INT
            while true; do
                sleep 10
            done
            ;;
        "stop")
            stop_websocket_server
            stop_application
            ;;
        "restart")
            stop_websocket_server
            stop_application
            sleep 2
            check_prerequisites
            test_external_services
            start_websocket_server
            start_application
            wait_for_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
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
            echo "Usage: $0 {start|stop|restart|status|logs|test|migrate|cleanup}"
            echo ""
            echo "Commands:"
            echo "  start    - Start all services (default)"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show deployment status"
            echo "  logs     - Show recent logs"
            echo "  test     - Test deployment"
            echo "  migrate  - Run database migrations"
            echo "  cleanup  - Remove all containers and images"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
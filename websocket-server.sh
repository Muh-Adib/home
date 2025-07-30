#!/bin/bash

# WebSocket Server Script untuk Dokploy
# Laravel Echo Server untuk Real-time Notifications

set -e

# Color codes untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔌 Starting WebSocket Server for Dokploy${NC}"
echo "=============================================="

# Configuration
WEBSOCKET_PORT="6001"
WEBSOCKET_HOST="0.0.0.0"
CONFIG_FILE="laravel-echo-server.dokploy.json"

# External Service Configuration
REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PORT="6379"
REDIS_PASSWORD="5vlcwpzc45g9mtho"

# Environment variables
export REDIS_HOST=$REDIS_HOST
export REDIS_PORT=$REDIS_PORT
export REDIS_PASSWORD=$REDIS_PASSWORD

echo -e "${BLUE}📋 WebSocket Configuration:${NC}"
echo "- Host: $WEBSOCKET_HOST"
echo "- Port: $WEBSOCKET_PORT"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"
echo "- Config: $CONFIG_FILE"
echo ""

# Function untuk check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking WebSocket prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
        exit 1
    fi
    
    # Check config file
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ WebSocket config file not found: $CONFIG_FILE${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function untuk test external services
test_external_services() {
    echo -e "${BLUE}🔍 Testing external services...${NC}"
    
    # Test Redis connection
    echo "Testing Redis connection..."
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis connection failed - will continue anyway${NC}"
    fi
}

# Function untuk install Laravel Echo Server
install_echo_server() {
    echo -e "${BLUE}📦 Installing Laravel Echo Server...${NC}"
    
    # Install globally
    npm install -g laravel-echo-server
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Laravel Echo Server installed successfully${NC}"
    else
        echo -e "${RED}❌ Laravel Echo Server installation failed${NC}"
        exit 1
    fi
}

# Function untuk start WebSocket server
start_websocket_server() {
    echo -e "${BLUE}🚀 Starting WebSocket server...${NC}"
    
    # Check if port is available
    if lsof -Pi :$WEBSOCKET_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $WEBSOCKET_PORT is already in use${NC}"
        echo "Stopping existing process..."
        pkill -f "laravel-echo-server" || true
        sleep 2
    fi
    
    # Start Laravel Echo Server
    echo "Starting Laravel Echo Server with config: $CONFIG_FILE"
    laravel-echo-server start --config="$CONFIG_FILE" &
    
    ECHO_PID=$!
    echo "WebSocket server started with PID: $ECHO_PID"
    
    # Wait for server to start
    echo "Waiting for WebSocket server to be ready..."
    for i in {1..30}; do
        if curl -f "http://$WEBSOCKET_HOST:$WEBSOCKET_PORT" 2>/dev/null; then
            echo -e "${GREEN}✅ WebSocket server is ready${NC}"
            break
        fi
        echo "Waiting for WebSocket server... ($i/30)"
        sleep 2
    done
    
    # Keep script running
    echo -e "${GREEN}✅ WebSocket server is running on $WEBSOCKET_HOST:$WEBSOCKET_PORT${NC}"
    echo "Press Ctrl+C to stop the server"
    
    # Wait for the background process
    wait $ECHO_PID
}

# Function untuk stop WebSocket server
stop_websocket_server() {
    echo -e "${BLUE}🛑 Stopping WebSocket server...${NC}"
    
    # Kill Laravel Echo Server processes
    pkill -f "laravel-echo-server" || true
    
    echo -e "${GREEN}✅ WebSocket server stopped${NC}"
}

# Function untuk check WebSocket status
check_websocket_status() {
    echo -e "${BLUE}📊 WebSocket Server Status:${NC}"
    echo "========================"
    
    # Check if process is running
    if pgrep -f "laravel-echo-server" > /dev/null; then
        echo -e "${GREEN}✅ WebSocket server is running${NC}"
        
        # Get process info
        ECHO_PID=$(pgrep -f "laravel-echo-server")
        echo "Process ID: $ECHO_PID"
        
        # Check port
        if lsof -Pi :$WEBSOCKET_PORT -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${GREEN}✅ Port $WEBSOCKET_PORT is listening${NC}"
        else
            echo -e "${RED}❌ Port $WEBSOCKET_PORT is not listening${NC}"
        fi
        
        # Test connection
        if curl -f "http://$WEBSOCKET_HOST:$WEBSOCKET_PORT" 2>/dev/null; then
            echo -e "${GREEN}✅ WebSocket server is responding${NC}"
        else
            echo -e "${YELLOW}⚠️  WebSocket server is not responding${NC}"
        fi
        
    else
        echo -e "${RED}❌ WebSocket server is not running${NC}"
    fi
    
    echo ""
    echo "Service URLs:"
    echo "- WebSocket Server: http://$WEBSOCKET_HOST:$WEBSOCKET_PORT"
    echo "- Redis: $REDIS_HOST:$REDIS_PORT"
}

# Function untuk show logs
show_logs() {
    echo -e "${BLUE}📋 WebSocket Server Logs:${NC}"
    
    # Check if process is running
    if pgrep -f "laravel-echo-server" > /dev/null; then
        echo "Recent Laravel Echo Server logs:"
        # Note: Laravel Echo Server logs to stdout/stderr
        echo "Logs are displayed in the terminal where the server is running"
    else
        echo "WebSocket server is not running"
    fi
}

# Function untuk test WebSocket connection
test_websocket() {
    echo -e "${BLUE}🧪 Testing WebSocket connection...${NC}"
    
    # Test HTTP endpoint
    echo "Testing HTTP endpoint..."
    if curl -f "http://$WEBSOCKET_HOST:$WEBSOCKET_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ HTTP endpoint is accessible${NC}"
    else
        echo -e "${RED}❌ HTTP endpoint is not accessible${NC}"
        return 1
    fi
    
    # Test WebSocket connection (basic)
    echo "Testing WebSocket connection..."
    if nc -z "$WEBSOCKET_HOST" "$WEBSOCKET_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ WebSocket port is open${NC}"
    else
        echo -e "${RED}❌ WebSocket port is not open${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ WebSocket connection test passed${NC}"
}

# Main execution
main() {
    case "${1:-start}" in
        "start")
            check_prerequisites
            test_external_services
            install_echo_server
            start_websocket_server
            ;;
        "stop")
            stop_websocket_server
            ;;
        "restart")
            stop_websocket_server
            sleep 2
            check_prerequisites
            test_external_services
            start_websocket_server
            ;;
        "status")
            check_websocket_status
            ;;
        "logs")
            show_logs
            ;;
        "test")
            test_websocket
            ;;
        "install")
            check_prerequisites
            install_echo_server
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|test|install}"
            echo ""
            echo "Commands:"
            echo "  start    - Start WebSocket server (default)"
            echo "  stop     - Stop WebSocket server"
            echo "  restart  - Restart WebSocket server"
            echo "  status   - Show WebSocket server status"
            echo "  logs     - Show WebSocket server logs"
            echo "  test     - Test WebSocket connection"
            echo "  install  - Install Laravel Echo Server"
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}🛑 Stopping WebSocket server...${NC}"; stop_websocket_server; exit 0' INT

# Run main function
main "$@" 
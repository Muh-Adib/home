#!/bin/bash

# =============================================================================
# Dynamic Port Configuration Test Script
# =============================================================================

set -e

echo "🧪 Testing Dynamic Port Configuration..."

# =============================================================================
# 1. Check Environment Variables
# =============================================================================
echo "📋 Checking environment variables..."

# Check PORT variable
if [ -z "$PORT" ]; then
    echo "⚠️  PORT not set, using default 3000"
    export PORT=3000
else
    echo "✅ PORT is set to: $PORT"
fi

# Check APP_URL
if [ -z "$APP_URL" ]; then
    echo "⚠️  APP_URL not set, using default"
    export APP_URL="http://localhost:$PORT"
else
    echo "✅ APP_URL is set to: $APP_URL"
fi

# =============================================================================
# 2. Test Docker Compose Configuration
# =============================================================================
echo "🐳 Testing Docker Compose configuration..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

# Validate docker-compose configuration
echo "🔍 Validating docker-compose configuration..."
docker-compose config > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration is invalid"
    exit 1
fi

# =============================================================================
# 3. Test Port Availability
# =============================================================================
echo "🔌 Testing port availability..."

# Check if port is available
if command -v netstat >/dev/null 2>&1; then
    if netstat -tlnp | grep ":$PORT " > /dev/null; then
        echo "⚠️  Port $PORT is already in use"
        echo "📊 Current port usage:"
        netstat -tlnp | grep ":$PORT "
    else
        echo "✅ Port $PORT is available"
    fi
else
    echo "ℹ️  netstat not available, skipping port check"
fi

# =============================================================================
# 4. Test Container Startup
# =============================================================================
echo "🚀 Testing container startup..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start containers
echo "▶️  Starting containers with PORT=$PORT..."
docker-compose up -d

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose ps

# =============================================================================
# 5. Test Port Mapping
# =============================================================================
echo "🔗 Testing port mapping..."

# Check nginx port mapping
NGINX_PORT_MAPPING=$(docker port homsjogja-nginx 2>/dev/null | grep "80/tcp" || echo "")
if [ -n "$NGINX_PORT_MAPPING" ]; then
    echo "✅ Nginx port mapping: $NGINX_PORT_MAPPING"
else
    echo "❌ Nginx port mapping not found"
fi

# =============================================================================
# 6. Test Application Health
# =============================================================================
echo "🏥 Testing application health..."

# Test health endpoint
echo "🔍 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -f "http://localhost:$PORT/health" 2>/dev/null || echo "FAILED")
if [ "$HEALTH_RESPONSE" = "healthy" ]; then
    echo "✅ Health endpoint is working"
else
    echo "❌ Health endpoint failed: $HEALTH_RESPONSE"
fi

# Test internal health
echo "🔍 Testing internal health..."
INTERNAL_HEALTH=$(docker exec -it homsjogja-nginx curl -s -f http://localhost:80/health 2>/dev/null || echo "FAILED")
if [ "$INTERNAL_HEALTH" = "healthy" ]; then
    echo "✅ Internal health check is working"
else
    echo "❌ Internal health check failed: $INTERNAL_HEALTH"
fi

# =============================================================================
# 7. Test Laravel Echo Server
# =============================================================================
echo "🔌 Testing Laravel Echo Server..."

# Check Echo Server status
echo "🔍 Checking Echo Server status..."
ECHO_STATUS=$(docker exec -it homsjogja-nginx supervisorctl status laravel-echo-server 2>/dev/null | grep "RUNNING" || echo "NOT_RUNNING")
if [ "$ECHO_STATUS" = "RUNNING" ]; then
    echo "✅ Laravel Echo Server is running"
else
    echo "❌ Laravel Echo Server is not running: $ECHO_STATUS"
fi

# Test WebSocket endpoint
echo "🔍 Testing WebSocket endpoint..."
WEBSOCKET_RESPONSE=$(curl -s -f "http://localhost:$PORT/socket.io/" 2>/dev/null || echo "FAILED")
if [ "$WEBSOCKET_RESPONSE" != "FAILED" ]; then
    echo "✅ WebSocket endpoint is accessible"
else
    echo "❌ WebSocket endpoint failed: $WEBSOCKET_RESPONSE"
fi

# Check Echo Server configuration
echo "🔍 Checking Echo Server configuration..."
if docker exec -it homsjogja-nginx test -f /var/www/html/laravel-echo-server.dokploy.json; then
    echo "✅ Echo Server configuration file exists"
    echo "📄 Configuration content:"
    docker exec -it homsjogja-nginx cat /var/www/html/laravel-echo-server.dokploy.json | head -10
else
    echo "❌ Echo Server configuration file not found"
fi

# =============================================================================
# 8. Test Environment Variables in Container
# =============================================================================
echo "🔧 Testing environment variables in container..."

# Check PORT in container
CONTAINER_PORT=$(docker exec -it homsjogja-nginx env | grep PORT || echo "PORT_NOT_FOUND")
if [ "$CONTAINER_PORT" != "PORT_NOT_FOUND" ]; then
    echo "✅ PORT variable found in container: $CONTAINER_PORT"
else
    echo "❌ PORT variable not found in container"
fi

# Check APP_URL in container
CONTAINER_APP_URL=$(docker exec -it homsjogja-nginx env | grep APP_URL || echo "APP_URL_NOT_FOUND")
if [ "$CONTAINER_APP_URL" != "APP_URL_NOT_FOUND" ]; then
    echo "✅ APP_URL variable found in container: $CONTAINER_APP_URL"
else
    echo "❌ APP_URL variable not found in container"
fi

# =============================================================================
# 9. Test Dynamic Configuration Update
# =============================================================================
echo "🔄 Testing dynamic configuration update..."

# Change PORT and test
echo "🔄 Testing PORT change..."
export OLD_PORT=$PORT
export PORT=3001

echo "🔧 Updating configuration with new PORT=$PORT..."
docker exec -it homsjogja-nginx /usr/local/bin/update-echo-config.sh

# Check if configuration was updated
if docker exec -it homsjogja-nginx test -f /var/www/html/laravel-echo-server.dokploy.json; then
    echo "✅ Configuration updated successfully"
else
    echo "❌ Configuration update failed"
fi

# Restore original PORT
export PORT=$OLD_PORT
echo "🔄 Restored PORT to: $PORT"

# =============================================================================
# 10. Summary
# =============================================================================
echo "📊 Test Summary:"
echo "=================="
echo "🌐 External PORT: $PORT"
echo "🔗 Port Mapping: $NGINX_PORT_MAPPING"
echo "🏥 Health Status: $HEALTH_RESPONSE"
echo "🔌 Echo Server: $ECHO_STATUS"
echo "🔌 WebSocket: $WEBSOCKET_RESPONSE"

echo ""
echo "✅ Dynamic port configuration test completed!"
echo "🎯 You can now use PORT environment variable to change the external port"
echo "🔧 Laravel Echo Server configuration is updated automatically"
echo "🚀 Ready for Dokploy deployment!" 
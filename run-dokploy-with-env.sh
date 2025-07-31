#!/bin/bash

# ==================================================
# Run Dokploy Container with Environment Variables
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

log_info "=== Run Dokploy Container with Environment Variables ==="
log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
log_info "=================================================="

# Environment Variables Configuration
APP_URL="https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
DB_HOST="homsjogja-db-xsjalx"
DB_DATABASE="homs-db"
DB_USERNAME="homs-user"
DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ"
REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PASSWORD="5vlcwpzc45g9mtho"
REDIS_PORT="6379"
REDIS_USERNAME="default"

# Container configuration
CONTAINER_NAME="homsjogja-app"
IMAGE_NAME="homsjogja:latest"
EXTERNAL_PORT="8080"
INTERNAL_PORT="8080"

log_info "Environment Variables Configuration:"
log_info "APP_URL: $APP_URL"
log_info "DB_HOST: $DB_HOST"
log_info "DB_DATABASE: $DB_DATABASE"
log_info "DB_USERNAME: $DB_USERNAME"
log_info "DB_PASSWORD: ${DB_PASSWORD:0:4}***"
log_info "REDIS_HOST: $REDIS_HOST"
log_info "REDIS_PASSWORD: ${REDIS_PASSWORD:0:4}***"
log_info "REDIS_PORT: $REDIS_PORT"
log_info "REDIS_USERNAME: $REDIS_USERNAME"

# Stop existing container if running
log_info "Stopping existing container if running..."
docker stop $CONTAINER_NAME 2>/dev/null || log_warning "Container $CONTAINER_NAME not running"
docker rm $CONTAINER_NAME 2>/dev/null || log_warning "Container $CONTAINER_NAME not found"

# Build image with build arguments
log_info "Building Docker image with environment variables..."
docker build \
  --build-arg APP_URL="$APP_URL" \
  --build-arg DB_HOST="$DB_HOST" \
  --build-arg DB_DATABASE="$DB_DATABASE" \
  --build-arg DB_USERNAME="$DB_USERNAME" \
  --build-arg DB_PASSWORD="$DB_PASSWORD" \
  --build-arg REDIS_HOST="$REDIS_HOST" \
  --build-arg REDIS_PASSWORD="$REDIS_PASSWORD" \
  --build-arg REDIS_PORT="$REDIS_PORT" \
  --build-arg REDIS_USERNAME="$REDIS_USERNAME" \
  -f Dockerfile.dokploy \
  -t $IMAGE_NAME \
  .

if [ $? -eq 0 ]; then
    log_success "Docker image built successfully"
else
    log_error "Failed to build Docker image"
    exit 1
fi

# Run container with environment variables
log_info "Running container with environment variables..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $EXTERNAL_PORT:$INTERNAL_PORT \
  -p 6002:6002 \
  -e APP_URL="$APP_URL" \
  -e DB_HOST="$DB_HOST" \
  -e DB_DATABASE="$DB_DATABASE" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e REDIS_HOST="$REDIS_HOST" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e REDIS_PORT="$REDIS_PORT" \
  -e REDIS_USERNAME="$REDIS_USERNAME" \
  -e APP_ENV="production" \
  -e APP_DEBUG="false" \
  -e CACHE_DRIVER="redis" \
  -e SESSION_DRIVER="redis" \
  -e QUEUE_CONNECTION="redis" \
  -e BROADCAST_CONNECTION="redis" \
  $IMAGE_NAME

if [ $? -eq 0 ]; then
    log_success "Container started successfully"
else
    log_error "Failed to start container"
    exit 1
fi

# Wait for container to be ready
log_info "Waiting for container to be ready..."
sleep 10

# Check container status
log_info "Checking container status..."
if docker ps | grep -q $CONTAINER_NAME; then
    log_success "Container is running"
else
    log_error "Container is not running"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Show container logs
log_info "Container logs:"
docker logs $CONTAINER_NAME --tail 50

# Show container information
log_info "Container information:"
docker inspect $CONTAINER_NAME --format='{{.State.Status}} {{.NetworkSettings.IPAddress}}'

# Test application health
log_info "Testing application health..."
sleep 30

if curl -f http://localhost:$EXTERNAL_PORT/health >/dev/null 2>&1; then
    log_success "Application is healthy and accessible"
    log_info "Application URL: http://localhost:$EXTERNAL_PORT"
    log_info "Health Check: http://localhost:$EXTERNAL_PORT/health"
else
    log_warning "Application health check failed, checking logs..."
    docker logs $CONTAINER_NAME --tail 20
fi

log_info "=================================================="
log_info "🎯 CONTAINER DEPLOYMENT COMPLETED"
log_info "=================================================="
log_info "Container Name: $CONTAINER_NAME"
log_info "Image: $IMAGE_NAME"
log_info "External Port: $EXTERNAL_PORT"
log_info "Internal Port: $INTERNAL_PORT"
log_info "WebSocket Port: 6002"
log_info ""
log_info "📋 Useful Commands:"
log_info "  - View logs: docker logs $CONTAINER_NAME"
log_info "  - Follow logs: docker logs -f $CONTAINER_NAME"
log_info "  - Stop container: docker stop $CONTAINER_NAME"
log_info "  - Remove container: docker rm $CONTAINER_NAME"
log_info "  - Access shell: docker exec -it $CONTAINER_NAME bash"
log_info ""
log_info "🌐 Access URLs:"
log_info "  - Main App: http://localhost:$EXTERNAL_PORT"
log_info "  - Health Check: http://localhost:$EXTERNAL_PORT/health"
log_info "  - WebSocket: http://localhost:6002"
log_info "==================================================" 
#!/bin/bash

# ==================================================
# Dokploy Deployment Script
# Property Management System - Laravel 12 + React 18
# ==================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="homsjogja"
APP_PORT="80"
DOCKER_IMAGE="homsjogja-app"
CONTAINER_NAME="homsjogja-container"

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

# ==================================================
# Main Deployment Process
# ==================================================

log_info "Starting Dokploy deployment for $APP_NAME..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build the Docker image
log_info "Building Docker image..."
docker build -f Dockerfile.dokploy -t $DOCKER_IMAGE .

if [ $? -eq 0 ]; then
    log_success "Docker image built successfully"
else
    log_error "Docker build failed"
    exit 1
fi

# Stop and remove existing container
log_info "Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run the container
log_info "Starting container..."
docker run -d \
    --name $CONTAINER_NAME \
    -p 8080:80 \
    -e APP_NAME="$APP_NAME" \
    -e APP_ENV=production \
    -e APP_URL="${APP_URL:-http://localhost:8080}" \
    -e DB_HOST="${DB_HOST:-127.0.0.1}" \
    -e DB_PORT="${DB_PORT:-3306}" \
    -e DB_DATABASE="${DB_DATABASE:-property_management}" \
    -e DB_USERNAME="${DB_USERNAME:-root}" \
    -e DB_PASSWORD="${DB_PASSWORD}" \
    -e REDIS_HOST="${REDIS_HOST:-127.0.0.1}" \
    -e REDIS_PORT="${REDIS_PORT:-6379}" \
    -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
    $DOCKER_IMAGE

if [ $? -eq 0 ]; then
    log_success "Container started successfully"
else
    log_error "Container start failed"
    exit 1
fi

# Wait for container to be ready
log_info "Waiting for container to be ready..."
sleep 10

# Check container status
if docker ps | grep -q $CONTAINER_NAME; then
    log_success "Container is running"
else
    log_error "Container is not running"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Test application
log_info "Testing application..."
if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    log_success "Application is accessible"
else
    log_warning "Application not accessible yet, checking logs..."
    docker logs $CONTAINER_NAME
fi

log_info "Deployment completed successfully!"
log_info "Application URL: http://localhost:8080"
log_info "Health Check: http://localhost:8080/health" 
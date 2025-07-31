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
# Environment Variables Setup
# ==================================================

log_info "Setting up environment variables..."

# Set default environment variables
export APP_NAME=${APP_NAME:-"Homsjogja"}
export APP_ENV=${APP_ENV:-"production"}
export APP_KEY=${APP_KEY:-"base64:your-app-key-here"}
export APP_DEBUG=${APP_DEBUG:-"false"}
export APP_URL=${APP_URL:-"http://localhost:8080"}

# Database configuration
export DB_CONNECTION=${DB_CONNECTION:-"mysql"}
export DB_HOST=${DB_HOST:-"127.0.0.1"}
export DB_PORT=${DB_PORT:-"3306"}
export DB_DATABASE=${DB_DATABASE:-"property_management"}
export DB_USERNAME=${DB_USERNAME:-"root"}
export DB_PASSWORD=${DB_PASSWORD:-""}

# Redis configuration
export REDIS_CLIENT=${REDIS_CLIENT:-"phpredis"}
export REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
export REDIS_PORT=${REDIS_PORT:-"6379"}
export REDIS_USERNAME=${REDIS_USERNAME:-"null"}
export REDIS_PASSWORD=${REDIS_PASSWORD:-"null"}

# Session and Cache
export SESSION_DRIVER=${SESSION_DRIVER:-"file"}
export CACHE_DRIVER=${CACHE_DRIVER:-"file"}
export QUEUE_CONNECTION=${QUEUE_CONNECTION:-"sync"}

# Mail configuration
export MAIL_MAILER=${MAIL_MAILER:-"smtp"}
export MAIL_HOST=${MAIL_HOST:-"mailpit"}
export MAIL_PORT=${MAIL_PORT:-"1025"}
export MAIL_USERNAME=${MAIL_USERNAME:-"null"}
export MAIL_PASSWORD=${MAIL_PASSWORD:-"null"}
export MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS:-"hello@example.com"}
export MAIL_FROM_NAME=${MAIL_FROM_NAME:-"${APP_NAME}"}

log_info "Environment variables configured:"
log_info "APP_NAME: $APP_NAME"
log_info "APP_ENV: $APP_ENV"
log_info "APP_URL: $APP_URL"
log_info "DB_HOST: $DB_HOST"
log_info "DB_DATABASE: $DB_DATABASE"
log_info "REDIS_HOST: $REDIS_HOST"

# ==================================================
# Main Deployment Process
# ==================================================

log_info "Starting Dokploy deployment..."

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
    -e APP_ENV="$APP_ENV" \
    -e APP_KEY="$APP_KEY" \
    -e APP_DEBUG="$APP_DEBUG" \
    -e APP_URL="$APP_URL" \
    -e DB_CONNECTION="$DB_CONNECTION" \
    -e DB_HOST="$DB_HOST" \
    -e DB_PORT="$DB_PORT" \
    -e DB_DATABASE="$DB_DATABASE" \
    -e DB_USERNAME="$DB_USERNAME" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e REDIS_CLIENT="$REDIS_CLIENT" \
    -e REDIS_HOST="$REDIS_HOST" \
    -e REDIS_PORT="$REDIS_PORT" \
    -e REDIS_USERNAME="$REDIS_USERNAME" \
    -e REDIS_PASSWORD="$REDIS_PASSWORD" \
    -e SESSION_DRIVER="$SESSION_DRIVER" \
    -e CACHE_DRIVER="$CACHE_DRIVER" \
    -e QUEUE_CONNECTION="$QUEUE_CONNECTION" \
    -e MAIL_MAILER="$MAIL_MAILER" \
    -e MAIL_HOST="$MAIL_HOST" \
    -e MAIL_PORT="$MAIL_PORT" \
    -e MAIL_USERNAME="$MAIL_USERNAME" \
    -e MAIL_PASSWORD="$MAIL_PASSWORD" \
    -e MAIL_FROM_ADDRESS="$MAIL_FROM_ADDRESS" \
    -e MAIL_FROM_NAME="$MAIL_FROM_NAME" \
    $DOCKER_IMAGE

if [ $? -eq 0 ]; then
    log_success "Container started successfully"
else
    log_error "Container start failed"
    exit 1
fi

# Wait for container to be ready
log_info "Waiting for container to be ready..."
sleep 15

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

# Test internal port
log_info "Testing internal port..."
if docker exec $CONTAINER_NAME curl -f http://localhost:80/health >/dev/null 2>&1; then
    log_success "Internal port is working"
else
    log_warning "Internal port not working yet"
fi

log_info "Deployment completed successfully!"
log_info "Application URL: http://localhost:8080"
log_info "Health Check: http://localhost:8080/health"
log_info "Internal Health Check: http://localhost:80/health" 
# ==================================================
# Run Dokploy Container with Environment Variables (PowerShell)
# Property Management System - Laravel 12 + React 18 + WebSocket
# ==================================================

Write-Host "=== Run Dokploy Container with Environment Variables ===" -ForegroundColor Blue
Write-Host "Property Management System - Laravel 12 + React 18 + WebSocket" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Environment Variables Configuration
$APP_URL = "https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
$DB_HOST = "homsjogja-db-xsjalx"
$DB_DATABASE = "homs-db"
$DB_USERNAME = "homs-user"
$DB_PASSWORD = "jD8-AKHx2gFCQ5gx3ouRJ"
$REDIS_HOST = "homsjogja-redis-qmihbb"
$REDIS_PASSWORD = "5vlcwpzc45g9mtho"
$REDIS_PORT = "6379"
$REDIS_USERNAME = "default"

# Container configuration
$CONTAINER_NAME = "homsjogja-app"
$IMAGE_NAME = "homsjogja:latest"
$EXTERNAL_PORT = "8080"
$INTERNAL_PORT = "8080"

Write-Host "[INFO] Environment Variables Configuration:" -ForegroundColor Blue
Write-Host "APP_URL: $APP_URL" -ForegroundColor Blue
Write-Host "DB_HOST: $DB_HOST" -ForegroundColor Blue
Write-Host "DB_DATABASE: $DB_DATABASE" -ForegroundColor Blue
Write-Host "DB_USERNAME: $DB_USERNAME" -ForegroundColor Blue
Write-Host "DB_PASSWORD: $($DB_PASSWORD.Substring(0,4))***" -ForegroundColor Blue
Write-Host "REDIS_HOST: $REDIS_HOST" -ForegroundColor Blue
Write-Host "REDIS_PASSWORD: $($REDIS_PASSWORD.Substring(0,4))***" -ForegroundColor Blue
Write-Host "REDIS_PORT: $REDIS_PORT" -ForegroundColor Blue
Write-Host "REDIS_USERNAME: $REDIS_USERNAME" -ForegroundColor Blue

# Stop existing container if running
Write-Host "[INFO] Stopping existing container if running..." -ForegroundColor Blue
try {
    docker stop $CONTAINER_NAME 2>$null
    Write-Host "[WARNING] Container $CONTAINER_NAME stopped" -ForegroundColor Yellow
} catch {
    Write-Host "[WARNING] Container $CONTAINER_NAME not running" -ForegroundColor Yellow
}

try {
    docker rm $CONTAINER_NAME 2>$null
    Write-Host "[WARNING] Container $CONTAINER_NAME removed" -ForegroundColor Yellow
} catch {
    Write-Host "[WARNING] Container $CONTAINER_NAME not found" -ForegroundColor Yellow
}

# Build image with build arguments
Write-Host "[INFO] Building Docker image with environment variables..." -ForegroundColor Blue
$buildArgs = @(
    "--build-arg", "APP_URL=$APP_URL",
    "--build-arg", "DB_HOST=$DB_HOST",
    "--build-arg", "DB_DATABASE=$DB_DATABASE",
    "--build-arg", "DB_USERNAME=$DB_USERNAME",
    "--build-arg", "DB_PASSWORD=$DB_PASSWORD",
    "--build-arg", "REDIS_HOST=$REDIS_HOST",
    "--build-arg", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "--build-arg", "REDIS_PORT=$REDIS_PORT",
    "--build-arg", "REDIS_USERNAME=$REDIS_USERNAME",
    "-f", "Dockerfile.dokploy",
    "-t", $IMAGE_NAME,
    "."
)

$buildResult = docker build $buildArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Docker image built successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to build Docker image" -ForegroundColor Red
    exit 1
}

# Run container with environment variables
Write-Host "[INFO] Running container with environment variables..." -ForegroundColor Blue
$runArgs = @(
    "run", "-d",
    "--name", $CONTAINER_NAME,
    "-p", "$EXTERNAL_PORT`:$INTERNAL_PORT",
    "-p", "6002:6002",
    "-e", "APP_URL=$APP_URL",
    "-e", "DB_HOST=$DB_HOST",
    "-e", "DB_DATABASE=$DB_DATABASE",
    "-e", "DB_USERNAME=$DB_USERNAME",
    "-e", "DB_PASSWORD=$DB_PASSWORD",
    "-e", "REDIS_HOST=$REDIS_HOST",
    "-e", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "-e", "REDIS_PORT=$REDIS_PORT",
    "-e", "REDIS_USERNAME=$REDIS_USERNAME",
    "-e", "APP_ENV=production",
    "-e", "APP_DEBUG=false",
    "-e", "CACHE_DRIVER=redis",
    "-e", "SESSION_DRIVER=redis",
    "-e", "QUEUE_CONNECTION=redis",
    "-e", "BROADCAST_CONNECTION=redis",
    $IMAGE_NAME
)

$runResult = docker $runArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Container started successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to start container" -ForegroundColor Red
    exit 1
}

# Wait for container to be ready
Write-Host "[INFO] Waiting for container to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Check container status
Write-Host "[INFO] Checking container status..." -ForegroundColor Blue
$containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}"

if ($containerStatus -match $CONTAINER_NAME) {
    Write-Host "[SUCCESS] Container is running" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Container is not running" -ForegroundColor Red
    docker logs $CONTAINER_NAME
    exit 1
}

# Show container logs
Write-Host "[INFO] Container logs:" -ForegroundColor Blue
docker logs $CONTAINER_NAME --tail 50

# Show container information
Write-Host "[INFO] Container information:" -ForegroundColor Blue
docker inspect $CONTAINER_NAME --format='{{.State.Status}} {{.NetworkSettings.IPAddress}}'

# Test application health
Write-Host "[INFO] Testing application health..." -ForegroundColor Blue
Start-Sleep -Seconds 30

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:$EXTERNAL_PORT/health" -UseBasicParsing -TimeoutSec 10
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "[SUCCESS] Application is healthy and accessible" -ForegroundColor Green
        Write-Host "Application URL: http://localhost:$EXTERNAL_PORT" -ForegroundColor Blue
        Write-Host "Health Check: http://localhost:$EXTERNAL_PORT/health" -ForegroundColor Blue
    } else {
        Write-Host "[WARNING] Application health check failed" -ForegroundColor Yellow
        docker logs $CONTAINER_NAME --tail 20
    }
} catch {
    Write-Host "[WARNING] Application health check failed, checking logs..." -ForegroundColor Yellow
    docker logs $CONTAINER_NAME --tail 20
}

Write-Host "==================================================" -ForegroundColor Blue
Write-Host "🎯 CONTAINER DEPLOYMENT COMPLETED" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue
Write-Host "Container Name: $CONTAINER_NAME" -ForegroundColor Blue
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Blue
Write-Host "External Port: $EXTERNAL_PORT" -ForegroundColor Blue
Write-Host "Internal Port: $INTERNAL_PORT" -ForegroundColor Blue
Write-Host "WebSocket Port: 6002" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Blue
Write-Host "  - View logs: docker logs $CONTAINER_NAME" -ForegroundColor Blue
Write-Host "  - Follow logs: docker logs -f $CONTAINER_NAME" -ForegroundColor Blue
Write-Host "  - Stop container: docker stop $CONTAINER_NAME" -ForegroundColor Blue
Write-Host "  - Remove container: docker rm $CONTAINER_NAME" -ForegroundColor Blue
Write-Host "  - Access shell: docker exec -it $CONTAINER_NAME bash" -ForegroundColor Blue
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Blue
Write-Host "  - Main App: http://localhost:$EXTERNAL_PORT" -ForegroundColor Blue
Write-Host "  - Health Check: http://localhost:$EXTERNAL_PORT/health" -ForegroundColor Blue
Write-Host "  - WebSocket: http://localhost:6002" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue 
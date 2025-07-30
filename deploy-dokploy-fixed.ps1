# Dokploy Deployment Script untuk Windows - FIXED VERSION
# Property Management System - Laravel 12 + React 18 + WebSocket

param(
    [string]$Command = "deploy"
)

# Color codes untuk output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Status {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" $Red
}

Write-ColorOutput "🚀 Starting Dokploy Deployment with Fixed Dockerfile" $Blue
Write-ColorOutput "=====================================================" $Blue

# Configuration
$AppName = "homsjogja"
$Dockerfile = "Dockerfile.dokploy"
$ImageName = "homsjogja-app"
$ContainerName = "homsjogja-container"
$AppPort = "8080"
$WebSocketPort = "6001"

# External Service Configuration
$DBHost = "homsjogja-db-xsjalx"
$DBPort = "3306"
$DBDatabase = "homs-db"
$DBUsername = "homs-user"
$DBPassword = "jD8-AKHx2gFCQ5gx3ouRJ"

$RedisHost = "homsjogja-redis-qmihbb"
$RedisPort = "6379"
$RedisPassword = "5vlcwpzc45g9mtho"

Write-ColorOutput "📋 Configuration:" $Blue
Write-ColorOutput "- App URL: http://localhost:$AppPort" $White
Write-ColorOutput "- Database: $DBHost`:$DBPort" $White
Write-ColorOutput "- Redis: $RedisHost`:$RedisPort" $White
Write-ColorOutput "- App Port: $AppPort" $White
Write-ColorOutput "- WebSocket Port: $WebSocketPort" $White
Write-ColorOutput ""

# Function untuk check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-Success "Docker is available: $dockerVersion"
        } else {
            Write-Error "Docker not found. Please install Docker Desktop first."
            Write-ColorOutput "Download from: https://www.docker.com/products/docker-desktop/" $Yellow
            exit 1
        }
    }
    catch {
        Write-Error "Docker not found. Please install Docker Desktop first."
        Write-ColorOutput "Download from: https://www.docker.com/products/docker-desktop/" $Yellow
        exit 1
    }
    
    # Check if Dockerfile exists
    if (-not (Test-Path $Dockerfile)) {
        Write-Error "Dockerfile.dokploy not found!"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Function untuk test external services
function Test-ExternalServices {
    Write-Status "Testing external services..."
    
    # Test MySQL connection (basic port check)
    Write-Status "Testing MySQL connection..."
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($DBHost, $DBPort).Wait(5000) | Out-Null
        if ($tcp.Connected) {
            Write-Success "MySQL connection successful"
        } else {
            Write-Warning "MySQL connection failed - will continue anyway"
        }
        $tcp.Close()
    }
    catch {
        Write-Warning "MySQL connection failed - will continue anyway"
    }
    
    # Test Redis connection (basic port check)
    Write-Status "Testing Redis connection..."
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($RedisHost, $RedisPort).Wait(5000) | Out-Null
        if ($tcp.Connected) {
            Write-Success "Redis connection successful"
        } else {
            Write-Warning "Redis connection failed - will continue anyway"
        }
        $tcp.Close()
    }
    catch {
        Write-Warning "Redis connection failed - will continue anyway"
    }
}

# Function untuk build image
function Build-Image {
    Write-Status "Building Docker image..."
    
    # Remove existing image if exists
    try {
        $existingImage = docker image inspect $ImageName 2>$null
        if ($existingImage) {
            Write-Status "Removing existing image..."
            docker rmi $ImageName 2>$null
        }
    }
    catch {
        # Image doesn't exist, continue
    }
    
    # Build new image
    Write-Status "Building new image from $Dockerfile..."
    Write-Status "This may take several minutes..."
    
    $buildResult = docker build -f $Dockerfile -t $ImageName . 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Image built successfully"
    } else {
        Write-Error "Image build failed"
        Write-ColorOutput "Build output:" $Yellow
        Write-ColorOutput $buildResult $Yellow
        exit 1
    }
}

# Function untuk stop existing container
function Stop-Container {
    Write-Status "Stopping existing container..."
    
    $running = docker ps -q -f name=$ContainerName 2>$null
    if ($running) {
        Write-Status "Stopping container $ContainerName..."
        docker stop $ContainerName 2>$null
        docker rm $ContainerName 2>$null
        Write-Success "Container stopped and removed"
    } else {
        Write-Status "No existing container found"
    }
}

# Function untuk run container
function Start-Container {
    Write-Status "Starting container..."
    
    # Create network if not exists
    $network = docker network ls --format "table {{.Name}}" 2>$null | Select-String "homsjogja-network"
    if (-not $network) {
        Write-Status "Creating network homsjogja-network..."
        docker network create homsjogja-network 2>$null
    }
    
    # Run container dengan environment variables
    $envVars = @(
        "-e", "APP_ENV=production",
        "-e", "APP_DEBUG=false",
        "-e", "APP_URL=http://localhost:$AppPort",
        "-e", "DB_HOST=$DBHost",
        "-e", "DB_PORT=$DBPort",
        "-e", "DB_DATABASE=$DBDatabase",
        "-e", "DB_USERNAME=$DBUsername",
        "-e", "DB_PASSWORD=$DBPassword",
        "-e", "REDIS_HOST=$RedisHost",
        "-e", "REDIS_PORT=$RedisPort",
        "-e", "REDIS_PASSWORD=$RedisPassword",
        "-e", "REDIS_DB=0",
        "-e", "BROADCAST_DRIVER=redis",
        "-e", "BROADCAST_CONNECTION=default",
        "-e", "CACHE_DRIVER=redis",
        "-e", "SESSION_DRIVER=redis",
        "-e", "QUEUE_CONNECTION=redis",
        "-e", "SOCKETIO_PORT=6001",
        "-e", "SOCKETIO_HOST=0.0.0.0",
        "-e", "NOTIFICATION_CHANNELS=database,broadcast"
    )
    
    $volumeMounts = @(
        "-v", "$(Get-Location)\storage:/var/www/html/storage",
        "-v", "$(Get-Location)\public\uploads:/var/www/html/storage/app/public"
    )
    
    $dockerArgs = @(
        "run", "-d",
        "--name", $ContainerName,
        "--network", "homsjogja-network",
        "-p", "$AppPort`:80",
        "-p", "$WebSocketPort`:6001",
        "--restart", "unless-stopped"
    ) + $envVars + $volumeMounts + @($ImageName)
    
    $runResult = docker @dockerArgs 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Container started successfully"
    } else {
        Write-Error "Container start failed"
        Write-ColorOutput "Run output:" $Yellow
        Write-ColorOutput $runResult $Yellow
        exit 1
    }
}

# Function untuk wait for container ready
function Wait-ContainerReady {
    Write-Status "Waiting for container to be ready..."
    
    # Wait for container to start
    for ($i = 1; $i -le 30; $i++) {
        $running = docker ps -q -f name=$ContainerName 2>$null
        if ($running) {
            Write-Success "Container is running"
            break
        }
        Write-Status "Waiting for container to start... ($i/30)"
        Start-Sleep 2
    }
    
    # Wait for application to be ready
    Write-Status "Waiting for application to be ready..."
    for ($i = 1; $i -le 60; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$AppPort/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is ready"
                return
            }
        }
        catch {
            # Continue waiting
        }
        Write-Status "Waiting for application... ($i/60)"
        Start-Sleep 2
    }
    
    Write-Warning "Application may not be fully ready yet"
}

# Function untuk run migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    
    # Run migrations
    Write-Status "Running migrations..."
    $migrateResult = docker exec $ContainerName php artisan migrate --force 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrations completed successfully"
    } else {
        Write-Warning "Migrations may have failed"
        Write-ColorOutput "Migration output:" $Yellow
        Write-ColorOutput $migrateResult $Yellow
    }
    
    # Clear and rebuild cache
    Write-Status "Rebuilding cache..."
    docker exec $ContainerName php artisan config:cache 2>$null
    docker exec $ContainerName php artisan route:cache 2>$null
    docker exec $ContainerName php artisan view:cache 2>$null
    
    Write-Success "Cache rebuild completed"
}

# Function untuk test deployment
function Test-Deployment {
    Write-Status "Testing deployment..."
    
    # Test main application
    Write-Status "Testing main application..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$AppPort" -TimeoutSec 10
        Write-Success "Application is accessible"
    }
    catch {
        Write-Error "Application is not accessible"
        return 1
    }
    
    # Test health endpoint
    Write-Status "Testing health endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$AppPort/health" -TimeoutSec 10
        Write-Success "Health endpoint is working"
    }
    catch {
        Write-Warning "Health endpoint is not working"
    }
    
    # Test database connection
    Write-Status "Testing database connection..."
    try {
        $result = docker exec $ContainerName php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK';" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database connection is working"
        } else {
            Write-Warning "Database connection failed"
        }
    }
    catch {
        Write-Warning "Database connection failed"
    }
    
    # Test Redis connection
    Write-Status "Testing Redis connection..."
    try {
        $result = docker exec $ContainerName php artisan tinker --execute="Redis::ping(); echo 'Redis OK';" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Redis connection is working"
        } else {
            Write-Warning "Redis connection failed"
        }
    }
    catch {
        Write-Warning "Redis connection failed"
    }
}

# Function untuk show logs
function Show-Logs {
    Write-ColorOutput "📋 Recent logs:" $Blue
    docker logs --tail=20 $ContainerName 2>$null
}

# Function untuk show status
function Show-Status {
    Write-ColorOutput "📊 Deployment Status:" $Blue
    Write-ColorOutput "=====================" $Blue
    
    # Show running container
    Write-ColorOutput "Container status:" $White
    docker ps -f name=$ContainerName 2>$null
    
    Write-ColorOutput ""
    
    # Show service URLs
    Write-ColorOutput "Service URLs:" $White
    Write-ColorOutput "- Main Application: http://localhost:$AppPort" $White
    Write-ColorOutput "- Health Check: http://localhost:$AppPort/health" $White
    
    Write-ColorOutput ""
    
    # Show external service status
    Write-ColorOutput "External Services:" $White
    Write-ColorOutput "- MySQL: $DBHost`:$DBPort" $White
    Write-ColorOutput "- Redis: $RedisHost`:$RedisPort" $White
    
    Write-ColorOutput ""
    
    # Show container info
    Write-ColorOutput "Container Info:" $White
    try {
        $status = docker inspect --format='{{.State.Status}}' $ContainerName 2>$null
        Write-ColorOutput $status $White
    }
    catch {
        Write-ColorOutput "Container not found" $Red
    }
}

# Function untuk cleanup
function Remove-All {
    Write-Status "Cleaning up..."
    
    # Stop and remove container
    Stop-Container
    
    # Remove image
    try {
        $existingImage = docker image inspect $ImageName 2>$null
        if ($existingImage) {
            Write-Status "Removing image..."
            docker rmi $ImageName 2>$null
        }
    }
    catch {
        # Image doesn't exist
    }
    
    Write-Success "Cleanup completed"
}

# Main execution
switch ($Command.ToLower()) {
    "deploy" {
        Test-Prerequisites
        Test-ExternalServices
        Build-Image
        Stop-Container
        Start-Container
        Wait-ContainerReady
        Invoke-Migrations
        Test-Deployment
        Show-Status
    }
    "build" {
        Test-Prerequisites
        Build-Image
    }
    "start" {
        Start-Container
        Wait-ContainerReady
    }
    "stop" {
        Stop-Container
    }
    "restart" {
        Stop-Container
        Start-Container
        Wait-ContainerReady
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "test" {
        Test-Deployment
    }
    "migrate" {
        Invoke-Migrations
    }
    "cleanup" {
        Remove-All
    }
    default {
        Write-ColorOutput "Usage: .\deploy-dokploy-fixed.ps1 {deploy|build|start|stop|restart|logs|status|test|migrate|cleanup}" $White
        Write-ColorOutput ""
        Write-ColorOutput "Commands:" $White
        Write-ColorOutput "  deploy   - Full deployment (default)" $White
        Write-ColorOutput "  build    - Build Docker image only" $White
        Write-ColorOutput "  start    - Start container" $White
        Write-ColorOutput "  stop     - Stop container" $White
        Write-ColorOutput "  restart  - Restart container" $White
        Write-ColorOutput "  logs     - Show recent logs" $White
        Write-ColorOutput "  status   - Show deployment status" $White
        Write-ColorOutput "  test     - Test deployment" $White
        Write-ColorOutput "  migrate  - Run database migrations" $White
        Write-ColorOutput "  cleanup  - Remove container and image" $White
        exit 1
    }
} 
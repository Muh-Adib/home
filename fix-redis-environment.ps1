# ==================================================
# Fix Redis Environment Variables Script (PowerShell)
# Property Management System - Laravel 12 + React 18 + WebSocket
# ==================================================

Write-Host "=== Fix Redis Environment Variables Script ===" -ForegroundColor Blue
Write-Host "Property Management System - Laravel 12 + React 18 + WebSocket" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Check if we're in a Docker container
if (Test-Path "/.dockerenv") {
    Write-Host "[INFO] Running inside Docker container" -ForegroundColor Blue
} else {
    Write-Host "[INFO] Running on host system" -ForegroundColor Blue
}

# Check current environment variables
Write-Host "[INFO] Current Environment Variables:" -ForegroundColor Blue
Write-Host "APP_URL: ${{project.APP_URL}}" -ForegroundColor Blue
Write-Host "DB_HOST: ${{project.DB_HOST}}" -ForegroundColor Blue
Write-Host "DB_DATABASE: ${{project.DB_DATABASE}}" -ForegroundColor Blue
Write-Host "REDIS_HOST: ${{project.REDIS_HOST}}" -ForegroundColor Blue
Write-Host "REDIS_PASSWORD: $(${{project.REDIS_PASSWORD}}.Substring(0,4))***" -ForegroundColor Blue

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "[SUCCESS] .env file exists" -ForegroundColor Green
    
    # Read current Redis configuration
    $envContent = Get-Content ".env"
    $redisHost = ($envContent | Where-Object { $_ -match "^REDIS_HOST=" }) -replace "^REDIS_HOST=", ""
    $redisPort = ($envContent | Where-Object { $_ -match "^REDIS_PORT=" }) -replace "^REDIS_PORT=", ""
    $redisPassword = ($envContent | Where-Object { $_ -match "^REDIS_PASSWORD=" }) -replace "^REDIS_PASSWORD=", ""
    
    Write-Host "[INFO] Current .env Redis configuration:" -ForegroundColor Blue
    Write-Host "REDIS_HOST: $redisHost" -ForegroundColor Blue
    Write-Host "REDIS_PORT: $redisPort" -ForegroundColor Blue
    Write-Host "REDIS_PASSWORD: $redisPassword" -ForegroundColor Blue
} else {
    Write-Host "[WARNING] .env file not found" -ForegroundColor Yellow
}

# Create or update .env file with correct Redis configuration
Write-Host "[INFO] Setting up .env file with correct Redis configuration..." -ForegroundColor Blue

# Check if environment variables are set by Dokploy
if (${{project.REDIS_HOST}}) {
    Write-Host "[INFO] Dokploy Redis configuration detected:" -ForegroundColor Blue
    Write-Host "REDIS_HOST: ${{project.REDIS_HOST}}" -ForegroundColor Blue
    Write-Host "REDIS_PORT: ${{project.REDIS_PORT}}" -ForegroundColor Blue
    Write-Host "REDIS_PASSWORD: $(${{project.REDIS_PASSWORD}}.Substring(0,4))***" -ForegroundColor Blue
    
    # Update .env file with Dokploy values
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        
        # Update Redis configuration
        $envContent = $envContent -replace "^REDIS_HOST=.*", "REDIS_HOST=$(${{project.REDIS_HOST}})"
        if (${{project.REDIS_PORT}}) {
            $envContent = $envContent -replace "^REDIS_PORT=.*", "REDIS_PORT=$(${{project.REDIS_PORT}})"
        }
        if (${{project.REDIS_PASSWORD}}) {
            $envContent = $envContent -replace "^REDIS_PASSWORD=.*", "REDIS_PASSWORD=$(${{project.REDIS_PASSWORD}})"
        }
        if (${{project.REDIS_USERNAME}}) {
            $envContent = $envContent -replace "^REDIS_USERNAME=.*", "REDIS_USERNAME=$(${{project.REDIS_USERNAME}})"
        }
        
        $envContent | Set-Content ".env"
        Write-Host "[SUCCESS] Updated .env with Dokploy Redis configuration" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] .env file not found, cannot update" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[WARNING] No Dokploy Redis configuration detected" -ForegroundColor Yellow
    Write-Host "[INFO] Using default Redis configuration (127.0.0.1:6379)" -ForegroundColor Blue
    
    # Set default Redis configuration
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        
        # Update Redis configuration with defaults
        $envContent = $envContent -replace "^REDIS_HOST=.*", "REDIS_HOST=127.0.0.1"
        $envContent = $envContent -replace "^REDIS_PORT=.*", "REDIS_PORT=6379"
        $envContent = $envContent -replace "^REDIS_PASSWORD=.*", "REDIS_PASSWORD=null"
        $envContent = $envContent -replace "^REDIS_USERNAME=.*", "REDIS_USERNAME="
        
        $envContent | Set-Content ".env"
        Write-Host "[SUCCESS] Updated .env with default Redis configuration" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] .env file not found, cannot update" -ForegroundColor Red
        exit 1
    }
}

# Clear Laravel config cache
Write-Host "[INFO] Clearing Laravel config cache..." -ForegroundColor Blue
try {
    php artisan config:clear
    php artisan config:cache
    Write-Host "[SUCCESS] Config cache cleared and rebuilt" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Failed to clear config cache: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test Redis connection
Write-Host "[INFO] Testing Redis connection..." -ForegroundColor Blue
$envContent = Get-Content ".env"
$redisHost = ($envContent | Where-Object { $_ -match "^REDIS_HOST=" }) -replace "^REDIS_HOST=", ""

if ($redisHost -eq "127.0.0.1" -or $redisHost -eq "localhost") {
    Write-Host "[WARNING] Redis host is local (127.0.0.1), skipping Redis test..." -ForegroundColor Yellow
    Write-Host "[INFO] Redis will be handled by external service or local installation" -ForegroundColor Blue
} else {
    Write-Host "[INFO] Testing Redis connection to $redisHost..." -ForegroundColor Blue
    
    # Test Redis connection with timeout
    try {
        $result = php artisan tinker --execute="try { `$redis = new Redis(); `$redis->connect(config('database.redis.default.host'), config('database.redis.default.port'), 5); if(config('database.redis.default.password')) { `$redis->auth(config('database.redis.default.password')); } `$redis->ping(); echo 'Redis OK'; } catch (Exception `$e) { echo 'Redis Error: ' . `$e->getMessage(); }" 2>$null
        if ($result -match "Redis OK") {
            Write-Host "[SUCCESS] Redis connection successful!" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Redis connection failed, but continuing..." -ForegroundColor Yellow
            Write-Host "[INFO] Application will work without Redis (some features may be limited)" -ForegroundColor Blue
        }
    } catch {
        Write-Host "[WARNING] Redis connection test failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "[INFO] Application will work without Redis (some features may be limited)" -ForegroundColor Blue
    }
}

# Show final configuration
Write-Host "[INFO] Final Redis Configuration:" -ForegroundColor Blue
$envContent = Get-Content ".env"
$redisHost = ($envContent | Where-Object { $_ -match "^REDIS_HOST=" }) -replace "^REDIS_HOST=", ""
$redisPort = ($envContent | Where-Object { $_ -match "^REDIS_PORT=" }) -replace "^REDIS_PORT=", ""
$redisPassword = ($envContent | Where-Object { $_ -match "^REDIS_PASSWORD=" }) -replace "^REDIS_PASSWORD=", ""
$redisUsername = ($envContent | Where-Object { $_ -match "^REDIS_USERNAME=" }) -replace "^REDIS_USERNAME=", ""

Write-Host "REDIS_HOST: $redisHost" -ForegroundColor Blue
Write-Host "REDIS_PORT: $redisPort" -ForegroundColor Blue
Write-Host "REDIS_PASSWORD: $redisPassword" -ForegroundColor Blue
Write-Host "REDIS_USERNAME: $redisUsername" -ForegroundColor Blue

Write-Host "[SUCCESS] Redis environment configuration completed!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Blue
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Blue
Write-Host "1. Restart your Docker container" -ForegroundColor Blue
Write-Host "2. Check container logs for Redis connection" -ForegroundColor Blue
Write-Host "3. If Redis is external, ensure it's accessible" -ForegroundColor Blue
Write-Host "4. Test application functionality" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue 
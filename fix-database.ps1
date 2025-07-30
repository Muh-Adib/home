# Database Fix Script untuk Windows
# Property Management System - Laravel 12 + React 18 + WebSocket

param(
    [string]$Command = "fix"
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

Write-ColorOutput "🔧 Database Fix Script" $Blue
Write-ColorOutput "=====================" $Blue

# Configuration
$ContainerName = "homsjogja-container"
$AppName = "homsjogja"

# Function untuk check container status
function Test-ContainerStatus {
    Write-Status "Checking container status..."
    
    try {
        $running = docker ps -q -f name=$ContainerName 2>$null
        if ($running) {
            Write-Success "Container is running"
            return $true
        } else {
            Write-Error "Container is not running"
            Write-ColorOutput "Please start the container first:" $Yellow
            Write-ColorOutput ".\deploy-dokploy-fixed.ps1 start" $Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to check container status"
        return $false
    }
}

# Function untuk test database connection
function Test-DatabaseConnection {
    Write-Status "Testing database connection..."
    
    try {
        $result = docker exec $ContainerName php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK';" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database connection is working"
            return $true
        } else {
            Write-Warning "Database connection failed"
            Write-ColorOutput "Connection test output:" $Yellow
            Write-ColorOutput $result $Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to test database connection"
        return $false
    }
}

# Function untuk run migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    
    try {
        # Run migrations
        Write-Status "Running migrations..."
        $migrateResult = docker exec $ContainerName php artisan migrate --force 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Migrations completed successfully"
            return $true
        } else {
            Write-Warning "Migrations may have failed"
            Write-ColorOutput "Migration output:" $Yellow
            Write-ColorOutput $migrateResult $Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to run migrations"
        return $false
    }
}

# Function untuk run seeders
function Invoke-Seeders {
    Write-Status "Running database seeders..."
    
    try {
        # Run seeders
        Write-Status "Running seeders..."
        $seedResult = docker exec $ContainerName php artisan db:seed --force 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Seeders completed successfully"
            return $true
        } else {
            Write-Warning "Seeders may have failed"
            Write-ColorOutput "Seeder output:" $Yellow
            Write-ColorOutput $seedResult $Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to run seeders"
        return $false
    }
}

# Function untuk run specific seeder
function Invoke-SpecificSeeder {
    param([string]$SeederName)
    
    Write-Status "Running specific seeder: $SeederName"
    
    try {
        $seedResult = docker exec $ContainerName php artisan db:seed --class=$SeederName --force 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Seeder $SeederName completed successfully"
            return $true
        } else {
            Write-Warning "Seeder $SeederName may have failed"
            Write-ColorOutput "Seeder output:" $Yellow
            Write-ColorOutput $seedResult $Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to run seeder $SeederName"
        return $false
    }
}

# Function untuk check table exists
function Test-TableExists {
    param([string]$TableName)
    
    Write-Status "Checking if table '$TableName' exists..."
    
    try {
        $result = docker exec $ContainerName php artisan tinker --execute="echo Schema::hasTable('$TableName') ? 'Table exists' : 'Table not found';" 2>&1
        
        if ($result -like "*Table exists*") {
            Write-Success "Table '$TableName' exists"
            return $true
        } else {
            Write-Warning "Table '$TableName' does not exist"
            return $false
        }
    }
    catch {
        Write-Error "Failed to check table '$TableName'"
        return $false
    }
}

# Function untuk show migration status
function Show-MigrationStatus {
    Write-Status "Showing migration status..."
    
    try {
        $result = docker exec $ContainerName php artisan migrate:status 2>&1
        Write-ColorOutput "Migration Status:" $Blue
        Write-ColorOutput $result $White
    }
    catch {
        Write-Error "Failed to show migration status"
    }
}

# Function untuk reset database
function Reset-Database {
    Write-Status "Resetting database..."
    
    try {
        # Drop all tables and re-run migrations
        Write-Status "Dropping all tables..."
        $dropResult = docker exec $ContainerName php artisan migrate:reset --force 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database reset completed"
            
            # Run migrations again
            Invoke-Migrations
            
            # Run seeders
            Invoke-Seeders
        } else {
            Write-Warning "Database reset may have failed"
            Write-ColorOutput "Reset output:" $Yellow
            Write-ColorOutput $dropResult $Yellow
        }
    }
    catch {
        Write-Error "Failed to reset database"
    }
}

# Function untuk fresh database
function Fresh-Database {
    Write-Status "Fresh database setup..."
    
    try {
        # Fresh install (drop all tables, run migrations, run seeders)
        Write-Status "Running fresh install..."
        $freshResult = docker exec $ContainerName php artisan migrate:fresh --seed --force 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Fresh database setup completed"
        } else {
            Write-Warning "Fresh database setup may have failed"
            Write-ColorOutput "Fresh output:" $Yellow
            Write-ColorOutput $freshResult $Yellow
        }
    }
    catch {
        Write-Error "Failed to run fresh database setup"
    }
}

# Function untuk test application
function Test-Application {
    Write-Status "Testing application..."
    
    try {
        # Test main application
        Write-Status "Testing main application..."
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10
        Write-Success "Application is accessible"
        
        # Test health endpoint
        Write-Status "Testing health endpoint..."
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 10
        Write-Success "Health endpoint is working"
        
    }
    catch {
        Write-Error "Application is not accessible"
        return $false
    }
}

# Function untuk show database info
function Show-DatabaseInfo {
    Write-Status "Showing database information..."
    
    try {
        # Show tables
        Write-Status "Database tables:"
        $tablesResult = docker exec $ContainerName php artisan tinker --execute="echo implode(', ', Schema::getTableNames());" 2>&1
        Write-ColorOutput "Tables: $tablesResult" $White
        
        # Show amenities count
        Write-Status "Amenities count:"
        $amenitiesResult = docker exec $ContainerName php artisan tinker --execute="echo App\Models\Amenity::count();" 2>&1
        Write-ColorOutput "Amenities: $amenitiesResult" $White
        
    }
    catch {
        Write-Error "Failed to show database info"
    }
}

# Main execution
switch ($Command.ToLower()) {
    "fix" {
        if (Test-ContainerStatus) {
            if (Test-DatabaseConnection) {
                Invoke-Migrations
                Invoke-Seeders
                Test-Application
                Show-DatabaseInfo
            }
        }
    }
    "migrate" {
        if (Test-ContainerStatus) {
            Invoke-Migrations
        }
    }
    "seed" {
        if (Test-ContainerStatus) {
            Invoke-Seeders
        }
    }
    "amenities" {
        if (Test-ContainerStatus) {
            Invoke-SpecificSeeder "AmenitySeeder"
        }
    }
    "status" {
        if (Test-ContainerStatus) {
            Show-MigrationStatus
            Show-DatabaseInfo
        }
    }
    "reset" {
        if (Test-ContainerStatus) {
            Reset-Database
        }
    }
    "fresh" {
        if (Test-ContainerStatus) {
            Fresh-Database
        }
    }
    "test" {
        if (Test-ContainerStatus) {
            Test-Application
        }
    }
    "check" {
        if (Test-ContainerStatus) {
            Test-DatabaseConnection
            Test-TableExists "amenities"
            Test-TableExists "users"
            Test-TableExists "properties"
        }
    }
    default {
        Write-ColorOutput "Usage: .\fix-database.ps1 {fix|migrate|seed|amenities|status|reset|fresh|test|check}" $White
        Write-ColorOutput ""
        Write-ColorOutput "Commands:" $White
        Write-ColorOutput "  fix       - Fix database (migrate + seed)" $White
        Write-ColorOutput "  migrate   - Run migrations only" $White
        Write-ColorOutput "  seed      - Run seeders only" $White
        Write-ColorOutput "  amenities - Run amenities seeder only" $White
        Write-ColorOutput "  status    - Show migration status" $White
        Write-ColorOutput "  reset     - Reset database (drop + migrate + seed)" $White
        Write-ColorOutput "  fresh     - Fresh database (drop + migrate + seed)" $White
        Write-ColorOutput "  test      - Test application" $White
        Write-ColorOutput "  check     - Check database status" $White
        exit 1
    }
} 
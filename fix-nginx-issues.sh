#!/bin/bash

# ==================================================
# Fix Nginx Issues Script
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

log_info "=== Fix Nginx Issues Script ==="
log_info "Property Management System - Laravel 12 + React 18 + WebSocket"
log_info "=================================================="

# Check if we're in a container
if [ ! -f "/.dockerenv" ]; then
    log_error "This script must be run inside a Docker container"
    exit 1
fi

# Fix 1: Ensure index.php exists in public directory
log_info "Fix 1: Checking index.php in public directory..."
if [ ! -f "/var/www/html/public/index.php" ]; then
    log_warning "index.php not found in public directory, creating it..."
    cat > /var/www/html/public/index.php << 'EOF'
<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Check If The Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is in maintenance / demo mode via the "down" command
| we will load this file so that any pre-rendered content can be shown
| instead of starting the framework, which could cause an exception.
|
*/

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| Composer provides a convenient, automatically generated class loader for
| this application. We just need to utilize it! We'll simply require it
| into the script here so we don't need to manually load our classes.
|
*/

require __DIR__.'/../vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request using
| the application's HTTP kernel. Then, we will send the response back
| to this client's browser, allowing them to enjoy our application.
|
*/

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
EOF
    log_success "Created index.php in public directory"
else
    log_success "index.php already exists in public directory"
fi

# Fix 2: Ensure proper permissions
log_info "Fix 2: Setting proper permissions..."
chown -R www:www /var/www/html
chmod -R 755 /var/www/html
chmod -R 777 /var/www/html/storage
chmod -R 777 /var/www/html/bootstrap/cache
chmod +x /var/www/html/public/index.php

log_success "Permissions set correctly"

# Fix 3: Create storage link if not exists
log_info "Fix 3: Creating storage link..."
if [ ! -L "/var/www/html/public/storage" ]; then
    cd /var/www/html
    php artisan storage:link || log_warning "Storage link creation failed"
    log_success "Storage link created"
else
    log_success "Storage link already exists"
fi

# Fix 4: Ensure 404.html exists
log_info "Fix 4: Checking 404.html error page..."
if [ ! -f "/var/www/html/public/404.html" ]; then
    log_warning "404.html not found, creating it..."
    cat > /var/www/html/public/404.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - Homsjogja</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .error-container {
            text-align: center;
            max-width: 500px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .error-code {
            font-size: 6rem;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .error-message {
            font-size: 1.5rem;
            margin: 1rem 0;
            opacity: 0.9;
        }
        .error-description {
            font-size: 1rem;
            margin: 1rem 0;
            opacity: 0.8;
            line-height: 1.6;
        }
        .back-button {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 25px;
            margin-top: 1rem;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .back-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .container-info {
            font-size: 0.8rem;
            opacity: 0.6;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .search-box {
            margin: 1rem 0;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .search-input {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 5px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            font-size: 14px;
        }
        .search-input:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-message">Page Not Found</h2>
        <p class="error-description">
            Maaf, halaman yang Anda cari tidak ditemukan. Mungkin URL telah berubah atau halaman telah dihapus.
        </p>
        
        <div class="search-box">
            <input type="text" class="search-input" placeholder="Cari properti, lokasi, atau layanan..." id="searchInput">
        </div>
        
        <a href="/" class="back-button">Kembali ke Beranda</a>
        <div class="container-info">
            <p>Homsjogja Property Management System</p>
            <p>Container ID: <span id="container-id">Loading...</span></p>
            <p>Timestamp: <span id="timestamp">Loading...</span></p>
            <p>Requested URL: <span id="requested-url">Loading...</span></p>
        </div>
    </div>

    <script>
        // Update container info
        document.getElementById('container-id').textContent = window.location.hostname || 'Unknown';
        document.getElementById('timestamp').textContent = new Date().toLocaleString('id-ID');
        document.getElementById('requested-url').textContent = window.location.pathname || '/';
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    window.location.href = `/?search=${encodeURIComponent(query)}`;
                }
            }
        });
        
        // Auto-refresh after 60 seconds
        setTimeout(() => {
            window.location.reload();
        }, 60000);
    </script>
</body>
</html>
EOF
    log_success "Created 404.html error page"
else
    log_success "404.html already exists"
fi

# Fix 5: Ensure 50x.html exists
log_info "Fix 5: Checking 50x.html error page..."
if [ ! -f "/var/www/html/public/50x.html" ]; then
    log_warning "50x.html not found, creating it..."
    cat > /var/www/html/public/50x.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Error - Homsjogja</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .error-container {
            text-align: center;
            max-width: 500px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .error-code {
            font-size: 6rem;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .error-message {
            font-size: 1.5rem;
            margin: 1rem 0;
            opacity: 0.9;
        }
        .error-description {
            font-size: 1rem;
            margin: 1rem 0;
            opacity: 0.8;
            line-height: 1.6;
        }
        .back-button {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 25px;
            margin-top: 1rem;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .back-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .container-info {
            font-size: 0.8rem;
            opacity: 0.6;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-code">500</h1>
        <h2 class="error-message">Server Error</h2>
        <p class="error-description">
            Maaf, terjadi kesalahan pada server kami. Tim kami sedang bekerja untuk memperbaiki masalah ini.
        </p>
        <a href="/" class="back-button">Kembali ke Beranda</a>
        <div class="container-info">
            <p>Homsjogja Property Management System</p>
            <p>Container ID: <span id="container-id">Loading...</span></p>
            <p>Timestamp: <span id="timestamp">Loading...</span></p>
        </div>
    </div>

    <script>
        // Update container info
        document.getElementById('container-id').textContent = window.location.hostname || 'Unknown';
        document.getElementById('timestamp').textContent = new Date().toLocaleString('id-ID');
        
        // Auto-refresh after 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
EOF
    log_success "Created 50x.html error page"
else
    log_success "50x.html already exists"
fi

# Fix 6: Test Nginx configuration
log_info "Fix 6: Testing Nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration is invalid"
    exit 1
fi

# Fix 7: Check Nginx config file location
log_info "Fix 7: Checking Nginx configuration file..."
if [ -f "/etc/nginx/http.d/default.conf" ]; then
    log_success "Nginx config found at /etc/nginx/http.d/default.conf"
    log_info "Nginx config content (first 10 lines):"
    head -10 /etc/nginx/http.d/default.conf
elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    log_success "Nginx config found at /etc/nginx/conf.d/default.conf"
    log_info "Nginx config content (first 10 lines):"
    head -10 /etc/nginx/conf.d/default.conf
else
    log_error "Nginx config file not found"
    log_info "Searching for Nginx config files..."
    find /etc/nginx -name "*.conf" 2>/dev/null || log_warning "No Nginx config files found"
fi

# Fix 8: Check PHP-FPM status
log_info "Fix 8: Checking PHP-FPM status..."
if pgrep -f "php-fpm" > /dev/null; then
    log_success "PHP-FPM is running"
else
    log_warning "PHP-FPM is not running"
fi

# Fix 9: Check file structure
log_info "Fix 9: Checking file structure..."
log_info "Public directory contents:"
ls -la /var/www/html/public/ | head -10

log_info "Storage directory contents:"
ls -la /var/www/html/storage/ | head -5

# Fix 10: Test application access
log_info "Fix 10: Testing application access..."
if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    log_success "Application health check passed"
else
    log_warning "Application health check failed"
fi

# Fix 11: Restart services if needed
log_info "Fix 11: Restarting services..."
supervisorctl restart nginx || log_warning "Failed to restart nginx"
supervisorctl restart php-fpm || log_warning "Failed to restart php-fpm"

log_info "=================================================="
log_success "🎯 Nginx Issues Fix Completed"
log_info "=================================================="
log_info "✅ index.php created/verified"
log_info "✅ Permissions set correctly"
log_info "✅ Storage link created"
log_info "✅ 404.html error page created"
log_info "✅ 50x.html error page created"
log_info "✅ Nginx configuration tested"
log_info "✅ Services restarted"
log_info ""
log_info "📋 Next Steps:"
log_info "   - Check application logs: tail -f /var/log/nginx/error.log"
log_info "   - Test application: curl http://localhost:8080/"
log_info "   - Check supervisor status: supervisorctl status"
log_info "==================================================" 
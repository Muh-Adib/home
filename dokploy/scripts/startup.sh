#!/bin/bash

# 🚀 STARTUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🚀 Starting Property Management System..."

# Rely on Dokploy-provided environment variables (do not create or load .env)
echo "🌍 Using Dokploy environment variables (no .env creation)"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
mkdir -p /var/log/supervisor /etc/supervisor/conf.d /etc/nginx
mkdir -p /var/log/nginx /run

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Configuration files are already copied in build phase
echo "📋 Configuration files already copied in build phase"

# Generate Laravel Echo Server config with environment variables
echo "🔧 Generating Laravel Echo Server config..."
bash dokploy/scripts/generate-echo-config-simple.sh

# Verify config file exists
if [ ! -f "/app/laravel-echo-server.json" ]; then
    echo "❌ Laravel Echo Server config file not found!"
    echo "Creating fallback config..."
    cat > /app/laravel-echo-server.json << 'EOF'
{
    "authHost": "http://localhost",
    "authEndpoint": "/broadcasting/auth",
    "clients": [{"appId": "homsjogja", "key": "homsjogja-key"}],
    "database": "redis",
    "databaseConfig": {"redis": {"host": "127.0.0.1", "port": 6379, "password": null, "db": 0}},
    "devMode": false,
    "host": "0.0.0.0",
    "port": 6001,
    "protocol": "http",
    "socketio": {},
    "subscribers": {"http": true, "redis": true},
    "apiOriginAllow": {"allowCors": true, "allowOrigin": "*", "allowMethods": "GET, POST", "allowHeaders": "Origin, Content-Type, Accept, Authorization, X-Request-With"}
}
EOF
    echo "✅ Fallback config created"
else
    echo "✅ Laravel Echo Server config file exists"
fi

# Copy custom nginx.conf ke lokasi default Nixpacks Nginx
NIX_NGINX_CONF=$(find /nix/store -type f -name "nginx.conf" -path "*/nginx-*/conf/nginx.conf" 2>/dev/null | head -n 1)
NIX_MIME_TYPES=$(find /nix/store -name mime.types | head -n 1)

if [ -f "$NIX_NGINX_CONF" ]; then
    # Replace mime.types path in nginx.conf
    sed -i "s|include /etc/nginx/mime.types;|include $NIX_MIME_TYPES;|g" /app/dokploy/config/nginx.conf
    
    # Copy modified nginx.conf
    cp /app/dokploy/config/nginx.conf "$NIX_NGINX_CONF"
    echo "✅ Custom nginx.conf copied to $NIX_NGINX_CONF with updated mime.types path"
else
    echo "⚠️ Default Nginx config not found in /nix/store"
fi

# Pastikan mime.types juga sesuai
if [ -n "$NIX_MIME_TYPES" ]; then
    # Buat temporary file untuk validasi
    TMP_MIME="/tmp/mime.types.tmp"
    cp "$NIX_MIME_TYPES" "$TMP_MIME"
    
    # Pastikan file diakhiri dengan } yang proper
    if ! grep -q '^}$' "$TMP_MIME"; then
        echo "}" >> "$TMP_MIME"
    fi
    
    # Validasi syntax nginx
    if nginx -t -c "$TMP_MIME" > /dev/null 2>&1; then
        cp "$TMP_MIME" /etc/nginx/mime.types
        echo "✅ Valid mime.types copied"
    else
        echo "⚠️ Invalid mime.types detected, using nginx default"
        cp /etc/nginx/mime.types.default /etc/nginx/mime.types 2>/dev/null || {
            # Jika default tidak ada, gunakan dari nginx package
            NGINX_PKG_MIME=$(find /nix/store -path '*/nginx/conf/mime.types' | head -n 1)
            if [ -n "$NGINX_PKG_MIME" ]; then
                cp "$NGINX_PKG_MIME" /etc/nginx/mime.types
                echo "✅ Using nginx package mime.types"
            fi
        }
    fi
    
    # Cleanup
    rm -f "$TMP_MIME"
else
    echo "⚠️ mime.types not found in /nix/store"
fi

# Run Laravel commands with environment variables (RUNTIME)
echo "🔧 Running Laravel setup commands with Dokploy environment variables..."

# Ensure Laravel is properly installed
if [ ! -f "artisan" ]; then
    echo "❌ Laravel not found - redeploy needed"
    exit 1
fi

# Clear Laravel caches first
php artisan config:clear || echo "Config clear failed"
php artisan route:clear || echo "Route clear failed"
php artisan view:clear || echo "View clear failed"

# Ensure public/index.php exists
if [ ! -f "public/index.php" ]; then
    echo "❌ Laravel index.php not found - redeploy needed"
    exit 1
fi

# Run migrations if needed
echo "🔧 Running migrations..."
php artisan migrate --force || echo "Migration skipped"

# Create storage link
echo "🔧 Creating storage link..."
php artisan storage:link || echo "Storage link skipped"

# Cache configurations (now with proper environment variables)
echo "🔧 Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Test Laravel application
echo "🔧 Testing Laravel application..."
if php artisan --version > /dev/null 2>&1; then
    echo "✅ Laravel application is working"
else
    echo "❌ Laravel application not working"
fi

# Test external connections with environment variables
echo "🔍 Testing external connections..."
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "⚠️ Database connection failed"
fi

if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "⚠️ Redis connection failed"
fi

echo "🎉 Startup completed successfully!"
echo "Starting Supervisor..."

# Start Supervisor with environment variables
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf

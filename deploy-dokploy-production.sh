#!/bin/bash

# Deployment script untuk Dokploy Production
# Laravel Property Management System dengan WebSocket Support

set -e

echo "🚀 Starting Dokploy Production Deployment"

# Check if we're in the right directory
if [ ! -f "composer.json" ]; then
    echo "❌ Error: composer.json not found. Please run this script from the Laravel root directory."
    exit 1
fi

# Copy production environment file
echo "📝 Setting up production environment..."
if [ -f ".env.dokploy" ]; then
    cp .env.dokploy .env
    echo "✅ Production .env configured"
else
    echo "⚠️  Warning: .env.dokploy not found, using existing .env"
fi

# Ensure proper directory structure
echo "📁 Creating required directories..."
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions  
mkdir -p storage/framework/views
mkdir -p storage/app/public
mkdir -p bootstrap/cache
mkdir -p database/echo-server

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache
chmod -R 755 database
chmod +x artisan

# Generate application key if not set
echo "🔑 Checking application key..."
if ! grep -q "APP_KEY=base64:" .env; then
    php artisan key:generate --force
    echo "✅ Application key generated"
fi

# Install dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Install Node dependencies and build assets
echo "🎨 Building frontend assets..."
npm ci --production=false
npm run build

# Clear all caches
echo "🧹 Clearing application caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Optimize for production
echo "⚡ Optimizing application for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Create storage link
echo "🔗 Creating storage link..."
php artisan storage:link

# Test configuration
echo "🔍 Testing configuration..."
php artisan config:show database.default || echo "⚠️ Database config test failed"
php artisan config:show cache.default || echo "⚠️ Cache config test failed"

# Create Laravel Echo Server config for production
echo "🌐 Setting up Laravel Echo Server..."
cat > laravel-echo-server.production.json << EOF
{
    "authHost": "http://localhost",
    "authEndpoint": "/broadcasting/auth",
    "clients": [{
        "appId": "homeapp",
        "key": "homeapp_key"
    }],
    "database": "sqlite",
    "databaseConfig": {
        "sqlite": {
            "databasePath": "/var/www/html/database/echo-server/laravel-echo-server.sqlite"
        }
    },
    "devMode": false,
    "host": null,
    "port": "6001",
    "protocol": "http",
    "socketio": {
        "transports": ["websocket", "polling"],
        "allowEIO3": true,
        "cors": {
            "origin": "*",
            "methods": ["GET", "POST"],
            "credentials": true
        },
        "pingTimeout": 60000,
        "pingInterval": 25000
    },
    "sslCertPath": "",
    "sslKeyPath": "",
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "*",
        "allowMethods": "GET,POST,PUT,DELETE,OPTIONS",
        "allowHeaders": "Origin,Content-Type,X-Auth-Token,X-Requested-With,Accept,Authorization,X-CSRF-TOKEN,X-Socket-Id,Cookie"
    }
}
EOF

# Verify critical files exist
echo "✅ Verifying deployment files..."
[ -f "Dockerfile.dokploy" ] && echo "✅ Dockerfile.dokploy found" || echo "❌ Dockerfile.dokploy missing"
[ -f "docker/supervisor/dokploy.conf" ] && echo "✅ Supervisor config found" || echo "❌ Supervisor config missing"
[ -f "docker/nginx/dokploy.conf" ] && echo "✅ Nginx config found" || echo "❌ Nginx config missing"
[ -f "docker/scripts/startup.sh" ] && echo "✅ Startup script found" || echo "❌ Startup script missing"
[ -f "laravel-echo-server.production.json" ] && echo "✅ Echo Server config found" || echo "❌ Echo Server config missing"

# Final summary
echo ""
echo "🎉 Dokploy Production Deployment Ready!"
echo ""
echo "📋 Summary:"
echo "   - Environment: Production"
echo "   - Database: MySQL (External)"
echo "   - Cache/Queue: Redis (External)"
echo "   - WebSocket: Laravel Echo Server"
echo "   - Assets: Built and optimized"
echo "   - Cache: Optimized for production"
echo ""
echo "🚀 Ready for Dokploy deployment!"
echo ""
echo "📝 Next steps:"
echo "   1. Commit these changes to your Git repository"
echo "   2. Push to the branch monitored by Dokploy"
echo "   3. Dokploy will automatically build using Dockerfile.dokploy"
echo "   4. Verify deployment at your domain"
echo "   5. Test WebSocket functionality at your-domain:6001/socket.io/"
echo ""
echo "🔧 Environment Variables for Dokploy:"
echo "   - Set APP_URL to your actual domain"
echo "   - Verify DB_* variables match your MySQL service"
echo "   - Verify REDIS_* variables match your Redis service"
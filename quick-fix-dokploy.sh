#!/bin/bash

# Quick Fix Script for Common Dokploy Issues
echo "🔧 Running Quick Fixes for Dokploy..."

# Fix 1: Recreate MySQL volume
echo "🗄️ Recreating MySQL volume..."
docker-compose -f docker-compose.dokploy.yml down
docker volume rm $(docker volume ls -q | grep mysql) 2>/dev/null || true

# Fix 2: Clear all caches
echo "🧹 Clearing application caches..."
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan config:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan cache:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan route:clear
docker-compose -f docker-compose.dokploy.yml run --rm app php artisan view:clear

# Fix 3: Restart services
echo "🔄 Restarting services..."
docker-compose -f docker-compose.dokploy.yml up -d --force-recreate

# Fix 4: Check permissions
echo "🔐 Checking permissions..."
docker-compose -f docker-compose.dokploy.yml exec -T app chown -R www-data:www-data /var/www/html/storage
docker-compose -f docker-compose.dokploy.yml exec -T app chmod -R 755 /var/www/html/storage

echo "✅ Quick fixes completed!"

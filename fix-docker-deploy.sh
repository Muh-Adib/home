#!/bin/bash

# ===========================================
# DOCKER DEPLOYMENT FIX SCRIPT
# ===========================================

echo "🔧 Fixing Docker deployment issues..."

# 1. Fix .dockerignore - remove composer.lock and package-lock.json from ignore
echo "📝 Updating .dockerignore..."
sed -i 's/^composer\.lock/# composer.lock/' .dockerignore
sed -i 's/^package-lock\.json/# package-lock.json/' .dockerignore

# 2. Remove version from docker-compose.yml
echo "📝 Updating docker-compose.yml..."
sed -i 's/^version: .*/# Docker Compose version/' docker-compose.yml

# 3. Ensure composer.lock exists
if [ ! -f "composer.lock" ]; then
    echo "📦 Installing composer dependencies..."
    composer install --no-dev --optimize-autoloader
fi

# 4. Ensure package-lock.json exists
if [ ! -f "package-lock.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm ci --only=production
fi

# 5. Create volume directories
echo "📁 Creating volume directories..."
mkdir -p docker/volumes/mysql
mkdir -p docker/volumes/redis
mkdir -p docker/volumes/nginx/logs
mkdir -p docker/volumes/prometheus
mkdir -p docker/volumes/grafana

# 6. Set permissions
chmod -R 755 docker/volumes/

# 7. Create .env if not exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp ENV_EXAMPLE.md .env
fi

echo "✅ Docker deployment fixes completed!"
echo "🚀 You can now run: docker-compose up -d --build" 
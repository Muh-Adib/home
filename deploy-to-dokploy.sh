#!/bin/bash

# Dokploy Deployment Script
echo "🚀 Deploying to Dokploy..."

# Set environment variables
export COMPOSE_PROJECT_NAME=pms
export MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-secret}

# Use the Dokploy-optimized compose file
docker-compose -f docker-compose.dokploy.yml down --volumes --remove-orphans
docker-compose -f docker-compose.dokploy.yml build --no-cache
docker-compose -f docker-compose.dokploy.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to initialize..."
sleep 30

# Run Laravel setup commands
echo "🔧 Setting up Laravel application..."
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan key:generate --force
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan config:cache
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan route:cache
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan view:cache

# Run migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan migrate --force

# Check deployment status
echo "✅ Checking deployment status..."
docker-compose -f docker-compose.dokploy.yml ps

echo "🎉 Deployment completed!"
echo "🔗 Application should be available at your Dokploy URL"

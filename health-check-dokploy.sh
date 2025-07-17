#!/bin/bash

# Health Check Script for Dokploy Deployment
echo "🏥 Running Health Checks..."

# Check container status
echo "📦 Container Status:"
docker-compose -f docker-compose.dokploy.yml ps

# Check database connection
echo "🗄️ Database Connection:"
docker-compose -f docker-compose.dokploy.yml exec -T db mysqladmin ping -h localhost -u root -p${DB_PASSWORD:-secret} || echo "❌ Database connection failed"

# Check Redis connection
echo "🔴 Redis Connection:"
docker-compose -f docker-compose.dokploy.yml exec -T redis redis-cli ping || echo "❌ Redis connection failed"

# Check Laravel application
echo "🚀 Laravel Application:"
docker-compose -f docker-compose.dokploy.yml exec -T app php artisan --version || echo "❌ Laravel application failed"

# Check logs for errors
echo "📋 Recent Logs (last 10 lines):"
docker-compose -f docker-compose.dokploy.yml logs --tail=10 db

echo "✅ Health check completed!"

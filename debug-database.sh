#!/bin/bash

echo "🔍 Debugging Database Container..."

# Cek status container
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "📋 Database Logs:"
docker-compose logs db

echo ""
echo "🔧 Database Health Check:"
docker-compose exec db mysqladmin ping -h localhost -u root -p${DB_PASSWORD:-secret} || echo "Health check failed"

echo ""
echo "💾 Volume Information:"
docker volume ls | grep mysql

echo ""
echo "🔍 Database Process:"
docker-compose exec db ps aux | grep mysql || echo "Cannot access container"

echo ""
echo "📁 Database Directory:"
docker-compose exec db ls -la /var/lib/mysql || echo "Cannot access container"

echo ""
echo "✅ Debug selesai!" 
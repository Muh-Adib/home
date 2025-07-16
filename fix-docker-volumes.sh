#!/bin/bash

# Fix Docker Volume Directories
# This script creates all the missing volume directories for Docker deployment

echo "🔧 Creating Docker volume directories..."

# Create base volumes directory
mkdir -p docker/volumes

# Create MySQL data directory
echo "📁 Creating MySQL data directory..."
mkdir -p docker/volumes/mysql
chmod 755 docker/volumes/mysql

# Create Redis data directory
echo "📁 Creating Redis data directory..."
mkdir -p docker/volumes/redis
chmod 755 docker/volumes/redis

# Create Nginx logs directory
echo "📁 Creating Nginx logs directory..."
mkdir -p docker/volumes/nginx/logs
chmod 755 docker/volumes/nginx/logs

# Create Prometheus data directory
echo "📁 Creating Prometheus data directory..."
mkdir -p docker/volumes/prometheus
chmod 755 docker/volumes/prometheus

# Create Grafana data directory
echo "📁 Creating Grafana data directory..."
mkdir -p docker/volumes/grafana
chmod 755 docker/volumes/grafana

# Create PostgreSQL data directory (for future use)
echo "📁 Creating PostgreSQL data directory..."
mkdir -p docker/volumes/postgres
chmod 755 docker/volumes/postgres

# Set proper ownership (adjust user/group as needed)
echo "🔐 Setting proper ownership..."
sudo chown -R 1000:1000 docker/volumes/ 2>/dev/null || echo "⚠️  Could not set ownership, you may need to run with sudo"

echo "✅ Docker volume directories created successfully!"
echo ""
echo "📋 Created directories:"
echo "  - docker/volumes/mysql"
echo "  - docker/volumes/redis"
echo "  - docker/volumes/nginx/logs"
echo "  - docker/volumes/prometheus"
echo "  - docker/volumes/grafana"
echo "  - docker/volumes/postgres"
echo ""
echo "🚀 You can now run your Docker deployment!"
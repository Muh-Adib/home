#!/bin/bash

# Fix Docker Supervisor Issues Script
# This script rebuilds the Docker containers with the supervisor fixes

echo "🔧 Fixing Docker Supervisor Issues..."
echo "======================================"

# Stop all running containers
echo "📦 Stopping existing containers..."
docker-compose down

# Remove old images to force rebuild
echo "🗑️  Removing old images..."
docker-compose down --rmi all --volumes --remove-orphans

# Clean up any dangling images
echo "🧹 Cleaning up dangling images..."
docker system prune -f

# Rebuild the containers
echo "🔨 Rebuilding containers with supervisor fixes..."
docker-compose build --no-cache

# Start the containers
echo "🚀 Starting containers..."
docker-compose up -d

# Wait a moment for containers to start
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check supervisor logs
echo "📋 Checking supervisor logs..."
docker-compose logs app | grep -i supervisor || echo "No supervisor logs found"

echo "✅ Docker supervisor fixes applied!"
echo "🌐 Application should be available at: http://localhost:8000"
echo "🔍 Health check: http://localhost:8000/health"
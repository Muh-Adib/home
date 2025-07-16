#!/bin/bash

# Property Management System - Docker Rebuild Script
# This script rebuilds the Docker image with the latest fixes

echo "🔧 Property Management System - Docker Rebuild"
echo "=============================================="

# Stop and remove existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Remove existing images to force rebuild
echo "🗑️  Removing existing images..."
docker-compose down --rmi all --volumes --remove-orphans

# Clean up any dangling images
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Rebuild the images
echo "🔨 Rebuilding Docker images..."
docker-compose build --no-cache

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker build completed successfully!"
    echo ""
    echo "🚀 To start the application, run:"
    echo "   docker-compose up -d"
    echo ""
    echo "📊 To view logs, run:"
    echo "   docker-compose logs -f app"
else
    echo "❌ Docker build failed!"
    echo "Please check the error messages above."
    exit 1
fi
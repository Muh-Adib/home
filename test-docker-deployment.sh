#!/bin/bash

# Test Docker Deployment
# This script tests the Docker deployment after fixing volume issues

echo "🧪 Testing Docker Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

echo "✅ docker-compose is available"

# Check if volume directories exist
required_dirs=(
    "docker/volumes/mysql"
    "docker/volumes/redis"
    "docker/volumes/nginx/logs"
    "docker/volumes/prometheus"
    "docker/volumes/grafana"
    "docker/volumes/postgres"
)

echo "📁 Checking volume directories..."
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir is missing"
        exit 1
    fi
done

# Check if required files exist
required_files=(
    "docker-compose.yml"
    "docker-compose.production.yml"
    "Dockerfile"
    ".env"
)

echo "📄 Checking required files..."
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "⚠️  $file is missing (may be optional)"
    fi
done

# Test Docker Compose syntax
echo "🔍 Testing Docker Compose syntax..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml syntax is valid"
else
    echo "❌ docker-compose.yml has syntax errors"
    docker-compose config
    exit 1
fi

# Test Production Docker Compose syntax
echo "🔍 Testing Production Docker Compose syntax..."
if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo "✅ docker-compose.production.yml syntax is valid"
else
    echo "❌ docker-compose.production.yml has syntax errors"
    docker-compose -f docker-compose.production.yml config
    exit 1
fi

echo ""
echo "🎉 All checks passed! Your Docker deployment should work now."
echo ""
echo "🚀 To deploy:"
echo "   Development: docker-compose up -d --build"
echo "   Production:  docker-compose -f docker-compose.production.yml up -d --build"
echo ""
echo "📋 To check status:"
echo "   docker-compose ps"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs [service_name]"
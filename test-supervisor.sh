#!/bin/bash

# Test Supervisor Setup Script
# This script tests if supervisor is working correctly

echo "🧪 Testing Supervisor Setup..."
echo "================================"

# Check if containers are running
echo "📊 Checking container status..."
docker-compose ps

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://localhost:8000/health || echo "❌ Health endpoint failed"

# Check supervisor processes
echo "🔍 Checking supervisor processes..."
docker-compose exec app supervisorctl status || echo "❌ Supervisor not running"

# Check supervisor logs
echo "📋 Checking supervisor logs..."
docker-compose logs app | grep -i supervisor || echo "No supervisor logs found"

# Check if all required processes are running
echo "✅ Supervisor test complete!"
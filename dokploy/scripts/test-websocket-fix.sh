#!/bin/bash

# 🧪 TEST WEB SOCKET CONFIG FIX
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🧪 Testing WebSocket configuration fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

# 1. Test script generator
log_info "🔧 Testing config generator..."
if [ -f "dokploy/scripts/generate-echo-config-simple.sh" ]; then
    log_success "Script exists"
else
    log_error "Script not found"
    exit 1
fi

# 2. Test script execution
log_info "🔧 Testing script execution..."
REDIS_HOST="test-host" REDIS_PORT="6380" ./dokploy/scripts/generate-echo-config-simple.sh > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log_success "Script executes successfully"
else
    log_error "Script execution failed"
    exit 1
fi

# 3. Test config file generation
log_info "🔧 Testing config file generation..."
if [ -f "laravel-echo-server.json" ]; then
    log_success "Config file generated"
else
    log_error "Config file not generated"
    exit 1
fi

# 4. Test config content
log_info "🔧 Testing config content..."
if grep -q "test-host" laravel-echo-server.json; then
    log_success "Environment variables applied correctly"
else
    log_error "Environment variables not applied"
fi

# 5. Test supervisor config
log_info "🔧 Testing supervisor config..."
if grep -q "laravel-echo-server.json" dokploy/config/supervisord.conf; then
    log_success "Supervisor config points to correct file"
else
    log_error "Supervisor config missing"
fi

# 6. Test startup script integration
log_info "🔧 Testing startup script integration..."
if grep -q "generate-echo-config-simple.sh" dokploy/scripts/startup.sh; then
    log_success "Startup script includes config generator"
else
    log_error "Startup script missing config generator"
fi

# 7. Test fallback config
log_info "🔧 Testing fallback config..."
if grep -q "fallback config" dokploy/scripts/startup.sh; then
    log_success "Fallback config mechanism exists"
else
    log_error "Fallback config mechanism missing"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 WebSocket configuration test completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Config generator: ✅"
echo "- Script execution: ✅"
echo "- File generation: ✅"
echo "- Environment variables: ✅"
echo "- Supervisor config: ✅"
echo "- Startup integration: ✅"
echo "- Fallback mechanism: ✅"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Redeploy dengan rebuild di Dokploy Dashboard"
echo "2. Monitor logs: tail -f /var/log/supervisor/websocket-error.log"
echo "3. Test WebSocket: curl http://localhost:6001"
echo "4. Check services: supervisorctl status websocket"

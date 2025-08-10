#!/bin/bash

echo "🔍 Debugging WebSocket Issues..."
echo "=================================="

# Check if script is running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

echo "1. Checking Laravel Echo Server installation..."
if command -v laravel-echo-server &> /dev/null; then
    echo "✅ Laravel Echo Server is installed"
    laravel-echo-server --version
else
    echo "❌ Laravel Echo Server is not installed"
fi

echo ""
echo "2. Checking Echo Server configuration..."
if [ -f "/app/laravel-echo-server.json" ]; then
    echo "✅ Configuration file exists"
    echo "Configuration content:"
    cat /app/laravel-echo-server.json | jq '.' 2>/dev/null || cat /app/laravel-echo-server.json
else
    echo "❌ Configuration file not found"
fi

echo ""
echo "3. Checking Node.js and npm..."
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed: $(node --version)"
else
    echo "❌ Node.js is not installed"
fi

if command -v npm &> /dev/null; then
    echo "✅ npm is installed: $(npm --version)"
else
    echo "❌ npm is not installed"
fi

echo ""
echo "4. Checking port 6001 availability..."
if netstat -tuln | grep ":6001" > /dev/null; then
    echo "❌ Port 6001 is already in use"
    netstat -tuln | grep ":6001"
else
    echo "✅ Port 6001 is available"
fi

echo ""
echo "5. Testing Echo Server manually..."
cd /app
if [ -f "laravel-echo-server.json" ]; then
    echo "Attempting to start Echo Server manually..."
    timeout 10s laravel-echo-server start --config=laravel-echo-server.json || echo "❌ Echo Server failed to start"
else
    echo "❌ No configuration file found for manual test"
fi

echo ""
echo "6. Checking environment variables..."
echo "SOCKETIO_PORT: ${SOCKETIO_PORT:-not set}"
echo "SOCKETIO_HOST: ${SOCKETIO_HOST:-not set}"
echo "SOCKETIO_SSL: ${SOCKETIO_SSL:-not set}"

echo ""
echo "7. Checking file permissions..."
ls -la /app/laravel-echo-server.json 2>/dev/null || echo "Configuration file not found"
ls -la /usr/local/bin/laravel-echo-server 2>/dev/null || echo "Echo Server binary not found"

echo ""
echo "8. Checking supervisor configuration..."
if [ -f "/etc/supervisor/conf.d/websocket.conf" ]; then
    echo "✅ Supervisor config exists"
    cat /etc/supervisor/conf.d/websocket.conf
else
    echo "❌ Supervisor config not found"
fi

echo ""
echo "9. Checking supervisor status..."
supervisorctl status websocket 2>/dev/null || echo "WebSocket service not found in supervisor"

echo ""
echo "🔧 Recommendations:"
echo "1. If Echo Server is not installed: npm install -g laravel-echo-server@latest"
echo "2. If configuration is missing: run generate-echo-config-simple.sh"
echo "3. If port is in use: check what's using port 6001"
echo "4. If permissions issue: chmod +x /usr/local/bin/laravel-echo-server"
echo "5. If supervisor issue: restart supervisor with 'supervisorctl reread && supervisorctl update'"

echo ""
echo "✅ Debug completed!"

#!/bin/bash

echo "🔧 Fixing WebSocket Issues..."
echo "=============================="

# Check if script is running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

echo "1. Stopping all services..."
supervisorctl stop all 2>/dev/null || true

echo "2. Checking and fixing Laravel Echo Server installation..."
if ! command -v laravel-echo-server &> /dev/null; then
    echo "Installing Laravel Echo Server..."
    npm install -g laravel-echo-server@latest
else
    echo "Upgrading Laravel Echo Server..."
    npm install -g laravel-echo-server@latest
fi

echo "3. Generating Echo Server configuration..."
cd /app
/usr/local/bin/generate-echo-config-simple.sh

echo "4. Checking configuration file..."
if [ -f "laravel-echo-server.json" ]; then
    echo "✅ Configuration file exists"
    echo "Configuration summary:"
    cat laravel-echo-server.json | jq -r '. | {host, port, protocol, devMode}' 2>/dev/null || echo "Configuration file exists but jq not available"
else
    echo "❌ Configuration file not found, creating..."
    /usr/local/bin/generate-echo-config-simple.sh
fi

echo "5. Testing Echo Server configuration..."
if [ -f "laravel-echo-server.json" ]; then
    echo "Testing configuration validity..."
    laravel-echo-server start --config=laravel-echo-server.json --dev &
    ECHO_PID=$!
    sleep 3
    if kill -0 $ECHO_PID 2>/dev/null; then
        echo "✅ Echo Server started successfully"
        kill $ECHO_PID
        wait $ECHO_PID 2>/dev/null
    else
        echo "❌ Echo Server failed to start"
    fi
fi

echo "6. Generating supervisor configuration..."
/usr/local/bin/generate-supervisor-config.sh

echo "7. Setting proper permissions..."
chown -R www:www /app
chmod +x /usr/local/bin/laravel-echo-server 2>/dev/null || true
chmod 644 /app/laravel-echo-server.json 2>/dev/null || true

echo "8. Checking port availability..."
if netstat -tuln | grep ":6001" > /dev/null; then
    echo "⚠️ Port 6001 is in use, killing processes..."
    pkill -f "laravel-echo-server" || true
    sleep 2
fi

echo "9. Starting supervisor..."
supervisorctl reread
supervisorctl update
supervisorctl start all

echo "10. Waiting for services to start..."
sleep 5

echo "11. Checking service status..."
supervisorctl status

echo "12. Testing WebSocket connection..."
if curl -s http://localhost:6001 > /dev/null 2>&1; then
    echo "✅ WebSocket server is responding"
else
    echo "❌ WebSocket server is not responding"
    echo "Checking logs..."
    tail -n 20 /var/log/supervisor/websocket.log 2>/dev/null || echo "No websocket log found"
    tail -n 20 /var/log/supervisor/websocket-error.log 2>/dev/null || echo "No websocket error log found"
fi

echo ""
echo "✅ WebSocket fix completed!"
echo ""
echo "🔧 If issues persist, run:"
echo "  /usr/local/bin/debug-websocket.sh"
echo ""
echo "📊 To monitor logs:"
echo "  tail -f /var/log/supervisor/websocket.log"
echo "  tail -f /var/log/supervisor/websocket-error.log"

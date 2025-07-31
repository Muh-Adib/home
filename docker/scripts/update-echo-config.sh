#!/bin/bash

# =============================================================================
# Laravel Echo Server Dynamic Configuration Script
# =============================================================================

set -e

echo "🔧 Updating Laravel Echo Server configuration..."

# Get PORT from environment or use default
EXTERNAL_PORT=${PORT:-3000}
echo "🌐 External PORT: $EXTERNAL_PORT"

# Create dynamic Laravel Echo Server configuration
cat > /var/www/html/laravel-echo-server.dokploy.json << EOF
{
    "authHost": "http://localhost:80",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "homsjogja",
            "key": "your-pusher-key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "127.0.0.1",
            "port": "6379",
            "password": null,
            "db": 0
        }
    },
    "devMode": false,
    "host": "127.0.0.1",
    "port": "6002",
    "protocol": "http",
    "socketio": {},
    "sslCertPath": "",
    "sslKeyPath": "",
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "*",
        "allowMethods": "GET,POST",
        "allowHeaders": "Origin,Content-Type,Accept,Authorization,X-Request-With"
    },
    "referrers": [],
    "subscribers": {
        "http": true,
        "redis": true
    }
}
EOF

echo "✅ Laravel Echo Server configuration updated for port $EXTERNAL_PORT"

# Restart Laravel Echo Server if running
if pgrep -f "laravel-echo-server" > /dev/null; then
    echo "🔄 Restarting Laravel Echo Server..."
    pkill -f "laravel-echo-server"
    sleep 2
    echo "✅ Laravel Echo Server restarted"
else
    echo "ℹ️ Laravel Echo Server not running, will start with new config"
fi 
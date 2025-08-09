#!/bin/bash

# 🔧 GENERATE LARAVEL ECHO SERVER CONFIG (SIMPLE)
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🔧 Generating Laravel Echo Server config..."

# Get environment variables with defaults
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_DB=${REDIS_DB:-0}

echo "Using REDIS_HOST: ${REDIS_HOST}"
echo "Using REDIS_PORT: ${REDIS_PORT}"

# Create config file (works in both local and production)
CONFIG_PATH="/app/laravel-echo-server.json"
if [ ! -d "/app" ]; then
    CONFIG_PATH="laravel-echo-server.json"
fi

cat > "$CONFIG_PATH" << 'CONFIG_EOF'
{
    "authHost": "http://localhost",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "homsjogja",
            "key": "homsjogja-key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "REDIS_HOST_PLACEHOLDER",
            "port": REDIS_PORT_PLACEHOLDER,
            "password": "REDIS_PASSWORD_PLACEHOLDER",
            "db": REDIS_DB_PLACEHOLDER
        }
    },
    "devMode": false,
    "host": "0.0.0.0",
    "port": 6001,
    "protocol": "http",
    "socketio": {},
    "sslCertPath": "",
    "sslKeyPath": "",
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "subscribers": {
        "http": true,
        "redis": true
    },
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "*",
        "allowMethods": "GET, POST",
        "allowHeaders": "Origin, Content-Type, Accept, Authorization, X-Request-With"
    }
}
CONFIG_EOF

# Replace placeholders with actual values
sed -i "s/REDIS_HOST_PLACEHOLDER/${REDIS_HOST}/g" "$CONFIG_PATH"
sed -i "s/REDIS_PORT_PLACEHOLDER/${REDIS_PORT}/g" "$CONFIG_PATH"
sed -i "s/REDIS_PASSWORD_PLACEHOLDER/${REDIS_PASSWORD}/g" "$CONFIG_PATH"
sed -i "s/REDIS_DB_PLACEHOLDER/${REDIS_DB}/g" "$CONFIG_PATH"

echo "✅ Laravel Echo Server config generated!"
echo "Config file: $CONFIG_PATH"

# Debug: Show config content
echo "🔍 Debug: Config file content:"
cat "$CONFIG_PATH" | head -10
echo "..."

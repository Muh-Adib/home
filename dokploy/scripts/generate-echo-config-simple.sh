#!/bin/bash

# 🔧 GENERATE LARAVEL ECHO SERVER CONFIG (SIMPLE)
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🔧 Generating Laravel Echo Server config..."

# Get environment variables with defaults
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_DB=${REDIS_DB:-0}

echo "Using REDIS_HOST: ${REDIS_HOST}"
echo "Using REDIS_PORT: ${REDIS_PORT}"

# Create config file (works in both local and production)
CONFIG_PATH="/app/laravel-echo-server.json"
if [ ! -d "/app" ]; then
    CONFIG_PATH="laravel-echo-server.json"
fi

# Build redis config block — only include password if set and non-empty
if [ -n "${REDIS_PASSWORD}" ]; then
    REDIS_CONFIG_BLOCK="\"host\": \"${REDIS_HOST}\", \"port\": ${REDIS_PORT}, \"password\": \"${REDIS_PASSWORD}\", \"db\": ${REDIS_DB}"
else
    REDIS_CONFIG_BLOCK="\"host\": \"${REDIS_HOST}\", \"port\": ${REDIS_PORT}, \"db\": ${REDIS_DB}"
fi

cat > "$CONFIG_PATH" << CONFIG_EOF
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
            ${REDIS_CONFIG_BLOCK}
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

echo "✅ Laravel Echo Server config generated!"
echo "Config file: $CONFIG_PATH"

# Debug: Show config (mask password)
echo "🔍 Debug: Config file content (password masked):"
sed 's/"password": "[^"]*"/"password": "***"/g' "$CONFIG_PATH" | head -15
echo "..."

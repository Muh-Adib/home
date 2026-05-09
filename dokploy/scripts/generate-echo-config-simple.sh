#!/bin/bash

# 🔧 GENERATE LARAVEL ECHO SERVER CONFIG (SIMPLE)
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🔧 Generating Laravel Echo Server config..."

# Get environment variables with defaults
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_DB=${REDIS_DB:-0}

# Pusher/Echo credentials — must match Laravel's PUSHER_APP_* env vars
ECHO_APP_ID=${PUSHER_APP_ID:-"homsjogja"}
ECHO_APP_KEY=${PUSHER_APP_KEY:-"homsjogja-key"}

# authHost: ALWAYS use http://localhost for internal auth within the container.
# Using APP_URL (public domain) would fail because the container cannot resolve
# its own public domain internally. Laravel Echo Server calls /broadcasting/auth
# via this host, which must be reachable from inside the container.
ECHO_AUTH_HOST="http://localhost"

echo "Using REDIS_HOST: ${REDIS_HOST}"
echo "Using REDIS_PORT: ${REDIS_PORT}"
echo "Using ECHO_APP_ID: ${ECHO_APP_ID}"
echo "Using ECHO_AUTH_HOST: ${ECHO_AUTH_HOST}"

# Create config file (works in both local and production)
CONFIG_PATH="/app/laravel-echo-server.json"
if [ ! -d "/app" ]; then
    CONFIG_PATH="laravel-echo-server.json"
fi

# Build redis config block — only include password if set and non-empty
if [ -n "${REDIS_PASSWORD}" ] && [ "${REDIS_PASSWORD}" != "null" ]; then
    REDIS_CONFIG_BLOCK="\"host\": \"${REDIS_HOST}\", \"port\": ${REDIS_PORT}, \"password\": \"${REDIS_PASSWORD}\", \"db\": ${REDIS_DB}"
else
    REDIS_CONFIG_BLOCK="\"host\": \"${REDIS_HOST}\", \"port\": ${REDIS_PORT}, \"db\": ${REDIS_DB}"
fi

cat > "$CONFIG_PATH" << CONFIG_EOF
{
    "authHost": "${ECHO_AUTH_HOST}",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "${ECHO_APP_ID}",
            "key": "${ECHO_APP_KEY}"
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

# Debug: Show config (mask key/secret)
echo "🔍 Debug: Config file content (credentials masked):"
sed 's/"key": "[^"]*"/"key": "***"/g' "$CONFIG_PATH" | head -20
echo "..."

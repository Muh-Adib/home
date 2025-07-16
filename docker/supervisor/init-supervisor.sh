#!/bin/sh

# Supervisor initialization script for Alpine Linux
# This script ensures proper supervisor setup

set -e

echo "🔧 Initializing Supervisor..."

# Create necessary directories
mkdir -p /var/log/supervisor
mkdir -p /var/run
mkdir -p /etc/supervisor.d

# Set proper permissions
chown -R www:www /var/log/supervisor
chmod -R 755 /var/log/supervisor

# Copy supervisor configuration if it exists
if [ -f /var/www/html/docker/supervisor/supervisord.conf ]; then
    echo "📋 Copying supervisor configuration..."
    cp /var/www/html/docker/supervisor/supervisord.conf /etc/supervisor.d/supervisord.conf
    chmod 644 /etc/supervisor.d/supervisord.conf
fi

# Create supervisor log directory if it doesn't exist
mkdir -p /var/log/supervisor

echo "✅ Supervisor initialization complete!"

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf
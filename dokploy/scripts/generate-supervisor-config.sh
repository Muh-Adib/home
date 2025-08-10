#!/bin/bash

echo "🔧 Generating Supervisor Configuration..."

# Create supervisor configuration directory
mkdir -p /etc/supervisor/conf.d

# Generate PHP-FPM configuration
cat > /etc/supervisor/conf.d/php-fpm.conf << 'EOF'
[program:php-fpm]
command=php-fpm -F
autostart=true
autorestart=true
startretries=3
startsecs=5
user=root
redirect_stderr=true
stdout_logfile=/var/log/supervisor/php-fpm.log
stdout_logfile_maxbytes=0
stderr_logfile=/var/log/supervisor/php-fpm-error.log
stderr_logfile_maxbytes=0
EOF

# Generate Nginx configuration
cat > /etc/supervisor/conf.d/nginx.conf << 'EOF'
[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
startretries=3
startsecs=5
user=root
redirect_stderr=true
stdout_logfile=/var/log/supervisor/nginx.log
stdout_logfile_maxbytes=0
stderr_logfile=/var/log/supervisor/nginx-error.log
stderr_logfile_maxbytes=0
EOF

# Generate Laravel Queue configuration
cat > /etc/supervisor/conf.d/laravel-queue.conf << 'EOF'
[program:laravel-queue]
command=php /app/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
startretries=3
startsecs=5
user=www
redirect_stderr=true
stdout_logfile=/var/log/supervisor/laravel-queue.log
stdout_logfile_maxbytes=0
stderr_logfile=/var/log/supervisor/laravel-queue-error.log
stderr_logfile_maxbytes=0
directory=/app
EOF

# Generate WebSocket configuration with better error handling
cat > /etc/supervisor/conf.d/websocket.conf << 'EOF'
[program:websocket]
command=laravel-echo-server start --config=/app/laravel-echo-server.json
autostart=true
autorestart=true
startretries=5
startsecs=10
user=root
redirect_stderr=true
stdout_logfile=/var/log/supervisor/websocket.log
stdout_logfile_maxbytes=0
stderr_logfile=/var/log/supervisor/websocket-error.log
stderr_logfile_maxbytes=0
directory=/app
environment=NODE_ENV=production
stopwaitsecs=10
killasgroup=true
stopasgroup=true
EOF

# Create log directory
mkdir -p /var/log/supervisor

# Set permissions
chmod 644 /etc/supervisor/conf.d/*.conf

echo "✅ Supervisor configuration generated successfully!"
echo "📁 Configuration files created:"
echo "  - /etc/supervisor/conf.d/php-fpm.conf"
echo "  - /etc/supervisor/conf.d/nginx.conf"
echo "  - /etc/supervisor/conf.d/laravel-queue.conf"
echo "  - /etc/supervisor/conf.d/websocket.conf"
echo ""
echo "🔧 To apply changes:"
echo "  supervisorctl reread"
echo "  supervisorctl update"
echo "  supervisorctl restart all"

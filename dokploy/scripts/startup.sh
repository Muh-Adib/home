#!/bin/bash

# 🚀 STARTUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🚀 Starting Property Management System..."

# Rely on Dokploy-provided environment variables (do not create or load .env)
echo "🌍 Using Dokploy environment variables (no .env creation)"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
mkdir -p /var/log/supervisor /etc/supervisor/conf.d /etc/nginx
mkdir -p /var/log/nginx /run

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Copy configuration files with better error handling
echo "📋 Copying configuration files..."

# Copy Nginx configuration
if [ -f "/app/dokploy/config/nginx.conf" ]; then
    if [ -d "/etc/nginx" ]; then
        cp /app/dokploy/config/nginx.conf /etc/nginx/nginx.conf
        echo "✅ Nginx configuration copied"
    else
        echo "⚠️ /etc/nginx directory not found, creating..."
        mkdir -p /etc/nginx
        cp /app/dokploy/config/nginx.conf /etc/nginx/nginx.conf
        echo "✅ Nginx configuration copied after creating directory"
    fi
    # Ensure mime.types exists to prevent nginx startup failure
    if [ ! -f "/etc/nginx/mime.types" ]; then
        cat > /etc/nginx/mime.types <<'EOF'
 types {
     text/html                             html htm shtml;
     text/css                              css;
     text/xml                              xml;
     image/gif                             gif;
     image/jpeg                            jpeg jpg;
     application/javascript                js;
     application/atom+xml                  atom;
     application/rss+xml                   rss;

     text/mathml                           mml;
     text/plain                            txt;
     text/vnd.sun.j2me.app-descriptor      jad;
     text/vnd.wap.wml                      wml;
     text/x-component                      htc;

     image/png                             png;
     image/tiff                            tif tiff;
     image/vnd.wap.wbmp                    wbmp;
     image/x-icon                          ico;
     image/x-jng                           jng;
     image/bmp                             bmp;
     image/svg+xml                         svg svgz;
     image/webp                            webp;

     application/json                      json;
     application/xml                       xml xsl;
     application/xhtml+xml                 xhtml;
     application/pdf                       pdf;
     application/msword                    doc;
     application/vnd.ms-excel              xls;
     application/vnd.ms-powerpoint         ppt;
     application/vnd.wap.wmlc              wmlc;
     application/x-shockwave-flash         swf;
     application/java-archive              jar war ear;
     application/zip                       zip;
     application/x-gzip                    gz tgz;
     application/x-bittorrent              torrent;
     application/x-7z-compressed           7z;

     audio/mpeg                            mp3;
     audio/x-realaudio                     ra;

     video/mpeg                            mpeg mpg;
     video/quicktime                       mov;
     video/x-flv                           flv;
     video/x-msvideo                       avi;
     video/x-ms-wmv                        wmv;
     video/mp4                             mp4;
 }
EOF
        echo "✅ Created default /etc/nginx/mime.types"
    fi
else
    echo "⚠️ Nginx config not found at /app/dokploy/config/nginx.conf"
fi

# Copy Supervisor configuration
if [ -f "/app/dokploy/config/supervisord.conf" ]; then
    if [ -d "/etc/supervisor/conf.d" ]; then
        cp /app/dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
        echo "✅ Supervisor configuration copied"
    else
        echo "⚠️ /etc/supervisor/conf.d directory not found, creating..."
        mkdir -p /etc/supervisor/conf.d
        cp /app/dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
        echo "✅ Supervisor configuration copied after creating directory"
    fi
else
    echo "⚠️ Supervisor config not found at /app/dokploy/config/supervisord.conf"
fi

# Copy Laravel Echo Server configuration
if [ -f "/app/dokploy/config/laravel-echo-server.dokploy.json" ]; then
    cp /app/dokploy/config/laravel-echo-server.dokploy.json /app/laravel-echo-server.json
    echo "✅ Laravel Echo Server configuration copied"
else
    echo "⚠️ Laravel Echo Server config not found, proceeding with env-based config"
fi

# Run Laravel commands with environment variables
echo "🔧 Running Laravel setup commands..."
php artisan storage:link || echo "Storage link skipped"
php artisan config:cache || echo "Config cache failed"
php artisan route:cache || echo "Route cache failed"
php artisan view:cache || echo "View cache failed"

# Test external connections with environment variables
echo "🔍 Testing external connections..."
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "⚠️ Database connection failed"
fi

if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "⚠️ Redis connection failed"
fi

echo "🎉 Startup completed successfully!"
echo "Starting Supervisor..."

# Start Supervisor with environment variables
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf

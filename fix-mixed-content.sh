#!/bin/bash

# Script untuk memperbaiki Mixed Content issues
# Jalankan script ini di server production

echo "🔧 Memperbaiki Mixed Content Issues..."

# 1. Update .env file
echo "📝 Mengupdate konfigurasi environment..."
if [ -f .env ]; then
    # Backup .env file
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update APP_URL ke HTTPS
    sed -i 's|APP_URL=.*|APP_URL=https://homsjogja.com|g' .env
    
    # Tambahkan ASSET_URL jika belum ada
    if ! grep -q "ASSET_URL" .env; then
        echo "ASSET_URL=https://homsjogja.com" >> .env
    fi
    
    # Update session secure cookie
    if ! grep -q "SESSION_SECURE_COOKIE" .env; then
        echo "SESSION_SECURE_COOKIE=true" >> .env
    fi
    
    echo "✅ Environment configuration updated"
else
    echo "❌ File .env tidak ditemukan!"
    exit 1
fi

# 2. Clear cache
echo "🧹 Membersihkan cache..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# 3. Rebuild assets
echo "🏗️  Rebuilding assets..."
npm run build

# 4. Set proper permissions
echo "🔐 Mengatur permissions..."
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# 5. Restart services
echo "🔄 Restarting services..."
systemctl reload nginx
systemctl restart php8.3-fpm

echo "✅ Mixed Content fix completed!"
echo "🌐 Test your website at: https://homsjogja.com"
echo "📊 Check browser console untuk memastikan tidak ada Mixed Content errors"

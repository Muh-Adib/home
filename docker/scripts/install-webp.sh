#!/bin/sh
# Quick Fix: Install WebP support in running container
# This is a temporary fix until Docker image is rebuilt

echo "=== Installing WebP Support ==="
echo ""

# 1. Install libwebp packages
echo "1. Installing libwebp packages..."
apk add --no-cache libwebp libwebp-dev
echo "   ✅ Installed"
echo ""

# 2. Reinstall ImageMagick to pick up WebP delegates
echo "2. Reinstalling ImageMagick with WebP support..."
apk del imagemagick imagemagick-dev
apk add --no-cache imagemagick imagemagick-dev
echo "   ✅ Reinstalled"
echo ""

# 3. Reinstall Imagick PHP extension
echo "3. Reinstalling Imagick PHP extension..."
pecl uninstall imagick
pecl install imagick
docker-php-ext-enable imagick
echo "   ✅ Reinstalled"
echo ""

# 4. Restart PHP-FPM
echo "4. Restarting PHP-FPM..."
kill -USR2 1
echo "   ✅ Restarted"
echo ""

# 5. Verify WebP support
echo "5. Verifying WebP support..."
php -r "if (extension_loaded('imagick')) { \$im = new Imagick(); echo in_array('WEBP', \$im->queryFormats()) ? '   ✅ WebP: YES' : '   ❌ WebP: NO'; echo PHP_EOL; } else { echo '   ❌ Imagick not loaded' . PHP_EOL; }"
echo ""

echo "=== Installation Complete ==="
echo ""
echo "Run this to verify:"
echo "  php artisan image:check-support"

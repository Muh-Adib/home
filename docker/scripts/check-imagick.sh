#!/bin/sh
# Imagick Troubleshooting Script for Production

echo "=== Imagick Troubleshooting ==="
echo ""

# 1. Check if Imagick extension file exists
echo "1. Checking Imagick extension file..."
if [ -f "/usr/local/lib/php/extensions/no-debug-non-zts-20240924/imagick.so" ]; then
    echo "   ✅ imagick.so found"
else
    echo "   ❌ imagick.so NOT found"
    echo "   Searching for imagick.so..."
    find /usr -name "imagick.so" 2>/dev/null
fi
echo ""

# 2. Check PHP ini files
echo "2. Checking PHP configuration..."
php --ini
echo ""

# 3. Check if extension is enabled in php.ini
echo "3. Checking if imagick is in php.ini..."
grep -r "extension=imagick" /usr/local/etc/php/ 2>/dev/null || echo "   ⚠️  Not found in php.ini"
echo ""

# 4. Check loaded extensions
echo "4. Checking loaded PHP extensions..."
php -m | grep -i imagick && echo "   ✅ Imagick is loaded" || echo "   ❌ Imagick NOT loaded"
echo ""

# 5. Try to enable manually
echo "5. Attempting to enable Imagick..."
docker-php-ext-enable imagick 2>&1
echo ""

# 6. Verify after enable
echo "6. Verifying Imagick after enable..."
php -m | grep -i imagick && echo "   ✅ SUCCESS!" || echo "   ❌ Still not loaded"
echo ""

# 7. Check ImageMagick system library
echo "7. Checking ImageMagick system library..."
which convert && echo "   ✅ ImageMagick installed" || echo "   ❌ ImageMagick NOT installed"
convert -version 2>/dev/null | head -n 1
echo ""

# 8. Check Imagick PHP info
echo "8. Checking Imagick PHP info..."
php -r "if (extension_loaded('imagick')) { \$im = new Imagick(); echo 'Imagick version: ' . phpversion('imagick') . PHP_EOL; echo 'Supported formats: ' . implode(', ', array_slice(\$im->queryFormats(), 0, 10)) . '...' . PHP_EOL; } else { echo 'Imagick not loaded' . PHP_EOL; }"
echo ""

echo "=== Troubleshooting Complete ==="

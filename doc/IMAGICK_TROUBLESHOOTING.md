# Imagick Production Troubleshooting Guide

## Issue
Imagick installed via PECL but not loading in PHP.

## Quick Fix Commands

Run these commands in the production container:

### 1. Check Current Status
```bash
# Check if Imagick extension is loaded
php -m | grep imagick

# Check PHP configuration
php --ini
```

### 2. Enable Imagick Extension
```bash
# Enable the extension
docker-php-ext-enable imagick

# Verify it's enabled
php -m | grep imagick
```

### 3. If Still Not Working - Manual Enable
```bash
# Find the imagick.so file
find /usr -name "imagick.so"

# Add to php.ini manually
echo "extension=imagick.so" >> /usr/local/etc/php/conf.d/docker-php-ext-imagick.ini

# Restart PHP-FPM
kill -USR2 1
```

### 4. Verify WebP Support
```bash
php -r "if (extension_loaded('imagick')) { \$im = new Imagick(); \$formats = \$im->queryFormats(); echo in_array('WEBP', \$formats) ? 'WebP: YES' : 'WebP: NO'; } else { echo 'Imagick not loaded'; }"
```

## Automated Troubleshooting

Run the troubleshooting script:
```bash
chmod +x docker/scripts/check-imagick.sh
./docker/scripts/check-imagick.sh
```

## Common Issues

### Issue 1: Extension File Not Found
**Symptom**: `imagick.so` not found
**Solution**: Rebuild Docker image
```bash
docker build --no-cache -t your-app:latest .
```

### Issue 2: Extension Not Enabled
**Symptom**: `imagick.so` exists but not in `php -m`
**Solution**: 
```bash
docker-php-ext-enable imagick
```

### Issue 3: ImageMagick Library Missing
**Symptom**: Extension loads but can't process images
**Solution**: Install ImageMagick system package
```bash
apk add imagemagick imagemagick-dev
```

## Verification

After fixing, verify with:
```bash
# 1. Check extension is loaded
php -m | grep imagick

# 2. Check WebP support
php -r "\$im = new Imagick(); var_dump(in_array('WEBP', \$im->queryFormats()));"

# 3. Test conversion
php artisan image:check-support
```

## Fallback Solution

If Imagick still doesn't work, use GD driver:

1. Set in `.env`:
```env
IMAGE_DRIVER=gd
IMAGE_AUTO_FALLBACK=true
```

2. Clear config:
```bash
php artisan config:clear
php artisan config:cache
```

GD also supports WebP and will work fine.

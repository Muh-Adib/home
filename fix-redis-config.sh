#!/bin/bash

echo "🔧 Redis Configuration Fix Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking PHP Redis Extension${NC}"

# Check if Redis extension is installed
if php -m | grep -q redis; then
    echo -e "${GREEN}✅ Redis extension is installed${NC}"
else
    echo -e "${RED}❌ Redis extension is NOT installed${NC}"
    echo "Installing Redis extension..."
    
    # Install Redis extension
    if command -v pecl > /dev/null; then
        pecl install redis
        echo "extension=redis.so" >> /usr/local/etc/php/conf.d/redis.ini
    else
        echo -e "${RED}PECL not found. Please install manually.${NC}"
        exit 1
    fi
fi

echo -e "\n${YELLOW}Step 2: Testing Redis Connection${NC}"

# Test Redis connection
php -r "
try {
    \$redis = new Redis();
    \$redis->connect('${REDIS_HOST:-homsjogja-redis-qmihbb}', ${REDIS_PORT:-6379});
    if (!empty('${REDIS_PASSWORD:-5vlcwpzc45g9mtho}')) {
        \$redis->auth('${REDIS_PASSWORD:-5vlcwpzc45g9mtho}');
    }
    \$redis->ping();
    echo '✅ Redis connection successful\n';
} catch (Exception \$e) {
    echo '❌ Redis connection failed: ' . \$e->getMessage() . '\n';
    exit(1);
}"

echo -e "\n${YELLOW}Step 3: Checking Laravel Configuration${NC}"

# Test Laravel config
php artisan config:show cache | grep -A 5 "default"
php artisan config:show session | grep -A 5 "driver"
php artisan config:show queue | grep -A 5 "default"

echo -e "\n${YELLOW}Step 4: Testing Laravel Redis Integration${NC}"

# Test Laravel Redis
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Redis;
    \$result = Redis::ping();
    echo 'Laravel Redis ping: ' . \$result . PHP_EOL;
    
    Redis::set('test_key', 'test_value');
    \$value = Redis::get('test_key');
    echo 'Redis test write/read: ' . \$value . PHP_EOL;
    
    Redis::del('test_key');
    echo '✅ Laravel Redis integration working!' . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Laravel Redis error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${YELLOW}Step 5: Cache and Session Test${NC}"

# Test cache
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Cache;
    Cache::put('test_cache', 'cache_value', 60);
    \$value = Cache::get('test_cache');
    echo 'Cache test: ' . \$value . PHP_EOL;
    Cache::forget('test_cache');
    echo '✅ Cache working!' . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Cache error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${YELLOW}Step 6: Clear and Rebuild Config${NC}"

# Clear and rebuild Laravel caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild optimized config
php artisan config:cache

echo -e "\n${GREEN}✅ Redis configuration fix completed!${NC}"
echo -e "${YELLOW}Please restart your web server/supervisor processes.${NC}"
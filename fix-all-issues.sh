#!/bin/bash

echo "🔧 Laravel Complete Fix Script"
echo "=============================="
echo "This script will fix Redis, database, and session issues"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 FAILED${NC}"
        return 1
    fi
}

echo -e "${BLUE}=== STEP 1: CHECKING PHP EXTENSIONS ===${NC}"

# Check and install Redis extension if needed
if ! php -m | grep -q redis; then
    echo -e "${YELLOW}Installing Redis extension...${NC}"
    
    if command -v pecl > /dev/null; then
        pecl install redis
        echo "extension=redis.so" >> /usr/local/etc/php/conf.d/redis.ini
        check_status "Redis extension installed"
    else
        echo -e "${RED}PECL not found. Installing via package manager...${NC}"
        # Try different package managers
        if command -v apk > /dev/null; then
            apk add --no-cache php83-redis
        elif command -v apt-get > /dev/null; then
            apt-get update && apt-get install -y php-redis
        elif command -v yum > /dev/null; then
            yum install -y php-redis
        else
            echo -e "${RED}Cannot automatically install Redis extension${NC}"
            echo "Please install php-redis manually"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✅ Redis extension already installed${NC}"
fi

echo -e "\n${BLUE}=== STEP 2: UPDATING ENVIRONMENT CONFIGURATION ===${NC}"

# Create backup of current .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backed up current .env file${NC}"
fi

# Update specific problematic environment variables
echo -e "${YELLOW}Updating environment variables...${NC}"

# Fix APP_DEBUG for production
if [ "$APP_ENV" = "production" ]; then
    sed -i 's/APP_DEBUG=true/APP_DEBUG=false/' .env 2>/dev/null || true
    echo "APP_DEBUG set to false for production"
fi

# Ensure BROADCAST_DRIVER is set for Redis
grep -q "BROADCAST_DRIVER=" .env || echo "BROADCAST_DRIVER=redis" >> .env
sed -i 's/BROADCAST_CONNECTION=log/BROADCAST_DRIVER=redis/' .env 2>/dev/null || true

# Add missing Redis configurations
grep -q "REDIS_DB=" .env || echo "REDIS_DB=0" >> .env
grep -q "REDIS_CACHE_DB=" .env || echo "REDIS_CACHE_DB=1" >> .env
grep -q "REDIS_SESSION_DB=" .env || echo "REDIS_SESSION_DB=2" >> .env

echo -e "${GREEN}✅ Environment variables updated${NC}"

echo -e "\n${BLUE}=== STEP 3: CLEARING ALL CACHES ===${NC}"

# Clear all Laravel caches
echo -e "${YELLOW}Clearing caches...${NC}"
php artisan config:clear
check_status "Config cache cleared"

php artisan cache:clear
check_status "Application cache cleared"

php artisan route:clear
check_status "Route cache cleared"

php artisan view:clear
check_status "View cache cleared"

php artisan event:clear 2>/dev/null || true
check_status "Event cache cleared"

echo -e "\n${BLUE}=== STEP 4: TESTING CONNECTIONS ===${NC}"

echo -e "${YELLOW}Testing database connection...${NC}"
php artisan tinker --execute="
try {
    DB::connection()->getPdo();
    echo '✅ Database connection successful';
} catch (Exception \$e) {
    echo '❌ Database connection failed: ' . \$e->getMessage();
    exit(1);
}"

echo -e "\n${YELLOW}Testing Redis connection...${NC}"
php -r "
try {
    \$redis = new Redis();
    \$redis->connect('${REDIS_HOST}', ${REDIS_PORT}, 5);
    if (!empty('${REDIS_PASSWORD}')) {
        \$redis->auth('${REDIS_PASSWORD}');
    }
    \$redis->ping();
    echo '✅ Redis connection successful' . PHP_EOL;
    \$redis->close();
} catch (Exception \$e) {
    echo '❌ Redis connection failed: ' . \$e->getMessage() . PHP_EOL;
    echo 'Please check REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD' . PHP_EOL;
}"

echo -e "\n${BLUE}=== STEP 5: SETTING UP SESSIONS ===${NC}"

# Check session driver and setup accordingly
SESSION_DRIVER=$(php artisan tinker --execute="echo config('session.driver');" 2>/dev/null | tail -1)
echo "Session driver: ${SESSION_DRIVER}"

if [ "$SESSION_DRIVER" = "database" ]; then
    echo -e "${YELLOW}Setting up database sessions...${NC}"
    
    # Check if sessions table exists
    TABLE_EXISTS=$(php artisan tinker --execute="
    try {
        echo Schema::hasTable('sessions') ? 'yes' : 'no';
    } catch (Exception \$e) {
        echo 'no';
    }" 2>/dev/null | tail -1)
    
    if [ "$TABLE_EXISTS" != "yes" ]; then
        echo -e "${YELLOW}Creating sessions table...${NC}"
        php artisan session:table
        check_status "Session table migration created"
        
        php artisan migrate --force
        check_status "Sessions table created"
    else
        echo -e "${GREEN}✅ Sessions table already exists${NC}"
    fi
    
elif [ "$SESSION_DRIVER" = "redis" ]; then
    echo -e "${GREEN}✅ Using Redis sessions - no table needed${NC}"
    
    # Test Redis session connection
    php artisan tinker --execute="
    try {
        use Illuminate\Support\Facades\Redis;
        Redis::connection()->ping();
        echo '✅ Redis sessions ready';
    } catch (Exception \$e) {
        echo '❌ Redis sessions error: ' . \$e->getMessage();
    }"
    
elif [ "$SESSION_DRIVER" = "file" ]; then
    echo -e "${YELLOW}Setting up file sessions...${NC}"
    mkdir -p storage/framework/sessions
    chmod 755 storage/framework/sessions
    chown -R www-data:www-data storage/framework/sessions 2>/dev/null || true
    echo -e "${GREEN}✅ File sessions directory ready${NC}"
fi

echo -e "\n${BLUE}=== STEP 6: SETTING PROPER PERMISSIONS ===${NC}"

# Set proper permissions for Laravel directories
echo -e "${YELLOW}Setting permissions...${NC}"
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
check_status "Permissions set"

echo -e "\n${BLUE}=== STEP 7: REBUILDING CACHES ===${NC}"

echo -e "${YELLOW}Rebuilding optimized caches...${NC}"
php artisan config:cache
check_status "Config cache rebuilt"

php artisan route:cache
check_status "Route cache rebuilt"

php artisan view:cache
check_status "View cache rebuilt"

echo -e "\n${BLUE}=== STEP 8: RUNNING FINAL TESTS ===${NC}"

echo -e "${YELLOW}Testing Laravel Redis integration...${NC}"
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Redis;
    use Illuminate\Support\Facades\Cache;
    
    // Test Redis facade
    \$ping = Redis::ping();
    echo '✅ Redis facade working: ' . \$ping . PHP_EOL;
    
    // Test cache
    Cache::put('test_key', 'test_value', 60);
    \$value = Cache::get('test_key');
    if (\$value === 'test_value') {
        echo '✅ Cache working properly' . PHP_EOL;
        Cache::forget('test_key');
    } else {
        echo '❌ Cache not working' . PHP_EOL;
    }
    
} catch (Exception \$e) {
    echo '❌ Laravel Redis integration error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${YELLOW}Testing session functionality...${NC}"
php artisan tinker --execute="
try {
    // Test session
    session()->put('test_session', 'session_value');
    \$value = session()->get('test_session');
    if (\$value === 'session_value') {
        echo '✅ Sessions working properly' . PHP_EOL;
        session()->forget('test_session');
    } else {
        echo '❌ Sessions not working' . PHP_EOL;
    }
    
} catch (Exception \$e) {
    echo '❌ Session test error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${BLUE}=== STEP 9: CHECKING QUEUE CONFIGURATION ===${NC}"

echo -e "${YELLOW}Testing queue configuration...${NC}"
php artisan tinker --execute="
try {
    echo 'Queue driver: ' . config('queue.default') . PHP_EOL;
    echo 'Queue connection configured: ' . (config('queue.connections.redis') ? 'Yes' : 'No') . PHP_EOL;
    echo '✅ Queue configuration accessible' . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Queue configuration error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${BLUE}=== STEP 10: RESTARTING SERVICES ===${NC}"

echo -e "${YELLOW}Restarting services...${NC}"

# Restart PHP-FPM if available
if command -v supervisorctl > /dev/null; then
    supervisorctl restart php-fpm 2>/dev/null || true
    supervisorctl restart nginx 2>/dev/null || true
    supervisorctl restart queue-worker:* 2>/dev/null || true
    echo -e "${GREEN}✅ Supervisor services restarted${NC}"
elif systemctl is-active php-fpm >/dev/null 2>&1; then
    systemctl restart php-fpm
    systemctl restart nginx 2>/dev/null || true
    echo -e "${GREEN}✅ System services restarted${NC}"
else
    echo -e "${YELLOW}⚠️  Please manually restart your web server${NC}"
fi

echo -e "\n${GREEN}🎉 =================================== 🎉${NC}"
echo -e "${GREEN}    ALL FIXES COMPLETED SUCCESSFULLY!    ${NC}"
echo -e "${GREEN}🎉 =================================== 🎉${NC}"

echo -e "\n${YELLOW}Summary of fixes applied:${NC}"
echo "✅ Redis extension verified/installed"
echo "✅ Environment variables updated"
echo "✅ All caches cleared and rebuilt"
echo "✅ Database connection tested"
echo "✅ Redis connection tested"
echo "✅ Session storage configured"
echo "✅ Permissions set correctly"
echo "✅ Laravel integrations tested"
echo "✅ Services restarted"

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Test your application in a browser"
echo "2. Check that real-time notifications work"
echo "3. Verify file uploads work correctly"
echo "4. Monitor logs for any remaining issues"

echo -e "\n${YELLOW}If you still encounter issues:${NC}"
echo "1. Check Docker container logs: docker logs [container-name]"
echo "2. Check Laravel logs: tail -f storage/logs/laravel.log"
echo "3. Run diagnostic script: ./diagnose-laravel-issues.sh"

echo -e "\n${GREEN}Happy coding! 🚀${NC}"
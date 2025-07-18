#!/bin/bash

echo "🔍 Laravel Configuration Diagnostic Script"
echo "==========================================="

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
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

echo -e "${BLUE}=== ENVIRONMENT CHECK ===${NC}"

echo -e "\n${YELLOW}1. Checking PHP Version and Extensions${NC}"
php --version
echo ""
echo "PHP Extensions:"
php -m | grep -E "(redis|pdo|mysql|mbstring|openssl|json|tokenizer|xml|ctype|fileinfo|filter|hash|session)"

echo -e "\n${YELLOW}2. Checking Laravel Installation${NC}"
php artisan --version
check_status "Laravel command accessible"

echo -e "\n${BLUE}=== DATABASE CHECK ===${NC}"

echo -e "\n${YELLOW}3. Testing Database Connection${NC}"
php artisan tinker --execute="
try {
    \$pdo = DB::connection()->getPdo();
    echo '✅ Database connection successful' . PHP_EOL;
    echo 'Database: ' . DB::connection()->getDatabaseName() . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Database connection failed: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${YELLOW}4. Checking Database Tables${NC}"
php artisan migrate:status 2>/dev/null || echo "❌ Migration status check failed"

echo -e "\n${BLUE}=== REDIS CHECK ===${NC}"

echo -e "\n${YELLOW}5. Checking Redis Extension${NC}"
if php -m | grep -q redis; then
    echo -e "${GREEN}✅ Redis extension loaded${NC}"
    php -r "echo 'Redis extension version: ' . phpversion('redis') . PHP_EOL;"
else
    echo -e "${RED}❌ Redis extension NOT loaded${NC}"
fi

echo -e "\n${YELLOW}6. Testing Redis Connection${NC}"
php -r "
try {
    \$redis = new Redis();
    \$host = '${REDIS_HOST:-localhost}';
    \$port = ${REDIS_PORT:-6379};
    \$password = '${REDIS_PASSWORD:-}';
    
    echo 'Connecting to Redis at: ' . \$host . ':' . \$port . PHP_EOL;
    \$redis->connect(\$host, \$port, 5);
    
    if (!empty(\$password)) {
        \$redis->auth(\$password);
        echo 'Authenticated with password' . PHP_EOL;
    }
    
    \$result = \$redis->ping();
    echo '✅ Redis ping successful: ' . \$result . PHP_EOL;
    \$redis->close();
} catch (Exception \$e) {
    echo '❌ Redis connection failed: ' . \$e->getMessage() . PHP_EOL;
    echo 'Possible causes:' . PHP_EOL;
    echo '- Redis server not running' . PHP_EOL;
    echo '- Wrong host/port/password' . PHP_EOL;
    echo '- Network connectivity issues' . PHP_EOL;
}"

echo -e "\n${YELLOW}7. Testing Laravel Redis Integration${NC}"
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Redis;
    \$result = Redis::ping();
    echo '✅ Laravel Redis facade working: ' . \$result . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Laravel Redis facade error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${BLUE}=== CACHE & SESSION CHECK ===${NC}"

echo -e "\n${YELLOW}8. Checking Cache Configuration${NC}"
php artisan config:show cache.default 2>/dev/null || echo "❌ Cache config check failed"
php artisan config:show cache.stores.redis 2>/dev/null || echo "❌ Redis cache config check failed"

echo -e "\n${YELLOW}9. Testing Cache Functionality${NC}"
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Cache;
    Cache::put('diagnostic_test', 'cache_working', 60);
    \$value = Cache::get('diagnostic_test');
    if (\$value === 'cache_working') {
        echo '✅ Cache store/retrieve working' . PHP_EOL;
        Cache::forget('diagnostic_test');
    } else {
        echo '❌ Cache not working properly' . PHP_EOL;
    }
} catch (Exception \$e) {
    echo '❌ Cache error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${YELLOW}10. Checking Session Configuration${NC}"
php artisan config:show session.driver 2>/dev/null || echo "❌ Session config check failed"
php artisan config:show session.connection 2>/dev/null || echo "❌ Session connection config check failed"

echo -e "\n${YELLOW}11. Testing Session Functionality${NC}"
# Check if sessions table exists for database driver
php artisan tinker --execute="
try {
    \$driver = config('session.driver');
    echo 'Session driver: ' . \$driver . PHP_EOL;
    
    if (\$driver === 'database') {
        \$exists = Schema::hasTable('sessions');
        if (\$exists) {
            echo '✅ Sessions table exists' . PHP_EOL;
        } else {
            echo '❌ Sessions table missing. Run: php artisan session:table && php artisan migrate' . PHP_EOL;
        }
    } elseif (\$driver === 'redis') {
        echo '✅ Using Redis for sessions' . PHP_EOL;
    }
} catch (Exception \$e) {
    echo '❌ Session check error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${BLUE}=== QUEUE CHECK ===${NC}"

echo -e "\n${YELLOW}12. Checking Queue Configuration${NC}"
php artisan config:show queue.default 2>/dev/null || echo "❌ Queue config check failed"
php artisan config:show queue.connections.redis 2>/dev/null || echo "❌ Redis queue config check failed"

echo -e "\n${YELLOW}13. Testing Queue Functionality${NC}"
php artisan tinker --execute="
try {
    use Illuminate\Support\Facades\Queue;
    echo 'Queue driver: ' . config('queue.default') . PHP_EOL;
    echo '✅ Queue configuration accessible' . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Queue error: ' . \$e->getMessage() . PHP_EOL;
}"

echo -e "\n${BLUE}=== ENVIRONMENT VARIABLES ===${NC}"

echo -e "\n${YELLOW}14. Key Environment Variables${NC}"
echo "APP_ENV: ${APP_ENV:-not set}"
echo "APP_DEBUG: ${APP_DEBUG:-not set}"
echo "DB_CONNECTION: ${DB_CONNECTION:-not set}"
echo "DB_HOST: ${DB_HOST:-not set}"
echo "REDIS_HOST: ${REDIS_HOST:-not set}"
echo "SESSION_DRIVER: ${SESSION_DRIVER:-not set}"
echo "CACHE_DRIVER: ${CACHE_DRIVER:-not set}"
echo "QUEUE_CONNECTION: ${QUEUE_CONNECTION:-not set}"
echo "BROADCAST_DRIVER: ${BROADCAST_DRIVER:-not set}"

echo -e "\n${BLUE}=== ARTISAN COMMANDS TEST ===${NC}"

echo -e "\n${YELLOW}15. Testing Essential Artisan Commands${NC}"
echo "Testing config:cache..."
php artisan config:cache >/dev/null 2>&1
check_status "config:cache command"

echo "Testing route:cache..."
php artisan route:cache >/dev/null 2>&1
check_status "route:cache command"

echo "Testing view:cache..."
php artisan view:cache >/dev/null 2>&1
check_status "view:cache command"

echo -e "\n${BLUE}=== RECOMMENDATIONS ===${NC}"

echo -e "\n${YELLOW}16. Configuration Recommendations${NC}"

# Check if APP_DEBUG is true in production
if [ "${APP_ENV}" = "production" ] && [ "${APP_DEBUG}" = "true" ]; then
    echo -e "${RED}⚠️  WARNING: APP_DEBUG=true in production environment${NC}"
    echo "   Recommendation: Set APP_DEBUG=false"
fi

# Check if session driver is appropriate
if [ "${SESSION_DRIVER}" = "file" ]; then
    echo -e "${YELLOW}⚠️  INFO: Using file session driver${NC}"
    echo "   Recommendation: Consider using redis for better performance"
fi

# Check if cache driver is set
if [ -z "${CACHE_DRIVER}" ] || [ "${CACHE_DRIVER}" = "array" ]; then
    echo -e "${YELLOW}⚠️  INFO: Using array/no cache driver${NC}"
    echo "   Recommendation: Use redis for better performance"
fi

echo -e "\n${GREEN}=== DIAGNOSTIC COMPLETE ===${NC}"
echo -e "${BLUE}If you see errors above, please address them before proceeding.${NC}"

# Suggest fixes
echo -e "\n${YELLOW}Common Fixes:${NC}"
echo "1. Redis extension missing: Run ./fix-redis-config.sh"
echo "2. Sessions table missing: php artisan session:table && php artisan migrate"
echo "3. Config cache issues: php artisan config:clear && php artisan config:cache"
echo "4. Redis connection issues: Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD"
echo "5. Database issues: Check DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD"
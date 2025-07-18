#!/bin/bash

echo "📋 Laravel Session Setup Script"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking current session configuration...${NC}"

# Get current session driver
SESSION_DRIVER=$(php artisan tinker --execute="echo config('session.driver');" 2>/dev/null | tail -1)

echo "Current session driver: ${SESSION_DRIVER}"

if [ "$SESSION_DRIVER" = "database" ]; then
    echo -e "${YELLOW}Database session driver detected. Setting up sessions table...${NC}"
    
    # Check if sessions table already exists
    TABLE_EXISTS=$(php artisan tinker --execute="
    try {
        echo Schema::hasTable('sessions') ? 'true' : 'false';
    } catch (Exception \$e) {
        echo 'false';
    }" 2>/dev/null | tail -1)
    
    if [ "$TABLE_EXISTS" = "true" ]; then
        echo -e "${GREEN}✅ Sessions table already exists${NC}"
    else
        echo -e "${YELLOW}Creating sessions table migration...${NC}"
        
        # Create session table migration
        php artisan session:table
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Session table migration created${NC}"
            
            echo -e "${YELLOW}Running migration...${NC}"
            php artisan migrate --force
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Sessions table created successfully${NC}"
            else
                echo -e "${RED}❌ Failed to run migration${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Failed to create session table migration${NC}"
            exit 1
        fi
    fi
    
elif [ "$SESSION_DRIVER" = "redis" ]; then
    echo -e "${GREEN}✅ Redis session driver detected - no table setup needed${NC}"
    
    echo -e "${YELLOW}Testing Redis connection for sessions...${NC}"
    php artisan tinker --execute="
    try {
        use Illuminate\Support\Facades\Redis;
        Redis::connection('default')->ping();
        echo '✅ Redis connection working for sessions';
    } catch (Exception \$e) {
        echo '❌ Redis connection failed: ' . \$e->getMessage();
    }"
    
elif [ "$SESSION_DRIVER" = "file" ]; then
    echo -e "${YELLOW}⚠️  File session driver detected${NC}"
    echo "Creating storage/framework/sessions directory..."
    
    mkdir -p storage/framework/sessions
    chmod 755 storage/framework/sessions
    chown -R www-data:www-data storage/framework/sessions 2>/dev/null || true
    
    echo -e "${GREEN}✅ Session storage directory ready${NC}"
    echo -e "${YELLOW}Note: Consider using Redis for better performance in production${NC}"
    
else
    echo -e "${RED}❌ Unknown session driver: ${SESSION_DRIVER}${NC}"
    echo "Supported drivers: database, redis, file"
    exit 1
fi

echo -e "\n${YELLOW}Setting proper permissions...${NC}"

# Set storage permissions
chmod -R 755 storage
chown -R www-data:www-data storage 2>/dev/null || true

echo -e "\n${YELLOW}Clearing and rebuilding cache...${NC}"

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan session:flush 2>/dev/null || true

# Rebuild config cache
php artisan config:cache

echo -e "\n${GREEN}✅ Session setup completed!${NC}"

# Test session functionality
echo -e "\n${YELLOW}Testing session functionality...${NC}"

php artisan tinker --execute="
try {
    // Test session store
    \$sessionId = Str::random(40);
    session()->setId(\$sessionId);
    session()->start();
    session()->put('test_key', 'test_value');
    session()->save();
    
    // Try to retrieve
    session()->setId(\$sessionId);
    session()->start();
    \$value = session()->get('test_key');
    
    if (\$value === 'test_value') {
        echo '✅ Session store/retrieve test passed';
    } else {
        echo '❌ Session store/retrieve test failed';
    }
    
    // Clean up
    session()->forget('test_key');
    session()->save();
    
} catch (Exception \$e) {
    echo '❌ Session test error: ' . \$e->getMessage();
}"

echo -e "\n${YELLOW}Session configuration summary:${NC}"
echo "Driver: ${SESSION_DRIVER}"
echo "Lifetime: $(php artisan tinker --execute="echo config('session.lifetime');" 2>/dev/null | tail -1) minutes"
echo "Cookie name: $(php artisan tinker --execute="echo config('session.cookie');" 2>/dev/null | tail -1)"

echo -e "\n${GREEN}🎉 Session setup complete!${NC}"
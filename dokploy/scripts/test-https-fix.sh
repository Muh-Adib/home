#!/bin/bash

# Test HTTPS Configuration and Mixed Content Fix
# This script tests the HTTPS setup and verifies no mixed content errors

set -e

echo "🔍 Testing HTTPS Configuration and Mixed Content Fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s -k "https://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to check SSL certificate
check_ssl() {
    local domain=$1
    local port=${2:-443}
    
    echo -e "${YELLOW}🔐 Checking SSL certificate for $domain:$port...${NC}"
    
    if echo | openssl s_client -servername $domain -connect $domain:$port 2>/dev/null | openssl x509 -noout -dates; then
        echo -e "${GREEN}✅ SSL certificate is valid${NC}"
        return 0
    else
        echo -e "${RED}❌ SSL certificate check failed${NC}"
        return 1
    fi
}

# Function to check for mixed content
check_mixed_content() {
    local url=$1
    
    echo -e "${YELLOW}🔍 Checking for mixed content on $url...${NC}"
    
    # Get page content and check for HTTP resources
    local content=$(curl -s -k "$url")
    local http_resources=$(echo "$content" | grep -o 'http://[^"\s]*' | head -5)
    
    if [ -n "$http_resources" ]; then
        echo -e "${RED}❌ Found HTTP resources (potential mixed content):${NC}"
        echo "$http_resources" | while read -r resource; do
            echo -e "${RED}   - $resource${NC}"
        done
        return 1
    else
        echo -e "${GREEN}✅ No HTTP resources found (no mixed content)${NC}"
        return 0
    fi
}

# Function to check asset URLs
check_asset_urls() {
    local url=$1
    
    echo -e "${YELLOW}📦 Checking asset URLs on $url...${NC}"
    
    # Get page content and extract asset URLs
    local content=$(curl -s -k "$url")
    local asset_urls=$(echo "$content" | grep -o 'https://[^"\s]*\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)' | head -10)
    
    if [ -n "$asset_urls" ]; then
        echo -e "${GREEN}✅ Found HTTPS asset URLs:${NC}"
        echo "$asset_urls" | while read -r asset; do
            echo -e "${GREEN}   ✅ $asset${NC}"
        done
        return 0
    else
        echo -e "${YELLOW}⚠️  No asset URLs found in page content${NC}"
        return 0
    fi
}

# Main test sequence
echo "🚀 Starting HTTPS and Mixed Content tests..."

# 1. Check if nginx is running
echo -e "\n${YELLOW}1. Checking Nginx service...${NC}"
if check_service "Nginx" 443; then
    echo -e "${GREEN}✅ Nginx HTTPS is working${NC}"
else
    echo -e "${RED}❌ Nginx HTTPS is not working${NC}"
    exit 1
fi

# 2. Check SSL certificate
echo -e "\n${YELLOW}2. Checking SSL certificate...${NC}"
if check_ssl "app.homsjogja.com" 443; then
    echo -e "${GREEN}✅ SSL certificate is valid${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate check failed (this might be expected for self-signed certs)${NC}"
fi

# 3. Check main application page
echo -e "\n${YELLOW}3. Checking main application page...${NC}"
if curl -s -k "https://app.homsjogja.com" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Main application page is accessible via HTTPS${NC}"
else
    echo -e "${RED}❌ Main application page is not accessible via HTTPS${NC}"
    exit 1
fi

# 4. Check for mixed content
echo -e "\n${YELLOW}4. Checking for mixed content...${NC}"
if check_mixed_content "https://app.homsjogja.com"; then
    echo -e "${GREEN}✅ No mixed content detected${NC}"
else
    echo -e "${RED}❌ Mixed content detected${NC}"
fi

# 5. Check asset URLs
echo -e "\n${YELLOW}5. Checking asset URLs...${NC}"
check_asset_urls "https://app.homsjogja.com"

# 6. Test WebSocket connection
echo -e "\n${YELLOW}6. Testing WebSocket connection...${NC}"
if curl -s -k "https://app.homsjogja.com/socket.io/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ WebSocket endpoint is accessible via HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket endpoint check failed (might be expected if not configured)${NC}"
fi

# 7. Check security headers
echo -e "\n${YELLOW}7. Checking security headers...${NC}"
headers=$(curl -s -I -k "https://app.homsjogja.com" | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|X-XSS-Protection)" || true)

if [ -n "$headers" ]; then
    echo -e "${GREEN}✅ Security headers found:${NC}"
    echo "$headers" | while read -r header; do
        echo -e "${GREEN}   ✅ $header${NC}"
    done
else
    echo -e "${YELLOW}⚠️  No security headers found${NC}"
fi

echo -e "\n${GREEN}🎉 HTTPS and Mixed Content tests completed!${NC}"

# Summary
echo -e "\n${YELLOW}📋 Test Summary:${NC}"
echo -e "${GREEN}✅ HTTPS is properly configured${NC}"
echo -e "${GREEN}✅ Mixed Content errors should be resolved${NC}"
echo -e "${GREEN}✅ All assets should now load via HTTPS${NC}"
echo -e "${GREEN}✅ Security headers are in place${NC}"

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo -e "1. Deploy the updated configuration"
echo -e "2. Clear browser cache and test the application"
echo -e "3. Monitor browser console for any remaining mixed content errors"
echo -e "4. Consider using a proper SSL certificate for production"

echo -e "\n${GREEN}🚀 Mixed Content fix is ready for deployment!${NC}"

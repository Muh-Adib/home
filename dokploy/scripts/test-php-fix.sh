#!/bin/bash

# 🧪 TEST PHP CONFIGURATION FIX
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🧪 Testing PHP configuration fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

# 1. Test nginx config has correct SCRIPT_FILENAME
log_info "🔧 Testing nginx SCRIPT_FILENAME..."
if grep -q "fastcgi_param SCRIPT_FILENAME \$realpath_root" dokploy/config/nginx.conf; then
    log_success "Nginx uses realpath_root for SCRIPT_FILENAME"
else
    log_error "Nginx not using realpath_root for SCRIPT_FILENAME"
fi

# 2. Test nginx config has realpath_root directive
log_info "🔧 Testing nginx realpath_root directive..."
if grep -q "realpath_root /app/public;" dokploy/config/nginx.conf; then
    log_success "Nginx has realpath_root directive"
else
    log_error "Nginx missing realpath_root directive"
fi

# 3. Test fastcgi_params has correct SCRIPT_FILENAME
log_info "🔧 Testing fastcgi_params SCRIPT_FILENAME..."
if grep -q "fastcgi_param  SCRIPT_FILENAME    \$realpath_root" dokploy/config/fastcgi_params; then
    log_success "fastcgi_params uses realpath_root"
else
    log_error "fastcgi_params not using realpath_root"
fi

# 4. Test fastcgi_params has no problematic PHP_VALUE
log_info "🔧 Testing fastcgi_params PHP values..."
if grep -q "^fastcgi_param.*auto_append_file=/dev/null" dokploy/config/fastcgi_params; then
    log_error "fastcgi_params still has problematic PHP_VALUE"
else
    log_success "fastcgi_params has no problematic PHP_VALUE"
fi

# 5. Test Laravel public directory exists
log_info "🔧 Testing Laravel public directory..."
if [ -f "public/index.php" ]; then
    log_success "Laravel public directory exists"
else
    log_error "Laravel public directory missing"
fi

# 6. Test nginx config copy in nixpacks
log_info "🔧 Testing nginx config copy..."
if grep -q "cp dokploy/config/fastcgi_params" nixpacks.toml; then
    log_success "fastcgi_params copy included in build"
else
    log_error "fastcgi_params copy missing from build"
fi

# 7. Test mime.types has no duplicates
log_info "🔧 Testing mime.types for duplicates..."
DUPLICATES=$(grep -o "woff\|woff2\|js\|json\|css\|svg" dokploy/config/mime.types | sort | uniq -d | wc -l)
if [ "$DUPLICATES" -eq 0 ]; then
    log_success "mime.types has no duplicate extensions"
else
    log_error "mime.types has $DUPLICATES duplicate extensions"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 PHP configuration test completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Nginx SCRIPT_FILENAME: $(grep -q "realpath_root" dokploy/config/nginx.conf && echo "✅" || echo "❌")"
echo "- Nginx realpath_root: $(grep -q "realpath_root /app/public" dokploy/config/nginx.conf && echo "✅" || echo "❌")"
echo "- fastcgi_params SCRIPT_FILENAME: $(grep -q "realpath_root" dokploy/config/fastcgi_params && echo "✅" || echo "❌")"
echo "- PHP_VALUE fix: $(grep -q "^fastcgi_param.*auto_append_file=/dev/null" dokploy/config/fastcgi_params && echo "❌" || echo "✅")"
echo "- Laravel public: $(ls public/index.php > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo "- fastcgi_params copy: $(grep -q "fastcgi_params" nixpacks.toml && echo "✅" || echo "❌")"
echo "- mime.types duplicates: $(grep -o "woff\|woff2\|js\|json\|css\|svg" dokploy/config/mime.types | sort | uniq -d | wc -l) found"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Redeploy dengan rebuild di Dokploy Dashboard"
echo "2. Monitor logs: tail -f /var/log/supervisor/nginx-error.log"
echo "3. Test Laravel: curl http://localhost/"
echo "4. Check PHP: curl http://localhost/health"
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Tidak ada lagi error 'Failed to open stream: No such file or directory'"
echo "- Laravel application accessible tanpa PHP errors"
echo "- PHP-FPM berfungsi dengan benar"

#!/bin/bash

# ===========================================
# NPM DEPENDENCIES FIX SCRIPT
# ===========================================

echo "🔧 Fixing npm dependencies..."

# 1. Remove existing node_modules and lock files
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules
rm -f package-lock.json

# 2. Install dependencies with legacy peer deps
echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

# 3. Update react-day-picker to compatible version
echo "🔄 Updating react-day-picker..."
npm install react-day-picker@^9.4.3 --legacy-peer-deps

# 4. Downgrade React to 18.3.1 for compatibility
echo "🔄 Downgrading React to 18.3.1..."
npm install react@^18.3.1 react-dom@^18.3.1 --legacy-peer-deps

# 5. Build assets to test
echo "🏗️ Building assets..."
npm run build

echo "✅ NPM dependencies fixed!"
echo "🚀 You can now run: docker-compose up -d --build" 
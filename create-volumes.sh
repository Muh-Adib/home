#!/bin/bash

# Script untuk membuat direktori volume yang diperlukan
echo "Membuat direktori volume untuk Docker..."

# Buat direktori volume
mkdir -p docker/volumes/mysql
mkdir -p docker/volumes/redis
mkdir -p docker/volumes/nginx/logs
mkdir -p docker/volumes/prometheus
mkdir -p docker/volumes/grafana

# Set permissions yang tepat
chmod -R 755 docker/volumes/

echo "Direktori volume berhasil dibuat!"
echo "Sekarang Anda bisa menjalankan: docker-compose up -d" 
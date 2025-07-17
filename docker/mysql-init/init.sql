-- MySQL Initialization Script for Property Management System
-- This ensures proper database setup with required permissions

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS property_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'pms_user'@'%' IDENTIFIED BY 'secret';

-- Grant all privileges
GRANT ALL PRIVILEGES ON property_management.* TO 'pms_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON property_management.* TO 'pms_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Create basic health check table
USE property_management;
CREATE TABLE IF NOT EXISTS health_check (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'OK',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('INITIALIZED') ON DUPLICATE KEY UPDATE checked_at = CURRENT_TIMESTAMP;

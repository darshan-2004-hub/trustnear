-- TrustNear Stage 5 Safe Migration
-- Provider Portfolio, Availability, Slot Reservation & Reliability Tracking

USE trustnear_db;

-- 1. Create table: provider_portfolios
CREATE TABLE IF NOT EXISTS provider_portfolios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    service_category VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    before_image_url VARCHAR(255) DEFAULT NULL,
    after_image_url VARCHAR(255) DEFAULT NULL,
    completion_date DATE NOT NULL,
    authorized_for_display BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_portfolio_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_portfolio_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create table: provider_availabilities
CREATE TABLE IF NOT EXISTS provider_availabilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL UNIQUE,
    working_days JSON NOT NULL,
    daily_start_time TIME NOT NULL DEFAULT '09:00:00',
    daily_end_time TIME NOT NULL DEFAULT '18:00:00',
    slot_duration_minutes INT NOT NULL DEFAULT 60,
    unavailable_dates JSON DEFAULT NULL,
    is_accepting_bookings BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_avail_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create table: provider_no_shows
CREATE TABLE IF NOT EXISTS provider_no_shows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    provider_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('reported', 'confirmed', 'dismissed') NOT NULL DEFAULT 'reported',
    admin_notes TEXT DEFAULT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_noshow_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_noshow_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_noshow_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_noshow_provider (provider_id),
    INDEX idx_noshow_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Safely add columns to bookings table if not existing
-- Procedure to add columns safely without error if already existing
DROP PROCEDURE IF EXISTS AddStage5BookingColumns;
DELIMITER $$
CREATE PROCEDURE AddStage5BookingColumns()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'end_time'
    ) THEN
        ALTER TABLE bookings ADD COLUMN end_time TIME DEFAULT NULL AFTER booking_time;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'cancelled_by'
    ) THEN
        ALTER TABLE bookings ADD COLUMN cancelled_by INT DEFAULT NULL AFTER cancellation_reason;
        ALTER TABLE bookings ADD CONSTRAINT fk_bk_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END$$
DELIMITER ;

CALL AddStage5BookingColumns();
DROP PROCEDURE IF EXISTS AddStage5BookingColumns;

DROP DATABASE IF EXISTS trustnear_db;
CREATE DATABASE trustnear_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trustnear_db;

-- 1. Table: users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'provider', 'admin') NOT NULL DEFAULT 'customer',
    phone VARCHAR(25),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: provider_profiles
CREATE TABLE provider_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    service_category VARCHAR(80) NOT NULL,
    experience_years INT NOT NULL DEFAULT 0,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    bio TEXT,
    service_address VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pp_category (service_category),
    INDEX idx_pp_status (verification_status),
    INDEX idx_pp_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: bookings
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    provider_id INT NOT NULL,
    service_title VARCHAR(150) NOT NULL,
    service_category VARCHAR(80) NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    customer_address VARCHAR(255) NOT NULL,
    customer_latitude DECIMAL(10, 8),
    customer_longitude DECIMAL(11, 8),
    agreed_price DECIMAL(10, 2) DEFAULT NULL,
    status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    cancellation_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bk_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bk_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_bk_status (status),
    INDEX idx_bk_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: reviews
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    provider_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    sentiment_score DECIMAL(5, 4) DEFAULT NULL,
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason VARCHAR(255) DEFAULT NULL,
    is_approved_by_admin BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rv_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_rv_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rv_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rv_provider (provider_id),
    INDEX idx_rv_suspicious (is_suspicious)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: messages
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    booking_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_msg_conversation (sender_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: trust_metrics
CREATE TABLE trust_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL UNIQUE,
    trust_score DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
    completed_jobs INT NOT NULL DEFAULT 0,
    cancellation_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    avg_response_minutes INT NOT NULL DEFAULT 0,
    review_sentiment_avg DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    shap_factors JSON DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tm_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tm_score (trust_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
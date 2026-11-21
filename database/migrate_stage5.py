import os
import pymysql
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

def run_migration():
    host = os.getenv('DB_HOST', 'localhost')
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'trustnear_db')
    port = int(os.getenv('DB_PORT', 3306))

    conn = pymysql.connect(host=host, user=user, password=password, database=database, port=port)
    cur = conn.cursor()

    print("Running Stage 5 safe database migration...")

    # 1. provider_portfolios table
    cur.execute("""
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
    """)
    print("Table 'provider_portfolios' checked/created.")

    # 2. provider_availabilities table
    cur.execute("""
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
    """)
    print("Table 'provider_availabilities' checked/created.")

    # 3. provider_no_shows table
    cur.execute("""
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
    """)
    print("Table 'provider_no_shows' checked/created.")

    # 4. Add end_time to bookings table if not present
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'end_time'
    """, (database,))
    if cur.fetchone()[0] == 0:
        cur.execute("ALTER TABLE bookings ADD COLUMN end_time TIME DEFAULT NULL AFTER booking_time")
        print("Column 'end_time' added to 'bookings'.")
    else:
        print("Column 'end_time' already exists in 'bookings'.")

    # 5. Add cancelled_by to bookings table if not present
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancelled_by'
    """, (database,))
    if cur.fetchone()[0] == 0:
        cur.execute("ALTER TABLE bookings ADD COLUMN cancelled_by INT DEFAULT NULL AFTER cancellation_reason")
        cur.execute("ALTER TABLE bookings ADD CONSTRAINT fk_bk_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL")
        print("Column 'cancelled_by' added to 'bookings'.")
    else:
        print("Column 'cancelled_by' already exists in 'bookings'.")

    conn.commit()
    cur.close()
    conn.close()
    print("Stage 5 migration executed successfully!")

if __name__ == '__main__':
    run_migration()

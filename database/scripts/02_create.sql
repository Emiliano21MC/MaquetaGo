CREATE DATABASE IF NOT EXISTS maquetago_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maquetago_db;
CREATE TABLE IF NOT EXISTS students (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(120) NOT NULL,
 institutional_email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL,
 is_verified_pucp BOOLEAN NOT NULL DEFAULT FALSE, otp_code VARCHAR(6), otp_hash CHAR(64), otp_expires_at DATETIME,
 otp_attempts INT NOT NULL DEFAULT 0, otp_requested_at DATETIME, pending_password_hash VARCHAR(255),
 promo_80_used BOOLEAN NOT NULL DEFAULT FALSE, plans_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_email CHECK (institutional_email REGEXP '^[A-Za-z0-9._%+-]+@pucp[.]edu[.]pe$')
);
CREATE TABLE IF NOT EXISTS lima_pickup_zones (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, district_name VARCHAR(80) NOT NULL UNIQUE,
 sample_address VARCHAR(255) NOT NULL, latitude DECIMAL(10,6) NOT NULL, longitude DECIMAL(10,6) NOT NULL,
 distance_km_to_pucp DECIMAL(5,2) NOT NULL, base_duration_min INT NOT NULL,
 map_x INT NOT NULL, map_y INT NOT NULL
);
CREATE TABLE IF NOT EXISTS drivers (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(120) NOT NULL, rating DECIMAL(2,1) NOT NULL,
 completed_trips INT NOT NULL DEFAULT 0, vehicle_model VARCHAR(100) NOT NULL, vehicle_color VARCHAR(60) NOT NULL,
 license_plate VARCHAR(12) NOT NULL UNIQUE, has_flat_platform BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS academic_calendar_events (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, course_label VARCHAR(100) NOT NULL,
 event_date DATE NOT NULL, recommended_time VARCHAR(15) NOT NULL, semester_code VARCHAR(15) NOT NULL,
 UNIQUE KEY uq_event (title, semester_code), INDEX idx_event_date (event_date)
);
CREATE TABLE IF NOT EXISTS student_academic_reminders (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL, event_id INT UNSIGNED NOT NULL,
 remind_hours_before INT NOT NULL DEFAULT 48, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE KEY uq_reminder(student_id,event_id), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(event_id) REFERENCES academic_calendar_events(id)
);
CREATE TABLE IF NOT EXISTS subscription_plans (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code ENUM('MONTHLY','SEMESTER','ANNUAL') NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL, period_label VARCHAR(30) NOT NULL, price_pen DECIMAL(8,2) NOT NULL,
 included_rides INT NOT NULL, validity_days INT NOT NULL, insurance_limit_pen DECIMAL(8,2) NOT NULL,
 discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0, badge_text VARCHAR(40), CONSTRAINT chk_plan CHECK(price_pen > 0 AND included_rides > 0 AND validity_days > 0)
);
CREATE TABLE IF NOT EXISTS student_subscriptions (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL, plan_id INT UNSIGNED NOT NULL,
 remaining_rides INT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 payment_method VARCHAR(30) NOT NULL, payment_ref VARCHAR(80), is_active BOOLEAN NOT NULL DEFAULT TRUE,
 request_key VARCHAR(80) NOT NULL, UNIQUE KEY uq_sub_request(student_id,request_key),
 FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(plan_id) REFERENCES subscription_plans(id),
 INDEX idx_active_sub(student_id,is_active,end_date), CONSTRAINT chk_rides CHECK(remaining_rides >= 0)
);
CREATE TABLE IF NOT EXISTS trips (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_code VARCHAR(30) NOT NULL UNIQUE,
 student_id INT UNSIGNED NOT NULL, driver_id INT UNSIGNED NOT NULL, student_subscription_id INT UNSIGNED NULL,
 request_key VARCHAR(80) NOT NULL, UNIQUE KEY uq_trip_request(student_id,request_key),
 pickup_address VARCHAR(255) NOT NULL, pickup_district VARCHAR(80) NOT NULL, pickup_lat DECIMAL(10,6) NOT NULL, pickup_lng DECIMAL(10,6) NOT NULL,
 destination_name VARCHAR(180) NOT NULL, scheduled_date DATE NOT NULL, scheduled_time VARCHAR(15) NOT NULL, is_peak_hour BOOLEAN NOT NULL,
 model_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL, model_dimensions VARCHAR(80) NOT NULL, model_material VARCHAR(100) NOT NULL, care_notes TEXT,
 distance_km DECIMAL(6,2) NOT NULL, traffic_minutes INT NOT NULL, base_fare DECIMAL(8,2) NOT NULL, distance_fare DECIMAL(8,2) NOT NULL,
 traffic_fare DECIMAL(8,2) NOT NULL, size_fare DECIMAL(8,2) NOT NULL, discount_amount DECIMAL(8,2) NOT NULL, total_paid DECIMAL(8,2) NOT NULL,
 insurance_fee DECIMAL(8,2) NOT NULL DEFAULT 0, discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0, discount_kind VARCHAR(24),
 insurance_policy_code VARCHAR(40) NULL UNIQUE, insurance_limit_pen DECIMAL(8,2) NOT NULL,
 payment_method VARCHAR(30) NOT NULL, payment_approval_code VARCHAR(80),
 status ENUM('CONFIRMED','AT_PICKUP','IN_TRANSIT','COMPLETED') NOT NULL DEFAULT 'CONFIRMED',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(driver_id) REFERENCES drivers(id), FOREIGN KEY(student_subscription_id) REFERENCES student_subscriptions(id),
 INDEX idx_student_trips(student_id,status,scheduled_date), CONSTRAINT chk_paid CHECK(total_paid >= 0)
);
CREATE TABLE IF NOT EXISTS safety_photo_acts (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id INT UNSIGNED NOT NULL, stage ENUM('BEFORE_PICKUP','AFTER_DELIVERY') NOT NULL,
 photo_url MEDIUMTEXT NOT NULL, captured_location VARCHAR(255) NOT NULL, captured_at DATETIME NOT NULL,
 verified BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE KEY uq_stage(trip_id,stage), FOREIGN KEY(trip_id) REFERENCES trips(id)
);
CREATE TABLE IF NOT EXISTS trip_ratings (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id INT UNSIGNED NOT NULL UNIQUE, driver_id INT UNSIGNED NOT NULL,
 stars TINYINT NOT NULL, praise_tags JSON NOT NULL, comment TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id), FOREIGN KEY(driver_id) REFERENCES drivers(id), CONSTRAINT chk_stars CHECK(stars BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS app_settings(setting_key VARCHAR(64) PRIMARY KEY,numeric_value DECIMAL(8,2) NOT NULL);

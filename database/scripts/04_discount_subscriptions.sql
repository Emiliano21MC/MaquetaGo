-- Migración no destructiva: descuentos recurrentes y microseguro opcional.
USE maquetago_db;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_plans' AND COLUMN_NAME='discount_percent')=0,'ALTER TABLE subscription_plans ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0','SELECT 1');
PREPARE migration_stmt FROM @ddl; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='insurance_fee')=0,'ALTER TABLE trips ADD COLUMN insurance_fee DECIMAL(8,2) NOT NULL DEFAULT 0','SELECT 1');
PREPARE migration_stmt FROM @ddl; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='discount_percent')=0,'ALTER TABLE trips ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0','SELECT 1');
PREPARE migration_stmt FROM @ddl; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='discount_kind')=0,'ALTER TABLE trips ADD COLUMN discount_kind VARCHAR(24) NULL','SELECT 1');
PREPARE migration_stmt FROM @ddl; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;
UPDATE subscription_plans SET discount_percent=CASE code WHEN 'MONTHLY' THEN 15 WHEN 'SEMESTER' THEN 25 WHEN 'ANNUAL' THEN 30 ELSE discount_percent END;
CREATE TABLE IF NOT EXISTS app_settings(setting_key VARCHAR(64) PRIMARY KEY,numeric_value DECIMAL(8,2) NOT NULL);
INSERT INTO app_settings(setting_key,numeric_value) VALUES('MICRO_INSURANCE_FEE',2.00) ON DUPLICATE KEY UPDATE numeric_value=VALUES(numeric_value);
UPDATE trips SET discount_kind=CASE WHEN student_subscription_id IS NOT NULL AND total_paid=0 THEN 'LEGACY_INCLUDED' WHEN discount_amount>0 THEN 'FIRST_TRIP' ELSE 'REGULAR' END,discount_percent=CASE WHEN (base_fare+distance_fare+traffic_fare+size_fare)>0 THEN ROUND(discount_amount/(base_fare+distance_fare+traffic_fare+size_fare)*100,2) ELSE 0 END WHERE discount_kind IS NULL;
SET @ddl=IF((SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='insurance_policy_code')='NO','ALTER TABLE trips MODIFY COLUMN insurance_policy_code VARCHAR(40) NULL','SELECT 1');
PREPARE migration_stmt FROM @ddl; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

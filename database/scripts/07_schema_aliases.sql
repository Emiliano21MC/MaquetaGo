USE maquetago_db;
-- Nombres de compatibilidad: los endpoints conservan sus tablas canónicas.
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='student_cards')=0,'CREATE SQL SECURITY INVOKER VIEW student_cards AS SELECT id,student_id,brand,last4,holder_name,exp_month,exp_year,is_default,created_at FROM student_payment_methods','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='plans')=0,'CREATE SQL SECURITY INVOKER VIEW plans AS SELECT * FROM subscription_plans','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academic_alerts')=0,'CREATE SQL SECURITY INVOKER VIEW academic_alerts AS SELECT * FROM academic_calendar_events','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

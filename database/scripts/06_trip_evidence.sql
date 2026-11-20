USE maquetago_db;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='before_photo_url')=0,'ALTER TABLE trips ADD COLUMN before_photo_url VARCHAR(160) NULL','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trips' AND COLUMN_NAME='after_photo_url')=0,'ALTER TABLE trips ADD COLUMN after_photo_url VARCHAR(160) NULL','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE trips t JOIN safety_photo_acts p ON p.trip_id=t.id AND p.stage='BEFORE_PICKUP' SET t.before_photo_url=CONCAT('/trips/',t.id,'/safety-photo/BEFORE_PICKUP') WHERE t.before_photo_url IS NULL;
UPDATE trips t JOIN safety_photo_acts p ON p.trip_id=t.id AND p.stage='AFTER_DELIVERY' SET t.after_photo_url=CONCAT('/trips/',t.id,'/safety-photo/AFTER_DELIVERY') WHERE t.after_photo_url IS NULL;

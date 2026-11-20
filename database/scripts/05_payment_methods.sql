USE maquetago_db;
CREATE TABLE IF NOT EXISTS student_payment_methods (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 student_id INT UNSIGNED NOT NULL,
 brand ENUM('Visa','Mastercard','Amex') NOT NULL,
 last4 CHAR(4) NOT NULL,
 holder_name VARCHAR(120) NOT NULL,
 exp_month TINYINT UNSIGNED NOT NULL,
 exp_year SMALLINT UNSIGNED NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(student_id) REFERENCES students(id),
 INDEX idx_payment_student(student_id,is_default),
 CONSTRAINT chk_payment_month CHECK(exp_month BETWEEN 1 AND 12)
);

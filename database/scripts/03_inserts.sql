USE maquetago_db;
INSERT IGNORE INTO lima_pickup_zones (district_name,sample_address,latitude,longitude,distance_km_to_pucp,base_duration_min,map_x,map_y) VALUES
('San Miguel','Av. Universitaria 450, San Miguel',-12.0764,-77.0812,2.4,9,96,194),
('Pueblo Libre','Av. Simón Bolívar 920, Pueblo Libre',-12.0748,-77.0625,3.8,13,136,186),
('Jesús María','Av. General Garzón 1280, Jesús María',-12.0782,-77.0491,5.4,16,160,196),
('Lince','Jr. León Velarde 310, Lince',-12.0846,-77.0378,6.5,19,168,204),
('San Borja','Av. San Borja Norte 640, San Borja',-12.0941,-76.9998,11.4,28,198,218),
('Miraflores','Av. José Larco 450, Miraflores',-12.1219,-77.0298,10.2,26,156,250),
('Santiago de Surco','Av. Primavera 1240, Santiago de Surco',-12.1105,-76.9882,14.5,34,222,244),
('Los Olivos','Av. Carlos Izaguirre 810, Los Olivos',-11.9912,-77.0634,14.8,35,122,88),
('Comas','Av. Túpac Amaru 3450, Comas',-11.9541,-77.0489,19.6,44,154,46);
INSERT IGNORE INTO subscription_plans (code,name,period_label,price_pen,included_rides,validity_days,insurance_limit_pen,badge_text,discount_percent) VALUES
('MONTHLY','Plan Mensual','mes',68,4,30,200,NULL,15),
('SEMESTER','Plan Semestral · Ciclo Completo','4 meses',240,16,120,300,'Recomendado',25),
('ANNUAL','Plan Anual · 2 Ciclos','8 meses',432,32,240,300,'Mejor valor',30);
-- Fechas de referencia del mockup, no calendario oficial verificado.
INSERT IGNORE INTO academic_calendar_events (title,course_label,event_date,recommended_time,semester_code) VALUES
('Entrega Parcial de Taller','Taller de Arquitectura','2026-11-26','08:00 AM','2026-2'),
('Crítica General Pre-Entrega','Taller de Arquitectura','2026-12-04','10:00 AM','2026-2'),
('Entrega Final de Taller (Jurado)','Taller de Arquitectura','2026-12-14','07:00 AM','2026-2');
INSERT IGNORE INTO drivers (full_name,rating,completed_trips,vehicle_model,vehicle_color,license_plate,has_flat_platform) VALUES
('Carlos Mendoza',4.9,342,'Toyota Avanza 2024','Gris Plata','B4K-819',TRUE);
-- No se crean cuentas de estudiantes ficticias al inicializar.

INSERT IGNORE INTO app_settings(setting_key,numeric_value) VALUES('MICRO_INSURANCE_FEE',2.00);

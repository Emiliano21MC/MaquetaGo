-- DESTRUCTIVO. Ejecutar únicamente para reiniciar deliberadamente MaquetaGo.
CREATE DATABASE IF NOT EXISTS maquetago_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maquetago_db;
DROP TABLE IF EXISTS trip_ratings;
DROP TABLE IF EXISTS safety_photo_acts;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS student_subscriptions;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS student_academic_reminders;
DROP TABLE IF EXISTS academic_calendar_events;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS lima_pickup_zones;
DROP TABLE IF EXISTS student_payment_methods;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS app_settings;
-- DROP DATABASE IF EXISTS maquetago_db;

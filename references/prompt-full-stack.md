# Guía de Implementación Full-Stack y Prompt Maestro para Codex — **MaquetaGo**

Este documento contiene toda la arquitectura, scripts de base de datos **MySQL Workbench** y el **Prompt Maestro** para que **Codex** implemente en VS Code tanto la **aplicación móvil (Expo + React Native + TypeScript)** como el **Backend REST API (Node.js + Express + TypeScript + MySQL)** replicando fielmente el diseño y comportamiento de `maquetago_splash_mockup.html`.

---

## 1. Archivos que debes entregarle a Codex en VS Code

Coloca estos dos archivos en la raíz de tu workspace antes de ejecutar el prompt en Codex:
1. **`maquetago_splash_mockup.html`** (el mockup interactivo completo aprobado con todas las vistas, estilos y flujos).
2. **`codex_prompt_maquetago.md`** (este documento).

### Estructura de Carpetas del Proyecto Completo
```text
MaquetaGo/
├── database/
│   └── scripts/
│       ├── 01_drop.sql          # Limpieza ordenada de tablas y base de datos
│       ├── 02_create.sql        # Creación de esquema maquetago_db y tablas relacionales
│       └── 03_inserts.sql       # Datos iniciales (distritos, tarifas, planes, calendario PUCP, conductor)
├── backend/
│   ├── .env                     # Credenciales MySQL local (127.0.0.1:3306, root, [CONFIGURADO EN backend/.env])
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/db.ts         # Pool de conexión mysql2/promise
│       ├── routes/              # auth, trips, locations, plans, academicAlerts
│       ├── services/            # tariffCalculator.ts, otpService.ts
│       └── server.ts
└── mobile/                      # App Expo + React Native + TypeScript
    ├── App.tsx
    └── src/
        ├── theme/tokens.ts
        ├── types/models.ts
        ├── services/api.ts      # Cliente HTTP conectado al backend con fallback offline
        ├── context/AppContext.tsx
        ├── components/
        └── screens/
```

---

## 2. Credenciales Locales de MySQL Workbench

El backend debe configurarse para conectarse directamente a tu instancia local de MySQL Workbench:

* **JDBC / Host URL:** `jdbc:mysql://127.0.0.1:3306` (`DB_HOST=127.0.0.1`, `DB_PORT=3306`)
* **Base de Datos:** `maquetago_db`
* **Usuario:** `root`
* **Contraseña:** `[CONFIGURADO EN backend/.env]`

---

## 3. Prompt Maestro para Codex (Copiar y Pegar en VS Code)

> Copia todo el bloque siguiente y pégalo en Codex:

```text
Actúa como un Arquitecto Full-Stack Senior especializado en React Native (Expo + TypeScript), Node.js/Express (TypeScript) y MySQL. Tu objetivo es construir el proyecto completo **MaquetaGo** en este workspace siguiendo fielmente el diseño visual, las reglas de negocio y el flujo de usuario definidos en `maquetago_splash_mockup.html`.

### 1. REGLA DE TONO Y EXPERIENCIA DE USUARIO (OBLIGATORIA)
- Toda la interfaz móvil debe diseñarse y redactarse como un producto comercial real y corporativo para estudiantes de Arquitectura que viajan hacia la **Facultad de Arquitectura y Urbanismo - PUCP** (Av. Universitaria 1801, San Miguel, Lima).
- **PROHIBIDO** usar palabras como "simulado", "simulación", "prototipo", "demo" o "ficticio" dentro de la interfaz de usuario de la app móvil.
- Únicamente en el pie de `ProfileScreen` incluye la nota discreta: `"Servicio independiente de movilidad estudiantil · No afiliado oficialmente a la PUCP."`

---

### 2. PARTE A: BASE DE DATOS MYSQL (`database/scripts/`)
Crea la carpeta `database/scripts/` con tres scripts SQL 100% compatibles con **MySQL 8.0 / MySQL Workbench**:

1. **`database/scripts/01_drop.sql`**:
   - Elimina en orden seguro por llaves foráneas las tablas (`trip_ratings`, `safety_photo_acts`, `trips`, `student_subscriptions`, `subscription_plans`, `student_academic_reminders`, `academic_calendar_events`, `drivers`, `lima_pickup_zones`, `students`) y opcionalmente `DROP DATABASE IF EXISTS maquetago_db;`.

2. **`database/scripts/02_create.sql`**:
   - Crea `CREATE DATABASE IF NOT EXISTS maquetago_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE maquetago_db;` y las siguientes tablas con sus claves primarias, foráneas e índices:
     - `students`: `id` (INT AI PK), `full_name`, `institutional_email` (UNIQUE, validado `@pucp.edu.pe`), `password_hash`, `is_verified_pucp` (BOOLEAN DEFAULT FALSE), `otp_code` (VARCHAR(6)), `otp_expires_at` (DATETIME), `promo_80_used` (BOOLEAN DEFAULT FALSE), `plans_unlocked` (BOOLEAN DEFAULT FALSE), `created_at`.
     - `lima_pickup_zones`: `id`, `district_name`, `sample_address`, `latitude` (DECIMAL 10,6), `longitude` (DECIMAL 10,6), `distance_km_to_pucp` (DECIMAL 5,2), `base_duration_min` (INT).
     - `drivers`: `id`, `full_name`, `rating` (DECIMAL 2,1), `completed_trips` (INT), `vehicle_model`, `vehicle_color`, `license_plate`, `has_flat_platform` (BOOLEAN DEFAULT TRUE).
     - `academic_calendar_events`: `id`, `title`, `course_label`, `event_date` (DATE), `recommended_time` (VARCHAR(15)), `semester_code`.
     - `student_academic_reminders`: `id`, `student_id` (FK), `event_id` (FK), `remind_hours_before` (INT DEFAULT 48), `is_active` (BOOLEAN).
     - `subscription_plans`: `id`, `code` (`MONTHLY`, `SEMESTER`, `ANNUAL`), `name`, `period_label`, `price_pen` (DECIMAL 8,2), `included_rides` (INT), `validity_days` (INT), `insurance_limit_pen` (DECIMAL 8,2), `badge_text`.
     - `student_subscriptions`: `id`, `student_id` (FK), `plan_id` (FK), `remaining_rides` (INT), `start_date` (DATE), `end_date` (DATE), `payment_method`, `payment_ref`, `is_active` (BOOLEAN).
     - `trips`: `id`, `reservation_code` (UNIQUE, ej. `#MG-2048`), `student_id` (FK), `driver_id` (FK), `student_subscription_id` (FK NULL), `pickup_address`, `pickup_district`, `pickup_lat`, `pickup_lng`, `destination_name`, `scheduled_date` (DATE), `scheduled_time` (VARCHAR(15)), `is_peak_hour` (BOOLEAN), `model_size` (`SMALL`, `MEDIUM`, `LARGE`), `model_dimensions`, `model_material`, `care_notes`, `distance_km`, `traffic_minutes`, `base_fare`, `distance_fare`, `traffic_fare`, `size_fare`, `discount_amount`, `total_paid`, `insurance_policy_code`, `insurance_limit_pen`, `payment_method`, `payment_approval_code`, `status` (`CONFIRMED`, `AT_PICKUP`, `IN_TRANSIT`, `COMPLETED`), `created_at`.
     - `safety_photo_acts`: `id`, `trip_id` (FK), `stage` (`BEFORE_PICKUP`, `AFTER_DELIVERY`), `photo_url` (TEXT), `captured_location`, `captured_at` (DATETIME), `verified` (BOOLEAN DEFAULT TRUE).
     - `trip_ratings`: `id`, `trip_id` (FK UNIQUE), `driver_id` (FK), `stars` (TINYINT), `praise_tags` (JSON), `comment` (TEXT), `created_at`.

3. **`database/scripts/03_inserts.sql`**:
   - Inserta los 9 distritos de Lima con sus distancias y tiempos hacia PUCP (`San Miguel 2.4km`, `Pueblo Libre 3.8km`, `Jesús María 5.4km`, `Lince 6.5km`, `Miraflores 10.2km`, `San Borja 11.4km`, `Santiago de Surco 14.5km`, `Los Olivos 14.8km`, `Comas 19.6km`).
   - Inserta los 3 planes de suscripción:
     - `Plan Mensual` (`S/ 68.00`, 4 traslados, 30 días, MaquetaSegura hasta `S/ 200.00`).
     - `Plan Semestral · Ciclo Completo` (`S/ 240.00`, 16 traslados, 120 días, MaquetaSegura hasta `S/ 300.00`, badge `Recomendado`).
     - `Plan Anual · 2 Ciclos` (`S/ 432.00`, 32 traslados, 240 días, MaquetaSegura hasta `S/ 300.00`, badge `Mejor valor`).
   - Inserta los 3 hitos del Calendario Académico PUCP (`Entrega Parcial de Taller`, `Crítica General Pre-Entrega`, `Entrega Final de Taller (Jurado)`).
   - Inserta al conductor verificado `Carlos Mendoza` (`4.9 ★`, `342` entregas, `Toyota Avanza 2024 · Gris Plata`, placa `B4K-819`) y la cuenta inicial de `Valeria Mendoza` (`valeria.mendoza@pucp.edu.pe`).

---

### 3. PARTE B: BACKEND NODE.JS + EXPRESS + TYPESCRIPT (`backend/`)
Crea un servidor REST API en `backend/` conectado a MySQL usando `mysql2/promise`:
- Configura `backend/.env` con:
  - `PORT=3001`
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=3306`
  - `DB_USER=root`
  - `DB_PASSWORD=[CONFIGURADO EN backend/.env]`
  - `DB_NAME=maquetago_db`
  - `GOOGLE_MAPS_API_KEY=` (con integración real a Google Places/Distance Matrix cuando exista la clave y cálculo geodésico Haversine + factor tráfico Lima como respaldo automático).
- Endpoints principales:
  - `POST /api/auth/login-or-register`: Valida estrictamente dominio `@pucp.edu.pe`, genera código OTP de 6 dígitos y lo guarda en `students`.
  - `POST /api/auth/verify-otp`: Valida el código OTP, marca `is_verified_pucp = 1` y retorna el perfil con el beneficio del 80% activo.
  - `GET /api/locations/quote`: Calcula la tarifa real según distancia, hora punta/valle y tamaño de maqueta.
  - `GET /api/academic-events/:studentId` y `POST /api/academic-events/toggle-reminder`: Gestiona alertas del calendario académico (48h antes).
  - `POST /api/trips`: Crea la reserva, asigna conductor verificado, genera póliza `MaquetaSegura` (`#MS-XXXX`), registra pago Yape/Tarjeta o descuenta traslado de `student_subscriptions`, y marca `promo_80_used = 1` si aplicó el descuento.
  - `POST /api/trips/:id/safety-photo`: Registra el Acta Fotográfica de Seguridad (`BEFORE_PICKUP` y `AFTER_DELIVERY`).
  - `PATCH /api/trips/:id/status` y `POST /api/trips/:id/rating`: Marca el viaje como `COMPLETED`, registra la calificación con estrellas/etiquetas y desbloquea `plans_unlocked = 1` en `students`.
  - `GET /api/plans` y `POST /api/subscriptions`: Lista los planes Mensual, Semestral y Anual y activa la suscripción elegida.

---

### 4. PARTE C: APLICACIÓN MÓVIL EXPO + REACT NATIVE + TYPESCRIPT (`mobile/`)
Implementa la app móvil replicando exactamente el diseño corporativo y minimalista de `maquetago_splash_mockup.html`:
- **Estética:** Splash Screen oscuro `#0F2537` con trazado isométrico animado del logo MaquetaGo (`react-native-svg` + `Animated`) que transiciona suavemente al flujo de acceso. Pantallas internas en fondo `#FFFFFF` y papel técnico `#F8FAFC`, bordes finos `1px solid #CBD5E1`, acentos en turquesa `#0D9488` y tipografía tabular.
- **Pantallas y Flujos:**
  1. `SplashScreen` -> `SignInScreen` / `SignUpScreen` (Google Auth + formulario institucional `@pucp.edu.pe`) -> `VerifyOtpScreen` (código OTP de 6 dígitos que otorga la insignia `✓ Estudiante Verificado PUCP`).
  2. `HomeScreen`: Saludo, insignia verificada, tarjeta de cuota si tiene suscripción, tarjeta de reserva principal con selector de punto de recojo hacia `Facultad de Arquitectura y Urbanismo - PUCP`, módulo de **Alertas de Calendario Académico** (con botón de aviso `48h` y enlace directo `Agendar`), y tarjeta de suscripciones bloqueadas hasta completar el primer viaje.
  3. `MapPickerScreen`: Buscador con autocompletado de distritos/direcciones de Lima y mapa interactivo con pin arrastrable que actualiza coordenadas, dirección exacta, distancia en `km` y tiempo estimado.
  4. `TripDetailsScreen`: Calendario mensual completo (sin límite de 3 días), selector de horario con etiqueta de tráfico (`Hora punta` vs. `Fluido`), tamaño con dimensiones explícitas (`Pequeña: Hasta 40 × 40 cm`, `Mediana: Hasta 80 × 60 cm`, `Gran Formato: Hasta 120 × 80 cm`), material predominante, comentarios, tarjeta de **Garantía MaquetaSegura** (cobertura hasta `S/ 150.00` o `S/ 300.00` con plan) y desglose en vivo de la fórmula de tarifa real:
     `Tarifa = Base (S/ 8.00) + (Km × S/ 1.80) + (Min tráfico × S/ 0.25) + Factor Tamaño`.
  5. `PaymentScreen`: Pasarela limpia con **Yape** (QR vectorial + código de aprobación de 6 dígitos) o **Tarjeta** (guardada o nueva), o cargo directo a suscripción activa.
  6. `ActiveTripScreen`: Stepper de progreso, ficha de conductor (`Carlos Mendoza · 4.9 ★ · Toyota Avanza B4K-819`), póliza `MaquetaSegura`, **Acta Fotográfica de Seguridad** interactiva (`1. Antes del traslado` al recoger y `2. Después del traslado` en PUCP usando `expo-image-picker` con respaldo de captura rápida) y botón `"Marcar viaje como completado"`.
  7. `RatingScreen`: Calificación de 1 a 5 estrellas, etiquetas rápidas y comentario; al enviar, desbloquea los planes.
  8. `PlansScreen`, `TripsScreen` y `ProfileScreen`: Contratación de **Plan Mensual**, **Plan Semestral · Ciclo Completo** o **Plan Anual · 2 Ciclos**, historial con actas y calificaciones, y gestión de perfil.

Genera todos los archivos completos, bien tipados en TypeScript y listos para ejecutar sin errores.
```

---

## 4. Orden Recomendado de Ejecución en VS Code

1. **En MySQL Workbench:** Abre y ejecuta en orden:
   - `database/scripts/01_drop.sql`
   - `database/scripts/02_create.sql`
   - `database/scripts/03_inserts.sql`
2. **En la terminal del Backend (`backend/`):**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. **En la terminal de la App Móvil (`mobile/`):**
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
# MaquetaGo · ejecución full-stack

La app Expo existente permanece en la raíz de `MiAplicacion` para conservar su configuración, Expo Router y comandos. `backend/` contiene la API Express/TypeScript y `database/scripts/` los scripts MySQL. `shared/tariff.ts` comparte la fórmula entre app y servidor. Las nuevas referencias están en `references/mockup_completo.html` y `references/prompt-full-stack.md`.

## Estado local

Se crearon `maquetago_db`, sus tablas y los catálogos en la instancia local de MySQL. Se ejecutaron únicamente `02_create.sql` y `03_inserts.sql`; `01_drop.sql` es destructivo y no se ejecutó. Los scripts son compatibles con MySQL 8.0.16+; la instancia disponible usa MySQL 8.4.

`backend/.env` contiene las credenciales locales solicitadas y un secreto de sesión aleatorio. Está excluido de Git. Nunca colocar la contraseña MySQL o el secreto JWT en variables `EXPO_PUBLIC_*`.

## Iniciar

En una terminal desde la raíz:

```powershell
npm.cmd install --prefix backend
npm.cmd run db:init --prefix backend
npm.cmd run dev --prefix backend
```

En otra terminal desde la raíz:

```powershell
npm.cmd install
npx.cmd expo start
```

La API escucha en `http://localhost:3001/api`; `GET /api/health` comprueba la conexión MySQL. Para compilar el backend: `npm.cmd run build --prefix backend`; para ejecutarlo compilado: `npm.cmd start --prefix backend`.

También se puede iniciar directamente desde una terminal de VS Code con:

```powershell
cd "C:\Users\Emiliano MC\MiAplicacion"
npm.cmd run backend
```

Dejar esa terminal abierta mientras se usa la app. El `.env` de Expo define `EXPO_PUBLIC_API_URL=http://localhost:3001/api`; conservar el sufijo `/api`, ya que los métodos del cliente añaden rutas como `/auth/login-or-register`. En desarrollo, CORS permite `localhost:8081`, `localhost:8082`, `localhost:8083` y `localhost:19006`, además de los orígenes explícitos de `CORS_ORIGINS`. En producción sólo se utiliza la lista configurada. La API carga siempre `backend/.env`, tanto desde código fuente como desde el resultado compilado, sin depender de la carpeta actual de la terminal.

### Teléfono físico

Crear `.env.local` en la raíz con `EXPO_PUBLIC_API_URL=http://IP_LAN_DEL_EQUIPO:3001/api`, reiniciar Expo y conectar teléfono y equipo a la misma red. Android Emulator usa `10.0.2.2` y web/iOS Simulator usan `localhost` por defecto. En producción usar HTTPS. `CORS_ORIGINS` acepta los orígenes web autorizados; no afecta a la app nativa.

Las dependencias nativas nuevas se configuran mediante plugins en `app.json`; crear un development build compatible para probar cámara, SecureStore y notificaciones en dispositivos. No se editaron carpetas nativas.

## Acceso y OTP

Sólo se aceptan correos `@pucp.edu.pe`. Se guardan hashes bcrypt de contraseñas y HMAC de OTP, nunca el código en claro en la tabla. El código vence en 10 minutos, tiene cinco intentos y se consume al verificar. Hay límite de peticiones y espera entre reenvíos. La contraseña inicial o recuperada sólo se aplica después del OTP.

La cuenta inicial es `valeria.mendoza@pucp.edu.pe`, sin contraseña predeterminada. En su primer acceso se puede elegir una contraseña y verificar el OTP. La entrega SMTP se activa automáticamente cuando existen `SMTP_USER` y `SMTP_PASS`, independientemente del valor anterior de `OTP_DELIVERY`. El entorno local quedó configurado con Gmail, TLS implícito y puerto 465. Las credenciales reales sólo están en `backend/.env`, excluido de Git.

El servicio `backend/src/services/mailer.ts` envía un correo HTML y texto con marca MaquetaGo, código de seis dígitos y vigencia de 10 minutos. Usa `SMTP_PASS` (no `SMTP_PASSWORD`) y `SMTP_FROM` es opcional: por defecto, el remitente es MaquetaGo con la dirección `SMTP_USER`. La API guarda primero el hash del código y el vencimiento UTC en `students`; no almacena el código en claro. Si el correo falla, invalida el desafío y permite reintentar. Con SMTP configurado, responde `devCode: null`, nunca incluye `developmentCode` y nunca cambia silenciosamente al modo local. Sólo sin credenciales SMTP y fuera de producción devuelve `devCode` para desarrollo. La pantalla oculta el recuadro local con `devCode` nulo o vacío y muestra el aviso de bandeja de entrada/spam.

Verificar TLS y autenticación sin enviar mensajes:

```powershell
npm.cmd run smtp:verify --prefix backend
```

Esta comprobación pasó con Gmail. No se envió un correo real de prueba a un estudiante; la recepción en la bandeja se comprobará en el siguiente registro, acceso por contraseña o recuperación.

El botón Google usa AuthSession y el backend verifica el ID token con Google, audiencia y dominio institucional. La configuración web usa `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en el `.env` de la raíz y `GOOGLE_CLIENT_ID` en `backend/.env`. `GOOGLE_CLIENT_SECRET` se guarda exclusivamente en el backend; la verificación actual de ID tokens no requiere enviar ese secreto. `GOOGLE_CLIENT_IDS` permite audiencias adicionales por compatibilidad. Los ejemplos sólo contienen nombres y valores vacíos para estas variables.

Registrar el origen web y la URI de redirección utilizados en Google Cloud Console. En web se usa exactamente `window.location.origin`: al abrir la app en `http://localhost:8082`, registrar ese origen y `http://localhost:8082` como URI de redirección. No cambiar de puerto, de `localhost` a `127.0.0.1`, ni recargar la ventana principal mientras está abierto el popup. Reiniciar Expo después de cambiar `.env` para actualizar el cliente incluido en el bundle. Android e iOS requieren sus respectivos `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` y un development build con esquemas registrados. El botón valida la configuración de la plataforma actual.

Google inicia sesión directamente: la app completa el popup en el layout raíz antes de las redirecciones, procesa `response` una sola vez y envía `id_token` o `access_token` a `/api/auth/google`. Para ID tokens se verifica firma, emisor, audiencia y vigencia mediante Google Auth Library; para access tokens se consulta su audiencia/vigencia y el perfil oficial de Google. Ambos requieren correo verificado `@pucp.edu.pe` y dominio alojado PUCP. El backend devuelve JWT y cuenta, conservando los beneficios existentes. La app persiste la sesión y usa `router.replace('/(tabs)')`. Google ya no solicita un OTP adicional; el acceso por contraseña conserva su flujo OTP. Los errores se muestran bajo el botón Google. No se probó acceso con una cuenta real del usuario.

Las sesiones móviles se almacenan en SecureStore; en web se usa localStorage, con lectura de sesiones antiguas de sessionStorage para compatibilidad. La cuenta se conserva en contexto y caché AsyncStorage. Cerrar sesión elimina ambas ubicaciones del token web, caché activa y avisos locales de ese estudiante. El modo sin conexión permite consultar la caché; no inventa confirmaciones, OTP válidos ni pagos.

## Tarifas y reservas

La API calcula base S/ 8 + km × S/ 1.80 + minutos × S/ 0.25 + tamaño (0/3/6). Distancia y tráfico conservan el redondeo a S/ 0.10; descuentos y total se redondean a céntimos. Horas punta: 07:00–08:59 y 17:00–19:59, minutos locales × 1.35. Sin plan, el primer viaje verificado recibe 80% de descuento; después corresponde tarifa regular. Un plan vigente aplica su descuento recurrente en cada viaje. El servidor consulta la promoción y la suscripción en MySQL, bloquea al estudiante durante la reserva y usa claves de idempotencia.

Planes opcionales: mensual 15% (S/ 68, 30 días), semestral 25% (S/ 240, 120 días), anual 30% (S/ 432, 240 días). Se ofrecen al completar y calificar el primer viaje; se pueden omitir para seguir reservando a tarifa regular. Cada viaje se paga por separado; no se consumen cuotas de viajes. MaquetaSegura es opcional y suma S/ 2.00 después del descuento. Los porcentajes y el cargo se guardan en MySQL.

La migración idempotente database/scripts/04_discount_subscriptions.sql agrega descuentos, configuración de precios y metadatos sin cambiar importes históricos. npm run db:init ejecuta 02, 04 y 03. Las columnas de cuotas se conservan por compatibilidad histórica. /api/me devuelve promo_80_used, plans_unlocked y active_subscription, además de los campos usados por la app.

El mapa web usa Leaflet 1.9.4, tiles oficiales de OpenStreetMap y atribución visible © OpenStreetMap contributors. El destino fijo es Arquitectura PUCP (-12.0695, -77.0794). El recojo inicial es Larco 450, Miraflores (-12.1219, -77.0297). Click o arrastre obtiene dirección por /api/maps/reverse y ruta por /api/trips/quote; búsqueda por /api/maps/search. Mi ubicación usa geolocalización del navegador (HTTPS o localhost y permiso); en móvil usa Expo Location. Leaflet se importa dentro de un efecto en un archivo .web.tsx para evitar DOM en SSR y bundles nativos. En móvil se puede elegir por búsqueda/GPS; el mapa visual requiere web.

Nominatim público prohíbe autocompletar, por lo que la búsqueda se envía con botón o Enter, sin peticiones al escribir. Política: https://operations.osmfoundation.org/policies/nominatim/. El proxy identifica MaquetaGo-PUCP-App/1.0, limita búsquedas y reverse a una petición cada 1,1 segundos y comparte caché/deduplicación. Esto está preparado para una instancia de Node; varias réplicas requieren una cola/caché compartida. No enviar datos personales en búsquedas. NOMINATIM_BASE_URL y OSRM_BASE_URL permiten sustituir los servicios desde el backend. Son servicios públicos sin garantía de disponibilidad; para mayor escala se necesitan instancias propias o un proveedor adecuado.

OSRM calcula geometría real por carretera, kilómetros = distance/1000 y minutos = round(duration/60 × 1.35). El ajuste urbano es una estimación, no tráfico en vivo. Cotización y creación de viajes usan el mismo servicio y reglas de MySQL; no se inventa una ruta ante un fallo. La pantalla impide confirmar/pagar mientras falta una cotización por carretera. Los usuarios se autentican por JWT y studentId, si se proporciona, debe coincidir con la sesión.

## Pagos y protección

`PAYMENT_MODE=local` registra referencias de pago en MySQL, valida el formato de seis dígitos de Yape y permite recorrer el flujo. No verifica operaciones Yape ni cobra tarjetas. El QR y VISA 4829 son gráficos de referencia. No transferir dinero usando ese QR. Antes de cobrar se necesita QR de comercio, pasarela/tokenización y confirmación de pago por servidor. La app no envía ni persiste número completo de tarjeta o CVV. Producción bloquea el modo local; no hay un proveedor comercial configurado.

Los códigos `#MS-...` son registros internos de MaquetaSegura; no son pólizas emitidas por una aseguradora. No se ha contratado cobertura real. Los códigos de reserva y protección son únicos.

## Actas y calendario

Las fotografías deben seleccionarse o capturarse realmente. Galería es el respaldo cuando no hay cámara. Se guardan la imagen, etapa, ubicación declarada y fecha del servidor. No se fabrican evidencias al avanzar. Las fotos se muestran como registradas y quedan `verified=0` hasta una revisión independiente; no hay verificación automática de autenticidad. Se requiere acta de recojo antes de salir y ambas actas antes de completar. El historial conserva fotos y opiniones.

Las respuestas de perfil y viajes sólo contienen referencias a las imágenes. Cada fotografía se descarga con autenticación al abrir el detalle, para no cargar el historial completo de imágenes en cada consulta ni en la caché general.

Las alertas completas y sus endpoints requieren un plan ACTIVE vigente; se ocultan sin plan o al vencer y se cancelan los avisos locales. El calendario usa las fechas del HTML como datos de referencia; no constituye calendario oficial PUCP. Los avisos se guardan en MySQL y se programan en el dispositivo móvil 48 horas antes con permiso de notificaciones. En web se guarda la preferencia, sin aviso del sistema. No se implementó un servicio de push remoto o correo para recordatorios; si el estudiante cambia de teléfono, debe volver a activar el aviso en ese dispositivo.

## Verificar

La regresión de suscripciones comprueba los tres estados de Home, el ocultamiento del calendario, su acceso con plan vigente y el botón para continuar sin plan mediante renderizado de componentes. Las pruebas API/MySQL comprueban reserva regular sin plan, seguro de S/ 2.00, descuentos 15%/25%/30%, ausencia de cuotas y exclusión de planes vencidos, inactivos o futuros. No envían correos reales.

```powershell
npx.cmd expo lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run test:google-popup
npm.cmd run typecheck --prefix backend
npm.cmd test --prefix backend
npm.cmd run build --prefix backend
```

Las pruebas de integración usan MySQL y crean exclusivamente cuentas `test.<UUID>@pucp.edu.pe` o cuentas de prueba equivalentes con UUID; eliminan sus propios registros al terminar. No borran ni modifican la cuenta inicial. Cubren OTP, token, aislamiento, cálculo, concurrencia/idempotencia, actas, estados, opinión, desbloqueo, planes opcionales, descuentos recurrentes, seguro y vencimiento de suscripción. Los trabajadores de pruebas desactivan credenciales SMTP o sustituyen el transporte por uno controlado; no envían correos reales incluso si `backend/.env` contiene credenciales válidas. Las pruebas de pagos requieren `PAYMENT_MODE=local`.

SMTP está cubierto por pruebas de configuración TLS, plantilla, ocultación del código, vencimiento, guardado antes del envío, recuperación e invalidación tras error. Pasaron 11 pruebas del backend, lint y TypeScript.

Verificados: lint, TypeScript móvil, siete grupos de pruebas de negocio, integración contra MySQL, compilación del backend y exportaciones de bundles para web, Android e iOS. En navegador a 390 × 844 se verificaron registro institucional, OTP, inicio con calendario, desglose del traslado, confirmación local y detalle de la reserva guardada. Evidencia en `artifacts/maquetago-movil.png`. Las exportaciones no son APK/IPA firmados. Quedan por probar cámara, galería y notificaciones en dispositivos físicos; las integraciones con credenciales externas no se probaron sin sus claves.

La regresión Google incluye extracción de ambos tokens en el frontend, siete pruebas del backend (incluyen API/MySQL y proveedor Google controlado), sesión directa sin OTP, conservación de beneficios y errores SQL. `test:google-popup` ejecuta la implementación web instalada de Expo en dos contextos de ventana de prueba: confirma que el callback `http://localhost:8082/#state=...&access_token=...` completa el resultado y cierra el popup, manteniendo la comprobación de origen. No usa credenciales Google reales ni habilita atajos de autenticación en producción. En el navegador integrado se comprobó la apertura del flujo; el acceso real con una cuenta del usuario sigue pendiente. Después de actualizar, cerrar popups antiguos y recargar la ventana principal antes de iniciar un nuevo intento.


## Evidencias del traslado

La migración 06_trip_evidence.sql añade before_photo_url y after_photo_url a trips sin duplicar imágenes: son referencias autenticadas a safety_photo_acts, donde permanece el contenido en MySQL. POST /api/trips/:id/evidence conserva el alias safety-photo, permite la primera evidencia desde CONFIRMED y desbloquea la segunda tras la primera. El acta de un viaje COMPLETED permanece cerrada. Cambiar foto actualiza la evidencia existente y su revisión SHA-256 invalida la miniatura anterior. Los horarios se guardan en UTC y se muestran en Lima.

En web la cámara solicita getUserMedia con video environment, ofrece vista previa y captura JPEG; detiene las pistas al cerrar o desmontar. Requiere HTTPS o localhost. Si no hay cámara o se deniega el permiso, se ofrece selector capture=environment; la galería usa un selector de archivos. En iOS/Android se solicitan permisos explícitos de cámara/galería con expo-image-picker; expo-image-manipulator reduce a 1600 px y JPEG 0.7 antes de subir. No se generan evidencias ficticias. La imagen referencial del Toyota Avanza plata se incluye localmente y tiene respaldo SVG.


## AWS RDS

El backend utiliza DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME de backend/.env. Para RDS se activa TLS con la CA pública oficial de us-east-1, validación de certificado e identidad (sin rejectUnauthorized=false). El pool permite 10 conexiones, espera conexiones disponibles, limita la cola a 100 y usa timeout de conexión de 15 segundos y keepalive. DB_SSL_CA_FILE puede apuntar a un certificado actualizado; el certificado público se incluye en backend/certs.

DB_INIT_ON_START=true inicializa y verifica el esquema antes de escuchar peticiones. También se puede ejecutar npm.cmd run db:init --prefix backend desde la raíz. Un bloqueo MySQL evita migraciones simultáneas; schema_migrations registra las aplicadas. Los scripts son idempotentes y no se ejecuta 01_drop.sql. No se crean estudiantes ficticios. Se conservan registros base existentes. Las columnas y el motor InnoDB se verifican al inicializar.

Los nombres canónicos usados por los endpoints son student_payment_methods, subscription_plans y academic_calendar_events. Las vistas SQL SECURITY INVOKER student_cards, plans y academic_alerts ofrecen los nombres alternativos sin duplicar datos. No se sobrescribe un objeto existente que ya tenga uno de esos nombres. Las fechas del calendario siguen siendo datos de referencia, no fechas oficiales verificadas de FAU-PUCP.

La inicialización usa credenciales con permisos CREATE/ALTER/CREATE VIEW y escritura de datos base; para despliegues con permisos separados, ejecutar db:init con el rol de migración y DB_INIT_ON_START=false para el proceso de la aplicación. Incluir database/scripts y backend/certs al desplegar. Nunca subir .env. Las pruebas de integración que crean datos de prueba deben ejecutarse contra una base aislada, no contra la base de producción. Para MySQL local, configurar DB_SSL=false.

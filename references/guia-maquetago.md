# Guía y Prompt Maestro para Implementar **MaquetaGo** en Codex

Este documento contiene todo lo necesario para que **Codex** implemente la aplicación móvil **MaquetaGo** en **Expo + React Native + TypeScript** replicando fielmente el diseño corporativo, las animaciones y el flujo interactivo aprobado en `maquetago_splash_mockup.html`.

---

## 1. ¿Qué debes pasarle a Codex?

Para obtener el mejor resultado, entrega a Codex los siguientes elementos en tu espacio de trabajo:

1. **El archivo HTML del mockup (`maquetago_splash_mockup.html`)** guardado en la raíz del proyecto como referencia visual y funcional exacta.
2. **El Prompt Maestro (Sección 2 de este documento)**, que contiene las instrucciones de arquitectura, componentes, reglas de negocio, diseño visual y restricciones de texto.
3. **Comandos iniciales de preparación (opcional, si inicias desde cero):**

```bash
npx create-expo-app@latest MaquetaGo --template blank-typescript
cd MaquetaGo
npx expo install react-native-svg react-native-safe-area-context react-native-screens @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
```

---

## 2. Prompt Maestro para Codex (Copiar y Pegar)

> Copia todo el bloque siguiente y pégalo directamente en Codex:

```text
Actúa como un Ingeniero Senior de React Native / Expo y Especialista UI. Tu tarea es implementar la aplicación móvil **MaquetaGo** usando **Expo (Managed Workflow), React Native y TypeScript (`strict: true`)**, replicando exactamente el diseño, flujo, reglas de negocio y experiencia del archivo de referencia `maquetago_splash_mockup.html`.

### 1. REGLA FUNDAMENTAL DE TONO Y COPIA (CRÍTICA)
- La interfaz debe verse y redactarse 100% como una aplicación comercial real, seria y corporativa dirigida a estudiantes de Arquitectura que viajan hacia la **Facultad de Arquitectura y Urbanismo - PUCP** (Av. Universitaria 1801, San Miguel, Lima).
- **PROHIBIDO** incluir palabras como "simulado", "simulación", "prototipo", "demo" o "ficticio" en cualquier texto, etiqueta, alerta o botón visible para el usuario.
- Incluye únicamente en el pie de la pantalla de Perfil el aviso discreto: `"Servicio independiente de movilidad estudiantil · No afiliado oficialmente a la PUCP."`

### 2. SISTEMA VISUAL Y ESTÉTICA EDITORIAL
- **Splash Screen:** Fondo azul arquitectónico profundo `#0F2537` con cuadrícula ortogonal sutil (`rgba(255,255,255,0.04)`, celdas de `32px`), viñeteado radial e isotipo SVG isométrico animado (trazado de aristas blancas `#FFFFFF` + ruta turquesa `#2DD4BF` + nodo destino) acompañado del título `MaquetaGo` ("Go" en `#2DD4BF`), subtítulo `MOVILIDAD PARA ARQUITECTURA` y barra de progreso que transiciona automáticamente tras ~2.6 segundos hacia la pantalla de Iniciar Sesión.
- **Resto de la aplicación (Estilo Editorial Corporativo):**
  - Fondos luminosos: Blanco puro `#FFFFFF` en formularios/modales y gris papel técnico `#F8FAFC` en pantallas principales.
  - Geometría limpia y plana: Bordes finos de `1px solid #E2E8F0` (o `#CBD5E1` en inputs), radios moderados (`8px` en botones e inputs, `10px` en tarjetas), sin sombras pesadas, sin degradados llamativos ni efectos futuristas.
  - Paleta exacta:
    - Primario / Textos / Cabeceras: `#0F2537`
    - Acento principal (CTAs y activos): `#0D9488`
    - Tint turquesa (badges): Fondo `#CCFBF1` con texto `#115E59`
    - Texto secundario: `#475569` / `#64748B`
    - Yape acento: `#742284`
  - Números, distancias y precios con `fontVariant: ['tabular-nums']`.

### 3. ARQUITECTURA DE NAVEGACIÓN Y PANTALLAS A IMPLEMENTAR
Implementa la navegación con `@react-navigation/native-stack` y `@react-navigation/bottom-tabs`:

1. **`SplashScreen`:** Animación SVG del logo usando `react-native-svg` + `Animated` (`strokeDashoffset`) y redirección automática a `SignInScreen`.
2. **`SignInScreen` y `SignUpScreen`:**
   - Diseño alineado a la izquierda (`paddingHorizontal: 24`).
   - Botón superior `"Continuar con Google"` que abre un Bottom Sheet modal para elegir cuenta (`Valeria Mendoza - valeria.mendoza@pucp.edu.pe` o `"Usar otra cuenta"` con input de correo).
   - Formulario limpio con correo, contraseña (con botón mostrar/ocultar), modal de `"¿Olvidaste tu contraseña?"` y enlace para alternar entre Iniciar sesión y Crear cuenta.
3. **`MainTabs` (Navegación inferior con 3 pestañas: `Inicio`, `Mis viajes`, `Perfil`):**
   - **`HomeScreen`:**
     - Saludo personalizado (`Hola, Valeria`) y badge de estado (`Cuenta verificada` o el nombre del plan activo).
     - Si tiene suscripción activa: tarjeta oscura `#0F2537` mostrando `"X de Y traslados disponibles"`, barra de progreso turquesa y vigencia en días.
     - Si tiene un viaje en curso: tarjeta destacada con código `#MG-2048`, fecha/hora y datos del conductor (`Carlos Mendoza · B4K-819`) que abre `ActiveTripScreen`.
     - Tarjeta principal blanca (`1px` borde): etiqueta `"80% de descuento en tu primer traslado"` (si `promoUsed === false`), título `"¿A qué hora entregas tu maqueta?"`, diagrama vertical conectando el **Punto de recojo** (botón interactivo que abre `MapPickerScreen` mostrando distrito y distancia en km) con el destino fijo **Facultad de Arquitectura y Urbanismo - PUCP**, y botón primario `"Programar traslado"`.
     - Fila inferior de suscripciones: muestra candado y `"Planes de suscripción · Se habilitan al completar tu primer traslado"` mientras `plansUnlocked === false`; al desbloquearse cambia a tarjeta activa que abre `PlansScreen`.
   - **`MapPickerScreen` (Selector de punto de recojo estilo Google Maps):**
     - Barra de búsqueda superior con autocompletado en tiempo real para distritos y avenidas de Lima (`San Miguel`, `Pueblo Libre`, `Lince`, `Miraflores`, `Santiago de Surco`, `Los Olivos`, `Comas`, `San Juan de Lurigancho`) + soporte para escribir cualquier dirección personalizada.
     - Mapa vectorial interactivo de Lima Metropolitana construido con `react-native-svg` (Costa Verde, Río Rímac, Av. Universitaria, Av. Javier Prado, Av. Túpac Amaru, Panamericana, etiquetas de distritos, marcador fijo `Arq. PUCP` y línea curva punteada hacia el punto de recojo).
     - **Pin arrastrable y táctil (`PanResponder` + `onPress` en el mapa):** al mover o tocar cualquier punto del mapa, realiza geocodificación inversa local actualizando automáticamente la dirección, el distrito, la distancia en `km` y los minutos estimados hacia PUCP.
     - Botón flotante `"Mi ubicación"` y tarjeta inferior con dirección confirmada, distancia en km y botón `"Confirmar punto de recojo"`.
   - **`TripDetailsScreen` (Fecha, hora y características de la maqueta):**
     - **Calendario mensual compacto interactivo:** navegación entre meses (`<` `>`), grilla de 7 columnas (`Lu` a `Do`), bloqueo de fechas pasadas, resaltado del día actual y selección de cualquier fecha futura sin limitarse a 3 días.
     - **Selector de horario:** franjas horarias (`07:00 AM`, `08:30 AM`, `10:00 AM`, `12:30 PM`, `02:30 PM`, `04:30 PM`, `06:30 PM`) más selector de hora personalizada (`Otra`).
     - **Tamaño y dimensiones de la maqueta (3 opciones seleccionables):**
       - `Pequeña` — *Hasta 40 × 40 × 30 cm* (Cabina protegida con sujeción, `+S/ 0.00`).
       - `Mediana` — *Hasta 80 × 60 × 45 cm* (Maletera plana acondicionada, `+S/ 3.00`).
       - `Gran Formato` — *Hasta 120 × 80 × 60 cm* (Plataforma extendida antideslizante, `+S/ 6.00`).
     - **Material predominante (chips):** `Cartón pluma / Balsa`, `Madera MDF / Acrílico`, `Yeso / Topografía`, `Alambre / Mixto`.
     - **Campo de texto:** `"Indicaciones adicionales (opcional)"`.
     - Pie fijo mostrando la tarifa calculada dinámicamente según distancia y tamaño, con botón `"Continuar al pago"`.
   - **`PaymentScreen` (Resumen y Pasarela de Pago):**
     - Funciona tanto para pagar un traslado (`TRIP`) como para contratar una suscripción (`PLAN`).
     - Muestra el desglose detallado (tarifa base + distancia + acondicionamiento por tamaño - descuento 80% o cobertura de suscripción).
     - Selector de método de pago con 2 pestañas:
       - **Yape:** Muestra código QR vectorial nítido (`react-native-svg`), monto exacto a transferir, campo opcional `"N.° de operación Yape"` y botón `"Confirmar pago con Yape"`.
       - **Tarjeta:** Alterna entre `"Tarjeta guardada"` (`VISA •••• 4829`) y `"Nueva tarjeta"` (inputs formateados para número de tarjeta, titular, vencimiento `MM/AA` y `CVV`).
       - *(Si el estudiante tiene suscripción activa con traslados disponibles, muestra directamente la confirmación con cargo a su plan en `S/ 0.00` y descuenta 1 traslado al confirmar).*
   - **`ActiveTripScreen` (Seguimiento, conductor y vehículo):**
     - Stepper vertical de 4 estados: `1. Reserva confirmada`, `2. Conductor en camino al punto de recojo`, `3. Maqueta asegurada · En ruta a PUCP`, `4. Llegada a Facultad de Arquitectura`.
     - Tarjeta de conductor y vehículo asignados: **Carlos Mendoza** (`4.9 ★ · 342 traslados universitarios`), placa **`B4K-819`**, vehículo **Toyota Avanza 2024 · Gris Plata** con etiqueta *"Unidad con plataforma plana antideslizante"*.
     - Resumen completo del servicio y monto pagado.
     - Botón secundario `"Actualizar estado del recorrido"` (avanza los pasos del recorrido) y botón primario **`"Viaje completado"`** que finaliza el traslado y lleva a `RatingScreen`.
   - **`RatingScreen` (Calificación del conductor):**
     - Selector interactivo de **1 a 5 estrellas** con etiqueta dinámica (`Muy deficiente` hasta `Excelente servicio`).
     - Chips seleccionables de reconocimiento (`Maqueta intacta`, `Conducción suave`, `Puntualidad`, `Buen trato`, `Espacio limpio`).
     - Campo de comentario adicional y botón `"Enviar calificación"`.
     - **Regla de desbloqueo:** Al enviar la calificación del primer viaje completado, se desbloquean las suscripciones (`plansUnlocked = true`) y navega automáticamente a `PlansScreen`.
   - **`PlansScreen` (Suscripciones Mensual, Semestral y Anual):**
     - Banner superior de desbloqueo cuando recién se habilitan.
     - 3 tarjetas de planes con botón `"Suscribirme"` (que abre `PaymentScreen` en modo `PLAN` para pagar con Yape o Tarjeta):
       1. **Plan Mensual:** `S/ 68.00 / mes` — `4 traslados incluidos` (vigencia 30 días, S/ 17.00 por traslado).
       2. **Plan Semestral** (Badge `Recomendado`): `S/ 348.00 / 6 meses` — `24 traslados incluidos` (vigencia 180 días, equivale a S/ 58.00/mes, ahorra 15%).
       3. **Plan Anual** (Badge `Mejor valor`): `S/ 624.00 / 12 meses` — `48 traslados incluidos` (vigencia 365 días, equivale a S/ 52.00/mes, ahorra 24%).
   - **`TripsScreen` (Mis viajes):**
     - Control segmentado `En curso` / `Historial` con tarjetas detalladas que muestran código, ruta, tamaño de maqueta, distancia, monto pagado y estrellas/comentario otorgados al conductor.
   - **`ProfileScreen` (Perfil):**
     - Datos del estudiante (`Valeria Mendoza`, `valeria.mendoza@pucp.edu.pe`, `Facultad de Arquitectura`), estado de suscripción actual con acceso a cambiar/renovar plan, método de pago guardado (`VISA •••• 4829`), botón `"Cerrar sesión"` y nota de independencia institucional respecto a la PUCP.

### 4. FÓRMULA EXACTA DE TARIFAS POR DISTANCIA Y TAMAÑO
Implementa esta función pura en `src/utils/pricing.ts`:
- `baseRate = 10.00`
- `distanceRate = Math.round(distanceKm * 1.50 * 2) / 2` (redondeado a `S/ 0.50`; por ejemplo, San Miguel `2.4 km` → `S/ 13.50` subtotal base, mientras que Comas `19.6 km` → `S/ 39.50` subtotal base).
- `sizeFee`: `SMALL = 0.00`, `MEDIUM = 3.00`, `LARGE = 6.00`.
- `subtotal = baseRate + distanceRate + sizeFee`.
- Prioridad de cobro:
  1. Si `activeSubscription && activeSubscription.remainingRides > 0`: `total = 0.00` (descuenta 1 traslado al confirmar).
  2. Si `!promoUsed`: `discount = Math.round(subtotal * 0.80 * 10) / 10`, `total = Math.max(2.50, Math.round((subtotal - discount) * 10) / 10)` y marca `promoUsed = true` al confirmar.
  3. Si `promoUsed && !activeSubscription`: `total = subtotal`.

### 5. ESTRUCTURA DE ARCHIVOS RECOMENDADA
Organiza el código limpio y modular:
- `src/theme/tokens.ts` (colores, tipografía, espaciados y bordes)
- `src/types/models.ts` (interfaces TypeScript estrictas)
- `src/data/limaLocations.ts` (presets de distritos, coordenadas relativas del mapa SVG, planes y tamaños)
- `src/utils/pricing.ts` (cálculo de tarifas y geocodificación inversa por coordenadas)
- `src/context/AppContext.tsx` (estado global con React Context + `useReducer`)
- `src/components/` (`AppHeader`, `YapeQrCode`, `LimaInteractiveMap`, `CompactCalendar`, `GoogleAuthModal`, `ResetPasswordModal`)
- `src/screens/` (todas las pantallas descritas arriba)
- `src/navigation/RootNavigator.tsx`

Asegúrate de que toda la app compile sin errores de TypeScript (`npx tsc --noEmit`) y funcione fluida tanto en iOS como en Android.
```

---

## 3. Anexo Técnico de Referencia Rápida

Si Codex solicita confirmar los valores exactos del catálogo utilizado en el mockup, aquí tienes la tabla maestra:

### Catálogo de Distritos y Distancias Referenciales hacia PUCP (San Miguel)

| Distrito | Dirección de ejemplo | Distancia | Tiempo est. | Subtotal Base (Pequeña) | Con 80% Dcto. (1er viaje) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **San Miguel** | Av. Universitaria 450 | `2.4 km` | `8 min` | `S/ 13.50` | `S/ 2.70` |
| **Pueblo Libre** | Av. Simón Bolívar 920 | `3.8 km` | `12 min` | `S/ 15.50` | `S/ 3.10` |
| **Lince** | Jr. León Velarde 310 | `6.5 km` | `18 min` | `S/ 20.00` | `S/ 4.00` |
| **Miraflores** | Av. José Larco 450 | `10.2 km` | `26 min` | `S/ 25.50` | `S/ 5.10` |
| **Santiago de Surco** | Av. Primavera 1240 | `14.5 km` | `34 min` | `S/ 32.00` | `S/ 6.40` |
| **Los Olivos** | Av. Carlos Izaguirre 810 | `14.8 km` | `35 min` | `S/ 32.00` | `S/ 6.40` |
| **Comas** | Av. Túpac Amaru 3450 | `19.6 km` | `44 min` | `S/ 39.50` | `S/ 7.90` |
| **San Juan de Lurigancho** | Av. Próceres 2100 | `21.4 km` | `48 min` | `S/ 42.00` | `S/ 8.40` |

*(Nota: Si el estudiante elige maqueta **Mediana**, se suman `S/ 3.00` al subtotal antes del descuento; si elige **Gran Formato**, se suman `S/ 6.00`).*

### Planes de Suscripción (Desbloqueados tras completar el 1er viaje)

| Plan | Precio Total | Traslados Incluidos | Vigencia | Costo por Traslado | Etiqueta |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Plan Mensual** | `S/ 68.00` | `4 traslados` | `30 días` | `S/ 17.00` | — |
| **Plan Semestral** | `S/ 348.00` | `24 traslados` | `180 días` | `S/ 14.50` | `Recomendado` |
| **Plan Anual** | `S/ 624.00` | `48 traslados` | `365 días` | `S/ 13.00` | `Mejor valor` |
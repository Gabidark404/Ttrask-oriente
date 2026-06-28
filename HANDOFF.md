# TTRAKS ORIENTE — Documentación del Proyecto

**Última actualización:** 22 de junio de 2026
**Stack:** Node.js/Express + Supabase (PostgreSQL) + Vanilla JS
**Hosting objetivo:** Vercel

---

## 1. Resumen Ejecutivo

Aplicación web para la gestión y control de herramientas en el taller de servicio de un concesionario automotriz. Dos roles: **Supervisor** (control total) y **Técnico** (solo consulta y solicitudes). Sin módulos financieros ni precios.

### Funcionalidades implementadas

| Funcionalidad | Estado |
|---|---|
| Dashboard con métricas (total, disponible, prestada, etc.) | ✅ |
| Catálogo de herramientas con búsqueda, filtros y paginación | ✅ |
| Solicitud de herramienta (técnico) | ✅ |
| Aprobación/rechazo de solicitudes (supervisor) | ✅ |
| Centro de notificaciones | ✅ |
| Importación de inventario desde Excel (.xlsx/.xls) | ✅ |
| Autenticación con Supabase Auth (usuario/contraseña) | ✅ |
| Roles: supervisor y técnico (app_metadata.role) | ✅ |
| Documentación Swagger (/api-docs) | ✅ |
| Health check (/health) | ✅ |
| RLS (Row Level Security) en Supabase | ✅ |

### Pendientes / Mejoras futuras

| Tarea | Prioridad |
|---|---|
| Insertar datos semilla en Supabase y verificar que la API los devuelve | 🔴 Alta |
| Crear usuario técnico en Supabase Auth (`tecnico1@ttraks.com`) | 🔴 Alta |
| Probar flujo completo: login → dashboard → solicitar → aprobar | 🔴 Alta |
| Hosting en Vercel + variables de entorno | 🟡 Media |
| Devolución de herramienta (marcar como devuelta) | 🟡 Media |
| Filtro "Mis solicitudes" para técnicos | 🟡 Media |
| Historial completo de movimientos por herramienta | 🟢 Baja |
| Exportar inventario a Excel/PDF | 🟢 Baja |
| Campo `read` en notificaciones (marcar como leídas) | 🟢 Baja |
| Tests automatizados (la estructura Jest está lista) | 🟢 Baja |
| Diseño responsive mobile (básico implementado) | 🟢 Baja |

---

## 2. Estructura del Proyecto

```
ttraks-oriente/
├── .env                          # Variables de entorno (SUPABASE_URL, SUPABASE_ANON_KEY, PORT)
├── package.json                  # Dependencias y scripts
├── supabase-schema.sql           # Esquema PostgreSQL + RLS (ejecutar en Supabase SQL Editor)
├── swagger.yaml                  # Documentación OpenAPI 3.0.3
├── HANDOFF.md                    # Este documento
│
├── server/
│   ├── index.js                  # Servidor Express (static files, API, swagger)
│   ├── config/
│   │   └── supabase.js           # Cliente Supabase (createClient con env vars)
│   ├── controllers/
│   │   ├── inventoryController.js # CRUD herramientas + dashboard (6 queries paralelas)
│   │   ├── requestController.js   # Solicitudes: crear, aprobar/rechazar + notificaciones
│   │   ├── notificationController.js # Listar/crear notificaciones
│   │   └── uploadController.js    # Importar Excel con upsert por código
│   ├── middleware/
│   │   └── auth.js               # verifyJwt (Bearer token) + authorize(roles[])
│   └── routes/
│       ├── inventory.js          # /api/inventory/*
│       ├── requests.js           # /api/requests/*
│       ├── notifications.js      # /api/notifications/*
│       └── upload.js             # /api/upload (multipart)
│
├── client/
│   ├── index.html                # SPA: login modal, header, 4 tabs, solicitud modal, toasts
│   ├── styles.css                # Diseño dark-blue/white/gray, responsive, animaciones
│   └── app.js                    # Supabase auth, apiFetch(), renderizado de tabs
│
├── tools.csv                     # Datos semilla - herramientas
├── requests.csv                  # Datos semilla - solicitudes
└── notifications.csv             # Datos semilla - notificaciones
```

---

## 3. Base de Datos (Supabase PostgreSQL)

### 3.1 Tabla: `tools`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | BIGSERIAL PK | Auto-incremental |
| `item` | INTEGER | Número de ítem |
| `code` | TEXT UNIQUE | Código único (ej. HER-001) |
| `codification` | TEXT | Codificación interna (ej. EST-01-A) |
| `description` | TEXT NOT NULL | Descripción de la herramienta |
| `brand` | TEXT | Marca |
| `quantity` | INTEGER | Cantidad total (default 0) |
| `available` | INTEGER | Cantidad disponible (default 0) |
| `status` | TEXT | CHECK: Disponible, Prestada, Reservada, En mantenimiento, Extraviada, Fuera de servicio |
| `location` | TEXT | Ubicación física |
| `last_update` | TIMESTAMPTZ | Se actualiza automáticamente con trigger |

### 3.2 Tabla: `requests`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | BIGSERIAL PK | Auto-incremental |
| `tool_id` | BIGINT FK→tools.id | Herramienta solicitada (SET NULL on delete) |
| `tool_name` | TEXT | Nombre denormalizado de la herramienta |
| `requested_by` | TEXT | Quién solicita (**NO se llama `user`** — palabra reservada PostgreSQL) |
| `reason` | TEXT NOT NULL | Motivo de la solicitud |
| `estimated_return` | TIMESTAMPTZ | Fecha estimada de devolución |
| `request_date` | TIMESTAMPTZ | Fecha de solicitud (default NOW()) |
| `status` | TEXT | CHECK: Pendiente, Aprobada, Rechazada |

### 3.3 Tabla: `notifications`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | BIGSERIAL PK | Auto-incremental |
| `message` | TEXT NOT NULL | Contenido |
| `created_by` | TEXT | Quién generó la notificación (**NO `user`**) |
| `created_at` | TIMESTAMPTZ | Fecha (default NOW()) |

### 3.4 Políticas RLS (Row Level Security)

**Principio clave:** El rol se lee del JWT con `auth.jwt() -> 'app_metadata' ->> 'role'`.  
NUNCA se consulta `auth.users` (requiere service_role key, no accesible con anon key).

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `tools` | Todos (`USING true`) | Solo supervisor (`WITH CHECK`) | Solo supervisor (`USING`) | Solo supervisor (`USING`) |
| `requests` | Todos | Todos (`WITH CHECK true`) | Solo supervisor (`USING`) | — |
| `notifications` | Todos | Todos (`WITH CHECK true`) | — | — |

---

## 4. Autenticación y Roles

### 4.1 Flujo

1. Usuario ingresa email + contraseña en modal de login
2. Frontend: `supabase.auth.signInWithPassword({ email, password })`
3. Recibe JWT → guarda en localStorage: `supabase-token`, `supabase-role`, `supabase-user`
4. Toda llamada a `/api/*` → header `Authorization: Bearer <token>`
5. Backend: `verifyJwt` → `supabase.auth.getUser(token)` → extrae `app_metadata.role`
6. Rutas protegidas: `authorize(['supervisor'])` verifica el rol

### 4.2 Usuarios en Supabase Auth

| Email | Contraseña | Rol | Comando SQL |
|---|---|---|---|
| `supervisor1@ttraks.com` | `Super1234` | supervisor | `UPDATE auth.users SET raw_app_meta_data = '{"role":"supervisor"}' WHERE email = 'supervisor1@ttraks.com';` |
| `tecnico1@ttraks.com` | `Tecno1234` | tecnico | `UPDATE auth.users SET raw_app_meta_data = '{"role":"tecnico"}' WHERE email = 'tecnico1@ttraks.com';` |

> ⚠️ En Authentication → Settings, desactivar "Confirm email" para desarrollo.

### 4.3 Nota sobre nombres de campo

- **Columna en `auth.users`**: `raw_app_meta_data` (así se llama en PostgreSQL)
- **Claim en el JWT**: `app_metadata` (así viene en el token)
- **En RLS**: usar `auth.jwt() -> 'app_metadata'` (lee del JWT, no de la tabla)
- **En SQL directo**: `UPDATE auth.users SET raw_app_meta_data = ...`

---

## 5. API Endpoints

Base URL: `http://localhost:3000/api`

### Inventory `/api/inventory`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Todos | Listar (query: search, status, brand, code, limit, offset) |
| GET | `/dashboard` | Todos | Métricas: total, disponible, prestada, mantenimiento, extraviada, pendientes |
| GET | `/code/:code` | Todos | Buscar por código único |
| GET | `/:id` | Todos | Buscar por ID |
| POST | `/` | Supervisor | Crear herramienta |
| PATCH | `/:id` | Supervisor | Actualizar herramienta |
| DELETE | `/:id` | Supervisor | Eliminar herramienta |
| PATCH | `/:id/status` | Supervisor | Cambiar solo el estado |

### Requests `/api/requests`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Todos | Listar (query: status, limit, offset). Incluye datos de tool |
| GET | `/:id` | Todos | Ver solicitud |
| POST | `/` | Todos | Crear (body: code, reason, estimatedReturnDate, user). Crea notificación |
| PATCH | `/:id` | Supervisor | Aprobar/Rechazar (body: status). Actualiza inventario + notificación |

### Notifications `/api/notifications`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Todos | Listar (query: limit, offset) |
| POST | `/` | Todos | Crear (body: message, user) |
| PATCH | `/:id/read` | Todos | Marcar leída (placeholder) |

### Upload `/api/upload`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/` | Supervisor | Importar Excel (multipart: campo `excel`). Upsert por código |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check (sin auth) |
| GET | `/api-docs` | Swagger UI |
| GET | `/` | Sirve `client/index.html` |

---

## 6. API - Formato de Respuestas

El backend mapea snake_case (PostgreSQL) → camelCase (JSON). Ejemplo:

```json
// GET /api/inventory
{
  "data": [{
    "id": 1,
    "item": 1,
    "code": "HER-001",
    "codification": "EST-01-A",
    "description": "Llave Dinamometrica 1/2",
    "brand": "Proto",
    "quantity": 3,
    "available": 2,
    "status": "Disponible",
    "location": "Estante A1",
    "lastUpdate": "2026-06-22T..."
  }],
  "pagination": { "total": 5, "limit": 100, "offset": 0 }
}

// GET /api/requests
{
  "data": [{
    "id": 1,
    "toolId": 2,
    "toolName": "Escaner Automotriz OBD2",
    "user": "Carlos Mendoza",        // ← mapeado desde requested_by
    "reason": "Diagnostico de falla",
    "estimatedReturnDate": "...",
    "requestDate": "...",
    "status": "Aprobada",
    "tool": { "id": 2, "code": "HER-002", ... }
  }]
}

// GET /api/notifications
{
  "data": [{
    "id": 1,
    "message": "Sistema iniciado con exito",
    "user": "Administrador",         // ← mapeado desde created_by
    "createdAt": "..."
  }]
}
```

---

## 7. Configuración

### 7.1 `.env` (raíz del proyecto)

```
SUPABASE_URL=https://plvikymtlgxmpbuborsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdmlreW10bGd4bXBidWJvcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjk5NjgsImV4cCI6MjA5NzY0NTk2OH0.1-0o_h0VIqWASZhXpn5HaYqDyMKZfFlk_OsBbH4ke54
PORT=3000
```

### 7.2 Comandos

```bash
npm install          # Instalar dependencias
npm start            # Iniciar servidor (node server/index.js)
npm run dev          # Iniciar con nodemon (recarga automática)
npm test             # Ejecutar tests (Jest)
```

### 7.3 Para desplegar en Vercel

Crear `vercel.json`:
```json
{
  "buildCommand": "npm install",
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/index.js" },
    { "src": "/(.*)", "dest": "/client/$1" }
  ]
}
```
Configurar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en Vercel Dashboard → Environment Variables.

---

## 8. Bugs Corregidos

### 8.1 `user` es palabra reservada en PostgreSQL ❌→✅
- **Error:** `ERROR: 42601: syntax error at or near "user"`
- **Fix:** Columnas renombradas: `requests.user` → `requests.requested_by`, `notifications.user` → `notifications.created_by`
- **Controllers:** Mapean `requested_by`/`created_by` → `user` en la respuesta JSON
- **Archivos afectados:** schema SQL, requestController, notificationController, uploadController, CSVs

### 8.2 RLS consultando `auth.users` ❌→✅
- **Error:** `new row violates row-level security policy` al hacer INSERT
- **Causa:** `SELECT ... FROM auth.users` requiere service_role key
- **Fix:** Cambiar a `auth.jwt() -> 'app_metadata' ->> 'role'`

### 8.3 `FOR ALL` sin `WITH CHECK` ❌→✅
- **Error:** INSERT bloqueado aunque sí había política
- **Causa:** `FOR ALL ... USING (...)` no cubre INSERT; INSERT necesita `WITH CHECK`
- **Fix:** Separar políticas: `FOR SELECT`, `FOR INSERT WITH CHECK`, `FOR UPDATE USING`, `FOR DELETE USING`

### 8.4 `app_metadata` vs `raw_app_meta_data` ❌→✅
- **Error:** `ERROR: 42703: column "app_metadata" does not exist`
- **Fix:** En RLS usar `auth.jwt() -> 'app_metadata'` (JWT claim). En SQL directo usar `raw_app_meta_data` (nombre real de la columna)

---

## 9. Checklist para Puesta en Marcha

- [ ] Ejecutar `supabase-schema.sql` en Supabase SQL Editor
- [ ] Insertar datos semilla:
  ```sql
  INSERT INTO tools (item, code, codification, description, brand, quantity, available, status, location) VALUES
  (1, 'HER-001', 'EST-01-A', 'Llave Dinamometrica 1/2', 'Proto', 3, 2, 'Disponible', 'Estante A1'),
  (2, 'HER-002', 'EST-01-B', 'Escaner Automotriz OBD2', 'Launch', 1, 0, 'Prestada', 'Bahia 3'),
  (3, 'HER-003', 'EST-02-A', 'Pistola de Impacto 3/4', 'Chicago Pneumatic', 2, 1, 'En mantenimiento', 'Taller de Soporte'),
  (4, 'HER-004', 'EST-03-C', 'Juego de Dados de Impacto', 'Urrea', 5, 5, 'Disponible', 'Estante B2'),
  (5, 'HER-005', 'EST-04-A', 'Medidor de Compresion Diesel', 'Otc', 1, 1, 'Reservada', 'Almacen Especial');
  ```
- [ ] Crear usuario `tecnico1@ttraks.com` / `Tecno1234` en Authentication → Users
- [ ] Asignar rol al técnico: `UPDATE auth.users SET raw_app_meta_data = '{"role":"tecnico"}' WHERE email = 'tecnico1@ttraks.com';`
- [ ] Desactivar "Confirm email" en Authentication → Settings
- [ ] `npm start` y probar en `http://localhost:3000`
- [ ] Iniciar sesión como supervisor, ver dashboard, crear solicitud, aprobarla
- [ ] Iniciar sesión como técnico, ver catálogo, crear solicitud
- [ ] Probar importación de Excel
- [ ] Desplegar en Vercel
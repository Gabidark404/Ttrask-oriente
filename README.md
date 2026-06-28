# TTRAKS ORIENTE 🔧

**Sistema Integrado de Control de Herramientas para Concesionarios Automotrices**

> Gestión completa del inventario de herramientas del Departamento de Servicio: catálogo, solicitudes, aprobaciones y notificaciones en tiempo real.

---

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Métricas en tiempo real: total, disponibles, prestadas, mantenimiento, extraviadas y pendientes |
| **Catálogo** | Inventario paginado con búsqueda, filtros por estado y marca |
| **Solicitudes** | Técnicos pueden solicitar herramientas con motivo y fecha estimada de devolución |
| **Supervisión** | Supervisores aprueban o rechazan solicitudes; el inventario se actualiza automáticamente |
| **Importación** | Carga masiva de inventario desde Excel (.xlsx/.xls) con reporte detallado |
| **Notificaciones** | Centro de notificaciones en tiempo real de todas las operaciones |

## 👥 Roles

| Rol | Acceso |
|-----|--------|
| **Supervisor** | Control total: aprobar/rechazar solicitudes, importar Excel, ver todas las secciones |
| **Técnico** | Consulta de catálogo y envío de solicitudes |

---

## 🛠 Stack Tecnológico

- **Frontend:** Vanilla HTML/CSS/JS — SPA con Inter font, animaciones CSS nativas
- **Backend:** Node.js 18 + Express 4
- **Base de datos:** Supabase (PostgreSQL) con Row Level Security
- **Autenticación:** Supabase Auth (JWT)
- **Hosting:** Vercel (configurado)

---

## 🚀 Instalación Local

### 1. Prerrequisitos

- Node.js ≥ 18
- Cuenta en [Supabase](https://supabase.com)

### 2. Clonar y configurar

```bash
git clone https://github.com/TU_USUARIO/ttraks-oriente.git
cd ttraks-oriente
npm install
```

### 3. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
PORT=3000
```

### 4. Configurar la base de datos

Ejecuta el archivo `supabase-schema.sql` en el **SQL Editor de Supabase**.

Luego inserta datos semilla:

```sql
INSERT INTO tools (item, code, codification, description, brand, quantity, available, status, location) VALUES
(1, 'HER-001', 'EST-01-A', 'Llave Dinamometrica 1/2', 'Proto', 3, 2, 'Disponible', 'Estante A1'),
(2, 'HER-002', 'EST-01-B', 'Escaner Automotriz OBD2', 'Launch', 1, 0, 'Prestada', 'Bahia 3'),
(3, 'HER-003', 'EST-02-A', 'Pistola de Impacto 3/4', 'Chicago Pneumatic', 2, 1, 'En mantenimiento', 'Taller de Soporte'),
(4, 'HER-004', 'EST-03-C', 'Juego de Dados de Impacto', 'Urrea', 5, 5, 'Disponible', 'Estante B2'),
(5, 'HER-005', 'EST-04-A', 'Medidor de Compresion Diesel', 'Otc', 1, 1, 'Reservada', 'Almacen Especial');
```

### 5. Crear usuarios en Supabase Auth

En **Authentication → Users**, crea:

| Email | Contraseña | Rol |
|-------|------------|-----|
| `supervisor1@ttraks.com` | `Super1234` | supervisor |
| `tecnico1@ttraks.com` | `Tecno1234` | tecnico |

Luego asigna roles en el SQL Editor:

```sql
UPDATE auth.users SET raw_app_meta_data = '{"role":"supervisor"}' WHERE email = 'supervisor1@ttraks.com';
UPDATE auth.users SET raw_app_meta_data = '{"role":"tecnico"}' WHERE email = 'tecnico1@ttraks.com';
```

> ⚠️ En **Authentication → Settings**, desactivar "Confirm email" para desarrollo.

### 6. Iniciar el servidor

```bash
npm run dev    # Desarrollo (nodemon)
npm start      # Producción
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 🌐 Despliegue en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno en Vercel Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. El archivo `vercel.json` ya está configurado

---

## 📁 Estructura del Proyecto

```
ttraks-oriente/
├── client/
│   ├── index.html          # SPA principal
│   ├── styles.css          # Design system (Inter, dark navy, animaciones)
│   └── app.js              # Lógica frontend (auth, API, lazy loading)
├── server/
│   ├── index.js            # Servidor Express
│   ├── config/supabase.js  # Cliente Supabase
│   ├── controllers/        # inventoryController, requestController, etc.
│   ├── middleware/auth.js  # JWT verification + role-based auth
│   └── routes/             # inventory, requests, notifications, upload
├── supabase-schema.sql     # Schema PostgreSQL + RLS
├── vercel.json             # Configuración Vercel
├── swagger.yaml            # Documentación OpenAPI 3.0
└── HANDOFF.md              # Documentación técnica completa
```

---

## 📋 API Endpoints

Base URL: `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/inventory` | Todos | Listar con filtros y paginación |
| GET | `/inventory/dashboard` | Todos | Métricas del dashboard |
| GET | `/inventory/code/:code` | Todos | Buscar por código |
| POST | `/inventory` | Supervisor | Crear herramienta |
| PATCH | `/inventory/:id` | Supervisor | Actualizar herramienta |
| GET | `/requests` | Todos | Listar solicitudes |
| POST | `/requests` | Todos | Crear solicitud |
| PATCH | `/requests/:id` | Supervisor | Aprobar/Rechazar |
| GET | `/notifications` | Todos | Listar notificaciones |
| POST | `/api/upload` | Supervisor | Importar Excel |
| GET | `/health` | Sin auth | Health check |
| GET | `/api-docs` | Sin auth | Swagger UI |

---

## 📄 Licencia

MIT © 2026 TTRAKS ORIENTE

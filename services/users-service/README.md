# Kiora — Users Service

Servicio de autenticación y gestión de usuarios del sistema Kiora. Construido con **Node.js**, **Express**, **PostgreSQL** y **Redis**.

---

## Requisitos previos

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (recomendado)

---

## Opción A: Levantar con Docker (recomendado)

```bash
# Desde la raíz del backend (kiora-backend/)
docker compose up
```

Levanta automáticamente:
- PostgreSQL en el puerto `5433`
- Redis en el puerto `6379`
- pgAdmin en `http://localhost:5050`
- Users Service en `http://localhost:3001`

---

## Opción B: Levantar manualmente

### 1. Instalar dependencias

```bash
cd kiora-backend/services/users-service
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
PORT=3001

DB_USER=postgres
DB_PASSWORD=rootpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=kiora

JWT_SECRET=TuSecretoSuperSeguro
JWT_REFRESH_SECRET=TuRefreshSecretoSuperSeguro

REDIS_HOST=localhost
REDIS_PORT=6379

RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=no-reply@tudominio.com
APP_URL=http://localhost:3000

CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### 3. Crear la base de datos

```sql
CREATE DATABASE kiora;
```

### 4. Correr las migraciones

```bash
npm run migrate:up
```

### 5. (Opcional) Crear usuarios de prueba

```bash
node src/scripts/seed.js
# Crea: Meneses@gmail.com / admin123  y  ruben@kiora.com / ruben123
```

### 6. Arrancar el servidor

```bash
npm run dev   # Desarrollo (recarga automática)
npm start     # Producción
```

---

## Endpoints disponibles

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión | No |
| `POST` | `/api/auth/register` | Registrar usuario | Admin |
| `POST` | `/api/auth/logout` | Cerrar sesión | Sí |
| `POST` | `/api/auth/refresh` | Renovar token | Cookie |
| `GET` | `/api/auth/me` | Perfil propio | Sí |
| `PATCH` | `/api/auth/me/password` | Cambiar contraseña propia | Sí |
| `GET` | `/api/auth/users` | Lista de usuarios paginada | Admin |
| `PATCH` | `/api/auth/users/:id` | Actualizar usuario | Admin |
| `DELETE` | `/api/auth/users/:id` | Eliminar usuario (soft delete) | Admin |
| `PATCH` | `/api/auth/users/:id/unlock` | Desbloquear cuenta | Admin |
| `PATCH` | `/api/auth/users/:id/role` | Asignar rol | Admin |
| `POST` | `/api/auth/forgot-password` | Solicitar recuperación de contraseña | No |
| `POST` | `/api/auth/reset-password` | Restablecer contraseña con token | No |

### Documentación interactiva (Swagger)

```
http://localhost:3001/api/docs
```

---

## Scripts disponibles

```bash
npm run dev              # Servidor en modo desarrollo
npm start                # Servidor en producción
npm test                 # Correr todos los tests (54 tests)
npm run migrate:up       # Aplicar migraciones pendientes
npm run migrate:down     # Revertir la última migración
npm run migrate:create   # Crear nueva migración
```

---

## Arquitectura del proyecto

```
src/
├── app.js
├── index.js
├── config/
│   ├── blacklist.js        # Blacklist de tokens con Redis (ioredis)
│   ├── db.js               # Conexión a PostgreSQL
│   ├── emailService.js     # Envío de emails con Resend
│   ├── env.js              # Validación de variables de entorno
│   ├── logger.js           # Logger Winston
│   └── swagger.js          # Configuración Swagger
├── middleware/
│   ├── authMiddleware.js   # verifyToken, isAdmin
│   ├── errorHandler.js     # Manejo centralizado de errores
│   └── validate.js         # Factory de validación Joi
├── validators/
│   └── authValidators.js   # Schemas Joi
├── repositories/
│   └── userRepository.js   # Único punto de acceso a la DB
├── services/
│   └── authService.js      # Lógica JWT
├── controllers/
│   └── authController.js   # Lógica de negocio
├── routes/
│   └── authRoutes.js       # Rutas + Swagger JSDoc
├── db/
│   └── migrations/
│       ├── 001_schema_inicial.sql
│       ├── 002_add_lock_policy.sql
│       ├── 003_add_activo_to_cliente.sql
│       └── 004_add_reset_tokens.sql
└── __tests__/
    └── authRoutes.test.js  # 54 tests de integración
```

---

## Autenticación

El servicio soporta **dos tipos de clientes**:

**Web (React, etc.):**
- Access Token en cookie `HttpOnly` (más seguro)
- Header `x-client-type: web` en el login

**Móvil (React Native, etc.):**
- Access Token en el body JSON
- `Authorization: Bearer <token>` en cada request

El **Refresh Token** siempre va en cookie `HttpOnly`.

---

## CI/CD

Tests automáticos con **GitHub Actions** en cada push a `main` o `develop`. Ver `.github/workflows/ci.yml`.

# Kiora — Users Service

Servicio de autenticación y gestión de usuarios del sistema Kiora. Construido con **Node.js**, **Express** y **PostgreSQL**.

---

## Requisitos previos

Antes de empezar, asegúrate de tener instalado:

- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/) — o [Docker](https://www.docker.com/) para levantarlo en contenedor

---

## Opción A: Levantar con Docker (recomendado)

La forma más fácil. Solo necesitas Docker instalado.

```bash
# 1. Desde la raíz del backend (kiora-backend/)
docker compose up
```

Esto levanta automáticamente:
- PostgreSQL en el puerto `5433`
- pgAdmin en `http://localhost:5050`
- Users Service en `http://localhost:3001`

---

## Opción B: Levantar manualmente

### 1. Clonar e instalar dependencias

```bash
cd kiora-backend/services/users-service
npm install
```

### 2. Configurar variables de entorno

```bash
# Copia la plantilla
cp .env.example .env
```

Edita `.env` con tus valores:

```env
PORT=3001

DB_USER=root
DB_PASSWORD=rootpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=kiora

JWT_SECRET=TuSecretoSuperSeguro
JWT_REFRESH_SECRET=TuRefreshSecretoSuperSeguro

CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### 3. Crear la base de datos

Conéctate a PostgreSQL y crea la base de datos:

```sql
CREATE DATABASE kiora;
```

### 4. Correr las migraciones

```bash
# Aplica todas las migraciones y crea las tablas
npm run migrate:up
```

Esto crea todas las tablas automáticamente (Cliente, Producto, Ventas, etc.).

### 5. (Opcional) Crear usuario administrador inicial

```bash
node src/scripts/seed.js
```

### 6. Arrancar el servidor

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El servidor estará en: `http://localhost:3001`

---

## Endpoints disponibles

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión | No |
| `POST` | `/api/auth/register` | Registrar usuario | Admin |
| `POST` | `/api/auth/logout` | Cerrar sesión | Sí |
| `POST` | `/api/auth/refresh` | Renovar token | Cookie |
| `GET` | `/api/auth/me` | Perfil propio | Sí |
| `GET` | `/api/auth/users` | Lista de usuarios | Admin |
| `PATCH` | `/api/auth/users/:id/unlock` | Desbloquear usuario | Admin |
| `GET` | `/api/users/health` | Estado del servicio | No |

### Documentación interactiva (Swagger)

Con el servidor corriendo, abre en el navegador:

```
http://localhost:3001/api/docs
```

---

## Scripts disponibles

```bash
npm run dev           # Servidor en modo desarrollo
npm start             # Servidor en producción
npm test              # Correr todos los tests
npm run migrate:up    # Aplicar migraciones pendientes
npm run migrate:down  # Revertir la última migración
npm run migrate:create nombre  # Crear nueva migración
```

---

## Arquitectura del proyecto

```
src/
├── app.js                  # Configuración Express (middlewares, rutas)
├── index.js                # Punto de entrada (arranca servidor)
├── config/
│   ├── db.js               # Conexión a PostgreSQL
│   ├── env.js              # Validación de variables de entorno
│   ├── logger.js           # Logger Winston
│   └── swagger.js          # Configuración Swagger
├── middleware/
│   ├── authMiddleware.js   # verifyToken, isAdmin, blacklist
│   ├── errorHandler.js     # Manejo centralizado de errores
│   └── validate.js         # Factory de validación Joi
├── validators/
│   └── authValidators.js   # Schemas Joi para login y register
├── repositories/
│   └── userRepository.js   # Queries a la DB (único punto de acceso)
├── services/
│   └── authService.js      # Lógica de JWT (generar, verificar)
├── controllers/
│   └── authController.js   # Lógica de negocio
├── routes/
│   └── authRoutes.js       # Definición de rutas
├── db/
│   └── migrations/         # Archivos SQL de migraciones
└── __tests__/
    └── authRoutes.test.js  # Tests de integración
```

---

## Autenticación

El servicio soporta **dos tipos de clientes**:

**Web (React, etc.):**
- El Access Token se guarda en una cookie `HttpOnly` (más seguro)
- Enviar el header `x-client-type: web` en el login

**Móvil (React Native, etc.):**
- El Access Token se devuelve en el body JSON
- Enviarlo como `Authorization: Bearer <token>` en cada request

El **Refresh Token** se guarda siempre en una cookie `HttpOnly` para mayor seguridad.

---

## CI/CD

Los tests se corren automáticamente con **GitHub Actions** en cada push a `main` o `develop`. Ver el badge en la tab **Actions** del repositorio.

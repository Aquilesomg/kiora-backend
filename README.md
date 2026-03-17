# Kiora Backend 🚀

Sistema de microservicios en **Node.js** para el kiosco inteligente Kiora.

---

## Arquitectura

```
kiora-backend/
├── services/
│   └── users-service/   # Autenticación y gestión de usuarios
└── docker-compose.yml   # Infraestructura local (PostgreSQL, Redis, pgAdmin)
```

> Cada servicio es autónomo y tiene su propio `README.md` con instrucciones detalladas.

---

## Levantar el entorno local

```bash
# Desde la raíz del proyecto
docker compose up
```

Levanta automáticamente:

| Servicio | URL / Puerto |
|---|---|
| Users Service | `http://localhost:3001` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |
| pgAdmin | `http://localhost:5050` |

---

## Servicios

### 🔐 Users Service

Gestión de usuarios, autenticación JWT y recuperación de contraseña.

- Ver [`services/users-service/README.md`](services/users-service/README.md) para instrucciones completas.
- API documentada en Swagger: `http://localhost:3001/api/docs`

**Características principales:**
- Login dual (Web/Móvil) con Access Token (10min) y Refresh Token (7 días).
- Bloqueo automático de cuentas tras 5 intentos fallidos.
- Recuperación de contraseña vía email usando Resend.
- Perfil de usuario y actualización de contraseña (`/me`, `/me/password`).
- Gestión completa por administradores (paginación, roles, soft delete).
- 54 tests de integración automatizados.

---

## CI/CD

Tests automáticos con **GitHub Actions** en cada push a `main` o `develop`.  
Ver `.github/workflows/ci.yml`.
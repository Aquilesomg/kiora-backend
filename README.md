# Kiora Backend 🚀

Sistema de **microservicios** en Node.js para el kiosco inteligente Kiora.

---

## Arquitectura

```
kiora-backend/
├── services/
│   ├── users-service/          # Autenticación y gestión de usuarios (puerto 3001)
│   ├── products-service/       # Catálogo de productos y categorías (puerto 3002)
│   ├── inventory-service/      # Stock, movimientos e inventario de proveedores (puerto 3003)
│   ├── orders-service/         # Ventas y facturación (puerto 3004)
│   └── notifications-service/  # Emails vía Redis pub/sub (puerto 3005)
├── database/
│   └── kiora_schema.sql        # Referencia global del esquema (documentación)
└── docker-compose.yml          # Infraestructura local completa
```

Cada servicio es **autónomo**: tiene su propia base de datos, migraciones, Dockerfile y configuración de entorno. Las referencias cruzadas entre servicios se manejan mediante **llamadas HTTP** (sin FK de BD entre dominios).

---

## Levantar el entorno local

Sigue estos pasos para configurar y ejecutar el proyecto:

1. **Configuración inicial**: Crea los archivos de entorno para todos los servicios.
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   *Nota: Revisa los archivos `.env.docker` generados en cada carpeta de servicio para asegurarte de que los secretos (JWT, SMTP) estén configurados si es necesario.*

2. **Iniciar infraestructura**:
   ```bash
   docker compose up -d
   ```

| Servicio               | URL / Puerto        | Base de datos  |
|------------------------|---------------------|----------------|
| users-service          | `localhost:3001`    | `kiora_users` @ 5433   |
| products-service       | `localhost:3002`    | `kiora_products` @ 5434 |
| inventory-service      | `localhost:3003`    | `kiora_inventory` @ 5435 |
| orders-service         | `localhost:3004`    | `kiora_orders` @ 5436  |
| notifications-service  | `localhost:3005`    | Sin BD (Redis + SMTP)  |
| Redis                  | `localhost:6379`    | —              |
| pgAdmin                | `localhost:5050`    | —              |

---

## Servicios

### 🔐 users-service

Gestión de usuarios, autenticación JWT y recuperación de contraseña.

- **BD:** `kiora_users` (PostgreSQL @ `localhost:5433`)
- **Docs:** [`services/users-service/README.md`](services/users-service/README.md)
- **Swagger:** `http://localhost:3001/api/docs`
- **Tests:** 54 tests de integración (`npm test`)

### 📦 products-service

Catálogo de productos: crear, consultar y administrar productos y categorías.

- **BD:** `kiora_products` (PostgreSQL @ `localhost:5434`)
- **Tablas:** `Categoria`, `Producto`

### 🏭 inventory-service

Control de stock: movimientos de entrada/salida, proveedores y stock disponible.

- **BD:** `kiora_inventory` (PostgreSQL @ `localhost:5435`)
- **Tablas:** `Proveedor`, `Inventario`, `Suministra`
- Consulta a `products-service` via HTTP para validar productos.

### 📋 orders-service

Ventas y facturación: crear ordenes, detalles de productos vendidos y facturas.

- **BD:** `kiora_orders` (PostgreSQL @ `localhost:5436`)
- **Tablas:** `Ventas`, `Producto_Venta`, `Factura`
- Consulta a `users-service` e `inventory-service` via HTTP.

### 🔔 notifications-service

Envío centralizado de emails.

- **Sin BD propia** — consume eventos del canal Redis `kiora:notifications`.
- Para enviar un email desde cualquier servicio, publicar en Redis:
  ```js
  redisClient.publish('kiora:notifications', JSON.stringify({
    to: 'usuario@example.com',
    subject: 'Asunto',
    html: '<p>Cuerpo HTML</p>',
  }));
  ```

---

## Migraciones

Cada servicio maneja sus propias migraciones con `node-pg-migrate`:

```bash
# Desde el directorio del servicio
npm run migrate:up        # Aplica migraciones pendientes (local)
npm run migrate:up:docker # Aplica migraciones en contenedor Docker
```

---

## CI/CD

Tests automáticos con **GitHub Actions** en cada push a `main` o `develop`.  
Ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
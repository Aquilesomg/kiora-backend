-- Migration: 001_schema_inicial
-- Crea todas las tablas base de Kiora

-- Up Migration
-- 1. TABLA CATEGORIA
CREATE TABLE IF NOT EXISTS Categoria (
    cod_cat SERIAL PRIMARY KEY,
    nom_cat VARCHAR(40) NOT NULL,
    descrip_cat TEXT
);

-- 2. TABLA PROVEEDOR
CREATE TABLE IF NOT EXISTS Proveedor (
    cod_prov SERIAL PRIMARY KEY,
    id_prov VARCHAR(50),
    nom_prov VARCHAR(100) NOT NULL,
    tel_prov VARCHAR(20),
    tipoid_prov VARCHAR(20)
);

-- 3. TABLA PRODUCTO
CREATE TABLE IF NOT EXISTS Producto (
    cod_prod SERIAL PRIMARY KEY,
    nom_prod VARCHAR(100) NOT NULL,
    descrip_prod TEXT,
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad_prod INT,
    fechaven_prod DATE,
    fk_cod_cat INT,
    fk_cod_prov INT,
    FOREIGN KEY (fk_cod_cat) REFERENCES Categoria(cod_cat),
    FOREIGN KEY (fk_cod_prov) REFERENCES Proveedor(cod_prov)
);

-- 4. TABLA INVENTARIO
CREATE TABLE IF NOT EXISTS Inventario (
    id_mov SERIAL PRIMARY KEY,
    tipo_mov VARCHAR(50),
    fecha_mov DATE,
    cantidad INT,
    fk_id_mov INT,
    FOREIGN KEY (fk_id_mov) REFERENCES Producto(cod_prod)
);

-- 5. TABLA SUMINISTRA (M:N Proveedor - Producto)
CREATE TABLE IF NOT EXISTS Suministra (
    cod_prod_cod_pov SERIAL PRIMARY KEY,
    fk_cod_prov INT,
    fk_cod_prod2 INT,
    stock INT,
    FOREIGN KEY (fk_cod_prov) REFERENCES Proveedor(cod_prov),
    FOREIGN KEY (fk_cod_prod2) REFERENCES Producto(cod_prod)
);

-- 6. TABLA CLIENTE
CREATE TABLE IF NOT EXISTS Cliente (
    id_usu SERIAL PRIMARY KEY,
    nom_usu VARCHAR(60),
    correo_usu VARCHAR(100),
    password_usu VARCHAR(255),
    rol_usu VARCHAR(30),
    tel_usu VARCHAR(20)
);

-- 7. TABLA VENTAS
CREATE TABLE IF NOT EXISTS Ventas (
    id_vent SERIAL PRIMARY KEY,
    fecha_vent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_prod_final DECIMAL(10,2),
    montofinal_vent DECIMAL(10,2),
    metodopago_usu VARCHAR(50),
    ordenar_usu VARCHAR(50)
);

-- 8. TABLA PRODUCTO_VENTA (M:N Producto - Ventas)
CREATE TABLE IF NOT EXISTS Producto_Venta (
    cod_prod_id_vent SERIAL PRIMARY KEY,
    fk_cod_prod1 INT,
    fk_id_vent2 INT,
    stock INT,
    FOREIGN KEY (fk_cod_prod1) REFERENCES Producto(cod_prod),
    FOREIGN KEY (fk_id_vent2) REFERENCES Ventas(id_vent)
);

-- 9. TABLA FACTURA (M:N Ventas - Cliente)
CREATE TABLE IF NOT EXISTS Factura (
    id_usu_id_vent SERIAL PRIMARY KEY,
    fk_id_vent INT,
    fk_id_usu INT,
    cantidad_vent INT,
    precio_prod DECIMAL(10,2),
    montototal_vent DECIMAL(10,2),
    FOREIGN KEY (fk_id_vent) REFERENCES Ventas(id_vent),
    FOREIGN KEY (fk_id_usu) REFERENCES Cliente(id_usu)
);

-- Down Migration
-- DROP TABLE IF EXISTS Factura;
-- DROP TABLE IF EXISTS Producto_Venta;
-- DROP TABLE IF EXISTS Ventas;
-- DROP TABLE IF EXISTS Cliente;
-- DROP TABLE IF EXISTS Suministra;
-- DROP TABLE IF EXISTS Inventario;
-- DROP TABLE IF EXISTS Producto;
-- DROP TABLE IF EXISTS Proveedor;
-- DROP TABLE IF EXISTS Categoria;

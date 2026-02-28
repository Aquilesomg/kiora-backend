CREATE DATABASE IF NOT EXISTS kiora;
USE kiora;

-- 1. TABLA CATEGORIA

CREATE TABLE Categoria (
    cod_cat INT PRIMARY KEY AUTO_INCREMENT,
    nom_cat VARCHAR(40) NOT NULL,
    descrip_cat TEXT
);

-- 2. TABLA PROVEEDOR

CREATE TABLE Proveedor (
    cod_prov INT PRIMARY KEY AUTO_INCREMENT,
    id_prov VARCHAR(50),
    nom_prov VARCHAR(100) NOT NULL,
    tel_prov VARCHAR(20),
    tipoid_prov VARCHAR(20)
);

-- 3. TABLA PRODUCTO

CREATE TABLE Producto (
    cod_prod INT PRIMARY KEY AUTO_INCREMENT,
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

CREATE TABLE Inventario (
    id_mov INT PRIMARY KEY AUTO_INCREMENT,
    tipo_mov VARCHAR(50),
    fecha_mov DATE,
    cantidad INT,
    fk_id_mov INT, -- Llave foránea hacia Producto según el MER
    FOREIGN KEY (fk_id_mov) REFERENCES Producto(cod_prod)
);

-- 5. TABLA SUMINISTRA (M:N Proveedor - Producto)

CREATE TABLE Suministra (
    cod_prod_cod_pov INT PRIMARY KEY AUTO_INCREMENT,
    fk_cod_prov INT,
    fk_cod_prod2 INT,
    stock INT,
    FOREIGN KEY (fk_cod_prov) REFERENCES Proveedor(cod_prov),
    FOREIGN KEY (fk_cod_prod2) REFERENCES Producto(cod_prod)
);

-- 6. TABLA CLIENTE

CREATE TABLE Cliente (
    id_usu INT PRIMARY KEY AUTO_INCREMENT,
    nom_usu VARCHAR(60),
    correo_usu VARCHAR(100),
    rol_usu VARCHAR(30),
    tel_usu VARCHAR(20)
);

-- 7. TABLA VENTAS

CREATE TABLE Ventas (
    id_vent INT PRIMARY KEY AUTO_INCREMENT,
    fecha_vent DATETIME DEFAULT CURRENT_TIMESTAMP,
    precio_prod_final DECIMAL(10,2),
    montofinal_vent DECIMAL(10,2),
    metodopago_usu VARCHAR(50),
    ordenar_usu VARCHAR(50)
);

-- 8. TABLA TIENE / PRODUCTO_VENTA (M:N Producto - Ventas)

CREATE TABLE Producto_Venta (
    cod_prod_id_vent INT PRIMARY KEY AUTO_INCREMENT,
    fk_cod_prod1 INT,
    fk_id_vent2 INT,
    stock INT,
    FOREIGN KEY (fk_cod_prod1) REFERENCES Producto(cod_prod),
    FOREIGN KEY (fk_id_vent2) REFERENCES Ventas(id_vent)
);

-- 9. TABLA FACTURA (M:N Ventas - Cliente)

CREATE TABLE Factura (
    id_usu_id_vent INT PRIMARY KEY AUTO_INCREMENT,
    fk_id_vent INT,
    fk_id_usu INT,
    cantidad_vent INT,
    precio_prod DECIMAL(10,2),
    montototal_vent DECIMAL(10,2),
    FOREIGN KEY (fk_id_vent) REFERENCES Ventas(id_vent),
    FOREIGN KEY (fk_id_usu) REFERENCES Cliente(id_usu)
);
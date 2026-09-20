-- ==============================================================================
-- UNIVERSIDAD EL BOSQUE - INGENIERÍA DE SISTEMAS
-- Seguridad de la Información (2026-II)
-- Laboratorio: Seguridad en Autenticación Web
-- Script SQL: Creación de Tablas e Inserción de Datos Iniciales (RBAC)
-- ==============================================================================

-- 1. Creación de la tabla de roles (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Creación de la tabla de usuarios con control de fuerza bruta
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INTEGER NOT NULL,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- 3. Inserción de roles del sistema
INSERT OR IGNORE INTO roles (id, nombre) VALUES (1, 'Administrador');
INSERT OR IGNORE INTO roles (id, nombre) VALUES (2, 'Usuario');

-- 4. Inserción de usuarios iniciales de prueba con contraseña hasheada en BCrypt (costo 10)
-- Contraseña usuario administrador: "AdminPass2026!"
-- Contraseña usuario estándar:      "UsuarioPass2026!"
-- Los hashes se insertan o actualizan dinámicamente mediante el script database/init-db.js

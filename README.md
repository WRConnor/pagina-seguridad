# Seguridad en Autenticación Web y Criptoanálisis Clásico

---

##  Descripción 

Este proyecto integra una aplicación de **Criptoanálisis Clásico (César, Afín, Vigenère y método Kasiski)** con un sistema robusto de **Autenticación Web Segura basada en Roles (RBAC)** desarrollado en **Node.js (Express)**, empaquetado en **Docker** y preparado para su despliegue en una máquina virtual de **Google Cloud Platform (Compute Engine)**.

Cumple con todos los requisitos teóricos, arquitectónicos y prácticos de la Guía de Laboratorio:
1. **Nota Arquitectónica Obligatoria:** Toda la lógica de autenticación, verificación de credenciales, hashing con salt y control de intentos fallidos se procesa exclusivamente en el backend.
2. **Esquema Relacional RBAC:** Base de datos con tablas `roles` y `usuarios`, llaves foráneas y unicidad de identificadores.
3. **Hashing con BCrypt:** Factor de trabajo `SALT_ROUNDS = 10` y salt automático criptográfico de 128 bits codificado en Base64.
4. **Protección Perimetral contra Fuerza Bruta:** Middleware que rastrea intentos por IP en una ventana de 15 minutos y bloquea el acceso con código **HTTP 429 Too Many Requests** tras **5 intentos fallidos consecutivos**.
5. **Formulario Seguro HTML5:** Cumple con la Sección 1.2 del laboratorio (`autocomplete="username"`, `autocomplete="current-password"`, envío `POST`).
6. **Dockerización Multiplataforma:** Imagen basada en `node:22-alpine` con usuario no-root `node` y persistencia de datos.

---

## Estructura del Proyecto

```text
PaginaSeguridad/
├── database/                             # BASE DE DATOS Y SCRIPTS DDL
│   ├── schema.sql                        # Script SQL oficial de creación e inserción inicial
│   ├── init-db.js                        # Inicializador automático de base de datos
│   └── database.sqlite                   # Base de datos SQLite (persistida en volumen)
│
├── docs/                                 # ENTREGABLES ACADÉMICOS DE LA GUÍA
│   ├── conclusiones_seguridad_web.md     # Justificación teórica: seguridad en servidor vs. cliente
│   └── evidencia_prueba_fuerza_bruta.md  # Bitácora de prueba demostrativa de bloqueo (HTTP 429)
│
├── src/                                  # BACKEND NODE.JS
│   ├── server.js                         # Punto de entrada y arranque del servidor HTTP
│   ├── app.js                            # Express, middlewares de seguridad (Helmet, Sesiones)
│   │
│   ├── config/
│   │   ├── env.js                        # Variables de entorno
│   │   ├── database.js                   # Conexión relacional y consultas preparadas
│   │   └── crypto.constants.js           # Alfabeto de 27 letras, frecuencias y n-gramas
│   │
│   ├── middlewares/
│   │   ├── bruteForce.middleware.js      # Middleware de bloqueo por fuerza bruta (5 fallos -> 429)
│   │   ├── auth.middleware.js            # Middleware de verificación de sesión (RBAC)
│   │   └── error.middleware.js           # Manejador de errores
│   │
│   ├── controllers/
│   │   ├── auth.controller.js            # Controladores de Login, Logout y Registro
│   │   └── crypto.controller.js          # Controladores de Criptoanálisis y Cifrado
│   │
│   ├── services/
│   │   ├── auth.service.js               # BCrypt hash/compare y gestión de intentos en BD
│   │   ├── text.service.js               # Normalización y análisis estadístico
│   │   ├── cesar.service.js              # Cifrado, descifrado y fuerza bruta de César
│   │   ├── afin.service.js               # Aritmética modular y análisis Afín
│   │   ├── vigenere.service.js           # Examen de Kasiski y resolución Vigenère
│   │   └── analysis.service.js           # Orquestador del análisis por IC y scoring
│   │
│   └── routes/
│       ├── auth.routes.js                # Rutas /login, /logout, /api/auth
│       └── crypto.routes.js              # Rutas /api/crypto y /api/health
│
├── public/                               # FRONTEND ESTÁTICO (Servido por Express)
│   ├── css/
│   │   └── style.css                     # Estilos tema oscuro preservados y ampliados para login
│   ├── js/
│   │   ├── api.js                        # Cliente HTTP común para peticiones fetch
│   │   ├── login.js                      # Manejo de respuestas y temporizador de bloqueo 429
│   │   ├── analizador.js                 # Vista cliente de index.html (conectada a la API)
│   │   └── encriptar.js                  # Vista cliente de encriptar.html (conectada a la API)
│   ├── login.html                        # Formulario seguro de Login HTML5 (Sección 1.2)
│   ├── index.html                        # Analizador de criptogramas (zona protegida)
│   └── encriptar.html                    # Encriptador de texto (zona protegida)
│
├── test/
│   └── test-bruteforce.js                # Script de pruebas automatizadas y verificación 429
│
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile                            # Imagen Alpine con usuario 'node'
├── docker-compose.yml                    # Orquestación de contenedor
└── package.json
```

---

## Credenciales Semilla del Laboratorio

| Rol | Usuario / Email | Contraseña en Claro | Hash Almacenado en BD |
|---|---|---|---|
| **Administrador** | `admin@seguridad.edu` | `AdminPass2026!` | `$2b$10$...` (Costo 10 con Salt) |
| **Usuario** | `usuario@seguridad.edu` | `UsuarioPass2026!` | `$2b$10$...` (Costo 10 con Salt) |

---

## Ejecución en Entorno Local

### Requisitos Previos:
- Node.js versión 20 o superior (recomendado Node 22 o 24).
- npm versión 10 o superior.

### Pasos:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Inicializar la base de datos relacional:**
   ```bash
   npm run init-db
   ```
   *(Crea las tablas `roles` y `usuarios`, e inserta los usuarios semilla con contraseñas hasheadas en BCrypt).*

3. **Ejecutar la suite de pruebas de seguridad y fuerza bruta:**
   ```bash
   npm run test-bruteforce
   ```
   *(Verifica automáticamente los 6 casos de prueba: healthcheck, protección de rutas, login válido, criptoanálisis autenticado, bloqueo por IP con HTTP 429 tras 5 intentos fallidos, y persistencia en BD).*

4. **Iniciar el servidor en modo desarrollo / producción:**
   ```bash
   npm start
   ```
   Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

---

## Ejecución Local con Docker y Docker Compose

Si tienes Docker Desktop en ejecución:

```bash
# Construir y levantar el contenedor
docker compose up -d --build

# Ver los logs del servidor
docker compose logs -f

# Detener el contenedor
docker compose down
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Guía Paso a Paso para Despliegue en Google Cloud Platform (GCP)

Para desplegar la aplicación en una Máquina Virtual de **Google Cloud Compute Engine**:

### Paso 1: Crear la Instancia en Compute Engine
1. Ingresa a la consola de Google Cloud ([console.cloud.google.com](https://console.cloud.google.com)).
2. Ve a **Compute Engine** > **Instancias de VM** > **Crear Instancia**.
3. Configuración recomendada:
   - **Nombre:** `vm-seguridad-autenticacion`
   - **Región / Zona:** `us-central1` (o la más cercana).
   - **Tipo de máquina:** `e2-micro` o `e2-small` (suficiente y económica).
   - **Disco de arranque:** Debian GNU/Linux 12 o Ubuntu 22.04 LTS.
   - **Firewall:** Marcar las casillas:
     -  **Permitir tráfico HTTP**
     -  **Permitir tráfico HTTPS**
4. Haz clic en **Crear**.

### Paso 2: Conectarse por SSH a la VM
En la lista de instancias de VM, haz clic en el botón **SSH** correspondiente a tu instancia.

### Paso 3: Instalar Docker y Docker Compose en la VM
En la consola SSH de la VM, ejecuta los siguientes comandos:

```bash
# Actualizar repositorios del sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Docker y Docker Compose
sudo apt-get install -y docker.io docker-compose

# Habilitar e iniciar el servicio de Docker
sudo systemctl enable --now docker

# Agregar el usuario actual al grupo docker
sudo usermod -aG docker $USER
```

*(Cierra la sesión SSH y vuelve a entrar para aplicar los permisos de grupo).*

### Paso 4: Transferir el Proyecto a la VM
Puedes clonar el repositorio mediante Git o transferir los archivos con `gcloud`:

```bash
# Opción A: Mediante Git
git clone <URL_DE_TU_REPOSITORIO> PaginaSeguridad
cd PaginaSeguridad

# Opción B: Si transfieres directamente desde tu equipo con Google Cloud SDK:
# gcloud compute scp --recurse ./PaginaSeguridad <NOMBRE_VM>:~/ --zone=<ZONA>
```

### Paso 5: Desplegar la Aplicación en el Puerto 80
Para que la aplicación sea accesible directamente por el puerto estándar HTTP (puerto 80):

Edita el archivo `docker-compose.yml` en la VM si deseas exponer el puerto 80:
```yaml
ports:
  - "80:3000"
```

Inicia el contenedor:
```bash
docker-compose up -d --build
```
---



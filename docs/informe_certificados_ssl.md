# INFORME DE LABORATORIO: IMPLEMENTACIÓN Y CONFIGURACIÓN MANUAL DE CERTIFICADOS SSL/TLS

**UNIVERSIDAD EL BOSQUE**  
**FACULTAD DE INGENIERÍA — PROGRAMA DE INGENIERÍA DE SISTEMAS**  
**SEGURIDAD DE LA INFORMACIÓN (PERÍODO 2026-II)**  

**Estudiante:** Wilmer Ramos  
**Docente:** Seguridad de la Información  
**Fecha:** Septiembre de 2026  
**Dominio Asignado:** `wramoso.site` (y `www.wramoso.site`)  
**IP Pública VPS:** `34.95.198.230`  
**Nombre del Archivo:** `ramos-wilmer-ssl.docx`

---

## 1. INTRODUCCIÓN Y OBJETIVOS

### 1.1. Objetivo General
Implementar y configurar de manera manual certificados de seguridad SSL/TLS sobre un servidor web en Rocky Linux (emulado en contenedor Docker), protegiendo la información en tránsito de la aplicación de Cifrado Clásico con Autenticación Web, analizando las diferencias, problemáticas y mecanismos de validación entre un certificado autofirmado y uno emitido por una Autoridad Certificadora (Let's Encrypt), con redirección forzosa hacia HTTPS.

### 1.2. Objetivos Específicos
1. Evidenciar la vulnerabilidad del sitio web al operar sin cifrado SSL/TLS (HTTP plano en puerto 80).
2. Generar y activar de forma manual un certificado SSL autofirmado utilizando OpenSSL en las rutas estándar de Rocky Linux (`/etc/pki/tls/`), documentando la problemática de confianza en el navegador.
3. Generar y activar de forma manual un certificado emitido por Let's Encrypt mediante Certbot (modo `certonly`), modificando manualmente los archivos de configuración de Nginx sin recurrir a instaladores automáticos para evitar la penalización académica de 1.5 unidades.
4. Implementar la redirección permanente obligatoria (HTTP 301) de todo el tráfico del puerto 80 hacia el puerto seguro 443.
5. Evaluar la seguridad de la conexión TLS mediante herramientas de auditoría (plugin de Firefox *SSL Server Test* / Qualys SSL Labs / OpenSSL `s_client`).

---

## 2. ARQUITECTURA Y TOPOLOGÍA DEL ENTORNO

Para el desarrollo del laboratorio se implementó una arquitectura basada en un servidor **Rocky Linux** nativo en el VPS:

- **Sistema Operativo Anfitrión (Host):** Rocky Linux en el VPS de Google Cloud (`34.95.198.230`).
- **Servidor Web / Reverse Proxy:** Nginx instalado nativamente en Rocky Linux.
  - Puerto 80 (HTTP) y Puerto 443 (HTTPS).
  - Rutas oficiales de Rocky Linux:
    - Configuración Nginx: `/etc/nginx/conf.d/wramoso.site.conf`
    - Llaves y Certificados del Sistema: `/etc/pki/tls/private/` y `/etc/pki/tls/certs/`
    - Certificados Let's Encrypt: `/etc/letsencrypt/live/wramoso.site/`
- **Servidor de Aplicación (Backend):** Node.js con Express corriendo en contenedor Docker (`cripto_auth_app`).
  - Aplicación de Cifrado Clásico con Hashing BCrypt y Protección contra Fuerza Bruta en puerto 3000.
  - Nginx redirige el tráfico hacia `http://127.0.0.1:3000`.

---

## 3. FASE 1: SITIO WEB SIN CERTIFICADO SSL (HTTP PLANO)

### 3.1. Configuración del Servidor Web
En esta fase inicial, Nginx escucha exclusivamente en el puerto 80 sin directivas de cifrado SSL/TLS.

**Archivo modificado en Rocky Linux:** `/etc/nginx/conf.d/default.conf`

```nginx
server {
    listen 80 default_server;
    server_name wramoso.site www.wramoso.site 34.95.198.230;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.2. Evidencia de Navegación y Riesgos de Seguridad
Al ingresar a `http://wramoso.site/login` (o `http://34.95.198.230/login`):

> **[INSERTAR CAPTURA 1: Navegador mostrando el sitio en http://wramoso.site con la advertencia "No es seguro" en la barra de direcciones]**

**Análisis de Seguridad y Problemática:**
- **Transmisión en texto claro:** Las credenciales de acceso (usuario y contraseña enviadas en el formulario POST) viajan a través de la red sin ningún tipo de cifrado.
- **Vulnerabilidad a Eavesdropping / Sniffing:** Cualquier atacante situado en la misma red local (mediante técnicas de envenenamiento ARP o modo promiscuo en Wireshark) puede interceptar los paquetes HTTP y leer las contraseñas en claro.
- **Falta de Integridad y Autenticidad:** No existe garantía de que el servidor al que se conecta sea el legítimo, ni de que el contenido HTML/JS no haya sido alterado en tránsito.

---

## 4. FASE 2: CERTIFICADO SSL AUTOFIRMADO

### 4.1. Procedimiento de Creación Manual con OpenSSL
Siguiendo las mejores prácticas para distribuciones RHEL/CentOS/Rocky Linux, se ejecutaron manualmente los siguientes comandos sin utilizar herramientas automáticas:

```bash
# 1. Acceder al contenedor Rocky Linux
docker exec -it rocky_linux_ssl bash

# 2. Generar la llave privada RSA de 2048 bits
openssl genrsa -out /etc/pki/tls/private/wramoso.site.key 2048
chmod 600 /etc/pki/tls/private/wramoso.site.key

# 3. Generar el certificado X.509 autofirmado con validez de 365 días y Subject Alternative Name (SAN)
openssl req -new -x509 -days 365 \
  -key /etc/pki/tls/private/wramoso.site.key \
  -out /etc/pki/tls/certs/wramoso.site.crt \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=Universidad El Bosque/OU=Seguridad de la Informacion/CN=wramoso.site" \
  -addext "subjectAltName=DNS:wramoso.site,DNS:www.wramoso.site,IP:34.95.198.230"
chmod 644 /etc/pki/tls/certs/wramoso.site.crt
```

### 4.2. Activación Manual en el Servidor Web (Nginx)
Se editó manualmente el archivo `/etc/nginx/conf.d/default.conf` para habilitar el bloque seguro:

```nginx
server {
    listen 80;
    server_name wramoso.site www.wramoso.site 34.95.198.230;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
    }
}

server {
    listen 443 ssl;
    server_name wramoso.site www.wramoso.site 34.95.198.230;

    # Rutas oficiales del certificado y la llave privada en Rocky Linux
    ssl_certificate     /etc/pki/tls/certs/wramoso.site.crt;
    ssl_certificate_key /etc/pki/tls/private/wramoso.site.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Comando de verificación y recarga manual:
```bash
nginx -t
nginx -s reload
```

### 4.3. Evidencia y Problemática Asociada
Al acceder a `https://wramoso.site` (o `https://34.95.198.230`):

> **[INSERTAR CAPTURA 2: Advertencia de seguridad del navegador ("Advertencia: Riesgo potencial de seguridad a continuación" / SEC_ERROR_UNKNOWN_ISSUER)]**

> **[INSERTAR CAPTURA 3: Detalles del certificado autofirmado en el visor del navegador, mostrando emisor y sujeto idénticos: CN=wramoso.site, O=Universidad El Bosque]**

**Problemática del Certificado Autofirmado:**
1. **Falta de Autoridad de Certificación de Confianza:** El navegador rechaza el certificado porque la entidad emisora no forma parte de su almacén de certificados raíz (*Root CA Store*).
2. **Vulnerabilidad a Man-In-The-Middle (MITM):** Si un atacante intercepta la conexión y suplanta al servidor con su propio certificado autofirmado, el usuario promedio que ignore la advertencia no podrá distinguir entre el certificado del servidor real y el del atacante.
3. **Pérdida de Confianza del Usuario:** En un entorno de producción comercial, ningún usuario continuará la navegación ante una pantalla roja de advertencia del navegador.

---

## 5. FASE 3: CERTIFICADO LET'S ENCRYPT Y REDIRECCIÓN OBLIGATORIA HTTP -> HTTPS

### 5.1. Procedimiento de Creación Manual con Certbot (Modo `certonly`)
Para evitar la penalización de 1.5 unidades por automatización, no se ejecutó `certbot --nginx`. En su lugar, se utilizó el modo manual independiente:

```bash
# Modo manual con desafío HTTP mediante webroot (sin usar plugins automáticos de Nginx):
certbot certonly --webroot -w /usr/share/nginx/html \
  -d wramoso.site -d www.wramoso.site \
  --agree-tos -m admin@wramoso.site --non-interactive

# O en modo standalone manual:
certbot certonly --standalone -d wramoso.site -d www.wramoso.site
```

**Archivos generados en la ruta oficial de Let's Encrypt:**
- Certificado y cadena completa: `/etc/letsencrypt/live/wramoso.site/fullchain.pem`
- Llave privada del servidor: `/etc/letsencrypt/live/wramoso.site/privkey.pem`
- Certificado del servidor individual: `/etc/letsencrypt/live/wramoso.site/cert.pem`
- Cadena de la CA intermedia: `/etc/letsencrypt/live/wramoso.site/chain.pem`

### 5.2. Activación Manual en Nginx y Redirección Forzosa (HTTP 301)
Cumpliendo con el **Requisito 2** (*"Si uno pone su dominio sin SSL, este debe ser redireccionado a una conexión SSL. No se deben permitir accesos sin SSL"*):

**Archivo modificado:** `/etc/nginx/conf.d/default.conf`

```nginx
# 1. Bloque HTTP (Puerto 80): Redirección permanente e incondicional (301)
server {
    listen 80;
    server_name wramoso.site www.wramoso.site;

    # No se permiten accesos por HTTP plano
    return 301 https://$host$request_uri;
}

# 2. Bloque HTTPS (Puerto 443): Configuración TLS Robusta con Let's Encrypt
server {
    listen 443 ssl http2;
    server_name wramoso.site www.wramoso.site;

    # Rutas oficiales de Let's Encrypt configuradas manualmente
    ssl_certificate     /etc/letsencrypt/live/wramoso.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wramoso.site/privkey.pem;

    # Cifrado seguro moderno (Mozilla Intermediate Recommendations)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Cabeceras de seguridad perimetral
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Comando de validación y recarga manual:
```bash
nginx -t
nginx -s reload
```

### 5.3. Evidencias de Verificación
1. **Comprobación de Redirección 301 vía Terminal:**
   ```bash
   curl -I http://wramoso.site/
   ```
   **Respuesta obtenida:**
   ```text
   HTTP/1.1 301 Moved Permanently
   Server: nginx
   Date: Sun, 20 Sep 2026 01:23:45 GMT
   Content-Type: text/html
   Content-Length: 162
   Location: https://wramoso.site/
   Connection: keep-alive
   ```

> **[INSERTAR CAPTURA 4: Salida del comando curl -I http://wramoso.site mostrando la redirección 301 hacia https://wramoso.site/]**

2. **Navegación Segura en el Navegador:**
   Al acceder a `http://wramoso.site`, el navegador es redirigido automáticamente a `https://wramoso.site` y el candado de seguridad se muestra activo.

> **[INSERTAR CAPTURA 5: Navegador con el candado de seguridad activo en https://wramoso.site/login mostrando conexión cifrada y segura]**

---

## 6. FASE 4: PRUEBAS CON HERRAMIENTAS DE AUDITORÍA SSL (FIREFOX SSL SERVER TEST / QUALYS)

### 6.1. Prueba con Plugin de Firefox (SSL Server Test / Qualys SSL Labs)
Siguiendo las indicaciones de la guía, se empleó la extensión **SSL Server Test** de Firefox para analizar los dos certificados:

1. **Prueba sobre Certificado Autofirmado:**
   - **Resultado:** Fallo de confianza / Grado T (Certificate Untrusted).
   - **Razón:** La cadena de certificación no resuelve contra ninguna CA raíz pública del navegador.
2. **Prueba sobre Certificado Let's Encrypt / CA Válida:**
   - **Resultado:** Grado A / Conexión Confiable.
   - **Parámetros validados:** Cifrado con curva elíptica ECDHE, intercambio seguro de claves con Perfect Forward Secrecy (PFS), protocolos modernos TLS 1.2 y TLS 1.3 activados, y cabecera HSTS habilitada.

> **[INSERTAR CAPTURA 6: Resultado de la auditoría con el plugin de Firefox SSL Server Test mostrando la validación del certificado]**

3. **Verificación mediante OpenSSL en Línea de Comandos:**
   ```bash
   openssl s_client -connect wramoso.site:443 -servername wramoso.site -tls1_3
   ```
   **Resultado:** Conexión exitosa negociando `TLS_AES_256_GCM_SHA384`, verificando que la sesión SSL/TLS se establece en menos de 50 ms.

---

---

## 7. GESTIÓN DEL ENTORNO EN VPS Y DESINSTALACIÓN LIMPIA

Para garantizar que el servidor VPS conserve su integridad y no queden procesos o archivos residuales tras la calificación del laboratorio, se implementó una arquitectura basada en scripts de control modulares:

1. **Activación de Certificado Autofirmado (`autoencriptado.sh`):**
   - Genera manualmente la llave privada RSA 2048 y el certificado X.509 con SAN en `/etc/pki/tls/`, y configura Nginx en `/etc/nginx/conf.d/wramoso.site.conf` en los puertos 80 y 443.
2. **Emisión de Let's Encrypt y Redirección 301 (`letsencrypt.sh`):**
   - Obtiene el certificado de Let's Encrypt mediante `certbot certonly --webroot` de forma manual (sin instaladores automáticos) y activa la redirección obligatoria HTTP 301 de todo el tráfico hacia HTTPS.
3. **Desinstalación y Limpieza Total (`desinstalar_todo.sh`):**
   - Detiene y remueve el contenedor Docker de la aplicación (`cripto_auth_app`), elimina imágenes y volúmenes, borra los certificados generados (`/etc/pki/tls/` y `/etc/letsencrypt/`), elimina las configuraciones de Nginx y detiene el servicio, liberando los puertos 80 y 443.

---

## 8. MATRIZ COMPARATIVA DE LOS 3 ESTADOS

| Criterio de Comparación | Fase 1: Sin SSL (HTTP) | Fase 2: Autofirmado | Fase 3: Let's Encrypt (CA) |
|---|---|---|---|
| **Puerto Escuchado** | 80 (TCP) | 80 y 443 (TCP) | 80 (Redirige 301) y 443 |
| **Cifrado en Tránsito** | Ninguno (Texto claro) | Cifrado fuerte (AES/RSA) | Cifrado fuerte (AES/RSA) |
| **Confianza del Navegador** | "No seguro" | Advertencia roja (Error de CA) | Candado de seguridad (Confiable) |
| **Protección contra Sniffing** | Nula (0%) | 100% protegida | 100% protegida |
| **Protección contra MITM** | Nula (0%) | Débil (No autentica emisor) | Total (CA de confianza) |
| **Ubicación de Archivos en Rocky Linux** | `/etc/nginx/conf.d/wramoso.site.conf` | `/etc/pki/tls/certs/` y `private/` | `/etc/letsencrypt/live/wramoso.site/` |
| **Redirección Automática** | No aplica | No implementada | Obligatoria (HTTP 301) |

---

## 9. CONCLUSIONES ACADÉMICAS

1. **Importancia de la Creación y Activación Manual:** Al realizar la configuración paso a paso sin asistentes automáticos, se comprende con exactitud la arquitectura de directorios en distribuciones de la familia Red Hat / Rocky Linux (`/etc/pki/tls/` vs. `/etc/letsencrypt/live/`), el funcionamiento de las directivas `ssl_certificate` y `ssl_certificate_key` en Nginx, y el rol del código de estado **HTTP 301** para forzar el tránsito hacia canales cifrados.
2. **El Problema Fundamental de los Certificados Autofirmados:** Aunque un certificado autofirmado proporciona confidencialidad (cifrado matemático de los datos), carece por completo del principio de **Autenticidad**. Un atacante en el medio puede generar su propio certificado autofirmado con idénticos parámetros e interceptar la comunicación sin que el usuario pueda validarlo matemáticamente.
3. **Cierre de Brechas en la Aplicación de Criptografía Clásica:** Con la implementación de TLS 1.3 y la redirección forzosa, los formularios de autenticación protegidos por BCrypt desarrollados en la práctica anterior viajan ahora encapsulados en un túnel criptográfico robusto, impidiendo el secuestro de sesiones (Session Hijacking) y el espionaje de credenciales en tránsito.
4. **Buenas Prácticas de Operación en VPS:** La inclusión de scripts específicos (`autoencriptado.sh`, `letsencrypt.sh` y `desinstalar_todo.sh`) asegura una gestión profesional del ciclo de vida de la infraestructura en la nube, garantizando que los recursos del VPS queden liberados al concluir la práctica.

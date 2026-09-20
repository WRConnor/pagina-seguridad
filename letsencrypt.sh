#!/bin/bash
# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN (2026-II)
# FASE 3: CERTIFICADO LET'S ENCRYPT Y REDIRECCIÓN OBLIGATORIA (HTTP 301 -> HTTPS)
# Para ejecutar directamente en el host Rocky Linux 9 / 10
# CUMPLE: Método manual certonly (sin automatizadores --nginx para evitar penalización)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: Este script debe ejecutarse como root o con sudo.${NC}"
   exit 1
fi

DOMAIN="wramoso.site"
EMAIL="admin@${DOMAIN}"
WEBROOT="/usr/share/nginx/html"
NGINX_CONF="/etc/nginx/conf.d/wramoso.site.conf"
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}   FASE 3: CERTIFICADO LET'S ENCRYPT + REDIRECCIÓN OBLIGATORIA    ${NC}"
echo -e "${BLUE}   Host: Rocky Linux | Dominio: ${DOMAIN} (y www.${DOMAIN})       ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Instalar Certbot mediante EPEL (sin usar el plugin automático --nginx)
if ! command -v certbot &> /dev/null; then
    echo -e "${BLUE}[*] Instalando Certbot desde repositorio EPEL...${NC}"
    dnf install -y epel-release
    dnf install -y --allowerasing certbot nginx
fi

# 2. Configurar SELinux y Firewall
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --permanent --add-service=https || true
    firewall-cmd --reload || true
fi

# 3. Preparar directorio Webroot para el desafío ACME HTTP-01
mkdir -p "${WEBROOT}/.well-known/acme-challenge"
chmod -R 755 "${WEBROOT}"

# Configuración temporal para permitir la validación del desafío ACME de Let's Encrypt
cat << EOF > ${NGINX_CONF}
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
    }
}
EOF

nginx -t
systemctl enable --now nginx
systemctl reload nginx

# 4. Obtención manual del certificado mediante Certbot (modo certonly con webroot)
echo -e "${BLUE}[*] Solicitando certificado a Let's Encrypt para ${DOMAIN} y www.${DOMAIN}...${NC}"
certbot certonly \
  --webroot -w "${WEBROOT}" \
  -d "${DOMAIN}" -d "www.${DOMAIN}" \
  --agree-tos \
  --email "${EMAIL}" \
  --non-interactive \
  --keep-until-expiring

if [ ! -f "${LIVE_DIR}/fullchain.pem" ]; then
    echo -e "${RED}[ERROR] No se pudo obtener el certificado de Let's Encrypt.${NC}"
    echo -e "${YELLOW}Verifica que el DNS de ${DOMAIN} apunte a este VPS y el puerto 80 esté abierto.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Certificado Let's Encrypt emitido exitosamente.${NC}"

# 5. Configuración manual de Nginx: Redirección 301 obligatoria y bloque HTTPS
echo -e "${BLUE}[*] Aplicando configuración Nginx con redirección HTTP 301 obligatoria...${NC}"
cat << 'EOF' > ${NGINX_CONF}
# ==============================================================================
# FASE 3: REDIRECCIÓN OBLIGATORIA Y CONEXIÓN SEGURA LET'S ENCRYPT
# ==============================================================================

# 1. Bloque HTTP (Puerto 80): Redirección permanente (HTTP 301) hacia HTTPS
# REQUISITO: "Si uno pone su dominio sin SSL, este debe ser redireccionado a una conexión SSL"
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name wramoso.site www.wramoso.site 34.95.198.230;

    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 2. Bloque HTTPS (Puerto 443): Cifrado robusto con certificado Let's Encrypt
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name wramoso.site www.wramoso.site 34.95.198.230;

    # Rutas oficiales de Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/wramoso.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wramoso.site/privkey.pem;

    # Cifrado seguro moderno (Mozilla Recommendations)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://127.0.0.1:3000;
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
EOF

# 6. Validar y recargar Nginx
echo -e "${BLUE}[*] Validando sintaxis y recargando Nginx...${NC}"
nginx -t
systemctl reload nginx

# 7. Comprobación automática de la redirección 301
echo ""
echo -e "${BLUE}[*] Comprobando redirección 301 con curl:${NC}"
curl -I http://${DOMAIN}/ || true

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}✓ FASE 3 ACTIVADA CON ÉXITO${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Certificado Let's Encrypt activo para: ${YELLOW}https://${DOMAIN}${NC}"
echo -e "Redirección obligatoria activa: ${YELLOW}http://${DOMAIN} -> https://${DOMAIN}${NC}"
echo ""
echo -e "${BLUE}Evidencias a capturar para el informe:${NC}"
echo -e " 1. Captura de terminal ejecutando: ${YELLOW}curl -I http://${DOMAIN}${NC} (mostrar HTTP/1.1 301 Moved Permanently)."
echo -e " 2. Captura del navegador en ${YELLOW}https://${DOMAIN}${NC} mostrando el candado de seguridad y conexión confiable."
echo -e " 3. Captura de la auditoría con el plugin de Firefox 'SSL Server Test' o Qualys SSL Labs."

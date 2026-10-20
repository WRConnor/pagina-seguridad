#!/bin/bash
# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN (2026-II)
# FASE 1: SITIO WEB SIN SSL (HTTP PLANO EN PUERTO 80)
# Para ejecutar directamente en el host Rocky Linux 9 / 10
# Incluye reseteo activo de HSTS para evitar auto-redirecciones del navegador
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

# ------------------------------------------------------------------------------
# DETECCIÓN AUTOMÁTICA DE LA IP DE LA MÁQUINA / VPS
# ------------------------------------------------------------------------------
detectar_ip() {
    if [[ -n "${VPS_IP}" ]]; then
        echo "${VPS_IP}"
        return
    fi
    if [[ -n "${HOST_IP}" ]]; then
        echo "${HOST_IP}"
        return
    fi

    local ip=""
    # 1. Metadatos de Google Cloud Platform (Compute Engine)
    ip=$(curl -s -m 2 -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" 2>/dev/null || true)

    # 2. Servicios de IP pública externa
    if [[ -z "$ip" || ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        ip=$(curl -s -m 3 -4 https://ifconfig.me 2>/dev/null || curl -s -m 3 -4 https://api.ipify.org 2>/dev/null || curl -s -m 3 -4 https://icanhazip.com 2>/dev/null || true)
    fi

    # 3. Interfaz de red local primaria del host
    if [[ -z "$ip" || ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    if [[ -z "$ip" || ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
    fi

    # 4. Fallback si no hay red disponible
    if [[ -z "$ip" || ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        ip="127.0.0.1"
    fi

    echo "$ip"
}

DOMAIN="wramoso.site"
VPS_IP=$(detectar_ip)
NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}   FASE 1: ACTIVAR SITIO SIN SSL (HTTP PUERTO 80) EN ROCKY LINUX  ${NC}"
echo -e "${BLUE}   Dominio: ${DOMAIN} (y www.${DOMAIN})                           ${NC}"
echo -e "${BLUE}   IP detectada automáticamente: ${YELLOW}${VPS_IP}${BLUE}                    ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}[*] Instalando Nginx en Rocky Linux...${NC}"
    dnf install -y nginx
fi

# 2. Configurar SELinux para permitir que Nginx actúe como proxy hacia 127.0.0.1:3000
echo -e "${BLUE}[*] Habilitando conexión de proxy en SELinux (httpd_can_network_connect)...${NC}"
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

# 3. Abrir puertos 80 y 443 en el firewall si está activo
if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    echo -e "${BLUE}[*] Abriendo puertos 80 y 443 en Firewalld...${NC}"
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --permanent --add-service=https || true
    firewall-cmd --reload || true
fi

# 4. Detectar o preparar certificado SSL para responder en 443, resetear HSTS y redirigir a HTTP
SSL_CERT=""
SSL_KEY=""

if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" && -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]]; then
    SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
elif [[ -f "/etc/pki/tls/certs/${DOMAIN}.crt" && -f "/etc/pki/tls/private/${DOMAIN}.key" ]]; then
    SSL_CERT="/etc/pki/tls/certs/${DOMAIN}.crt"
    SSL_KEY="/etc/pki/tls/private/${DOMAIN}.key"
else
    mkdir -p /etc/pki/tls/certs /etc/pki/tls/private
    if [[ ! -f "/etc/pki/tls/certs/temp_hsts_clear.crt" ]]; then
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
          -keyout /etc/pki/tls/private/temp_hsts_clear.key \
          -out /etc/pki/tls/certs/temp_hsts_clear.crt \
          -subj "/CN=${DOMAIN}" 2>/dev/null || true
    fi
    SSL_CERT="/etc/pki/tls/certs/temp_hsts_clear.crt"
    SSL_KEY="/etc/pki/tls/private/temp_hsts_clear.key"
fi

# 5. Escribir configuración de Nginx sin SSL y con reseteo de HSTS
echo -e "${BLUE}[*] Escribiendo configuración HTTP y limpiador de HSTS en ${NGINX_CONF}...${NC}"
cat << EOF > ${NGINX_CONF}
# ==============================================================================
# FASE 1: SITIO SIN CERTIFICADO SSL (HTTP PLANO EN PUERTO 80)
# Incluye limpiador activo de HSTS para navegadores con política previa en caché
# ==============================================================================

# 1. Bloque principal HTTP (Puerto 80): Servicio plano sin cifrado
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN} www.${DOMAIN} ${VPS_IP};

    # Encabezados para desactivar HSTS en el navegador y forzar no-cache de redirecciones
    add_header Strict-Transport-Security "max-age=0; includeSubDomains" always;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# 2. Bloque capturador HTTPS (Puerto 443): Resetea HSTS (max-age=0) y redirige a HTTP
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name ${DOMAIN} www.${DOMAIN} ${VPS_IP};

    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    # Invalida inmediatamente el HSTS guardado en Chrome / Edge / Firefox
    add_header Strict-Transport-Security "max-age=0; includeSubDomains" always;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;

    return 307 http://\$host\$request_uri;
}
EOF

# 6. Validar y reiniciar Nginx
echo -e "${BLUE}[*] Validando sintaxis de Nginx...${NC}"
nginx -t

systemctl enable --now nginx
systemctl reload nginx

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}✓ FASE 1 ACTIVADA CON ÉXITO (HTTP PLANO SIN REDIRECCIÓN HTTPS)${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Puedes acceder desde tu navegador a:"
echo -e "  ${YELLOW}http://${DOMAIN}/login${NC}  o  ${YELLOW}http://${VPS_IP}/login${NC}"
echo ""
echo -e "${BLUE}Nota sobre la caché de navegadores (HSTS):${NC}"
echo -e " Si tu navegador aún intenta forzar HTTPS por una prueba previa de Let's Encrypt:"
echo -e " 1. Ingresa a chrome://net-internals/#hsts (o edge://net-internals/#hsts)"
echo -e " 2. En 'Delete domain security policies', ingresa '${DOMAIN}' y pulsa 'Delete'."
echo -e " 3. O bien, abre una ventana de incógnito o escribe explícitamente http://${DOMAIN}/login"
echo ""
echo -e "${BLUE}Evidencia a capturar:${NC}"
echo -e "Toma la captura de pantalla mostrando la advertencia de navegador 'No es seguro'."

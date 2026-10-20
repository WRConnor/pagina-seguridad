#!/bin/bash
# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN (2026-II)
# FASE 2: CERTIFICADO SSL AUTOFIRMADO (OPENSSL) EN ROCKY LINUX 9 / 10
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
KEY_PATH="/etc/pki/tls/private/${DOMAIN}.key"
CRT_PATH="/etc/pki/tls/certs/${DOMAIN}.crt"
NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}   FASE 2: GENERACIÓN Y ACTIVACIÓN DE CERTIFICADO AUTOFIRMADO     ${NC}"
echo -e "${BLUE}   Host: Rocky Linux | Dominio: ${DOMAIN}                         ${NC}"
echo -e "${BLUE}   IP detectada automáticamente: ${YELLOW}${VPS_IP}${BLUE}                    ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Instalar paquetes necesarios si faltan
if ! command -v nginx &> /dev/null || ! command -v openssl &> /dev/null; then
    echo -e "${BLUE}[*] Instalando Nginx y OpenSSL...${NC}"
    dnf install -y nginx openssl
fi

# 2. Configurar SELinux y Firewall
echo -e "${BLUE}[*] Configurando SELinux y Firewall (puertos 80 y 443)...${NC}"
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --permanent --add-service=https || true
    firewall-cmd --reload || true
fi

# 3. Crear directorios estándar de Rocky Linux
mkdir -p /etc/pki/tls/private /etc/pki/tls/certs
chmod 700 /etc/pki/tls/private

# 4. Generar llave privada RSA de 2048 bits
echo -e "${BLUE}[*] Generando llave privada RSA en ${KEY_PATH}...${NC}"
openssl genrsa -out "${KEY_PATH}" 2048
chmod 600 "${KEY_PATH}"

# 5. Generar certificado X.509 autofirmado (validez 365 días) con SAN
echo -e "${BLUE}[*] Generando certificado X.509 autofirmado en ${CRT_PATH}...${NC}"
openssl req -new -x509 -days 365 \
  -key "${KEY_PATH}" \
  -out "${CRT_PATH}" \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=Universidad El Bosque/OU=N/A/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN},IP:${VPS_IP}"
chmod 644 "${CRT_PATH}"

# 6. Escribir configuración de Nginx con SSL autofirmado
echo -e "${BLUE}[*] Configurando Nginx en ${NGINX_CONF}...${NC}"
cat << EOF > ${NGINX_CONF}
# ==============================================================================
# FASE 2: NGINX CON CERTIFICADO AUTOFIRMADO
# ==============================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN} www.${DOMAIN} ${VPS_IP};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name ${DOMAIN} www.${DOMAIN} ${VPS_IP};

    # Rutas oficiales en Rocky Linux
    ssl_certificate     /etc/pki/tls/certs/${DOMAIN}.crt;
    ssl_certificate_key /etc/pki/tls/private/${DOMAIN}.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

# 7. Validar y reiniciar Nginx
echo -e "${BLUE}[*] Validando sintaxis de Nginx...${NC}"
nginx -t

systemctl enable --now nginx
systemctl reload nginx

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}✓ FASE 2 ACTIVADA CON ÉXITO${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Certificado generado en: ${YELLOW}${CRT_PATH}${NC}"
echo -e "Llave privada en:       ${YELLOW}${KEY_PATH}${NC}"
echo ""
echo -e "Accede desde tu navegador a:"
echo -e "  ${YELLOW}https://${DOMAIN}/login${NC}  o  ${YELLOW}https://${VPS_IP}/login${NC}"
echo ""
echo -e "${BLUE}Evidencias a capturar para el informe:${NC}"
echo -e " 1. Captura del navegador con la advertencia de seguridad (SEC_ERROR_UNKNOWN_ISSUER)."
echo -e " 2. Captura de los detalles del certificado en el visor (Sujeto y Emisor: CN=${DOMAIN}, Universidad El Bosque)."

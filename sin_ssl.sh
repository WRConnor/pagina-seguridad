#!/bin/bash
# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN (2026-II)
# FASE 1: SITIO WEB SIN SSL (HTTP PLANO EN PUERTO 80)
# Para ejecutar directamente en el host Rocky Linux 9 / 10
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
VPS_IP="136.65.24.69"
NGINX_CONF="/etc/nginx/conf.d/wramoso.site.conf"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}   FASE 1: ACTIVAR SITIO SIN SSL (HTTP PUERTO 80) EN ROCKY LINUX  ${NC}"
echo -e "${BLUE}   Dominio: ${DOMAIN} (y www.${DOMAIN}, IP: ${VPS_IP})${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}[*] Instalando Nginx en Rocky Linux...${NC}"
    dnf install -y nginx
fi

# 2. Configurar SELinux para permitir que Nginx actúe como proxy hacia 127.0.0.1:3000
echo -e "${BLUE}[*] Habilitando conexión de proxy en SELinux (httpd_can_network_connect)...${NC}"
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

# 3. Abrir puerto 80 en el firewall si está activo
if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    echo -e "${BLUE}[*] Abriendo puerto 80 en Firewalld...${NC}"
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --reload || true
fi

# 4. Escribir configuración de Nginx sin SSL
echo -e "${BLUE}[*] Escribiendo configuración HTTP en ${NGINX_CONF}...${NC}"
cat << 'EOF' > ${NGINX_CONF}
# ==============================================================================
# FASE 1: SITIO SIN CERTIFICADO SSL (HTTP PLANO EN PUERTO 80)
# ==============================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name wramoso.site www.wramoso.site 136.65.24.69;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 5. Validar y reiniciar Nginx
echo -e "${BLUE}[*] Validando sintaxis de Nginx...${NC}"
nginx -t

systemctl enable --now nginx
systemctl reload nginx

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}✓ FASE 1 ACTIVADA CON ÉXITO${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Puedes acceder desde tu navegador a:"
echo -e "  ${YELLOW}http://${DOMAIN}/login${NC}  o  ${YELLOW}http://${VPS_IP}/login${NC}"
echo ""
echo -e "${BLUE}Evidencia a capturar:${NC}"
echo -e "Toma la captura de pantalla mostrando la advertencia de navegador 'No es seguro'."

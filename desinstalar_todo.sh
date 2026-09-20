#!/bin/bash
# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN (2026-II)
# SCRIPT DE DESINSTALACIÓN Y LIMPIEZA TOTAL EN VPS ROCKY LINUX
# Restaura el VPS a su estado limpio eliminando contenedores, imágenes,
# volúmenes, configuraciones de Nginx y certificados generados.
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: Este script debe ejecutarse como root o con sudo.${NC}"
   exit 1
fi

DOMAIN="wramoso.site"

echo -e "${RED}==================================================================${NC}"
echo -e "${RED}   ADVERTENCIA: DESINSTALACIÓN Y LIMPIEZA TOTAL EN ROCKY LINUX   ${NC}"
echo -e "${RED}==================================================================${NC}"
echo -e "Este script realizará las siguientes acciones en su VPS:"
echo -e " 1. Detendrá y eliminará el contenedor Docker de la aplicación Node.js."
echo -e " 2. Eliminará la imagen Docker y los volúmenes de datos SQLite."
echo -e " 3. Eliminará los archivos de configuración de Nginx del sitio (${DOMAIN})."
echo -e " 4. Eliminará los certificados generados (/etc/pki/tls/ y /etc/letsencrypt/)."
echo -e " 5. Detendrá el servicio Nginx y verificará la liberación de los puertos 80 y 443."
echo ""

if [[ "$1" != "-y" && "$1" != "--yes" ]]; then
    read -p "¿Está seguro de que desea desinstalar y borrar TODO? (s/N): " CONFIRMACION
    if [[ "$CONFIRMACION" != "s" && "$CONFIRMACION" != "S" ]]; then
        echo -e "${YELLOW}Operación cancelada. No se modificó nada.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}[1/5] Deteniendo y eliminando contenedores Docker de la app...${NC}"
if command -v docker &> /dev/null; then
    docker compose down -v --remove-orphans 2>/dev/null || docker-compose down -v --remove-orphans 2>/dev/null || true
    docker stop cripto_auth_app 2>/dev/null || true
    docker rm -f cripto_auth_app 2>/dev/null || true
    echo -e "${GREEN}✓ Contenedor de la app eliminado.${NC}"
else
    echo -e "${YELLOW}[*] Docker no encontrado o ya limpio.${NC}"
fi

echo ""
echo -e "${BLUE}[2/5] Eliminando imágenes y volúmenes Docker...${NC}"
if command -v docker &> /dev/null; then
    docker rmi -f paginaseguridad-app cripto_auth_app 2>/dev/null || true
    docker volume rm -f cripto_sqlite_data paginaseguridad_sqlite_data 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    echo -e "${GREEN}✓ Imágenes y volúmenes Docker eliminados.${NC}"
fi

echo ""
echo -e "${BLUE}[3/5] Eliminando configuraciones de Nginx...${NC}"
rm -f /etc/nginx/conf.d/wramoso.site.conf
rm -f /etc/nginx/conf.d/default.conf
echo -e "${GREEN}✓ Configuraciones de Nginx eliminadas.${NC}"

echo ""
echo -e "${BLUE}[4/5] Eliminando certificados SSL (Autofirmados y Let's Encrypt)...${NC}"
rm -f /etc/pki/tls/certs/${DOMAIN}.crt
rm -f /etc/pki/tls/private/${DOMAIN}.key
rm -rf /etc/letsencrypt/live/${DOMAIN}
rm -rf /etc/letsencrypt/archive/${DOMAIN}
rm -f /etc/letsencrypt/renewal/${DOMAIN}.conf
echo -e "${GREEN}✓ Certificados eliminados del sistema.${NC}"

echo ""
echo -e "${BLUE}[5/5] Deteniendo Nginx y comprobando puertos...${NC}"
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

echo ""
echo -e "${BLUE}Comprobación de puertos en el sistema:${NC}"
if ss -tulpn | grep -E '(:80 |:443 |:3000 )'; then
    echo -e "${YELLOW}[!] Atención: Algunos de los puertos (80, 443, 3000) aún registran procesos.${NC}"
else
    echo -e "${GREEN}✓ Puertos 80, 443 y 3000 totalmente libres.${NC}"
fi

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}✓ DESINSTALACIÓN Y LIMPIEZA COMPLETADA CON ÉXITO${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "El VPS ha quedado limpio sin residuos del laboratorio."

# ==============================================================================
# UNIVERSIDAD EL BOSQUE - SEGURIDAD DE LA INFORMACIÓN
# Dockerfile para Despliegue en Google Cloud Platform (Compute Engine VM)
# ==============================================================================

# 1. Imagen base ligera y segura
FROM node:22-alpine

# Metadatos
LABEL maintainer="Estudiante de Ingeniería de Sistemas"
LABEL description="Aplicación segura de Autenticación (BCrypt + Anti-BruteForce) y Criptoanálisis"

# 2. Definir directorio de trabajo
WORKDIR /app

# 3. Establecer variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# 4. Copiar definiciones de dependencias e instalarlas en modo producción
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# 5. Copiar código fuente y activos
COPY database/ ./database/
COPY src/ ./src/
COPY public/ ./public/

# 6. Crear directorio de datos con permisos para el usuario no privilegiado 'node'
RUN mkdir -p /app/database && chown -R node:node /app

# 7. Ejecutar contenedor con usuario no privilegiado (Seguridad)
USER node

# 8. Exponer puerto de la aplicación
EXPOSE 3000

# 9. Verificación periódica de estado de salud (Health Check)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 10. Comando de inicio
CMD ["node", "src/server.js"]

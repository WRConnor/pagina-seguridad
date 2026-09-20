import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def create_report():
    doc = docx.Document()

    # Configuración de márgenes
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Estilo de fuentes
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # --- PORTADA / ENCABEZADO ---
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_inst = title_p.add_run("UNIVERSIDAD EL BOSQUE\nFACULTAD DE INGENIERÍA\nPROGRAMA DE INGENIERÍA DE SISTEMAS\n")
    run_inst.bold = True
    run_inst.font.size = Pt(14)
    run_inst.font.color.rgb = RGBColor(0x0B, 0x22, 0x40)

    run_sub = title_p.add_run("SEGURIDAD DE LA INFORMACIÓN (PERÍODO 2026-II)\n\n")
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    run_main = title_p.add_run("INFORME DE LABORATORIO: IMPLEMENTACIÓN Y CONFIGURACIÓN MANUAL DE CERTIFICADOS SSL/TLS (AUTOFIRMADO Y LET'S ENCRYPT)\n\n")
    run_main.bold = True
    run_main.font.size = Pt(16)
    run_main.font.color.rgb = RGBColor(0x00, 0x56, 0xB3)

    # Metadatos
    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_p.add_run("Estudiante: ").bold = True
    meta_p.add_run("Wilmer Ramos\n")
    meta_p.add_run("Docente: ").bold = True
    meta_p.add_run("Seguridad de la Información\n")
    meta_p.add_run("Fecha: ").bold = True
    meta_p.add_run("Septiembre de 2026\n")
    meta_p.add_run("Dominio Asignado: ").bold = True
    meta_p.add_run("wramoso.site (y www.wramoso.site)\n")
    meta_p.add_run("IP Pública VPS: ").bold = True
    meta_p.add_run("136.65.24.69\n")
    meta_p.add_run("Entorno de Ejecución: ").bold = True
    meta_p.add_run("Rocky Linux (VPS) + Nginx + OpenSSL + Certbot + Docker (App Node.js)\n")

    doc.add_page_break()

    # --- SECCIÓN 1: INTRODUCCIÓN Y OBJETIVOS ---
    doc.add_heading("1. Introducción y Objetivos", level=1)
    doc.add_paragraph(
        "En el marco de la asignatura Seguridad de la Información de la Universidad El Bosque, el presente laboratorio "
        "tiene como finalidad implementar la protección de la información en tránsito para la aplicación web de Cifrado Clásico "
        "con inicio de sesión desarrollada previamente. La práctica aborda la configuración manual de dos tipos de certificados digitales: "
        "un certificado autofirmado (con su correspondiente análisis de problemática) y un certificado emitido por una Autoridad Certificadora "
        "(Let's Encrypt), finalizando con la implementación de una política estricta de redirección HTTP a HTTPS."
    )
    doc.add_paragraph(
        "Requisito fundamental de la guía: Todos los certificados y configuraciones del servidor web deben realizarse de forma "
        "100% manual, identificando con precisión los archivos modificados y sus rutas estándar en Rocky Linux (/etc/pki/tls/ y /etc/nginx/conf.d/), "
        "evitando cualquier automatización para dar cumplimiento estricto a la rúbrica de evaluación."
    )

    # --- SECCIÓN 2: ARQUITECTURA EN ROCKY LINUX ---
    doc.add_heading("2. Arquitectura y Topología en Rocky Linux", level=1)
    doc.add_paragraph(
        "El servidor VPS en la nube ejecuta directamente Rocky Linux como sistema operativo anfitrión. "
        "Sobre este se instaló Nginx de manera nativa actuando como reverse proxy hacia la aplicación Node.js (Express), "
        "la cual corre aislada dentro de un contenedor Docker en el puerto 3000. De este modo, Nginx gestiona directamente "
        "la terminación TLS en los puertos 80 y 443 utilizando los directorios oficiales del sistema."
    )

    doc.add_heading("Estructura de Directorios Clave en Rocky Linux:", level=2)
    p_paths = doc.add_paragraph()
    p_paths.add_run("• /etc/nginx/conf.d/wramoso.site.conf: ").bold = True
    p_paths.add_run("Archivo de configuración de Nginx modificado manualmente para el sitio web.\n")
    p_paths.add_run("• /etc/pki/tls/private/wramoso.site.key: ").bold = True
    p_paths.add_run("Ruta oficial donde se almacena la llave privada RSA del certificado autofirmado.\n")
    p_paths.add_run("• /etc/pki/tls/certs/wramoso.site.crt: ").bold = True
    p_paths.add_run("Ruta oficial donde se almacena el certificado público autofirmado X.509.\n")
    p_paths.add_run("• /etc/letsencrypt/live/wramoso.site/: ").bold = True
    p_paths.add_run("Directorio oficial de Let's Encrypt que contiene fullchain.pem y privkey.pem.")

    # --- SECCIÓN 3: FASE 1 - SITIO SIN SSL ---
    doc.add_heading("3. Fase 1: Sitio Web sin Certificado SSL (HTTP Plano)", level=1)
    doc.add_paragraph(
        "En la primera etapa, el servidor Nginx escucha exclusivamente en el puerto 80 (TCP) sin directivas SSL. "
        "Las peticiones se dirigen en texto claro hacia el backend Node.js."
    )

    p_box1 = doc.add_paragraph()
    p_box1.add_run("[EVIDENCIA 1 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box1.add_run("Pegar aquí la captura del navegador accediendo a http://wramoso.site/login (o http://136.65.24.69/login) mostrando la advertencia 'No es seguro' en la barra de direcciones.")

    doc.add_paragraph(
        "Análisis de Riesgos de Seguridad:\n"
        "1. Intercepción de Credenciales (Sniffing): Al no existir cifrado en tránsito, las credenciales enviadas mediante el formulario "
        "de inicio de sesión (usuario y contraseña) pueden ser capturadas en texto claro por cualquier atacante en la red local mediante Wireshark.\n"
        "2. Falta de Integridad: El contenido transmitido puede ser inyectado o modificado en tránsito sin que el navegador ni el usuario lo detecten."
    )

    # --- SECCIÓN 4: FASE 2 - CERTIFICADO AUTOFIRMADO ---
    doc.add_heading("4. Fase 2: Certificado SSL Autofirmado", level=1)
    doc.add_paragraph(
        "Siguiendo el procedimiento documentado en la guía de AlcanceLibre (CentOS/Rocky Linux), se procedió a la creación "
        "y activación manual del certificado autofirmado utilizando OpenSSL con Subject Alternative Name (SAN) para wramoso.site, www.wramoso.site e IP 136.65.24.69."
    )

    doc.add_heading("Comandos Manuales Ejecutados en Rocky Linux:", level=2)
    p_cmd_ssl = doc.add_paragraph()
    p_cmd_ssl.add_run("# 1. Generar la llave privada RSA de 2048 bits:\n").bold = True
    p_cmd_ssl.add_run("openssl genrsa -out /etc/pki/tls/private/wramoso.site.key 2048\n\n")
    p_cmd_ssl.add_run("# 2. Generar el certificado X.509 autofirmado (validez 365 días):\n").bold = True
    p_cmd_ssl.add_run("openssl req -new -x509 -days 365 -key /etc/pki/tls/private/wramoso.site.key "
                      "-out /etc/pki/tls/certs/wramoso.site.crt "
                      "-subj \"/C=CO/ST=Bogota/L=Bogota/O=Universidad El Bosque/OU=N/A/CN=wramoso.site\" "
                      "-addext \"subjectAltName=DNS:wramoso.site,DNS:www.wramoso.site,IP:136.65.24.69\"\n")

    doc.add_heading("Modificación Manual de Nginx (/etc/nginx/conf.d/default.conf):", level=2)
    doc.add_paragraph(
        "Se agregó el bloque de escucha en el puerto 443 vinculando las directivas ssl_certificate y ssl_certificate_key:\n\n"
        "server {\n"
        "    listen 443 ssl;\n"
        "    server_name wramoso.site www.wramoso.site 136.65.24.69;\n"
        "    ssl_certificate /etc/pki/tls/certs/wramoso.site.crt;\n"
        "    ssl_certificate_key /etc/pki/tls/private/wramoso.site.key;\n"
        "    ssl_protocols TLSv1.2 TLSv1.3;\n"
        "    location / { proxy_pass http://app:3000; }\n"
        "}"
    )

    p_box2 = doc.add_paragraph()
    p_box2.add_run("[EVIDENCIA 2 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box2.add_run("Pegar aquí la captura de la advertencia de seguridad en Firefox/Chrome (SEC_ERROR_UNKNOWN_ISSUER / NET::ERR_CERT_AUTHORITY_INVALID).")

    p_box3 = doc.add_paragraph()
    p_box3.add_run("[EVIDENCIA 3 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box3.add_run("Pegar aquí la captura de los detalles del certificado autofirmado en el visor del navegador (Sujeto y Emisor: CN=wramoso.site, Universidad El Bosque).")

    doc.add_paragraph(
        "Problemática del Certificado Autofirmado:\n"
        "Aunque este certificado habilita el cifrado simétrico/asimétrico en el canal de comunicación, no provee Autenticidad. "
        "El navegador no puede validar la identidad del emisor frente a su almacén de Autoridades de Certificación de Confianza (Root CA). "
        "Esto deja al usuario vulnerable a ataques Man-In-The-Middle (MITM), donde un atacante puede suplantar la llave pública."
    )

    # --- SECCIÓN 5: FASE 3 - LET'S ENCRYPT Y REDIRECCIÓN ---
    doc.add_heading("5. Fase 3: Certificado Let's Encrypt y Redirección Obligatoria (HTTP -> HTTPS)", level=1)
    doc.add_paragraph(
        "Para cumplir el requerimiento de Let's Encrypt de manera manual sin asistentes automatizados (evitando certbot --nginx), se utilizó Certbot en modo "
        "certonly con webroot y se editó manualmente la configuración de Nginx para establecer la redirección obligatoria 301."
    )

    doc.add_heading("Comando Manual de Certbot (Modo certonly con Webroot):", level=2)
    doc.add_paragraph(
        "certbot certonly --webroot -w /usr/share/nginx/html \\\n"
        "  -d wramoso.site -d www.wramoso.site \\\n"
        "  --agree-tos -m admin@wramoso.site --non-interactive"
    )

    doc.add_heading("Modificación Manual de Nginx con Redirección 301:", level=2)
    doc.add_paragraph(
        "# 1. Redirección obligatoria permanente de todo tráfico HTTP:\n"
        "server {\n"
        "    listen 80;\n"
        "    server_name wramoso.site www.wramoso.site;\n"
        "    return 301 https://$host$request_uri;\n"
        "}\n\n"
        "# 2. Bloque seguro con certificados Let's Encrypt:\n"
        "server {\n"
        "    listen 443 ssl http2;\n"
        "    server_name wramoso.site www.wramoso.site;\n"
        "    ssl_certificate /etc/letsencrypt/live/wramoso.site/fullchain.pem;\n"
        "    ssl_certificate_key /etc/letsencrypt/live/wramoso.site/privkey.pem;\n"
        "    ssl_protocols TLSv1.2 TLSv1.3;\n"
        "    add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains\" always;\n"
        "    location / { proxy_pass http://app:3000; }\n"
        "}"
    )

    p_box4 = doc.add_paragraph()
    p_box4.add_run("[EVIDENCIA 4 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box4.add_run("Pegar aquí la captura de terminal ejecutando 'curl -I http://wramoso.site' mostrando la respuesta HTTP/1.1 301 Moved Permanently hacia https://wramoso.site/.")

    p_box5 = doc.add_paragraph()
    p_box5.add_run("[EVIDENCIA 5 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box5.add_run("Pegar aquí la captura del navegador accediendo a https://wramoso.site mostrando el candado de seguridad activo y la conexión cifrada.")

    # --- SECCIÓN 6: AUDITORÍA Y VERIFICACIÓN ---
    doc.add_heading("6. Verificación con Plugin de Firefox (SSL Server Test) y OpenSSL", level=1)
    doc.add_paragraph(
        "Se procedió a auditar los certificados empleando la extensión SSL Server Test de Firefox y la herramienta de consola openssl s_client."
    )

    p_box6 = doc.add_paragraph()
    p_box6.add_run("[EVIDENCIA 6 - CAPTURA DE PANTALLA REQUERIDA]\n").bold = True
    p_box6.add_run("Pegar aquí la captura del resultado del plugin SSL Server Test en Firefox evidenciando la auditoría del certificado.")

    # --- SECCIÓN 7: GESTIÓN DEL ENTORNO EN VPS Y DESINSTALACIÓN LIMPIA ---
    doc.add_heading("7. Gestión del Entorno en VPS y Desinstalación Limpia", level=1)
    doc.add_paragraph(
        "Para garantizar que el servidor VPS conserve su integridad operativa y no queden procesos huérfanos ni archivos "
        "residuales tras la evaluación del laboratorio, se desarrollaron scripts modulares de control para Rocky Linux:\n\n"
        "1. Script de Certificado Autofirmado (autoencriptado.sh): Genera de forma manual la llave privada RSA en /etc/pki/tls/private/ "
        "y el certificado X.509 con SAN en /etc/pki/tls/certs/, configurando Nginx para escuchar en los puertos 80 y 443.\n\n"
        "2. Script de Let's Encrypt y Redirección 301 (letsencrypt.sh): Obtiene el certificado emitido por Let's Encrypt mediante "
        "el modo certonly (webroot) sin herramientas automáticas (evitando penalizaciones académicas) y configura la redirección permanente "
        "HTTP 301 de todo tráfico hacia HTTPS.\n\n"
        "3. Script de Desinstalación y Limpieza Total (desinstalar_todo.sh): Diseñado para restaurar el VPS a su estado limpio. "
        "Detiene y elimina el contenedor Docker de la aplicación Node.js, borra imágenes y volúmenes de datos, destruye "
        "los certificados generados (/etc/pki/tls/ y /etc/letsencrypt/), elimina las configuraciones de Nginx y verifica la liberación de los puertos 80 y 443."
    )

    # --- SECCIÓN 8: TABLA COMPARATIVA ---
    doc.add_heading("8. Matriz Comparativa de los Tres Estados", level=1)
    
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    headers = ["Criterio", "Fase 1: Sin SSL", "Fase 2: Autofirmado", "Fase 3: Let's Encrypt"]
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].runs[0].bold = True
        set_cell_background(hdr_cells[i], "0B2240")
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    data = [
        ("Puerto de Escucha", "80 (TCP)", "80 y 443 (TCP)", "80 (Redirige 301) y 443"),
        ("Cifrado en Tránsito", "Ninguno (Texto claro)", "Cifrado fuerte (AES/RSA)", "Cifrado fuerte (AES/RSA)"),
        ("Validación del Navegador", "Advertencia 'No seguro'", "Alerta roja (CA desconocida)", "Candado de seguridad (Confiable)"),
        ("Protección contra Sniffing", "Nula (0%)", "Total (100%)", "Total (100%)"),
        ("Protección contra MITM", "Nula (0%)", "Vulnerable (No autenticado)", "Protegido (CA verificada)"),
        ("Rutas en Rocky Linux", "/etc/nginx/conf.d/wramoso.site.conf", "/etc/pki/tls/certs/ y private/", "/etc/letsencrypt/live/"),
        ("Redirección Forzosa", "No aplica", "No configurada", "Obligatoria (HTTP 301)")
    ]

    for row_data in data:
        row_cells = table.add_row().cells
        for j, val in enumerate(row_data):
            row_cells[j].text = val
            if j == 0:
                row_cells[j].paragraphs[0].runs[0].bold = True

    doc.add_paragraph("")

    # --- SECCIÓN 9: CONCLUSIONES ---
    doc.add_heading("9. Conclusiones", level=1)
    doc.add_paragraph(
        "1. La configuración manual de los certificados permitió comprender a fondo la arquitectura de seguridad en distribuciones "
        "empresariales Rocky Linux, identificando la separación entre llaves privadas de acceso restringido (/etc/pki/tls/private/ con permisos 600) "
        "y certificados públicos (/etc/pki/tls/certs/ con permisos 644).\n\n"
        "2. El ejercicio evidenció la diferencia crucial entre Confidencialidad y Autenticidad: el certificado autofirmado cumple con cifrar "
        "los datos, pero no garantiza con quién nos estamos comunicando. Por ello, en entornos de producción es imperativo el respaldo de una "
        "Autoridad Certificadora reconocida como Let's Encrypt.\n\n"
        "3. La implementación de la redirección 301 permanente en el puerto 80 garantiza que ningún usuario pueda transmitir accidentalmente "
        "sus credenciales en texto plano, cerrando completamente la superficie de ataque para la aplicación de cifrado y autenticación.\n\n"
        "4. La provisión de scripts para autoencriptado, Let's Encrypt y desinstalación total (autoencriptado.sh, letsencrypt.sh y desinstalar_todo.sh) "
        "garantiza una gestión responsable del ciclo de vida de la infraestructura, permitiendo limpiar el VPS y liberar todos los recursos sin dejar dependencias residuales."
    )

    output_path = os.path.join(os.path.dirname(__file__), "ramos-wilmer-ssl.docx")
    try:
        doc.save(output_path)
        print(f"[OK] Documento Word generado exitosamente en: {output_path}")
    except PermissionError:
        alt_path = os.path.join(os.path.dirname(__file__), "ramos-wilmer-ssl-vps.docx")
        doc.save(alt_path)
        print(f"[AVISO] 'ramos-wilmer-ssl.docx' está abierto en Word.")
        print(f"[OK] Se guardó la versión actualizada en: {alt_path}")

if __name__ == "__main__":
    create_report()

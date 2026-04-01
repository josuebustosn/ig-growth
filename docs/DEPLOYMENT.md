# Deployment a DigitalOcean - Guía Paso a Paso

Esta guía te llevará desde cero hasta tener TrawiStats corriendo en tu propio dominio.

---

## Paso 1: Crear el Droplet

1. En DigitalOcean, crea un nuevo Droplet:
   - **Imagen**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($6/mes es suficiente)
   - **Región**: New York o la más cercana a Venezuela
   - **Autenticación**: SSH Key (recomendado) o Password

2. Anota la IP pública del droplet (ej: `164.90.xxx.xxx`)

---

## Paso 2: Conectarse al Servidor

```bash
ssh root@164.90.xxx.xxx
```

---

## Paso 3: Instalación Inicial

### 3.1 Actualizar el sistema
```bash
apt update && apt upgrade -y
```

### 3.2 Instalar Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v  # Verificar (debe mostrar v18.x.x)
```

### 3.3 Instalar Python 3 y pip
```bash
apt install -y python3 python3-pip
python3 --version  # Verificar
```

### 3.4 Instalar Git
```bash
apt install -y git
```

---

## Paso 4: Clonar el Proyecto

```bash
cd /var/www
git clone https://github.com/TU_USUARIO/TrawiStats.git trawistats
cd trawistats
```

*(Si el repo es privado, necesitarás configurar SSH keys o usar HTTPS con token)*

---

## Paso 5: Configurar el Proyecto

### 5.1 Instalar dependencias de Node
```bash
npm install
```

### 5.2 Instalar dependencias de Python
```bash
pip3 install apify-client
```

### 5.3 Crear archivo de variables de entorno
```bash
nano .env.local
```

Pega esto (reemplaza con tu token real):
```
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.4 Build del proyecto
```bash
npm run build
```

---

## Paso 6: Instalar PM2 (Gestor de Procesos)

PM2 mantendrá tu app corriendo 24/7, incluso si el servidor se reinicia.

```bash
npm install -g pm2
```

### Iniciar la aplicación
```bash
pm2 start npm --name "trawistats" -- start
```

### Configurar auto-inicio
```bash
pm2 startup
# Copia y ejecuta el comando que te muestra
pm2 save
```

### Verificar que esté corriendo
```bash
pm2 status
```

Deberías ver:
```
┌─────┬──────────────┬─────────┬─────────┐
│ id  │ name         │ status  │ restart │
├─────┼──────────────┼─────────┼─────────┤
│ 0   │ trawistats   │ online  │ 0       │
└─────┴──────────────┴─────────┴─────────┘
```

---

## Paso 7: Nginx (Simplificado al Máximo)

### 7.1 Instalar Nginx
```bash
apt install -y nginx
```

### 7.2 Crear configuración del sitio
```bash
nano /etc/nginx/sites-available/trawistats
```

Pega esto (copia-pega tal cual, solo cambia la IP si es diferente):
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;  # e.g., stats.example.com

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`

### 7.3 Activar el sitio
```bash
ln -s /etc/nginx/sites-available/trawistats /etc/nginx/sites-enabled/
```

### 7.4 Verificar configuración
```bash
nginx -t
```

Debe decir: `syntax is ok` y `test is successful`

### 7.5 Reiniciar Nginx
```bash
systemctl restart nginx
```

---

## Paso 8: Configurar DNS

Configura un registro A en tu proveedor de DNS apuntando a la IP de tu droplet:

1. Ve a tu proveedor de DNS (Cloudflare, Netlify, Namecheap, etc.)
2. Agrega un nuevo registro DNS:
   - **Type**: A Record
   - **Name**: tu subdominio (e.g., `stats`)
   - **Value**: la IP de tu droplet
   - **TTL**: 3600 (o Automatic)

3. Espera 5-10 minutos para la propagación DNS.

---

## Paso 9: Instalar SSL (HTTPS) con Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN
```

Sigue las instrucciones:
- Email: tu email
- Términos: `A` (Agree)
- Compartir email: `N` (No)
- Redirect HTTP a HTTPS: `2` (Sí, recomendado)

Certbot configurará automáticamente Nginx para HTTPS.

---

## Paso 10: Verificar que Todo Funciona

1. Abre tu navegador y ve a: `https://YOUR_DOMAIN`
2. Deberías ver tu dashboard de TrawiStats funcionando.

---

## Comandos Útiles para Mantenimiento

### Ver logs de la aplicación
```bash
pm2 logs trawistats
```

### Reiniciar la app (después de hacer cambios)
```bash
cd /var/www/trawistats
git pull
npm install
npm run build
pm2 restart trawistats
```

### Ver estado de Nginx
```bash
systemctl status nginx
```

### Renovar SSL (automático, pero por si acaso)
```bash
certbot renew --dry-run
```

---

## Troubleshooting

### Si la app no carga:
```bash
pm2 logs trawistats --lines 50
```
Busca errores en rojo.

### Si Nginx da error:
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

### Si el dominio no resuelve:
```bash
dig stats.trawi.net
```
Debe mostrar tu IP. Si no, espera más tiempo (DNS puede tardar hasta 24h, pero usualmente 10 min).

---

## Backup Automático (Opcional pero Recomendado)

### Crear script de backup
```bash
nano /root/backup-trawistats.sh
```

Pega esto:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /root/backups/trawistats_$DATE.tar.gz /var/www/trawistats/data
find /root/backups -name "trawistats_*.tar.gz" -mtime +7 -delete
```

Guarda y dale permisos:
```bash
chmod +x /root/backup-trawistats.sh
mkdir -p /root/backups
```

### Programar backup diario (3 AM)
```bash
crontab -e
```

Agrega esta línea:
```
0 3 * * * /root/backup-trawistats.sh
```

---

## Actualizaciones Automáticas de Seguidores

El sistema actualiza la estadística de seguidores automáticamente mediante cron jobs.

### Configuración actual (Diciembre 2024)

```bash
# Ver configuración actual
crontab -l
```

**Cron jobs configurados:**
```
# Actualizar cada 2 horas
0 */2 * * * curl -s "http://localhost:3000/api/followers?username=YOUR_USERNAME" > /dev/null 2>&1

# Sync fin de día 23:51 Venezuela = 03:51 UTC
51 3 * * * curl -s "http://localhost:3000/api/followers?username=YOUR_USERNAME" > /dev/null 2>&1
```

### Cómo funciona

1. **Cron cada 2 horas**: Hace un request al API, forzando actualización si el caché de 2 horas expiró
2. **Cron 23:51 Venezuela**: Dispara el "End of Day sync" - la lógica en `instagram-service.ts` detecta que está en la ventana 23:50-23:59 y fuerza actualización
3. **El código interno** (líneas 56-63 de `lib/instagram-service.ts`) marca `lastEndOfDaySync` para no repetir el sync ese día

### Verificar que funciona
```bash
pm2 logs trawistats --lines 50
```
Buscar: `Fetching fresh data`, `[End of Day] Force updating`

---

## Estabilidad del Servidor (512MB RAM)

### PM2 con límite de memoria
```bash
pm2 start npm --name "trawistats" --max-memory-restart 150M -- start
```
Reinicia automáticamente si supera 150MB RAM.

### Rotación de logs (evita llenar disco)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 5M
pm2 set pm2-logrotate:retain 3
```

### Si el servidor se cuelga
```bash
# Verificar estado
pm2 status
pm2 logs trawistats --lines 100

# Reiniciar si es necesario
pm2 restart trawistats

# Si PM2 se corrompió
pm2 kill
pm2 start npm --name "trawistats" --max-memory-restart 150M -- start
pm2 save
```

---

---

**¡Listo!** Tu aplicación está en producción.

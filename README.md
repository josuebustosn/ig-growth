# 📊 TrawiStats

> Dashboard inteligente de analytics para Instagram con proyecciones predictivas y milestones dinámicos.

![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Live Demo:** [stats.trawi.net](https://stats.trawi.net)

---

## ✨ Características

### 📈 Analytics en Tiempo Real
- **Contador animado** con efecto odómetro
- **Actualización automática** cada 60 segundos
- **Timestamp preciso** que muestra tiempo real transcurrido
- **Badge de cambio diario** con indicador +X hoy

### 📅 Análisis Histórico
- **Selector de meses**: Explora tu historial completo mes por mes
- **Calendario de crecimiento**: Visualización de últimos 30 días o períodos específicos
- **Total dinámico**: Indicadores que se ajustan al período seleccionado
- **Hover effects**: Detalles interactivos en cada día

### 🎯 Sistema de Milestones Dinámicos
- **6 niveles de objetivos**: 10k, 20k, 50k, 100k, 500k, 1M
- **Auto-completado inteligente**: Se marcan con ✓ al alcanzarlos
- **Fechas de logros**: Historial de cuándo alcanzaste cada milestone
- **Formato legible**: Números simplificados (10k, 1M)

### 🧠 Proyección Inteligente
- **Algoritmo EMA** (Exponential Moving Average) con análisis de tendencias
- **Detección adaptativa**: Reconoce aceleración/desaceleración del crecimiento
- **Gráfico dinámico**: Se ajusta automáticamente al siguiente milestone
- **Predicciones precisas**: Fecha estimada para alcanzar objetivos
- **Referencias visuales**: Milestones completados vs pendientes

### 💰 Calculadora de Inversión
- **Costo por seguidor (CPF)**: Calcula inversión necesaria para objetivos
- **Milestones predefinidos**: Costo directo para cada nivel
- **Actualización en tiempo real**: Ajusta según tu CPF actual

### 📤 Compartir Logros
- **Generador de imágenes**: Crea graphics profesionales de tus métricas
- **3 períodos**: Hoy, Semana, 30 días
- **Múltiples formatos**: Copiar al portapapeles o descargar como PNG
- **Compatible mobile**: Web Share API integrada

### 🎨 Experiencia de Usuario
- **Modo oscuro/claro**: Tema adaptable
- **Diseño responsive**: Optimizado para mobile, tablet y desktop
- **Animaciones suaves**: Transiciones y efectos glassmorphism
- **Easter egg musical**: Canciones de Rawi rotando diariamente 🎵

---

## 🚀 Tech Stack

### Frontend
- **Next.js 16** - React framework con App Router
- **TypeScript** - Type safety y mejor DX
- **Recharts** - Gráficos y visualizaciones
- **CSS Modules** - Estilos scoped

### Backend
- **Next.js API Routes** - Serverless functions
- **Apify Client** - Web scraping de Instagram
- **Node.js** - Runtime environment

### Data & Storage
- **JSON files** - Sistema de caché y historial
- **File System API** - Persistencia local
- **Cron Jobs** - Actualizaciones automáticas cada 2 horas

### DevOps
- **PM2** - Process manager
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL/HTTPS
- **DigitalOcean** - Hosting VPS

---

## 📦 Instalación

### Requisitos Previos
- Node.js 18+ 
- npm o yarn
- Token de Apify API

### Setup Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/josuebustosn/trawi-stats.git
cd trawi-stats

# 2. Instalar dependencias
npm install

# 3. Crear archivo de configuración
cp .env.example .env.local

# 4. Configurar variables de entorno
# Editar .env.local con tu token de Apify y usuario de Instagram:
# APIFY_TOKEN=tu_token_aqui
# NEXT_PUBLIC_INSTAGRAM_USERNAME=tu_usuario

# 5. Correr en desarrollo
npm run dev

# 6. Abrir en navegador
# http://localhost:3000
```

### Variables de Entorno

Crear archivo `.env.local` en la raíz (ver `.env.example`):

```env
APIFY_TOKEN=tu_token_de_apify_aqui
NEXT_PUBLIC_INSTAGRAM_USERNAME=tu_usuario_de_instagram

# Opcional: segundos a esperar a que termine el run de Apify (default: 50).
# Ajustalo al limite de duracion de tu plan de hosting.
APIFY_WAIT_SECS=50
```

---

## 🏗️ Estructura del Proyecto

```
trawi-stats/
├── app/
│   ├── api/
│   │   └── followers/
│   │       └── route.ts          # API endpoint principal
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Estilos globales
├── components/
│   ├── Calculators.tsx           # Calculadora de CPF
│   ├── FollowerCounter.tsx       # Contador animado
│   ├── GrowthCalendar.tsx        # Calendario con selector de meses
│   ├── ProjectionChart.tsx       # Gráfico de proyección inteligente
│   ├── ShareMetrics.tsx          # Generador de imágenes
│   └── ThemeToggle.tsx           # Switcher de tema
├── lib/
│   ├── instagram-service.ts      # Servicio de Instagram
│   └── storage.ts                # Sistema de caché
├── public/
│   └── ...                       # Assets estáticos
├── data/                         # Datos persistentes
│   ├── history.json              # Historial de seguidores
│   └── cache.json                # Caché de datos
└── docs/                         # Documentación
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    └── ROADMAP.md
```

---

## 🔧 Configuración

### Actualización Automática

El sistema usa caché de 2 horas + sync automático a las 23:50 (hora Venezuela) para cierre diario.

### Cron Jobs (Producción)

```bash
# Actualizar cada 2 horas
0 */2 * * * cd /path/to/project && curl http://localhost:3000/api/followers?username=trawi.viajes
```

### PM2 (Producción)

```bash
# Iniciar con PM2
pm2 start npm --name "trawistats" -- start

# Configurar límite de memoria
pm2 start npm --name "trawistats" -- start --max-memory-restart 150M

# Guardar configuración
pm2 save

# Startup script
pm2 startup
```

---

## 📊 Uso

### Dashboard Principal

1. **Contador en Tiempo Real**
   - Muestra followers actuales
   - Badge con cambio del día (+X hoy)
   - Timestamp de última actualización

2. **Calendario de Crecimiento**
   - Selector: "Últimos 30 días" o meses específicos
   - Total dinámico según período
   - Cada día muestra cambio (+X / -X)

3. **Calculadora de Inversión**
   - Ingresa tu CPF (Costo Por Seguidor)
   - Ve costos para cada milestone
   - Milestones completados marcados con ✓

4. **Proyección de Crecimiento**
   - Gráfico con datos históricos
   - Proyección hasta siguiente milestone
   - Badges de milestones completados con fechas
   - Simulador de crecimiento manual

5. **Compartir Logros**
   - Selecciona período: Hoy / Semana / 30d
   - Genera imagen profesional
   - Copia o descarga

### API Endpoints

```typescript
// GET /api/followers?username=trawi.viajes
{
  profile: {
    followers: 15318,
    profilePicUrl: string
  },
  history: [
    { date: "2026-01-31", followers: 15318, change: -2 },
    ...
  ],
  lastUpdated: 1738355400000
}
```

---

## 🎨 Personalización

### Cambiar Usuario de Instagram

Editar la variable de entorno en `.env.local`:

```env
NEXT_PUBLIC_INSTAGRAM_USERNAME=tu_usuario_aqui
```

### Ajustar Milestones

Editar `components/Calculators.tsx` y `components/ProjectionChart.tsx`:

```typescript
const milestones = [10000, 20000, 50000, 100000, 500000, 1000000];
```

### Modificar Colores

Editar `app/globals.css`:

```css
:root {
  --primary: #3291ff;
  --accent: #d946ef;
  --success: #10b981;
  --danger: #ef4444;
}
```

---

## 🚀 Deploy

### Opción 1: VPS (Recomendado)

**DigitalOcean / Railway / Linode**

1. Crear servidor Ubuntu 22.04
2. Instalar Node.js 18+
3. Clonar repositorio
4. Configurar `.env.local` con `APIFY_TOKEN`
5. Instalar dependencias
6. Usar PM2 para mantener app corriendo
7. Configurar Nginx como reverse proxy
8. SSL con Let's Encrypt

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para guía completa.

### Opción 2: Vercel (Limitado)

⚠️ **No recomendado** porque:
- Archivos JSON no persisten entre deploys
- Necesitas base de datos externa

---

## 📝 Changelog

### v1.3 (2026-02-01) - Milestones Dinámicos y Proyección Inteligente

**✨ Features:**
- Selector de meses en calendario histórico
- Sistema de 6 milestones dinámicos (10k → 1M)
- Proyección inteligente con algoritmo EMA
- Gráfico adaptativo al siguiente milestone
- Badges de milestones completados con fechas

**🔧 Fixes:**
- Timestamp "Actualizado hace..." ahora funcional
- Actualización cada 10s (antes 60s)

**🗑️ Deprecated:**
- Eliminada Calculadora de CPF Diario

Historial completo: los mensajes de commit y las releases del repositorio.

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones de Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
docs: Cambios en documentación
style: Cambios de formato
refactor: Refactorización de código
test: Agregar tests
chore: Tareas de mantenimiento
```

---

## 🐛 Troubleshooting

### Error: "APIFY_TOKEN not set"
- Verifica que `.env.local` existe
- Confirma que el token es correcto
- Reinicia el servidor

### Error: "Cannot find module 'apify-client'"
```bash
npm install
```

### Cache no actualiza
- Elimina `data/cache.json`
- Reinicia servidor
- Verifica cron jobs

### Puerto 3000 ocupado
```bash
# Cambiar puerto
PORT=3001 npm run dev
```

---

## 📚 Documentación Adicional

- [Arquitectura del Proyecto](docs/ARCHITECTURE.md)
- [Guía de Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Sistema de Changelog](docs/CHANGELOG_SYSTEM.md)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 👥 Autor

**Josue Bustos** - [@trawi.viajes](https://instagram.com/trawi.viajes)

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - Framework React
- [Recharts](https://recharts.org/) - Librería de gráficos
- [Apify](https://apify.com/) - Web scraping platform
- Comunidad de [Trawi Viajes](https://instagram.com/trawi.viajes)

---

## 🔗 Links

- **Website:** [stats.trawi.net](https://stats.trawi.net)
- **Instagram:** [@trawi.viajes](https://instagram.com/trawi.viajes)
- **Repository:** [github.com/josuebustosn/trawi-stats](https://github.com/josuebustosn/trawi-stats)

---

<div align="center">
  
**Hecho con ❤️ por el equipo de Trawi**

⭐ Si te gustó este proyecto, deja una estrella en GitHub!

</div>

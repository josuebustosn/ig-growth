# Arquitectura de TrawiStats

TrawiStats es una aplicación web construida con **Next.js 16** (App Router) diseñada para monitorear el crecimiento de seguidores de cualquier cuenta de Instagram (configurable via `NEXT_PUBLIC_INSTAGRAM_USERNAME`).

## Estructura General

El proyecto sigue una arquitectura moderna de Next.js:

- **Frontend**: React Components (`app/`, `components/`)
- **Backend (API)**: Next.js Route Handlers (`app/api/`)
- **Data Fetching**: Script de Python (`scripts/`) + Apify
- **Persistencia**: Archivos JSON locales (`data/`)

## Flujo de Datos

1.  **Cliente (Frontend)**:
    - `app/page.tsx` carga y consulta `/api/followers` cada 60 segundos.
    - Muestra los datos usando componentes visuales (`FollowerCounter`, `GrowthCalendar`, `ProjectionChart`).

2.  **API (`app/api/followers/route.ts`)**:
    - Recibe la petición del cliente.
    - Llama a `lib/instagram-service.ts`.

3.  **Servicio (`lib/instagram-service.ts`)**:
    - **Paso 1 (Caché)**: Consulta `lib/storage.ts` para ver si hay datos recientes (menos de 2 horas).
    - **Paso 2 (Fetch)**: Si los datos son viejos, ejecuta el script de Python: `python scripts/get_followers.py`.
    - **Paso 3 (Guardado)**: Guarda el nuevo dato en `data/history.json` y actualiza la caché en `data/cache.json`.

4.  **Script Python (`scripts/get_followers.py`)**:
    - Usa la librería `apify-client`.
    - Se conecta a la API de Apify usando el token en `.env.local`.
    - Ejecuta el actor `instagram-scraper` para obtener el perfil de `trawi.viajes`.
    - Devuelve el número de seguidores a la salida estándar (stdout).

## Componentes Clave

-   **`FollowerCounter`**: Muestra el número actual grande.
-   **`GrowthCalendar`**: Visualización tipo GitHub de los cambios diarios.
-   **`ProjectionChart`**: Gráfico de línea con proyección futura basada en el promedio de los últimos 14 días.
-   **`Calculators`**: Herramientas para calcular costos por seguidor (CPF) y estimaciones.

## Tecnologías

-   **Framework**: Next.js 15
-   **Lenguaje**: TypeScript
-   **Estilos**: CSS Modules / Global CSS (Diseño Glassmorphism)
-   **Gráficos**: Recharts
-   **Scraping**: Python + Apify Client

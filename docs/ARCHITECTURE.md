# Arquitectura de TrawiStats

TrawiStats es una aplicación web construida con **Next.js 16** (App Router) diseñada para monitorear el crecimiento de seguidores de cualquier cuenta de Instagram (configurable via `NEXT_PUBLIC_INSTAGRAM_USERNAME`).

## Estructura General

El proyecto sigue una arquitectura moderna de Next.js:

- **Frontend**: React Components (`app/`, `components/`)
- **Backend (API)**: Next.js Route Handlers (`app/api/`)
- **Data Fetching**: Cliente de Apify (`apify-client`)
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
    - **Paso 2 (Fetch)**: Si los datos son viejos, llama a la API de Apify con `apify-client`.
    - **Paso 3 (Guardado)**: Guarda el nuevo dato en `data/history.json` y actualiza la caché en `data/cache.json`.

4.  **Cliente de Apify (`fetchFollowersFromApify` en `lib/instagram-service.ts`)**:
    - Usa la librería `apify-client` de npm.
    - Se conecta a la API de Apify usando el token `APIFY_TOKEN`.
    - Ejecuta el actor `instagram-scraper` para el usuario configurado, esperando como máximo `APIFY_WAIT_SECS` segundos (default: 50).
    - Verifica que el run haya terminado con estado `SUCCEEDED` antes de leer el dataset.
    - Devuelve el número de seguidores como `number`.

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
-   **Scraping**: Apify Client (`apify-client`)

# Configuración y Puesta en Marcha

## Requisitos Previos

1.  **Node.js**: v18 o superior.
2.  **Python**: v3.8 o superior.
3.  **Cuenta de Apify**: Con saldo o plan gratuito para usar el actor de Instagram.

## Instalación

1.  Instalar dependencias de Node.js:
    ```bash
    npm install
    ```

2.  Instalar dependencias de Python:
    ```bash
    pip install apify-client
    ```

## Configuración

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
APIFY_TOKEN=tu_token_de_apify_aqui
NEXT_PUBLIC_INSTAGRAM_USERNAME=tu_usuario_de_instagram
```

## Ejecución

Para desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Mantenimiento

-   **Intervalo de Actualización**: Configurado en `lib/storage.ts` (variable `baseDuration`). Actualmente 2 horas.
-   **Usuario Objetivo**: Configurable via variable de entorno `NEXT_PUBLIC_INSTAGRAM_USERNAME` en `.env.local`.
-   **Datos Históricos**: Se guardan en `data/history.json`. Puedes editar este archivo manualmente si necesitas corregir datos.

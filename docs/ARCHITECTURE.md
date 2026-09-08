# Arquitectura

Next.js 16 con App Router. Todo el estado vive en dos documentos JSON; no hay base de datos.

## Mapa

```
app/
  layout.tsx              Metadata, inyección de los 6 colores de marca a CSS, bootstrap del tema
  page.tsx                Composición del dashboard, polling cada 60 s
  globals.css             Toda la paleta derivada con color-mix()
  api/followers/route.ts  Lo que consume el navegador
  api/cron/refresh/       Lo que dispara Vercel Cron

lib/
  brand.ts                Identidad: nombre, logos, dominio, cuenta, colores
  format.ts               Formato de números, en un solo lugar
  instagram-service.ts    Apify + caché + ventana de cierre de día
  refresh.ts              Camino compartido entre la ruta pública y el cron
  storage.ts              Selector: Blob si hay token, disco si no
  storage-disk.ts         Backend de archivos
  storage-blob.ts         Backend de Vercel Blob, con CAS

components/               FollowerCounter · GrowthCalendar · Calculators
                          ProjectionChart · ShareMetrics · ThemeToggle
```

## El camino de los datos

`getInstagramProfile()` es la única puerta al scraping y hace tres cosas en orden:

1. **Deduplicación en proceso.** Un `Map` de promesas en vuelo: si llegan dos pedidos para la misma cuenta a la vez, el segundo se cuelga del primero. Es por instancia, no global — con Fluid Compute las instancias se reutilizan, así que ayuda, pero la defensa real contra el gasto es el TTL.

2. **Caché con ventana de cierre de día.** TTL de 2 horas. Entre las 23:50 y las 23:59 hora de Venezuela se fuerza una actualización si todavía no se sincronizó ese día, para que el número con el que cierra la fecha quede registrado.

3. **Fallback con backoff.** Si Apify falla y hay algo en caché, se devuelve el valor viejo y se reescribe el TTL a 15 minutos. Eso evita que cada visita durante una caída dispare un scrape nuevo.

## Persistencia

`storage.ts` elige backend por la presencia de `BLOB_READ_WRITE_TOKEN`, en cada llamada y no al cargar el módulo, para que la decisión no dependa del orden en que se puebla el entorno. El módulo de Blob se importa dinámicamente, así que un despliegue en disco nunca carga `@vercel/blob`.

**Las lecturas de Blob llevan `useCache: false`.** Sobrescribir un blob tarda hasta 60 segundos en propagar y `get()` puede servir la versión anterior en esa ventana — cada ciclo read-modify-write perdería actualizaciones en silencio. Las lecturas consistentes **solo existen en stores privados**, y de ahí la exigencia de que el store sea privado.

**`history.json` se escribe con compare-and-swap** (`ifMatch` + reintento). Cada escritura reemplaza el documento entero, así que una actualización perdida se llevaría entradas de otros días. `cache.json` va last-write-wins: es reconstruible.

**Documento corrupto, política distinta por clave.** Que un blob no exista y que exista pero no parsee no son lo mismo:

| Clave | Si no parsea | Por qué |
|---|---|---|
| `history.json` | lanza | Es el único registro que no se rehace. Devolver vacío daría `etag: null`, la escritura saldría sin `ifMatch` y reemplazaría el documento sin que nada la frene |
| `cache.json` | sigue como vacío | Es reconstruible. Lanzar rompería el propio camino de recuperación, que vuelve a leer la caché para servir un valor viejo |

## Marca y color

`lib/brand.ts` lee la identidad del entorno con valores por defecto. Seis colores se entregan a CSS una sola vez, como custom properties, en `app/layout.tsx`. `globals.css` deriva de ahí cada superficie, borde, tinte y estado con `color-mix()`.

Derivar en vez de listar no es preferencia: los dos temas necesitan tratar el mismo color de marca de forma distinta. El púrpura primario sobre el fondo oscuro da ~1,6:1 y no se lee, así que el modo oscuro lo mezcla hacia el color claro hasta pasar AA; el lime es el caso inverso. Listar esos pares a mano cablearía la paleta de una marca concreta.

El canvas de `ShareMetrics` es la excepción: no entiende `color-mix()` ni `var()`, así que ahí se mezcla en JavaScript con dos helpers (`withAlpha`, `mixWith`) sobre los mismos valores de `brand.colors`.

## Los crons

`vercel.json` agenda **uno**, a `/api/cron/refresh`:

```
55 1,3,5,7,9,11,13,15,17,19,21,23 * * *
```

Uno solo y no dos porque **Vercel registra una entrada por path**: dos definiciones apuntando a la misma ruta no corren las dos — `vercel crons ls` las reporta como un único job permanentemente "modified" y la segunda nunca dispara. Es un fallo callado, y el que se perdía era justo el de cierre de día.

Así que un schedule cubre los dos trabajos: doce corridas al día (cada 2 h, a los `:55`) mantienen la caché caliente, y la de las `03:55 UTC` cae en 23:55 hora de Venezuela, dentro de la ventana de cierre de día. Escrito en hora local dispararía a las 19:55 y erraría la ventana sin avisar.

La ruta del cron y la del navegador comparten `refreshAndRecord()`, así que el cron no es una segunda implementación que pueda desviarse de la que usan las personas.

## Lo que se paga y no se usaba

El Actor de Apify devuelve `profilePic`, `userFullName`, `followsCount`, `userUrl` y `userId`. Hasta la v2 el servicio los descartaba y devolvía una foto vacía, `following: 0` y el handle como nombre. Ahora se guardan en la caché junto al conteo — ya estaban pagados.

Cuando la cuenta no existe o es privada, el Actor **no falla la corrida**: devuelve un item con `{ url, username, error, errorDescription }` y un HTTP 200. Ese campo `error` es lo único que distingue el caso, y por eso se chequea explícitamente.

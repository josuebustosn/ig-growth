# Desplegar en Vercel

De cero a un dominio propio. Toma unos quince minutos, casi todo esperando builds.

Hace falta: una cuenta de Vercel, una cuenta de [Apify](https://console.apify.com) y el repo importado en GitHub.

---

## 1. El token de Apify

En [console.apify.com](https://console.apify.com) → **Settings → API & Integrations** → copiá el *Personal API token*.

El Actor que se usa es `apify/instagram-followers-count-scraper`, que es pay-per-event: **$0,001 por arranque de corrida + $0,0026 por perfil**, o sea **$0,0036 por corrida**. Con los crons de este repo (cada 2 h más el de cierre de día) son unas **13 corridas al día ≈ $1,40 al mes**, dentro de los $5 mensuales del plan gratuito.

> Al agotarse el crédito, una cuenta free queda bloqueada hasta el siguiente ciclo. El dashboard no se cae: sirve el último valor de la caché.

---

## 2. Importar el proyecto

En Vercel → **Add New → Project** → elegí el repo. Framework detectado: Next.js. No cambies nada del build.

**No hagas deploy todavía**: primero las variables, porque las `NEXT_PUBLIC_*` se inlinean en tiempo de build y un deploy sin ellas queda con los valores por defecto hasta que lo repitas.

---

## 3. El Blob store

En el proyecto → pestaña **Storage** → **Create Database** → **Blob**.

🔴 **Creálo PRIVADO, no público.** Las lecturas consistentes no existen en stores públicos, y sin ellas cada ciclo read-modify-write del histórico pierde actualizaciones sin avisar.

Al conectarlo, Vercel inyecta `BLOB_READ_WRITE_TOKEN` sola.

---

## 4. Las variables

**Settings → Environment Variables.** Marcá las tres: Production, Preview y Development.

| Variable | Valor | Obligatoria |
|---|---|---|
| `APIFY_TOKEN` | el del paso 1 | sí |
| `NEXT_PUBLIC_INSTAGRAM_USERNAME` | la cuenta a monitorear, sin `@` | sí |
| `BLOB_READ_WRITE_TOKEN` | la inyecta el paso 3 | sí en Vercel |
| `CRON_SECRET` | una cadena aleatoria larga | recomendada |
| `APIFY_WAIT_SECS` | por debajo del límite de duración de tu plan | no (default 50) |

Para `CRON_SECRET` sirve cualquier cosa impredecible:

```bash
openssl rand -hex 32
```

Vercel manda ese valor como `Authorization: Bearer <secreto>` en cada disparo del cron, y la ruta rechaza todo lo demás. Sin la variable el endpoint queda abierto — sobrevivible, porque la cuenta es fija y el TTL acota el gasto, pero no hay razón para dejarlo así.

Si vas a usar otra marca, agregá también las variables de `NEXT_PUBLIC_BRAND_*` (ver [`.env.example`](../.env.example)).

---

## 5. Deploy

**Deployments → Deploy.** El cron de `vercel.json` se registra solo; lo ves en **Settings → Cron Jobs**.

---

## 6. Verificar (el paso que no se salta)

**a) Que el Blob esté realmente conectado.** Este es el importante:

> Si `BLOB_READ_WRITE_TOKEN` falta, la aplicación **no falla**. El selector cae al backend de disco, responde 200 con toda normalidad, y el histórico se borra en cada cold start sin un solo error en los logs. Meses después te encontrás con un histórico que empieza ayer.

Comprobalo en **Storage → tu store**: después del primer pedido tienen que aparecer `history.json` y `cache.json`.

**b) Que el scrape funcione.** Abrí `https://tu-dominio/api/followers`. Tenés que ver el conteo, el `fullName` y el `profilePicUrl` reales:

```json
{"profile":{"username":"...","followers":4232,"following":15,"fullName":"...","profilePicUrl":"https://..."}, ...}
```

**c) Que el cron corra más de una vez.** En **Settings → Cron Jobs** mirá la última ejecución, y volvé a mirar dos horas después. Un cron que corre una sola vez y no vuelve a correr es un fallo silencioso clásico: nada se rompe, simplemente el histórico deja de llenarse.

Para forzar uno sin esperar:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/refresh
```

---

## 7. El dominio

**Settings → Domains → Add.** Poné el subdominio (`stats.tudominio.com`) y cargá el `CNAME` que te muestra Vercel en tu proveedor de DNS.

Si el dominio ya está en Vercel, se configura solo.

---

## Operación

**Ver logs:** pestaña **Logs** del proyecto, filtrando por `/api/`. Los prefijos son `[instagram]`, `[cron]` y `[Blob]`.

**Cambiar de cuenta de Instagram:** editá `NEXT_PUBLIC_INSTAGRAM_USERNAME` y **redesplegá** — es una `NEXT_PUBLIC_`, no se lee en runtime. El histórico se guarda por username, así que la cuenta anterior queda intacta en el documento.

**Respaldar el histórico:** descargá `history.json` desde el panel del Blob store. Es todo el estado que no se puede reconstruir; la caché se rehace sola.

**Si el conteo se congela:** casi siempre es crédito de Apify agotado. El dashboard sigue sirviendo el último valor bueno con backoff de 15 minutos, y los logs muestran el error real de `[instagram]`.

---

## Correrlo en un VPS

Sigue funcionando. Sin `BLOB_READ_WRITE_TOKEN` el storage escribe en `data/*.json`:

```bash
git clone <repo> && cd instagram-growth-dashboard
npm install
cp .env.example .env.local     # APIFY_TOKEN y la cuenta
npm run build
pm2 start npm --name stats -- start
```

Ahí no hay Vercel Cron, así que el refresco queda a cargo de crontab. Ojo con la zona horaria: si el servidor está en UTC, el cierre de día de Venezuela son las `03:55`.

```cron
55 1,3,5,7,9,11,13,15,17,19,21,23 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh
```

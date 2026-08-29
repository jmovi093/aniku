# Fuente anidb.app — mapeo, estado y plan B

Todo lo de acá fue **verificado en vivo el 2026-08-29** contra el sitio real
(no es de leer el código de ani-cli: se sacaron los payloads ejecutando
requests dentro de un Chrome real vía CDP).

`anidb.app` es la fuente que adoptó `pystardust/ani-cli` **v5** (PR #1830),
cuando abandonó AllAnime. `grep -c allanime ani-cli` en su master da **0**.

---

## 1. Estado actual en Aniku

| Pieza | Estado |
|---|---|
| `src/utils/cloudflareBridge.js` | ✅ implementado — fetch/eval dentro de un WebView oculto |
| `src/components/CloudflareBridge/` | ✅ implementado — WebView 0×0, lazy, montado en `App.js` |
| `src/services/AnidbService.js` | ✅ browse/filtros/detalle/episodios/schedule/video |
| `src/services/source/index.js` | ✅ **adaptador** — las pantallas importan de acá |
| `appConfig.source` | ✅ **`"anidb"` — FUENTE ACTIVA** |
| AllAnime | 🔌 **desconectado** — sus servicios siguen en el repo como referencia, nadie los importa |
| Parsers | ✅ **validados ejecutando el código real del servicio** en un Chrome que pasó Cloudflare |
| Validación en device | ❌ **pendiente** — es el único paso que falta |

### Cómo está cableado
```
pantallas/hooks
   └─ import { AnimeSource as AnimeService } from "services/source"
      └─ services/source/index.js   ← acá se decide la fuente
         └─ AnidbService  →  cloudflareBridge (WebView)  →  anidb.app
                          →  fetch directo               →  hls.anidb.app
```
AllAnime (`AnimeService.js`, `CatalogService.js`, `ScheduleService.js`,
`AnimeDetailsService.js`) **no está importado por nadie**. Para volver a él hay
que reconectarlo en `services/source/index.js` — no borrar esos archivos.

### Resultado de la validación de parsers (2026-08-29)
Se extrajeron las expresiones tal cual están en `AnidbService.js` y se
ejecutaron dentro de la página real:

| Caso | Resultado |
|---|---|
| `browse?q=slime` | ✅ 20 resultados (*That Time I Got Reincarnated as a Slime…*) |
| `sort=order_trending` | ✅ 28 resultados (*One Piece*) |
| `genres=1&sort=order_popular` | ✅ 28 resultados (*Attack on Titan*) |
| `type=TV` / `year=2025` / `type=TV&year=2025&season=fall` / `status=Currently+Airing` | ✅ 28 c/u |
| episodios → languages → embed → master.m3u8 | ✅ cadena completa |
| parseo del master m3u8 | ✅ 1080p / 720p / 360p |
| thumbnails | ✅ `https://cdn.xlsbox.com/poster/small/<ts>/<id>.jpg` |

`type=TV&year=2026&season=fall` da 0 resultados, pero **no es un bug**: esa
temporada todavía no tiene datos cargados.

**anidb es la fuente activa.** mkissa/AllAnime quedó desconectado pero sigue en
el repo como referencia (ver `AnimeService.js`, que tiene la cripto arreglada
del esquema bootstrap por si hay que volver).

### Cómo volver a mkissa
Reconectar los servicios viejos en `src/services/source/index.js` y poner
`appConfig.source = "mkissa"`. Los archivos de AllAnime **no se borraron**
justamente para eso. La rama `deprecated/allmanga` tiene el estado previo a
la migración.

### Qué mirar en los logs (tags `cf-bridge` y `anidb`)

Si va bien:
```
[cf-bridge] 🌐 Activando WebView puente (lazy)
[cf-bridge] ✅ Bridge listo (challenge de Cloudflare superado)
[anidb] 🔍 browse: https://anidb.app/browse?q=slime
[anidb]    20 resultados
```

---

## 2. Por qué hace falta el WebView (y por qué NO se puede hacer como ani-cli)

`anidb.app` está detrás de Cloudflare y **el bloqueo es por huella TLS**
(JA3/JA4: orden de extensiones del ClientHello, GREASE, ALPS), no por headers.

Medido contra `GET /api/frontend/anime/5241/episodes`:

| Intento | Resultado |
|---|---|
| `fetch`/axios por defecto | ❌ 403 CF |
| + UA de Chrome y 13 headers (`Sec-Ch-Ua`, `Sec-Fetch-*`, …) | ❌ 403 CF |
| + **ciphers exactos de Chrome** (los mismos que usa ani-cli) | ❌ 403 CF |
| + curva `X25519:P-256:P-384` | ❌ 403 CF |
| + `sigalgs` estilo Chrome | ❌ 403 CF |
| + **cookie `cf_clearance` sacada de un Chrome real, con su UA** | ❌ 403 CF |
| Chrome **headless** | ❌ 403 CF |
| **Chrome de verdad** | ✅ pasa **solo, sin clics** |

Dos conclusiones que importan:

1. **La cookie no sirve.** No se puede "resolver una vez y después usar axios".
   Cloudflare revalida la huella TLS en cada request. Por eso *todos* los
   requests de metadata van por el WebView, no solo el primero.
2. **El challenge es "managed" (automático).** El navegador lo resuelve solo en
   unos segundos, sin interacción. Por eso el WebView puede ir oculto (0×0) y
   **el usuario nunca ve nada ni tiene que hacer nada**.

### Lo que NO pasa por el WebView
El **video**. `hls.anidb.app` **no tiene Cloudflare**: responde 200 sin ningún
header y los segmentos dan 206. ExoPlayer lo reproduce directo, sin proxy, sin
cookies y sin `noReferer`. Solo la metadata necesita el puente.

---

## 3. Plan B: hacerlo como ani-cli (curl-impersonate nativo)

**Cuándo recurrir a esto:** si el WebView deja de pasar Cloudflare. Señales:
- `[cf-bridge] ⚠️ Bridge falló: challenge no resuelto tras 60s`
- aparece un challenge **interactivo** (casilla Turnstile) en vez del automático
- Android WebView empieza a ser detectado como bot

**Qué hace ani-cli exactamente** (`ani-cli` líneas ~389-402):

```sh
ciphers='ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...'
tls13_ciphers='TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'

curl_exe=$(dep_ch_failover "curl_firefox135,curl_chrome136,curl_chrome116,curl_ff117,curl")
# en macOS además:  cipher_flag="--ciphers $ciphers --tls13-ciphers $tls13_ciphers"

# y si solo hay curl normal, se rinde:
[ "$curl_exe" = "curl" ] && die "Blocked by cloudflare. Try installing curl-impersonate"
```

O sea: **ani-cli no resuelve el challenge, lo evita** con
[`curl-impersonate`](https://github.com/lwthiker/curl-impersonate), un libcurl
parcheado con BoringSSL que forja el ClientHello completo. Sin ese binario,
ani-cli directamente muere.

**Cómo portarlo a Aniku** (en orden de preferencia):

1. **Go + [utls](https://github.com/refraction-networking/utls) → `.aar` con gomobile.**
   Es la vía más mantenible: `utls` deja elegir un `ClientHelloID`
   (`HelloChrome_120`, etc.) y va bastante al día. Se expone un método
   `fetch(url, headersJson) -> body` y se llama desde JS con un módulo nativo,
   igual que se hizo con `modules/video-proxy`.
2. **Módulo nativo Android envolviendo `libcurl-impersonate`.** Más fiel a
   ani-cli, pero hay que compilar libcurl+BoringSSL por ABI.

**Costo real de este camino** (por eso NO se eligió de entrada):
- +5-15 MB de APK por arquitectura.
- Hay que **reperseguir versiones de Chrome**: cada vez que cambia el
  ClientHello, la huella falsificada envejece. Por eso ani-cli tiene 4 binarios
  distintos en su lista de failover.
- Toolchain NDK/gomobile en el build de CI.

El WebView no tiene ninguno de esos costos porque **no imita a Chrome: es
Chrome**, y se actualiza solo con el sistema.

---

## 4. Endpoints (todos verificados)

### 4.1 Búsqueda / catálogo — `GET /browse`
HTML (~115 KB). Parsear **dentro** del WebView con `DOMParser` y devolver solo
lo necesario (es lo que hace `browseParserExpression` en `AnidbService.js`).

Parámetros, todos combinables:

| Param | Valores |
|---|---|
| `q` | texto libre |
| `type` | `TV`, `Movie`, `ONA`, `OVA`, `Special`, `Music` |
| `status` | `Currently Airing`, `Finished Airing` |
| `season` | `winter`, `spring`, `summer`, `fall` |
| `year` | `1925`…`2026` (60 opciones en el select) |
| `genres` | id numérico (ver 4.2) |
| `sort` | ver abajo |
| `page` | paginación |

Ordenamientos (`sort`):

| Valor | Significado |
|---|---|
| `order_trending` | Trending |
| `order_top` | Top Rated |
| `order_updated` | Latest Updated |
| `order_popular` | Most Popular |
| `order_favorite` | Most Favorited |
| `order_top_airing` | Top Airing |
| `title` | Título A-Z |
| `aired_start` | Más nuevos primero |

> 💡 **Esto es más de lo que usa ani-cli.** ani-cli solo usa `?q=` porque es una
> CLI de búsqueda por nombre. Aniku necesita trending/géneros/filtros y la
> fuente **sí los soporta** — por eso `AnidbService` los expone todos.

Forma de una card:
```html
<a href="https://anidb.app/anime/that-time-i-got-reincarnated-as-a-slime-the-movie-scarlet-bond-5241"
   class="anime-card block group"
   title="That Time I Got Reincarnated as a Slime: The Movie - Scarlet Bond">
  <img src="https://cdn.xlsbox.com/poster/small/1782735600/5241.jpg" alt="..." >
```
El **id de anime** es el slug con el id numérico al final. La API de episodios
quiere **solo el número final** (`5241`), igual que ani-cli con `${1##*-}`.

### 4.2 Géneros — `GET /genres/<id>`
```
1 Action · 2 Drama · 3 Adventure · 4 Fantasy · 5 Comedy · 6 Sci-Fi
7 Mystery · 8 Gourmet · 9 Slice of Life · 10 Supernatural · 11 Sports
12 Award Winning · 13 Ecchi · 14 Romance · 15 Hentai · 16 Boys Love
17 Erotica · 18 Suspense · 19 Avant Garde · 20 Girls Love · 21 Horror
```

### 4.3 Episodios — `GET /api/frontend/anime/{numericId}/episodes`
JSON chico. Respuesta real:
```json
{"episodes":[{"id":7381,"number":1,"number2":null,"filler":false}]}
```

### 4.4 Idiomas / embed — `GET /api/frontend/episode/{episodeId}/languages`
```json
{"languages":[
  {"code":"eng","name":"English","embed_url":"https://anidb.app/embed/tffVB9iFpIu00D8HoO4KS1wEH79VpPoxksI37npaiyk"},
  {"code":"jpn","name":"Japanese","embed_url":"https://anidb.app/embed/y72CKh4Gee114NQdBuJrLQKVcrUC3cg0JKLnF3kdRP0"}
]}
```
`sub` → `jpn`, `dub` → `eng` (mismo criterio que ani-cli).

### 4.5 Embed → master m3u8 — `GET {embed_url}`
Buscar en el HTML:
```js
html.match(/file:\s*'([^']+)'/)
// → https://hls.anidb.app/stream/<token>/master.m3u8
```

### 4.6 Master playlist — `GET {master.m3u8}`
HLS estándar, **sin Cloudflare**. Ejemplo real:
```
#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=803948,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.29",VIDEO-RANGE=SDR
https://hls.anidb.app/stream/.../1080p/index.m3u8
```
Verificado: da **1080p / 720p / 360p** y los segmentos responden **206**.

### 4.7 Detalle de anime — `GET /anime/{slug-id}`
Se combinan dos cosas de la MISMA página porque ninguna alcanza sola:

**a) JSON-LD** (`<script type="application/ld+json">`) — lo estructurado y estable:
```json
{
  "@type": "TVSeries",
  "name": "That Time I Got Reincarnated as a Slime Season 2",
  "alternateName": "Tensei shitara Slime Datta Ken 2nd Season",
  "description": "Taking a break from his time as a teacher…",
  "image": "https://cdn.xlsbox.com/poster/small/1782735600/5231.jpg",
  "url": "https://anidb.app/anime/…-5231",
  "genre": ["Action", "Fantasy", "Comedy"]
}
```

**b) Texto del `<main>`** — lo que el JSON-LD NO trae (esto es lo frágil):
`type`, `status`, `score`, `Winter 2021`, `23m`, `Studio: 8bit`, rating.
Si algún día estos campos vienen `null`, es que cambió el layout: mirar acá primero.

> El listado de episodios **no** está en el HTML (`No episodes available` +
> `Loading stream…`): lo pinta el JS llamando a la API de episodios. Por eso
> hay que usar `/api/frontend/anime/{id}/episodes`, no scrapear la página.

### 4.8 Calendario — `GET /api/frontend/schedule?date=YYYY-MM-DD&tz=<IANA>`
JSON, sin scrapear. **`date` y `tz` son la clave**: sin `date` solo devuelve
hoy; sin `tz` los días se cortan en UTC. Ambos verificados sobre 7 días.
```json
{"schedules":[{
  "id":1423, "episode_name":"Episode 22",
  "airing_at":"2026-08-29T00:26:00+00:00",
  "anime_id":4429, "anime_title":"RILAKKUMA",
  "anime_poster":"https://cdn.xlsbox.com/poster/small/1782735600/4429.jpg",
  "anime_url":"https://anidb.app/anime/rilakkuma-4429"
}]}
```

### 4.9 Endpoints que NO existen (probados, dan 404)
```
/api/frontend/anime/{id}          /api/frontend/anime/{id}/info
/api/frontend/anime/{id}/seasons  /api/frontend/home
/api/frontend/genres              /api/frontend/browse
```
Solo existen: `/api/frontend/anime/{id}/episodes`,
`/api/frontend/episode/{id}/languages` y `/api/frontend/schedule`.

### 4.10 Rutas sin mapear
`/home`, `/themes`, `/az`, `/demographics`, `/studios`.

---

## 4bis. 🕳️ HUECOS CONOCIDOS (lo que anidb NO da)

Esto es lo que se pierde respecto a AllAnime. Josue confirmó que (a) y (b) no
son problema. El (c) quedó resuelto.

### a) Títulos de episodio — NO EXISTEN
`/api/frontend/anime/{id}/episodes` devuelve solo
`{id, number, number2, filler}`. No hay campo de título. En la web el usuario
ve "Episode 1", "Episode 2"… El `episode_name` del schedule también es genérico
("Episode 22"). AllAnime sí tenía `notes` con el título real.
→ La UI ya trata `notes` como opcional, así que no rompe: la lista queda con
números y el badge de *filler* (que AllAnime **no** tenía, así que se gana eso).

### a-bis) Cantidad de episodios en las CARDS — NO EXISTE
El HTML de una card de `/browse` trae **póster, título, badge de tipo
(TV/Movie/…) y badge de nota** — nada más. No hay cantidad de episodios, por eso
las tarjetas muestran "n/a" en ese campo. Tenerlo exigiría pedir el detalle de
CADA anime del listado (decenas de requests por pantalla), así que no se hace.
Sí se aprovechan **tipo y nota**, que antes se hardcodeaban.

### a-ter) Géneros combinados — NO SE PUEDE
Probado contra el sitio: `genres=1,14`, `genres=1&genres=14`, `genres=1|14` y
`genres=1+14` devuelven lo mismo que un solo género (el server toma uno), y
`genres[]=1&genres[]=14` devuelve **0 resultados**. Si el usuario elige varios,
se aplica el primero (`SourceTaxonomy.supportsMultiGenre === false`).

### b) Thumbnails de episodio — NO EXISTEN
No hay imagen por episodio en ningún endpoint ni en el HTML. Solo hay póster
del anime. AllAnime sí tenía (vía `wp.youtube-anime.com`).
→ `getEpisodeInfos` devuelve `thumbnail: null`; la UI lo maneja.

### c) ~~Calendario: solo ~1 día~~ → ✅ RESUELTO
El endpoint **sí** acepta fecha; hay que pasarle `date` **y** `tz`:

```
GET /api/frontend/schedule?date=YYYY-MM-DD&tz=America%2FCosta_Rica
```

⚠️ **Lección de método (para no repetir el error):** en la primera pasada
conclui que "ignora todos los parámetros" porque probé `?date=` con **la fecha
de HOY** — que obviamente devuelve lo mismo que sin parámetros. Nunca probé
otra fecha. **Al validar un filtro, usar siempre un valor que DEBA dar un
resultado distinto**, si no la prueba no prueba nada.

Verificado pidiendo los 7 días: 10, 12, 8, 12, 12, 10 y 22 emisiones
respectivamente — **86 en la semana**, todos los días con contenido.

`tz` importa: define dónde se cortan los días. Sin él el corte es UTC y las
emisiones de madrugada se corren de día. La app usa
`Intl.DateTimeFormat().resolvedOptions().timeZone`.

Y la fecha se arma en hora **local** (`toLocalDateString`), no con
`toISOString()`, que pasa a UTC y de noche en América devolvería el día
siguiente.

---

## 5. Estado del cableado

- [x] Adaptador `services/source/index.js` con la misma firma que los servicios
      viejos (las pantallas solo cambiaron la línea de `import`).
- [x] Normalización de cards: `{id,title,thumbnail}` → forma de AllAnime
      (`{id,name,englishName,thumbnail,episodes,type,score,…}`).
- [x] Detalle, lista de episodios, video y calendario.
- [x] **Calendario completo** — 7 días vía `?date=&tz=`.
- [ ] **Ids incompatibles entre fuentes** ⚠️ ver abajo.

### ⚠️ Ids: historial, listas y descargas
```
AllAnime:  srGrP23qJnjsHrRYD
anidb:     that-time-i-got-reincarnated-as-a-slime-season-2-5231
```
Lo guardado con AllAnime **no resuelve** contra anidb. No se borra nada, pero
esas entradas quedan "muertas" mientras anidb sea la fuente. Si se decide que
convivan, hay que namespacear los ids (`mkissa:xxx` / `anidb:xxx`) en
`HistoryService`/`ListsService`/`DownloadService`. **No implementado**: se dejó
así a propósito para esta prueba, porque el objetivo era validar la fuente.

---

## 6. Cómo re-verificar todo esto

Desde una máquina con Chrome (los scripts de `/diagnose` no pasan Cloudflare):

```bash
# 1. Chrome con perfil aparte y debugging abierto
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --user-data-dir=/tmp/anidbprof --remote-debugging-port=9222 \
  "https://anidb.app/browse?q=slime"
# esperar ~25s a que pase el challenge (solo, sin tocar nada)

# 2. Ejecutar fetch DENTRO de esa página vía CDP
#    (Node 20 necesita el flag para tener WebSocket global)
node --experimental-websocket tu-script-cdp.js
```
El truco es siempre el mismo: **cualquier request a anidb.app tiene que salir
desde dentro del navegador**. Desde Node/curl pelado siempre va a dar 403.

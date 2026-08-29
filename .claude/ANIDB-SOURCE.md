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
| `src/services/AnidbService.js` | ✅ implementado — browse/filtros/episodios/video |
| `appConfig.source` | ⚙️ en `"mkissa"` — anidb NO está activo todavía |
| Parsers | ✅ **validados ejecutando el código real del servicio** en un Chrome que pasó Cloudflare |
| Validación en device | ❌ **pendiente** — es el único paso que falta |

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

**La fuente en producción sigue siendo mkissa** (arreglada el mismo día, ver
`AnimeService.js`). anidb queda listo pero apagado hasta probar el WebView en
un Android real.

### Cómo activarlo para probar
1. `appConfig.source = "anidb"` en `src/config/index.js`.
2. Cablear los screens que hoy llaman a `AnimeService`/`CatalogService` para
   que usen `AnidbService` cuando `source === "anidb"` (ver §5, es lo único que
   queda sin hacer).
3. `npm run android` y mirar los logs con tag `cf-bridge` y `anidb`.

Qué esperar en los logs si va bien:
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
| `year` | `2013`…`2026` |
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

### 4.7 Otras rutas sin mapear todavía
`/home` (portada con secciones), `/schedule` (calendario, `<h1>Airing Schedule</h1>`),
`/themes`, `/az`, `/demographics`, `/studios`. Si hace falta reemplazar
`ScheduleService`, empezar por `/schedule`.

---

## 5. Lo que falta para poder activarlo

Solo el cableado de UI — la fuente en sí está completa:

- [ ] Adaptador que, según `appConfig.source`, mande los screens a
      `AnidbService` en vez de `AnimeService`/`CatalogService`.
- [ ] Mapear el shape de `AnidbService.browse()` (`{id,title,thumbnail}`) al que
      esperan las cards de Home/Search (hoy vienen de AllAnime con
      `_id/name/englishName/thumbnail/availableEpisodes`).
- [ ] `/schedule` para `ScheduleService`.
- [ ] Historial/descargas guardan `showId` de AllAnime; si se cambia de fuente,
      los ids **no son compatibles** — hace falta migración o namespacing.

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

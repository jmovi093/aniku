# /diagnose — Diagnóstico de la API AllAnime

Diagnostica la integración con AllAnime, detecta qué cambió y aplica los fixes que pueda automáticamente.

## 🧭 ani-cli es NUESTRA GUÍA para cualquier problema de fuente

Regla de fondo: **ante cualquier problema con la fuente de donde se saca el anime, lo primero es mirar qué está haciendo `pystardust/ani-cli`.** Ellos van adelante y reaccionan rápido. Clon local en `C:\xampp\htdocs\ani-cli\ani-cli` — hacerle **`git pull` SIEMPRE** antes de sacar conclusiones (el clon se queda viejo y eso ya llevó a conclusiones equivocadas una vez).

Cómo leerlos rápido:
```bash
cd /c/xampp/htdocs/ani-cli/ani-cli && git pull
grep -n -E '_base|_api|_refr|_cdn|https?://' ani-cli   # a qué host le pegan hoy
git log --oneline -15                                   # qué cambiaron último
```

## 🛑 LO ÚNICO QUE REQUIERE AVISAR ANTES: que ani-cli cambie DE FUENTE

Si ani-cli **da un giro de 180° y se cambia a otro proveedor** (como cuando v5, PR #1830, abandonó AllAnime y se pasó a `anidb.app`), **frenar y avisarle a Josue antes de seguir**. Eso es una decisión de arquitectura, no un fix.

**Formato del aviso (corto):** qué cambió · qué implica para Aniku · qué opciones hay · qué recomendás.

**Todo lo demás se arregla solo, sin preguntar.** Cambios *dentro* de la misma fuente — que rote la clave, que cambie el hash de la query, que se mude el host de un endpoint, que cambie el mecanismo de cripto, que aparezca un header nuevo obligatorio — **son trabajo normal: arreglarlo y reportarlo al final**, no interrumpir.

### 📚 Documentación local (leer ANTES de investigar)
| Archivo | Qué cubre |
|---|---|
| `.claude/ANIDB-SOURCE.md` | Fuente activa: endpoints, taxonomía, Seasons/Relations, huecos, plan B |
| `.claude/PLAYER-Y-RENDIMIENTO.md` | Reproductor (calidad/audio), mediciones de lentitud, precalentado del WebView |
| `.claude/check-source-contract.js` | Valida formas de retorno del adaptador (correr antes de cada APK) |
| `.claude/extract-mkissa-keys.js` | Regenera constantes de mkissa (fuente vieja, por si hay que volver) |

### Estado de fuentes hoy
- **anidb.app** (`AnidbService.js` + `services/source/index.js`) → **FUENTE ACTIVA**, `appConfig.source = "anidb"`. Es la misma que usa ani-cli v5. Todo en **`.claude/ANIDB-SOURCE.md`** (endpoints, taxonomía, por qué necesita WebView y el plan B con curl-impersonate).
- **mkissa/AllAnime** (`AnimeService.js`, `CatalogService.js`, `ScheduleService.js`, `AnimeDetailsService.js`) → 🔌 **desconectado**. Los archivos siguen en el repo **a propósito, como referencia — no borrarlos**; nadie los importa. Su cripto quedó arreglada (esquema bootstrap) por si hay que volver: se reconecta en `services/source/index.js`. La rama `deprecated/allmanga` tiene el estado previo a la migración.

> ⚠️ Buena parte de esta skill (secciones de cripto, `extract-mkissa-keys.js`, `diagnose-api.js`) aplica a **mkissa**, que hoy NO está en uso. Sigue siendo válida para el día que haya que volver, pero si el problema es de la app HOY, mirar primero `.claude/ANIDB-SOURCE.md`.

## Uso
```
/diagnose                                    # usa defaults (Slime S4 ep 6)
/diagnose srGrP23qJnjsHrRYD 6               # showId + episodio específico
/diagnose <showId> <episode>                 # cualquier anime reciente que tenga providers
```

## Pasos

**1. Preparar argumentos**

Los argumentos son: `$ARGUMENTS`
- Si hay args: primer arg = showId, segundo = episode
- Si no hay args: el script usa los defaults

**2. Correr el diagnóstico**

```bash
node .claude/diagnose-api.js [--showId <showId>] [--episode <episode>]
```

Parsear el JSON entre los marcadores `__DIAGNOSE_JSON__` y `__END_DIAGNOSE_JSON__`.

**3. Analizar cada tipo de issue**

### `UNMAPPED_PROVIDERS` (fixable automáticamente)
- Re-correr con `--fix` para agregar al `PROVIDER_MAPPING` en `src/utils/apiConfig.js`
- Revisar los tipos sugeridos: si la URL pertenece a un CDN conocido, ajustar el tipo
- Los tipos válidos son: `youtube`, `okru`, `mp4upload`, `fembed`, `streamwish`, `hls`, `wixmp`, `sharepoint`, `hianime`, `uni`, `vidhide`

### `CATALOG_FORMAT` / `TRENDING_FORMAT` / `EPISODES_FORMAT`
- Leer el service indicado en el issue
- Comparar el path esperado vs el raw de la respuesta en el output del diagnóstico
- Actualizar el parser: `parseSeasonResults`, `parseTrendingResults`, `parseEpisodesList`
- Los paths esperados actualmente:
  - Catálogo: `data.shows.edges[]` → `{ _id, name, englishName, thumbnail, availableEpisodes }`
  - Trending: `data.queryPopular.recommendations[].anyCard` → `{ _id, name, thumbnail }`
  - Episodios: `data.show.availableEpisodesDetail.sub[]`

### ⚡ Atajo para CASI TODO lo de cripto: `extract-mkissa-keys.js`
Antes de investigar a mano cualquier fallo de la query de episodio, correr:
```bash
node .claude/extract-mkissa-keys.js
```
Desofusca el bundle vivo de mkissa y re-deriva **todas** las constantes: `buildId`, `mask`, `lane`, `bootPrefix/join/parts`, `keyGroup`, `apiBase` y el **hash de la query de episodio**. Pegar lo que salga en las constantes `AA_*` de `src/services/AnimeService.js` **y** en la copia de `.claude/diagnose-api.js` (están duplicadas a propósito: el script tiene que correr sin el bundle de RN).
Eso arregla el caso normal (mkissa hizo un deploy nuevo). Solo si el script **falla** hay que investigar de verdad: ahí cambió el esquema, no los valores.

### `HASH_CHANGED` / `PersistedQueryNotFound` (ya no hace falta DevTools)
- El hash de `persistedQuery` de la query de episodio en `AnimeService.getEpisodeUrl` cambió porque cambió el TEXTO de la query en el build.
- **No hace falta el browser**: `extract-mkissa-keys.js` reconstruye la query desde el bundle (template `QB` + sus fragmentos) y devuelve el sha256 en `episodeQueryHash`. Ojo: el hash es del template **tal cual**, sin `.trim()` (lleva un `\n` inicial).

### `AA_CRYPTO_*` / `invalid_boot_token` (esquema bootstrap — desde 2026-08-29)
- La query de episodio vive en **`https://api.mkissa.net/api`** (el catálogo/trending/episodios siguen en `api.allanime.day`; `api.mkissa.net` también los responde si allanime.day muere).
- `extensions` lleva tres cosas: `persistedQuery`, el lane `k: "k7"`, y el token `aaReq`. Además el request **necesita el header `x-build-id`** (sin él: `AA_CRYPTO_MISSING_BUILD`).
- `aaReq` = base64(`0x01` + IV + AES-256-GCM(payload)), con payload `{v,ts,epoch,buildId,qh,k}` (**`buildId` volvió** y se sumó `k`) e IV = `SHA256("{epoch}:{buildId}:{qh}:{ts}:{lane}")[:12]`, `ts` redondeado a 5 min.
- **La clave ya NO se scrapea del HTML** (mkissa.to es ahora una landing sin `epoch`/`partB`). Ahora:
  1. `epoch = floor(Date.now() / 604800000)` — ventana **semanal**, con 1 día de gracia (se prueban `epoch` y `epoch-1`).
  2. `x-aa-boot = hex(HMAC(HMAC(MASK, "{bootPrefix}{buildId}"), "{epoch}~{host}~{buildId}~{lane}~{group}"))`
  3. `GET {api}/client-crypto/v1/bootstrap?buildId=…&k=…` con headers `x-build-id` + `x-aa-boot` → `{ epoch, partB }`
  4. `clave AES-256 = partB XOR MASK`
- **Por qué MASK/BUILD_ID están hardcodeados ahora**: el mask ya no está en texto plano en ningún chunk — se calcula dentro del bundle ofuscado desde 4 fragmentos base64 + buildId + sales. Reproducir eso con un regex desde React Native es inviable. Lo que rota solo (`partB`/`epoch`) **sí** se sigue resolviendo en runtime vía bootstrap; lo que cambia por deploy se regenera con el extractor.
- El `Referer`/`Origin` sigue siendo `https://mkissa.to`.
- **⚠️ `pystardust/ani-cli` YA NO SIRVE COMO REFERENCIA**: v5 (PR #1830) abandonó AllAnime y se pasó a **anidb**; `grep -c allanime ani-cli` en master da 0. La rama `origin/allanime-fix` quedó vieja (anterior a mkissa) y el tag `v4.15` tiene el esquema de julio, ya muerto. La fuente de verdad ahora es el bundle de mkissa + este extractor.
- **Cómo interpretar el fallo**:
  - `bootstrap 403 invalid_boot_token` → el build cambió (MASK/BUILD_ID viejos) o cambió el cálculo del token → correr el extractor.
  - `PersistedQueryNotFound` → cambió el texto de la query → extractor (`episodeQueryHash`).
  - `AA_CRYPTO_MISSING_BUILD` → falta el header `x-build-id`.
  - `AA_CRYPTO_STALE` / `AA_CRYPTO_MISSING` → cambió el layout del payload/IV del `aaReq`.
  - El extractor mismo falla (no encuentra `entry/app.*.js`, ningún chunk con `aaReq`/`partB`, o símbolos sin resolver) → mkissa cambió de dominio/CDN o reestructuró el bundle: revisar `SITE`/`CDN` en `.claude/extract-mkissa-keys.js` y los nombres de símbolos (`sg`, `Rf`, `Vd`, `Py`, `og`, `is`, `QB`).
- Requiere `@noble/ciphers` (AES-GCM real; `crypto-js` no soporta GCM, pero sí el `HmacSHA256` del boot token).

### `DECRYPT_KEY` (el descifrado de `tobeparsed` usa la MISMA clave del bootstrap)
- `tobeparsed` es AES-256-GCM: 1 byte de versión, 12 de IV, ciphertext, 16 de tag. Se descifra con la misma clave `partB XOR MASK` — así que si el bootstrap se rompe, ambos flujos (descifrado de sourceUrls y generación de `aaReq`) se caen a la vez.
- Si `tobeparsed` viene presente pero descifra a basura → cambió el cifrado de la RESPUESTA (¿volvió a CTR? ¿otra derivación?) — investigar en el chunk de cripto del bundle.

**4. Aplicar fixes automáticos**

Si hay `UNMAPPED_PROVIDERS`:
```bash
node .claude/diagnose-api.js [--showId <showId>] [--episode <episode>] --fix
```

**5. Reportar**

Mostrar un resumen claro:
- ✅ qué pasó OK
- ❌ qué está roto y en qué archivo
- 🔧 qué se auto-arregló
- ⚠️ qué necesita intervención manual y por qué

> ⚠️ **`NO_PLAYABLE_PROVIDERS` suele ser un FALSO NEGATIVO — no reportarlo como roto sin verificar.**
> El probe profundo manda `Referer` y el CDN de Bilibili (Ak) tiene hotlink protection, así que devuelve 403 y el script lo marca `VIDEO_URL_403_CDN_TOKEN`. La app **no** manda Referer para esos links (`noReferer: true` en `VideoService.js:~300`, respetado en `VideoPlayer.js`), así que en el device sí reproducen.
> Antes de decir que el video está roto, comprobar los dos casos sobre una URL de `rawUrls.vids`:
> ```bash
> curl -s -o /dev/null -w '%{http_code}\n' -r 0-1 "<url>" -A "Mozilla/5.0"                              # esperar 200/206
> curl -s -o /dev/null -w '%{http_code}\n' -r 0-1 "<url>" -A "Mozilla/5.0" -H "Referer: https://allmanga.to"  # esperar 403
> ```
> 206 sin Referer + 403 con Referer = **todo bien**, es el comportamiento esperado. Solo es un problema real si da 403 en **ambos** casos.
> (Verificado así el 2026-08-29: Ak 206/403, o sea sano.)
> Ojo también: el `sourceUrl` de Ak decodifica a `/apivtwo/clock?...` — hay que cambiar `/clock?` por `/clock.json?` antes de pedirlo, si no da 404.

---

## Flujo de investigación manual de providers

Cuando el video falla o hay que entender qué devuelve un provider nuevo, este es el flujo completo de queries. Todos los pasos son GET/POST reales — no hay que levantar la app.

### Paso 1 — Buscar un showId reciente

Usar **anime de los últimos 2-3 meses** para que los providers estén activos.

```bash
node -e "
const axios = require('axios').default;
axios.post('https://api.allanime.day/api', {
  variables: { search: { query: 'slime' }, limit: 3, page: 1, translationType: 'sub', countryOrigin: 'JP' },
  query: 'query(\$search:SearchInput,\$limit:Int,\$page:Int,\$translationType:VaildTranslationTypeEnumType,\$countryOrigin:VaildCountryOriginEnumType){shows(search:\$search,limit:\$limit,page:\$page,translationType:\$translationType,countryOrigin:\$countryOrigin){edges{_id name}}}'
}, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://allmanga.to', 'Content-Type': 'application/json' } })
.then(r => console.log(JSON.stringify(r.data.data.shows.edges, null, 2)));
"
```

Resultado: `[{ _id: 'srGrP23qJnjsHrRYD', name: 'That Time I Got Reincarnated as a Slime' }]`

### Paso 2 — Obtener providers de un episodio

Persisted query (GET con hash sha256) contra **`api.mkissa.net`**, con lane + `aaReq` + header `x-build-id`. **No intentar armar esto a mano**: `.claude/diagnose-api.js` ya hace el bootstrap, el token y el descifrado. Para un anime/episodio puntual:

```bash
node .claude/diagnose-api.js --showId srGrP23qJnjsHrRYD --episode 6
```

Interpretación rápida de lo que puede salir mal ahí:
- `❌ No se pudo obtener partB del bootstrap` → constantes `AA_*` viejas → `node .claude/extract-mkissa-keys.js`
- `❌ PersistedQueryNotFound` → cambió el texto de la query → mismo extractor (`episodeQueryHash`)
- `AA_CRYPTO_MISSING_BUILD` → falta el header `x-build-id`

### Paso 3 — Descifrar el blob tobeparsed → sourceUrls

**(Esquema bootstrap, 2026-08-29)** El blob es AES-256-**GCM** (1 byte versión, 12 IV, ciphertext, 16 tag) con la clave `partB XOR MASK` que sale del bootstrap (ver `deriveKeyMaterial()`/`fetchKeys()`), NO la vieja `SHA256("Xot36i3lK3:v1")` en CTR ni el `mask XOR partB` scrapeado del HTML de julio. El script `.claude/diagnose-api.js` ya hace bootstrap + descifrado — usarlo directamente. El plaintext viene como `{"episode":{"sourceUrls":[…]}}`.

Para inspeccionar manualmente el resultado descifrado:
```bash
node -e "
// Correr solo el decrypt del blob — ver src/services/AnimeService.js: decryptTobeparsedSourceUrls()
// El resultado es: [{ sourceName: 'Ak', sourceUrl: '--...hex...', priority: 8.2 }, ...]
"
```

Los `sourceUrls` tienen este formato:
- `sourceUrl` empieza con `--` → está hexencodeado (aplicar `decodeUrl` de `urlDecoder.js`)
- `sourceUrl` empieza con `http` → URL directa
- `sourceName` = nombre del provider (Ak, Ok, Luf-Mp4, etc.)
- `priority` = número decimal (mayor = se intenta primero)

### Paso 4 — Decodificar la URL de un provider

El encoding es un mapa hex de 53 caracteres. Ver el mapa completo en `src/utils/urlDecoder.js: HEX_MAPPING`.

**Importante:** Si copias el HEX_MAP a un script de prueba, incluir los 11 caracteres especiales (`!$&()*+,;=%`) o algunos providers darán null silenciosamente.

El resultado de decodificar Ak/Luf-Mp4/Default suele ser una ruta relativa:
```
/apivtwo/clock.json?authKey=...&component=...&id=...
```
Se prefija con `https://allanime.day` para formar la URL completa.

Para Ok, la URL decodificada ya es absoluta: `https://ok.ru/videoembed/...`

### Paso 5 — Sondear cada tipo de endpoint

#### clock.json (Ak, Luf-Mp4, Default)

```bash
curl -s "https://allanime.day/apivtwo/clock.json?authKey=...&component=...&id=..." \
  -H "User-Agent: Mozilla/5.0" \
  -H "Referer: https://allmanga.to" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const vids = d.links?.[0]?.rawUrls?.vids || [];
const link = d.links?.[0]?.link || 'ninguno';
console.log('rawUrls.vids:', vids.length, vids.map(v=>v.height+'p').join('/'));
console.log('link:', link.substring(0, 60));
"
```

Interpretar:
- `rawUrls.vids` tiene URLs → CDN Bilibili directo → **USAR ESTO** → `extractLinksFromClockJson`
- `link` apunta a `sk.json` → **IGNORAR** (da 404 sin sesión web)
- `link` apunta a wixmp.com → incluir como fallback (`clock-link`)

#### CDN Bilibili (URLs de rawUrls.vids)

```bash
# Probar SIN Referer — debe dar 200
curl -I "https://...akamaized.net/...segment...mp4" \
  -H "User-Agent: Mozilla/5.0"

# Probar CON Referer — debe dar 403 (hotlink protection)
curl -I "https://...akamaized.net/...segment...mp4" \
  -H "User-Agent: Mozilla/5.0" \
  -H "Referer: https://allmanga.to"
```

Si 403 con Referer y 200 sin → marcar el link con `noReferer: true`.
El VideoPlayer omite el header Referer cuando `currentLink.noReferer === true`.

#### ok.ru embed

```bash
curl -s "https://ok.ru/videoembed/..." \
  -H "User-Agent: Mozilla/5.0" \
  -H "Referer: https://allmanga.to" | node -e "
const html = require('fs').readFileSync('/dev/stdin','utf8');
const m = html.match(/data-options=\"([^\"]+)\"/);
if (!m) { console.log('data-options NO ENCONTRADO — embed diferente'); process.exit(1); }
const opts = JSON.parse(m[1].replace(/&quot;/g,'\"').replace(/&amp;/g,'&'));
const meta = JSON.parse(opts.flashvars.metadata);
console.log('HLS:', meta.hlsManifestUrl ? 'sí' : 'no');
console.log('Calidades:', (meta.videos||[]).map(v=>v.name).join(', '));
"
```

Si `data-options` no aparece → ok.ru sirve otra variante de página (ej. One Piece). El extractor no aplica; el provider aparece como "HTML iframe" en el probe.

#### Providers iframe (Fm-Hls, Mp4, Sw, Uni, Vn-Hls, Vg)

```bash
curl -sI "https://...embed.url..." -H "User-Agent: Mozilla/5.0"
# Ver status y content-type
curl -s "https://...embed.url..." -H "User-Agent: Mozilla/5.0" | wc -c
# Si HTML < 2KB → página de error o redirect
# Si HTML > 10KB → iframe real con player JS
```

Estos providers **no producen video** sin ejecutar JavaScript. Para extraer sus streams habría que hacer puppeteer/headless o reverse-engineer el JS del player. No están implementados actualmente.

### Paso 6 — Probar accesibilidad real de un stream

```bash
# HEAD sin headers (simula ExoPlayer con noReferer:true)
curl -I "https://...cdn.../video.mp4" -H "User-Agent: Mozilla/5.0"

# Si 403 → el stream tiene protección adicional (token expirado, IP restringida, etc.)
# Si 200/206 → el stream es accesible
# Si 302 → redirect, seguir con -L
```

Los tokens de Bilibili CDN (`hdnts=...`) son solo time-limited, no IP-restricted — si funciona en el probe, funciona en el dispositivo.

---

## Script de probe masivo

Para comparar providers entre múltiples anime de una sola vez:

```bash
node .claude/probe-providers.js
```

Muestra para cada anime y cada provider: calidades disponibles, status HTTP, si es clock.json o iframe.
Editar los `cases` al final del script para probar anime específicos.

---

## Archivos clave del proyecto

| Archivo | Qué puede romperse |
|---|---|
| `src/utils/apiConfig.js` | `PROVIDER_MAPPING` — providers nuevos o renombrados |
| `src/utils/urlDecoder.js` | `HEX_MAPPING` — si el encoding cambia; `filterProviders` |
| `src/services/AnimeService.js` | Hash de persisted query, `aaReq`/clave AES, parsers de episodios |
| `src/services/CatalogService.js` | Parsers de catálogo y trending |
| `src/services/VideoService.js` | `extractLinksFromClockJson`, `extractLinksFromOkRu` |
| `src/screens/Player/components/VideoPlayer.js` | Headers de ExoPlayer (noReferer, Referer condicional) |
| `src/components/AnimeDetailsEpisodes/components/EpisodeRow.js` | Header `Referer` en el `<Image>` del thumbnail de episodio |

## Sort por vistas en búsqueda (investigado — NO implementar, ver por qué)

Pregunta recurrente esperable: "¿se puede ordenar la búsqueda/catálogo por más vistos, combinado con género?" — **No, con esta API no es viable.** Investigado a fondo vía introspección GraphQL (`query { __schema { types { name kind enumValues { name } } } }`) y pruebas en vivo:

- El enum `SortBy` (usado en `SearchInput.sortBy`) tiene `Popular` y `Trending` — **están rotos**: devuelven exactamente el mismo orden que `Recent` (no ordenan por vistas). `Top` tampoco sigue vistas de forma estricta.
- `shows(search:...)` **sí** puede devolver `pageStatus{views}` por cada edge (dato real), y **sí** filtra por género correctamente. Pero no hay forma de pedirle que ordene por ese campo.
- `queryPopular(type,size,dateRange,page,...)` (ya usado en Home para trending diario/semanal vía `CatalogService.getPopularDaily/Weekly/Monthly`) **sí ordena por vistas reales** — probado con `dateRange: 0` (histórico total), da un ranking descendente correcto y pagina bien. Pero su `anyCard` **no acepta filtro de género** y el campo `genres` en `anyCard` siempre devuelve `null` aunque se pida explícitamente.
- Intentar mezclar ambos (traer resultados filtrados por género vía `shows(search)` y ordenar del lado del cliente por `pageStatus.views`) no es correcto de verdad: `pageInfo.total` de `shows(search:...)` devuelve **el mismo número (24618) sin importar el filtro de género aplicado** — la API no expone cuántos resultados hay realmente por género, así que no hay forma de saber si ya se trajeron todos los relevantes antes de ordenar. Cualquier "top N por vistas dentro de género X" sería solo el top N de lo que alcanzó a cargar, no el top N real — decisión consciente de no implementarlo así (fue rechazado explícitamente al proponerlo).
- Si se repite la pregunta, no volver a re-investigar desde cero — citar este hallazgo. Solo reabrir si AllAnime cambia el schema (verificar de nuevo con introspección primero).

## Nombres y thumbnails de episodio (endpoint `episodeInfos`)

Síntoma reportado: "el episodio no muestra nombre" o "no muestra thumbnail" en la lista de episodios. Son dos causas completamente distintas — no asumir que es la misma:

### Nombre de episodio ausente (`notes: null`) — normalmente NO es bug
AllAnime simplemente no siempre tiene el título en inglés/notas cargado para cada episodio — es común que solo los primeros episodios de una temporada reciente tengan `notes`, y el resto quede `null` hasta que alguien lo complete en su base de datos. Verificar con:
```bash
node -e "
const axios = require('axios').default;
const HASH = 'c8f3ac51f598e630a1d09d7f7fb6924cff23277f354a23e473b962a367880f7d';
axios.get('https://api.allanime.day/api', {
  headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://allmanga.to' },
  params: {
    variables: JSON.stringify({ showId: '<showId>', episodeNumStart: 1, episodeNumEnd: <N> }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }),
  },
}).then(r => (r.data?.data?.episodeInfos || []).forEach(ep =>
  console.log(ep.episodeIdNum, '| notes:', JSON.stringify(ep.notes))));
"
```
Si `notes` viene `null` en la respuesta cruda de la API, no hay nada que arreglar en la app — `EpisodeRow.js` ya maneja `info?.notes` como opcional y no rompe nada. Solo es un issue real si `notes` SÍ viene con datos pero no se refleja en la UI (ahí sí revisar el keying de `episodeInfoMap` en `useAnimeDetailsEpisodes.js`).

### Thumbnail de episodio ausente — SÍ es bug conocido (ya arreglado, ver si reaparece)
El CDN de thumbnails (`wp.youtube-anime.com`) responde **403 sin header `Referer`**. `getEpisodeInfos()` en `AnimeService.js` sí arma la URL correctamente (`THUMB_BASE + thumbPath`), pero si el `<Image source={{ uri: ... }}>` en `EpisodeRow.js` no incluye `headers: { Referer: "https://allmanga.to/" }`, la imagen falla en silencio para TODOS los episodios (no solo los recientes) — RN's `Image` no manda Referer por defecto. Confirmar con:
```bash
curl -sI "https://wp.youtube-anime.com/aln.youtube-anime.com/<thumbPath>?w=480" -A "Mozilla/5.0"          # esperar 403
curl -sI "https://wp.youtube-anime.com/aln.youtube-anime.com/<thumbPath>?w=480" -A "Mozilla/5.0" -H "Referer: https://allmanga.to/"  # esperar 200
```
Si da 403 sin Referer y 200 con Referer, el fix es agregar `headers` al `source` del `<Image>` en `EpisodeRow.js`.

## Notas generales

- Siempre usar un **showId de anime reciente** (últimos 2-3 meses) — los providers de anime viejo difieren
- Si el usuario reporta que un anime específico falla, pasar su showId como argumento
- Cuando aparezca un provider nuevo en `UNMAPPED_PROVIDERS`, sondearlo manualmente (Paso 5) antes de asumir que es iframe
- El hash de persisted query y la clave AES son los dos puntos más frágiles — si cambian, todo el sistema de providers falla

---

## Antes de compilar un APK: `check-source-contract.js`

```bash
node .claude/check-source-contract.js
```

Verifica que `src/services/source/index.js` devuelva las formas exactas que las pantallas esperan. Corre sin device, sin red y sin el bundle de RN (mockea el puente de Cloudflare y `fetch`).

**Por qué existe:** al migrar a anidb se rompieron 3 contratos de una sola vez y todos se vieron recién en el celular:
1. `searchAnimeAdvanced` devolvía un array, pero Search hace `const { results, pagination } = await ...` → *"Cannot read property 'length' of undefined"*.
2. `getAnimeDetails` no traía `title`, que `isAnimeDataComplete()` exige → la pantalla de detalle descartaba la respuesta **en silencio**.
3. `details.episodes` tiene que ser un **número** (`generateEpisodesList` itera `1..N`), no un objeto.

Lección: al cambiar de fuente no alcanza con que compile. Hay que verificar **la forma de retorno de cada método contra su consumidor real** — varios de estos fallan sin excepción visible.

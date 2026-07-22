# /diagnose — Diagnóstico de la API AllAnime

Diagnostica la integración con AllAnime, detecta qué cambió y aplica los fixes que pueda automáticamente.

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

### `HASH_CHANGED` (requiere intervención manual)
- El hash de `persistedQuery` en `AnimeService.getEpisodeUrl` (línea ~548) cambió
- Decirle al usuario que busque en DevTools del browser: Network tab → filtra por `episodeString` → copia el nuevo hash del parámetro `extensions`
- Actualizar en `src/services/AnimeService.js`

### `AA_CRYPTO_MISSING` (requiere investigación — esquema activo desde 2026-07-07/08)
- La query de episodio (providers) ahora exige, además del hash de `persistedQuery`, un token `aaReq` en `extensions`: AES-256-GCM de un payload `{v,ts,epoch,buildId,qh}`, con IV = `SHA256("{epoch}:{buildId}:{qh}:{ts}")` (12 primeros bytes) y `ts` redondeado a ventanas de 5 min. Ver `buildAaReqToken()` en `src/services/AnimeService.js` y la misma lógica duplicada en `.claude/diagnose-api.js`.
- La clave AES cambió de `SHA256("Xot36i3lK3:v1")` a un valor fijo derivado por XOR en el build del sitio: `22196fa6afca95309fdabe9a3534b87cd2454e50efeabfcbdbdfd3de678b3982` (constante `ALLANIME_KEY_HEX`).
- El `Referer`/`Origin` para esta query específica debe ser `https://youtu-chan.com` (no `https://allmanga.to`, que sigue sirviendo para catálogo/trending/episodios).
- `AAREQ_EPOCH` (4128) y `AAREQ_BUILD_ID` ("9") están hardcodeados — si AllAnime los rota y el diagnóstico vuelve a fallar con `AA_CRYPTO_MISSING`, hay que extraerlos de nuevo inspeccionando el JS del sitio (o revisar issues recientes en `pystardust/ani-cli` — ahí es donde se encontraron la última vez, ver PR #1772 y #1774).
- Requiere `@noble/ciphers` como dependencia (AES-GCM real; `crypto-js` no lo soporta).

### `DECRYPT_KEY` (requiere investigación)
- La clave AES para descifrar el blob `tobeparsed` es la misma `ALLANIME_KEY_HEX` de arriba — si vuelve a cambiar, ambos flujos (descifrado de sourceUrls y generación de `aaReq`) se rompen a la vez
- Esto requiere reverse engineering del JS de AllAnime — notificar al usuario

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

La API usa **persisted query** (GET con hash sha256) — no POST con el query completo.

```bash
node -e "
const axios = require('axios').default;
const HASH = 'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';
axios.get('https://api.allanime.day/api', {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://allmanga.to' },
  params: {
    variables: JSON.stringify({ showId: 'srGrP23qJnjsHrRYD', translationType: 'sub', episodeString: '6' }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } })
  }
}).then(r => {
  // La respuesta tiene los sourceUrls dentro de un blob cifrado en 'tobeparsed'
  const str = JSON.stringify(r.data);
  const m = str.match(/tobeparsed\":\"([^\"]+)\"/);
  console.log('tobeparsed blob (primeros 80):', m ? m[1].substring(0, 80) : 'NO ENCONTRADO');
  console.log('Status:', r.status);
});
"
```

Si el hash cambió → HTTP 200 pero sin datos (campo vacío o error `PersistedQueryNotFound`).
El hash actual está en `src/services/AnimeService.js` — buscar `sha256Hash`.

### Paso 3 — Descifrar el blob tobeparsed → sourceUrls

El blob usa AES-CTR con clave derivada de `SHA256("Xot36i3lK3:v1")`.
El script `.claude/probe-providers.js` ya tiene el descifrado completo — usarlo directamente.

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

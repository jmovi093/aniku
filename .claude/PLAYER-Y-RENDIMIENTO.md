# Reproductor y rendimiento — decisiones y mediciones

Complementa `.claude/ANIDB-SOURCE.md` (que cubre la fuente de datos). Acá va lo
del **reproductor** y lo de **por qué la app se siente lenta**, con números.

---

## 1. Reproductor: calidad y audio

Ambos controles viven **dentro del player**, en el engranaje de la barra
superior (junto al botón de Cast) → abre `PlayerSettingsSheet`.

| Archivo | Rol |
|---|---|
| `src/screens/Player/components/PlayerSettingsSheet.js` | Modal con Calidad + Audio |
| `src/screens/Player/components/VideoPlayer.js` | Botón de engranaje y render del modal |
| `src/screens/Player/PlayerScreen.js` | Estado y handlers |
| `src/utils/videoQuality.js` | `pickPreferredQualityIndex()` |

### Calidad
`appConfig.video.defaultQuality = "720p"`.

`pickPreferredQualityIndex(links, preferida)` elige el índice así:
1. coincidencia exacta;
2. la mejor **por debajo** (mejor quedarse corto que forzar 1080p con datos);
3. la más baja por encima;
4. índice 0.

Se aplica en **tres** lugares — los tres antes forzaban el índice 0, que es
siempre la calidad más alta:
- al abrir un episodio (`useVideoPlayer`, estado inicial);
- al pasar al siguiente (`useEpisodeManager`);
- al cambiar de provider tras un fallo (`PlayerScreen.handleProviderExhausted`).

Con `"auto"` devuelve 0 (la mejor), porque los enlaces vienen ordenados de
mayor a menor.

### Audio (sub / dub)
anidb expone `jpn` y/o `eng` **por episodio** vía
`/api/frontend/episode/{id}/languages`.

⚠️ **Cambiar de audio NO es cambiar de pista dentro del mismo stream**: son
streams distintos (otro `embed_url` → otro `master.m3u8`). Por eso hay que
volver a pedir los enlaces con el otro `translationType` y recargar. Se guarda
la posición y se hace `seekTo` cuando el nuevo stream está listo.

El selector **se oculta si solo hay un audio** (`audioOptions.length > 1`).

> Nota histórica: `QualitySelector.js` existía desde antes pero era **código
> muerto** — nadie lo renderizaba y usaba estilos (`qualityButton`,
> `qualitiesList`) que **no existen** en `PlayerStyles.js`. Se reescribió
> autocontenido. Hoy sigue exportado por si se quiere un selector inline fuera
> del player, pero la ruta oficial es el engranaje.

---

## 2. Por qué la app se siente lenta (medido, no supuesto)

Medido dentro de un Chrome real (equivalente al WebView del celular):

| caso | peso | red | parseo | total |
|---|---|---|---|---|
| `/browse?q=dragon` (scraping) | 113 KB | 488 ms | **3 ms** | 491 ms |
| `/browse?sort=trending` (scraping) | 112 KB | 423 ms | **3 ms** | 427 ms |
| `/anime/<slug>` (detalle) | 130 KB | 447 ms | **4 ms** | 451 ms |
| `/api/frontend/schedule` | 6.3 KB | 383 ms | 0 ms | 383 ms |
| `/api/frontend/anime/X/episodes` | 0.7 KB | 382 ms | 0 ms | 382 ms |

**Conclusiones que importan:**

1. **Parsear HTML es gratis** (3-4 ms para 113 KB). El scraping NO cuesta CPU.
2. Hay un **piso de ~380 ms por request**, tenga 0.7 KB o 113 KB: es latencia
   de red + Cloudflare + servidor. Una llamada a la API "pura" tarda casi lo
   mismo que un scrape.
3. La diferencia real scraping vs API es de **~100 ms** por request.
4. **El costo real es el PESO**: el Home pide 5 secciones →
   **4320 ms y 555 KB** para mostrar 140 tarjetas. Cada `/browse` pesa 113 KB
   y usamos ~4 campos por tarjeta.

Es decir: la lentitud viene del **peso de descarga**, no del parseo ni de la
elección de scraping.

---

## 3. Precalentado del WebView (implementado)

`<CloudflareBridge />` en `App.js` ahora monta el WebView **al arrancar la app**
(`warmUp` por defecto `true`), no al primer request. Así los 2-5 s del challenge
de Cloudflare se solapan con el arranque en vez de sumarse a la primera
pantalla que pida datos.

Además:
- **Reintento automático** con backoff (3 s, 6 s, 9 s; máx. 3 intentos) si la
  carga falla o el challenge no resuelve. Antes el puente quedaba muerto toda
  la sesión y ninguna pantalla cargaba hasta reiniciar la app.
- `markBridgeFailed` **rearma la promesa** de "listo": si no, cualquier request
  posterior al fallo quedaba rechazado para siempre.
- Se **mide** cuánto tardó el challenge:
  `✅ Bridge listo en 3480ms (challenge de Cloudflare superado)`.

Para desactivarlo: `<CloudflareBridge warmUp={false} />` (vuelve a montaje lazy).

### Qué mirar en los logs (tag `cf-bridge`)
```
🔥 Precalentando el puente al arrancar
✅ Bridge listo en NNNNms (challenge de Cloudflare superado)
🔁 Reintentando el puente en 3000ms (intento 1)      ← solo si falló
⚠️ Puente agotó 3 reintentos                          ← se rindió
```

---

## 4. Optimizaciones pendientes (NO implementadas)

| Idea | Ganancia esperada | Riesgo |
|---|---|---|
| **Cachear el Home** en AsyncStorage con TTL (~30 min) | aperturas siguientes instantáneas | bajo |
| **Lazy-load** de las secciones no visibles del Home | 555 KB → ~220 KB inicial | cambia el scroll |
| Usar `/search/suggestions` como **autocompletado** | 8 resultados por 5 KB (vs 113 KB) | bajo, es aditivo |

`/search/suggestions?q=` devuelve HTML (no JSON), 8 resultados, con póster,
título y **tipo · año** — un dato que la card de `/browse` no trae. Sirve para
autocompletar mientras se escribe, no para reemplazar la búsqueda.

---

## 5. Antes de compilar un APK

```bash
node .claude/check-source-contract.js
```
Valida las formas de retorno del adaptador contra lo que espera cada pantalla,
sin device ni red. Ver el porqué en `.claude/commands/diagnose.md`.

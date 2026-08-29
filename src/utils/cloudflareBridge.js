const logger = createLogger("cf-bridge");
import { createLogger } from "./logger";
// utils/cloudflareBridge.js
// Puente para hacer requests HTTP a orígenes protegidos por Cloudflare
// (hoy: anidb.app) ejecutándolos DENTRO de un WebView oculto.
//
// ─── POR QUÉ EXISTE ESTO (leer antes de "simplificarlo" a un axios) ─────────
//
// anidb.app está detrás de Cloudflare y el bloqueo es a nivel de **huella TLS**
// (JA3/JA4: orden de extensiones del ClientHello, valores GREASE, ALPS), no de
// headers. Medido el 2026-08-29 contra `/api/frontend/anime/5241/episodes`:
//
//   | intento                                            | resultado    |
//   |----------------------------------------------------|--------------|
//   | fetch/axios por defecto                            | 403 CF       |
//   | + UA de Chrome y 13 headers (Sec-Ch-Ua, etc.)      | 403 CF       |
//   | + ciphers EXACTOS de Chrome (los que usa ani-cli)  | 403 CF       |
//   | + curva X25519 / sigalgs estilo Chrome             | 403 CF       |
//   | + cookie `cf_clearance` robada de un Chrome real   | 403 CF       |
//   | Chrome headless                                    | 403 CF       |
//   | Chrome de verdad                                   | ✅ pasa solo |
//
// Conclusión: NO alcanza con cookies ni headers ni ciphers. Hace falta un
// ClientHello de navegador real. Desde JS en React Native no se puede tocar
// (fetch/axios salen por OkHttp/Conscrypt). Pero el WebView de Android **es**
// Chrome, así que un `fetch()` ejecutado dentro de su página pasa igual que el
// navegador de escritorio.
//
// El challenge de anidb.app es del tipo "managed" (automático): el navegador
// corre el JS y se autorresuelve en unos segundos SIN interacción del usuario.
// Por eso el WebView puede ir oculto (0×0) y el usuario nunca ve nada.
//
// ─── CÓMO LO HACE ani-cli (plan B, si esto alguna vez falla) ────────────────
//
// ani-cli NO resuelve el challenge: lo evita falsificando la huella TLS con
// `curl-impersonate` (libcurl parcheado con BoringSSL). Ver en su script:
//
//   curl_exe=$(dep_ch_failover "curl_firefox135,curl_chrome136,curl_chrome116,curl_ff117,curl")
//   [ "$curl_exe" = "curl" ] && die "Blocked by cloudflare. Try installing curl-impersonate"
//
// Si el WebView dejara de servir (p. ej. Cloudflare pasa a challenge
// INTERACTIVO, o Android WebView empieza a ser detectado), el equivalente para
// nosotros es meter esa capacidad nativa en el APK:
//   1. Módulo nativo Android que envuelva libcurl-impersonate, o
//   2. Go + github.com/refraction-networking/utls compilado a .aar con gomobile
//      (es la vía más mantenible; utls permite elegir el perfil de ClientHello).
// Costo: +5-15 MB por ABI y hay que **reperseguir versiones de Chrome** cada
// vez que cambia el ClientHello (por eso ani-cli tiene 4 binarios distintos en
// su lista). El WebView no tiene ese problema porque no imita a Chrome: ES
// Chrome y se actualiza con el sistema.
//
// ─── LO QUE **NO** NECESITA PASAR POR ACÁ ───────────────────────────────────
// El video. `hls.anidb.app` NO está detrás de Cloudflare (verificado: 200 sin
// ningún header, segmentos 206). ExoPlayer lo reproduce directo. Este puente es
// solo para metadata (búsqueda, episodios, embed → m3u8).

// Timeout por request. El primer request puede tardar más porque incluye la
// resolución del challenge; para eso está BRIDGE_READY_TIMEOUT aparte.
const REQUEST_TIMEOUT = 20000;
const BRIDGE_READY_TIMEOUT = 45000;

let _postToWebView = null; // lo setea el componente <CloudflareBridge/>
let _activate = null; // dispara el montaje lazy del WebView
let _isReady = false;
let _readyPromise = null;
let _readyResolve = null;
let _readyReject = null;

let _seq = 0;
const _pending = new Map();

function resetReadyPromise() {
  _readyPromise = new Promise((resolve, reject) => {
    _readyResolve = resolve;
    _readyReject = reject;
  });
  // Evita "unhandled rejection" si nadie está esperando todavía.
  _readyPromise.catch(() => {});
}
resetReadyPromise();

// ─── API que consume el componente <CloudflareBridge/> ──────────────────────

// El componente registra cómo inyectar JS en el WebView y cómo pedir su montaje.
export function registerBridge({ postToWebView, activate }) {
  _postToWebView = postToWebView;
  _activate = activate;
}

export function unregisterBridge() {
  _postToWebView = null;
  _isReady = false;
  resetReadyPromise();
  for (const [id, entry] of _pending) {
    clearTimeout(entry.timer);
    entry.reject(new Error("CloudflareBridge desmontado"));
    _pending.delete(id);
  }
}

// Momento en que se montó el WebView, para medir cuánto tarda el challenge.
let _warmStartedAt = null;

export function markBridgeWarmStart() {
  _warmStartedAt = Date.now();
}

// El WebView avisa que la página ya pasó el challenge y puede ejecutar fetch.
export function markBridgeReady() {
  if (_isReady) return;
  _isReady = true;
  const elapsed = _warmStartedAt ? `${Date.now() - _warmStartedAt}ms` : "?";
  logger.debug(`✅ Bridge listo en ${elapsed} (challenge de Cloudflare superado)`);
  _readyResolve?.();
}

// El WebView avisa que la carga falló (sin red, challenge interactivo, etc.).
// Se rearma la promesa para que un reintento posterior pueda resolverla: si no,
// cualquier request que llegue después quedaría rechazado para siempre.
export function markBridgeFailed(reason) {
  logger.warn(`⚠️ Bridge falló: ${reason}`);
  if (_isReady) return;
  _readyReject?.(new Error(reason));
  resetReadyPromise();
}

// Cada mensaje que llega del WebView resuelve el request correspondiente.
export function handleBridgeMessage(raw) {
  let msg;
  try {
    msg = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return;
  }

  if (msg?.type === "ready") return markBridgeReady();
  if (msg?.type === "failed") return markBridgeFailed(msg.reason || "desconocido");
  if (msg?.type === "log") return logger.debug(`[webview] ${msg.text}`);

  const entry = _pending.get(msg?.id);
  if (!entry) return;
  _pending.delete(msg.id);
  clearTimeout(entry.timer);

  if (msg.ok) entry.resolve(msg.value);
  else entry.reject(new Error(msg.error || "error en el WebView"));
}

// ─── API que consumen los servicios ─────────────────────────────────────────

// Asegura que el WebView esté montado y con el challenge resuelto.
export async function ensureBridgeReady() {
  if (_isReady) return;
  _activate?.();
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("timeout esperando el challenge de Cloudflare")),
      BRIDGE_READY_TIMEOUT,
    ),
  );
  await Promise.race([_readyPromise, timeout]);
}

export function isBridgeReady() {
  return _isReady;
}

// Ejecuta una expresión JS dentro de la página y devuelve su valor (o el valor
// resuelto, si es una promesa). Debe ser serializable a JSON.
export async function cfEval(expression) {
  await ensureBridgeReady();
  if (!_postToWebView) throw new Error("CloudflareBridge no está montado");

  const id = ++_seq;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(id);
      reject(new Error(`timeout (${REQUEST_TIMEOUT}ms) en cfEval`));
    }, REQUEST_TIMEOUT);
    _pending.set(id, { resolve, reject, timer });
  });

  // `true;` final evita warnings de injectJavaScript en Android.
  _postToWebView(`
    (function(){
      try {
        Promise.resolve(${expression})
          .then(function(v){ __aniku_post({ id: ${id}, ok: true, value: v }); })
          .catch(function(e){ __aniku_post({ id: ${id}, ok: false, error: String(e && e.message || e) }); });
      } catch (e) {
        __aniku_post({ id: ${id}, ok: false, error: String(e && e.message || e) });
      }
    })();
    true;
  `);

  return promise;
}

// fetch() ejecutado dentro de la página. Devuelve { status, body }.
// OJO: `body` viaja como string por el bridge; para HTML grande (~100 KB)
// conviene parsear DENTRO de la página con cfEval + DOMParser y devolver solo
// lo necesario, en vez de traerse el HTML entero.
export async function cfFetch(url, init = {}) {
  const expr = `
    fetch(${JSON.stringify(url)}, ${JSON.stringify(init)})
      .then(function(r){
        return r.text().then(function(t){
          return { status: r.status, body: t };
        });
      })
  `;
  return cfEval(expr);
}

// Igual que cfFetch pero parseando JSON dentro de la página (payload chico).
export async function cfFetchJson(url, init = {}) {
  const merged = { ...init, headers: { Accept: "application/json", ...(init.headers || {}) } };
  const expr = `
    fetch(${JSON.stringify(url)}, ${JSON.stringify(merged)})
      .then(function(r){
        return r.text().then(function(t){
          var parsed = null;
          try { parsed = JSON.parse(t); } catch (e) {}
          return { status: r.status, json: parsed, raw: parsed ? null : t.slice(0, 500) };
        });
      })
  `;
  const result = await cfEval(expr);
  if (result.status !== 200 || !result.json) {
    throw new Error(
      `cfFetchJson ${url} -> ${result.status}${result.raw ? ` (${result.raw.slice(0, 120)})` : ""}`,
    );
  }
  return result.json;
}

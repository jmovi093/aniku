import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import {
  handleBridgeMessage,
  markBridgeFailed,
  markBridgeWarmStart,
  registerBridge,
  unregisterBridge,
} from "../../utils/cloudflareBridge";
import { createLogger } from "../../utils/logger";
import { styles } from "./styles";

const logger = createLogger("cf-bridge");

// Origen sobre el que se resuelve el challenge. Los fetch() posteriores se
// hacen desde esta página, así que son same-origin para anidb.app (van con sus
// cookies y, lo importante, con el TLS del navegador).
const BRIDGE_ORIGIN = "https://anidb.app/";

// Reintentos de carga del WebView antes de rendirse.
const MAX_RETRIES = 3;

// Se inyecta en CADA carga (incluida la página de challenge). Cuando detecta
// que ya NO es el challenge, avisa que el puente está listo.
// Nota: el challenge de Cloudflare es "managed" (automático) — se resuelve solo
// en unos segundos sin que el usuario toque nada. Por eso el WebView va oculto.
const INJECTED = `
  (function(){
    if (window.__aniku_bridge_installed) { return true; }
    window.__aniku_bridge_installed = true;

    window.__aniku_post = function(payload){
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
    };

    function looksLikeChallenge(){
      var t = (document.title || '').toLowerCase();
      return t.indexOf('just a moment') !== -1
          || t.indexOf('un momento') !== -1
          || !!document.querySelector('#challenge-form, #challenge-running, .challenge-platform');
    }

    var tries = 0;
    (function check(){
      tries++;
      if (!looksLikeChallenge()) { window.__aniku_post({ type: 'ready' }); return; }
      if (tries > 60) { window.__aniku_post({ type: 'failed', reason: 'challenge no resuelto tras 60s' }); return; }
      setTimeout(check, 1000);
    })();
  })();
  true;
`;

/**
 * WebView oculto que permite hacer requests a orígenes con Cloudflare.
 *
 * Montarlo UNA vez cerca de la raíz de la app. No renderiza nada visible.
 * Por defecto PRECALIENTA: se monta al arrancar y resuelve el challenge de
 * Cloudflare mientras el usuario todavía está viendo el splash/Home, así ese
 * costo no se le suma a la primera pantalla que pida datos. Con
 * `warmUp={false}` vuelve al montaje lazy (solo al primer `ensureBridgeReady`).
 *
 * Ver `src/utils/cloudflareBridge.js` para el porqué de todo esto y para el
 * plan B (curl-impersonate nativo, como hace ani-cli) si el WebView fallara.
 *
 * @param {boolean} warmUp  si es true (default) el WebView se monta y resuelve
 *   el challenge apenas arranca la app, sin esperar al primer request. Así los
 *   2-5 segundos del challenge se solapan con el arranque en vez de sumarse a
 *   la primera pantalla que pida datos.
 */
export function CloudflareBridge({ warmUp = true }) {
  const webRef = useRef(null);
  const [active, setActive] = useState(warmUp);
  const [reloadKey, setReloadKey] = useState(0);
  const retriesRef = useRef(0);

  const postToWebView = useCallback((js) => {
    webRef.current?.injectJavaScript(js);
  }, []);

  const activate = useCallback(() => {
    setActive((prev) => {
      if (!prev) logger.debug("🌐 Activando WebView puente (lazy)");
      return true;
    });
  }, []);

  useEffect(() => {
    registerBridge({ postToWebView, activate });
    if (warmUp) {
      logger.debug("🔥 Precalentando el puente al arrancar");
      markBridgeWarmStart();
    }
    return () => unregisterBridge();
  }, [postToWebView, activate, warmUp]);

  // Si la carga falla (sin red al arrancar, challenge que no resolvió), se
  // reintenta remontando el WebView. Sin esto el puente quedaría muerto toda
  // la sesión y ninguna pantalla cargaría hasta reiniciar la app.
  const handleFailure = useCallback((reason) => {
    markBridgeFailed(reason);
    if (retriesRef.current >= MAX_RETRIES) {
      logger.warn(`⚠️ Puente agotó ${MAX_RETRIES} reintentos`);
      return;
    }
    retriesRef.current += 1;
    const delay = 3000 * retriesRef.current;
    logger.debug(`🔁 Reintentando el puente en ${delay}ms (intento ${retriesRef.current})`);
    setTimeout(() => {
      markBridgeWarmStart();
      setReloadKey((k) => k + 1);
    }, delay);
  }, []);

  if (!active) return null;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ uri: BRIDGE_ORIGIN }}
        injectedJavaScript={INJECTED}
        onMessage={(event) => {
          const raw = event.nativeEvent.data;
          // Un 'failed' del JS inyectado (challenge que no resolvió) tiene que
          // pasar por el reintento, no solo marcarse.
          try {
            const msg = JSON.parse(raw);
            if (msg?.type === "failed") {
              handleFailure(msg.reason || "challenge no resuelto");
              return;
            }
          } catch {}
          handleBridgeMessage(raw);
        }}
        key={reloadKey}
        onError={(event) =>
          handleFailure(event.nativeEvent?.description || "error de carga")
        }
        onHttpError={(event) =>
          logger.warn(`HTTP ${event.nativeEvent?.statusCode} en el puente`)
        }
        // Cloudflare necesita JS y cookies para el challenge.
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        // Un UA de Chrome móvil real; el WebView ya lo es, esto solo lo hace
        // explícito y estable entre versiones de Android.
        userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        // No queremos que navegue a ningún lado por su cuenta.
        setSupportMultipleWindows={false}
        originWhitelist={["https://*.anidb.app", "https://anidb.app"]}
      />
    </View>
  );
}

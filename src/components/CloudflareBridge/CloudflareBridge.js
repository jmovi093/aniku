import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import {
  handleBridgeMessage,
  markBridgeFailed,
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
 * Montarlo UNA vez cerca de la raíz de la app. No renderiza nada visible y no
 * carga el WebView hasta que algún servicio llama a `ensureBridgeReady()`
 * (montaje lazy), así que no cuesta nada si nunca se usa la fuente anidb.
 *
 * Ver `src/utils/cloudflareBridge.js` para el porqué de todo esto y para el
 * plan B (curl-impersonate nativo, como hace ani-cli) si el WebView fallara.
 */
export function CloudflareBridge() {
  const webRef = useRef(null);
  const [active, setActive] = useState(false);

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
    return () => unregisterBridge();
  }, [postToWebView, activate]);

  if (!active) return null;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ uri: BRIDGE_ORIGIN }}
        injectedJavaScript={INJECTED}
        onMessage={(event) => handleBridgeMessage(event.nativeEvent.data)}
        onError={(event) =>
          markBridgeFailed(event.nativeEvent?.description || "error de carga")
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

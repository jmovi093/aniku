import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AppState } from "react-native";
import { StatusBar } from "expo-status-bar";

// Navegador principal con tabs
import TabNavigator from "./src/navigation/TabNavigator";

// Pantallas secundarias (stack navigation)
import {
  PlayerScreen,
  LoginScreen,
  ProfileScreen,
  DownloadsScreen,
} from "./src/screens";
import AnimeDetailsEpisodesScreen from "./src/components/AnimeDetailsEpisodesScreen";
import ListDetailScreen from "./src/screens/Watching/ListDetailScreen";

// Componente de alertas personalizadas
import CustomAlertComponent from "./src/components/CustomAlert";

// WebView oculto que permite hablar con orígenes detrás de Cloudflare
// (fuente anidb). No renderiza nada y NO carga el WebView hasta que algún
// servicio lo pide — ver src/utils/cloudflareBridge.js.
import { CloudflareBridge } from "./src/components/CloudflareBridge";

// Servicios
import DownloadService from "./src/services/DownloadService";
import WatchedEpisodesService from "./src/services/WatchedEpisodesService";
import HybridHistoryService from "./src/services/HybridHistoryService";
import { createLogger, initializeLogger } from "./src/utils/logger";

// 🔥 Firebase - Test de conectividad
import { auth } from "./firebaseConfig";

const Stack = createStackNavigator();
const appLogger = createLogger("app");

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeLogger();

        // Inicializar servicio de descargas al arrancar la app
        DownloadService.init();

        // 🔥 Inicializar sistema híbrido de historial
        await HybridHistoryService.init();

        // Subir episodios vistos que quedaron pendientes: si Android mató el
        // proceso (o se apagó el teléfono) antes del debounce, el pendiente
        // quedó anotado EN DISCO y se recupera acá.
        WatchedEpisodesService.flushToCloud().catch(() => {});

        // 🔥 Test de Firebase - Verificar conectividad
        appLogger.info("Firebase conectado:", auth.app.name);
        appLogger.debug(
          "🔐 Auth instance:",
          auth.currentUser ? "Usuario autenticado" : "No hay usuario",
        );

        appLogger.info("App inicializada correctamente");
      } catch (error) {
        appLogger.error("Error inicializando app:", error);
      }
    };

    initializeApp();

    // Al pasar la app a segundo plano, subir lo pendiente ANTES de que Android
    // pueda matar el proceso. La escritura local ya ocurrió al marcar, así que
    // esto solo adelanta la nube: nada se pierde si igual nos matan.
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        WatchedEpisodesService.flushToCloud().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#1a1a1a" />
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#1a1a1a",
            },
            headerTintColor: "#ffffff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            cardStyle: { backgroundColor: "#1a1a1a" },
          }}
        >
          {/* Navegador principal con tabs */}
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{
              headerShown: false,
            }}
          />

          {/* Pantallas adicionales */}
          <Stack.Screen
            name="Episodes"
            component={AnimeDetailsEpisodesScreen}
            options={{
              title: "Anime",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              title: "Reproductor",
              headerShown: false,
            }}
          />

          {/* 🔐 Pantallas de autenticación */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: "Iniciar Sesión",
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: "Perfil",
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="Downloads"
            component={DownloadsScreen}
            options={{
              title: "Descargas",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="ListDetail"
            component={ListDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#ffffff",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Componente de alertas globales */}
      <CustomAlertComponent />

      {/* Puente para orígenes con Cloudflare (fuente anidb). Invisible; por
          defecto precalienta al arrancar — ver src/utils/cloudflareBridge.js. */}
      <CloudflareBridge />
    </>
  );
}

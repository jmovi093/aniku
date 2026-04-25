# Guia rapida de logs

## Que categoria tiene cada log de tu ejemplo

- Android Bundled ...: Metro bundler (no pasa por logger de la app).
- [app] ... API_CONFIG ...: categoria app.
- Firebase inicializado correctamente... / Proyecto ID...: vienen de firebaseConfig.js (sin categoria, console directo).
- [home] ... CARGANDO CATALOGOS HOME...: categoria home.
- [catalog] ... getPopular... / fetchCatalog / fetchTrending: categoria catalog.
- [history] ... HybridHistoryService / sync / cloud: categoria history.
- [downloads] ... DownloadService inicializado: categoria downloads.
- [console] WARN new NativeEventEmitter...: categoria console (warnings de librerias / console parcheado).

## Como ocultar logs (super breve)

1. Para cambiarlo fijo, editar [src/config/loggerSettings.js](src/config/loggerSettings.js).
2. `DEFAULT_LOGGING_ENABLED` = prende/apaga todo por defecto.
3. `DEFAULT_LOG_LEVEL` = nivel minimo por defecto.
4. `DEFAULT_LOG_TAGS` = tags activos/inactivos por defecto.
5. Para probar en caliente, usar Perfil > Logs (Dev).

## Recetas rapidas

- Ver solo errores:
  - Logs activos ON
  - Nivel ERROR
- Quitar ruido de red/home al abrir app:
  - Apagar tags home y catalog
- Quitar warnings de librerias (NativeEventEmitter):
  - Apagar tag console
- Mantener solo historial:
  - Apagar todos los tags menos history

## Importante release APK

- En release, los console.\* se remueven por Babel (transform-remove-console).
- El logger tambien queda en modo silencioso fuera de **DEV**.

## Donde tocar el codigo

- Default real: [src/config/loggerSettings.js](src/config/loggerSettings.js)
- Motor de logs: [src/utils/logger.js](src/utils/logger.js)
- Panel de prueba: [src/screens/Auth/ProfileScreen.js](src/screens/Auth/ProfileScreen.js)

## Nota de los logs Firebase sin tag

- Esos dos logs salen desde firebaseConfig.js con console.log directo.
- Se pueden migrar a logger para que tambien respeten tags y nivel.

Create a new API service class for this project following the existing pattern.

Arguments: $ARGUMENTS (service name, e.g. "Recommendations")

Create `src/services/$ARGUMENTSService.js` as a static class that:
- Imports `createLogger` from `../utils/logger` and creates `const logger = createLogger("serviceName")`
- Imports `API_CONFIG` from `../utils/apiConfig.js`
- Uses POST requests with `API_CONFIG.getHeaders()` for GraphQL queries
- Has a `parse*` static method separate from the fetch method
- Wraps errors with `logger.error(...)` before rethrowing
- Exports as `export default $ARGUMENTSService`

Match the pattern in `src/services/AnimeDetailsService.js` exactly.

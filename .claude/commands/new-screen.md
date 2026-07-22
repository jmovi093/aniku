Create a new screen for this Expo/React Native project following the existing conventions.

Arguments: $ARGUMENTS (screen name, e.g. "Favorites")

Steps:
1. Create `src/screens/$ARGUMENTS/` with this structure:
   - `$ARGUMENTSScreen.js` — main screen component
   - `components/index.js` — barrel export
   - `hooks/index.js` — barrel export
   - `styles/$ARGUMENTSStyles.js` — StyleSheet.create({...})

2. Add export to `src/screens/index.js`

3. Register the screen in the navigation config if the user describes where it should appear.

Conventions to follow:
- Plain JavaScript, no TypeScript
- Use `createLogger("screenName")` for any logging
- Import theme tokens from `src/styles/theme/`
- Comments in Spanish
- `export default` for the screen component

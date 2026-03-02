# Copilot instructions for SupplyApp

Purpose: Help AI coding agents become productive quickly in this Expo + Appwrite React Native repo.

- Quick start
  - Run the app (local dev): `npm run start` (uses Expo). For web: `npm run web`. For device/emulator: `npm run android` / `npm run ios`.
  - Key env vars (used by `lib/appwrite.js`): `EXPO_PUBLIC_APPWRITE_ENDPOINT`, `EXPO_PUBLIC_APPWRITE_PROJECT_ID`.

- High-level architecture
  - Mobile app built with Expo + `expo-router` (file-system routing). See the route tree under `app/` (route groups use parentheses, e.g. `(dashboard)`, `(auth)`). Layouts are defined with `_layout.jsx` files.
  - State is managed with React Contexts in `contexts/` and consumed via hooks in `hooks/` (e.g. `UserContext.jsx`, `WishlistContext.jsx`, `useWishlist`).
  - Shared UI lives in `components/` (Themed* components). Small pattern: prefer composing `ThemedView`/`ThemedText` for consistent styling.
  - Appwrite integration: `lib/appwrite.js` exports `client`, `account`, `avatars`, `database`. Use these for all server calls instead of constructing new clients.
  - Cloud functions live under `functions/` (example: `functions/match-donations` — Node runtime, entry `src/main.js`). See `functions/match-donations/README.md` for the starter function layout.
  - Appwrite configuration and DB/table metadata are in `appwrite.config.json` (project id, function config, table ids). Use it to understand allowed permissions and function settings.

- Project-specific conventions and patterns
  - Routing: file names map directly to routes. Pages export default React components. `_layout.jsx` files wrap nested routes.
  - Route grouping: folders named in parentheses (e.g. `(dashboard)`) indicate logical route groups used by `expo-router`.
  - Data access: prefer the exported `database` from `lib/appwrite.js` (avoid duplicating client setup). Example import: `import { database } from '../lib/appwrite';`.
  - Context + Hooks: read `contexts/*` to understand available state shape before adding new context. New data flows should usually be exposed via a hook in `hooks/`.
  - Themed UI: use existing `Themed*` components in `components/` to match look & feel.

- Dev & debugging tips
  - Use Expo dev tools (from `npm run start`) for device logs and hot reloads.
  - To run the cloud function locally for quick iteration, run `node src/main.js` inside `functions/match-donations` (it’s a simple Node entry — adapt to the function's handler signature when testing).
  - When changing Appwrite credentials, update environment variables used by Expo. Avoid hard-coding endpoints or project IDs in source files — `lib/appwrite.js` reads from `process.env`.

- Files to inspect for context when working on features
  - Routing + screens: [app](app)
  - Auth flows: [app/(auth)](app/(auth)) and `lib/appwrite.js` (client setup)
  - State providers: [contexts](contexts) and [hooks](hooks)
  - UI primitives: [components](components)
  - Serverless logic: [functions/match-donations](functions/match-donations) and `appwrite.config.json`

- When making changes
  - Preserve layout files `_layout.jsx` that provide common navigation and wrappers for pages.
  - If introducing a new Appwrite API usage, add or reuse a helper in `lib/appwrite.js` rather than re-instantiating a client.
  - For new routes, follow the existing folder + filename pattern so `expo-router` picks them up automatically.

If any of these conventions are unclear or you'd like me to add examples for a specific area (routing, contexts, Appwrite usage, or function deployment), tell me which area and I'll expand this file.

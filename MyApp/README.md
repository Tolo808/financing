# MyApp (Tolo Driver App)

Expo/React Native driver app for the Tolo financing platform. See the [top-level README](../README.md) for architecture, setup, and deployment instructions.

Quick reference:

```bash
npm install
npx expo start          # then press 'w' for web, or scan the QR code with Expo Go
```

The app talks to the `admin/` backend's driver API (`/api/auth/driver/login`, `/api/driver/*`). By default it auto-detects the API host from the Metro dev server's LAN address; override with `expo.extra.apiBaseUrl` in `app.json` for production builds.

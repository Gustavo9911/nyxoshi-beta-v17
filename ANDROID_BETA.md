# Nyxoshi — Android / APK beta

A web build is the canonical Nyxoshi application. The project already exposes an installable PWA manifest through the existing PWA plugin.

## Fastest beta APK path

1. Deploy the production web app on HTTPS.
2. Verify `/login`, account creation, feed, posts, comments, profiles, settings and messaging.
3. Use an Android PWA/TWA packaging tool such as Bubblewrap/PWABuilder to package the HTTPS PWA as an APK/AAB.
4. For a native Capacitor build, install Capacitor in this workspace and run `npx cap add android`, then `npx cap sync android` and build from Android Studio.

The repository intentionally does not commit generated `node_modules`, Gradle caches or platform-specific SDK files. Those are machine-specific build artifacts.

## Required production environment

Copy `.env.example` to the provider's environment and configure:

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `VITE_AUTH_ENABLED=true`
- `NYXOSHI_FOUNDER_1_EMAIL`
- `NYXOSHI_FOUNDER_2_EMAIL`
- `NYXOSHI_FOUNDER_3_EMAIL`

The three founder e-mails are the server-side allow-list. Founder #1 is the creator/developer account. Founder status must never be assigned by username or by client-side code.

## Local checks

```powershell
npm install
npm run typecheck
npm run build
```

The build runs the database migrations automatically when `DATABASE_URL` is configured.

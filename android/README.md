# LocalOffers — Android app (Trusted Web Activity)

This is **not** a rewrite of the app — it's a thin native wrapper (Google's
official [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
library) that launches your existing deployed website full-screen, with no
browser URL bar, an app icon, a splash screen, and a real Play Store
listing. All the actual UI/logic is the React app in `../frontend` — this
project has almost no code of its own.

**Why this approach instead of a rewrite:** shipping a content or bug-fix
update means deploying the website, not re-submitting to the Play Store.
The tradeoff: this app *is* the website, so it needs an internet connection
and doesn't get deep native integration (camera, contacts, etc.) — if you
outgrow that later, `../frontend`'s README has notes on Capacitor/React
Native as the next steps, which reuse your API layer either way.

## What you need (that I can't provide from here)

- **Android Studio** (free, from developer.android.com) — this project
  can't be built without it; there's no way to produce a working APK
  without the real Android SDK/build tools.
- **A deployed frontend URL** (`https://yourdomain.com`) — a TWA can't
  point at `localhost`. Deploy the frontend somewhere first (Vercel,
  Netlify, your own server — anything serving the Vite build output over
  HTTPS works).
- **A Google Play Developer account** ($25 one-time) if you intend to
  actually publish it, plus a keystore to sign the app (Android Studio
  generates one for you the first time you build a release).

## Before you open this in Android Studio

Everything below is a placeholder that must be changed — the app will not
correctly "trust" your site (it'll show a URL bar like a normal browser,
which defeats the point) until you do:

1. **Pick your package name** (e.g. `com.yourcompany.localoffers`) and
   replace `com.localoffers.app` in:
   - `app/build.gradle` (`namespace` and `applicationId`)
   - `app/src/main/res/xml/filepaths.xml` isn't affected, but the
     `${applicationId}.fileprovider` authority in `AndroidManifest.xml`
     updates automatically from `build.gradle`'s `applicationId`.
   This can **never be changed after your first Play Store upload**, so
   decide deliberately.

2. **Point it at your real deployed URL** — replace
   `YOUR-DOMAIN.example.com` in `app/src/main/res/values/strings.xml`
   (three places: `launch_url`, `host_name`, `asset_statements`).

3. **App name / icon** — `app_name` in `strings.xml`; icons are already
   generated in `app/src/main/res/mipmap-*` and `drawable/ic_launcher_foreground.png`
   matching the web app's marigold price-tag brand mark (see
   `frontend/public/icons/` — regenerate both sets together if you ever
   change the brand). Splash screen colors are in `res/values/colors.xml`.

## Digital Asset Links — the step that actually grants "trusted" status

This is the one genuinely fiddly part, and it's a two-way handshake:

1. **Build once, unsigned or debug-signed, to get a SHA256 fingerprint.**
   Open the project in Android Studio, let it sync, then run:
   ```
   keytool -list -v -keystore <your-keystore.jks> -alias <your-key-alias>
   ```
   (Android Studio creates a debug keystore automatically at
   `~/.android/debug.keystore`, password `android`, alias
   `androiddebugkey` — fine for testing, but you'll need a **real** release
   keystore before publishing; Build → Generate Signed Bundle/APK in
   Android Studio walks you through creating one.)
   Copy the `SHA256:` fingerprint it prints.

   **If you publish through Google Play App Signing** (the default, and
   recommended), Google re-signs your app with its own key — get the
   fingerprint to use from Play Console → your app → Setup → App integrity
   → App signing key certificate, not from your own upload keystore.

2. **Paste that fingerprint into `frontend/public/.well-known/assetlinks.json`**
   (replace `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT`), also fill
   in your real `package_name` there, then **redeploy the frontend** — this
   file must be served at exactly `https://yourdomain.com/.well-known/assetlinks.json`
   over HTTPS with no redirects. (It already survives `npm run build`
   correctly — verified — but double-check your host doesn't block
   dotfiles/`.well-known`; some strict server configs do by default even
   though `.well-known` is a standard, RFC 8615, path.)

3. **Verify it**: open
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yourdomain.com&relation=delegate_permission/common.handle_all_urls`
   in a browser — it should list your app's package name and fingerprint
   back to you. If it doesn't, the TWA falls back to showing a URL bar
   (Custom Tabs) instead of full trust — it still works, just doesn't look
   fully native.

## One thing to double-check before publishing

`app/build.gradle` targets API 34 (Android 14), current as of when this was
written — but Google raises the *minimum required* target SDK for new Play
Store submissions roughly once a year, and enforcement dates change. Check
[Play Console's current requirement](https://support.google.com/googleplay/android-developer/answer/11926878)
before your first upload and bump `compileSdk`/`targetSdkVersion` in
`app/build.gradle` if a newer one's required by then — Android Studio will
also flag this clearly at build time if the SDK is outdated.

## Building

```
File → Open → select this android/ folder in Android Studio
```
Let Gradle sync (it will fetch `androidbrowserhelper`, AppCompat, etc. from
Maven Central automatically — needs internet the first time). Then:
- **Run ▶** on an emulator/device for testing (points at whatever
  `launch_url` you set — use a real deployed URL, not localhost, since an
  emulator can't reach your dev machine's `localhost:5173` without extra
  networking setup).
- **Build → Generate Signed Bundle / APK** for a real release build to
  upload to Play Console (upload the `.aab`, Google's required format for
  new apps).

## What's NOT included here

- The Gradle wrapper `.jar` binary itself (`gradle/wrapper/gradle-wrapper.jar`)
  — it's a compiled binary I can't produce without downloading it, and this
  environment has no network access to Gradle's distribution servers.
  Android Studio detects the missing jar on first open and offers to fix it
  automatically ("Gradle wrapper is missing, download now?") — just accept.
- A real SMS gateway for OTP login (see backend README's "Auth" section) —
  the app will work end-to-end in testing via the backend's `DEBUG=True`
  dev-mode code display, but you'll want a real provider before real users
  rely on it.
- Push notifications — not wired up. The manifest already declares
  `ACCESS_NETWORK_STATE`; adding Firebase Cloud Messaging is the standard
  next step if you want them, and is independent of everything else here.

# TUBAL HUB Android

## Current Android version — v1.3.3

- Places **Home, Explore, Feeds, Community, and Profile** side by side in one bottom navigation bar.
- Uses compact, single-line labels so all five tabs fit better on mobile screens.
- Keeps the current **Peace of Mind** branding, saved appearance preference, tab scroll restoration, and native Share TUBAL HUB action.


TUBAL HUB for Android has its own **native mobile dashboard** built with Android Views. It is deliberately different from the desktop website: the Home, Explore, Community and Profile tabs are native app screens, with mobile-first cards and bottom navigation. Existing website pages are opened only when a destination is tapped.

**Web destinations:** https://tubalrr.github.io/tubalhub/

## Open in Android Studio

1. Pull the latest changes on the `main` branch in your existing clone.
2. In Android Studio, choose **File → Open**.
3. Select the `android-app` folder (not the repository root and not the inner `app` folder).
4. Use Gradle 8.13 and set the Gradle JDK to JDK 17. The project is pinned to Android Gradle Plugin 8.13.2 and Kotlin Android plugin 2.2.21.
5. Install Android SDK Platform 36 in SDK Manager if it is missing.
6. Let Gradle Sync complete, then select the `app` run configuration and a connected Android device or emulator.
7. Press **Run** to test the app.

## Native app features

- Animated branded loading screen with a TUBAL HUB monogram, orbit rings, pulsing glow and progress indicator.
- Native Home dashboard with a distinct mobile visual design.
- Bottom navigation for Home, Explore, Community and Profile.
- Search/filter within the Explore tab.
- Pin/unpin spaces from dashboard cards and Explore; favorites persist on the device.
- Recently opened destinations appear as quick-resume items on Home and Profile.
- Native cards and quick actions for LifeHub, Payapang Isip, CTRLZONE, Kapeng Barako, Community, Shop, News and Events.
- Destination pages open in a separate in-app screen with a native toolbar and loading/retry states.
- Android Back navigates page history before leaving a destination.
- External links are handed to Android for the appropriate app or browser.

The destinations still use the site's existing web implementations, so this is not yet a full native rewrite of every tool. Push notifications, file-upload edge cases, sign-in redirects, and destination-specific WebView behavior still require device testing.

## Build check

Every push changing `android-app/**` runs a clean debug APK build on GitHub Actions. When the build succeeds, the `tubal-hub-android-debug` APK artifact is available for seven days from the workflow run.


## Android update checker and releases

The splash screen includes **CHECK FOR UPDATES**. It checks the GitHub Releases API and compares the latest release tag (for example `v1.3.0`) with the installed app version. A published release should include an APK asset; the app opens the official GitHub download link after the user confirms. Android still controls APK installation.

### Publishing an installable update

1. Create and securely back up one Android release keystore. **Never commit the keystore or passwords to Git.**
2. In repository Settings → Secrets and variables → Actions, add:
   - `ANDROID_KEYSTORE_BASE64` — base64-encoded keystore file
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. Increment `versionCode` and `versionName` in `app/build.gradle.kts` before each release.
4. Push a tag such as `android-v1.3.0` to start the Android Release workflow, or run it manually with the tag input.
5. Confirm the workflow succeeds and the release contains `app-release.apk`.

**Important:** Android only installs an update over an existing installation when the application ID and signing certificate match. If the app currently installed on your phone was signed with a different debug key, it may require one uninstall/reinstall to move to the stable release key. Back up any local app data first. The update checker cannot publish a release by itself; a release must exist before it can report an update.

# TUBAL HUB Android

This folder contains the Android app shell for TUBAL HUB. It loads the existing live website inside an Android WebView so the website remains the single source of content.

**Website:** https://tubalrr.github.io/tubalhub/

## Open in Android Studio

1. Pull the latest changes on the `main` branch in your existing clone.
2. In Android Studio, choose **File → Open**.
3. Select the `android-app` folder (not the repository root).
4. Use Gradle 8.13 and set the Gradle JDK to JDK 17. This project is pinned to Android Gradle Plugin 8.13.2 plus Kotlin Android plugin 2.2.21.
5. Let Gradle Sync complete, then select the `app` run configuration and a connected Android device or emulator.
6. Press **Run** to test the app.

Android SDK Platform 36 is required by this project configuration.

## Current scope

- Opens the live TUBAL HUB site inside the app.
- Enables JavaScript and DOM storage needed by modern site pages.
- Shows a slim loading indicator.
- Provides a retry screen when the main page cannot be reached.
- Uses normal web navigation and Android back navigation.
- Opens non-web links such as `mailto:` and `tel:` through Android.

This is a WebView-based app shell, not a full offline/native rewrite. Features that require Android-specific integration (for example, push notifications, file uploads, and some external sign-in flows) need separate testing and implementation.

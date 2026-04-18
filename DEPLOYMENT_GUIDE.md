# Deployment Guide

## Android app

1. Open the repo in Android Studio.
2. Install Android SDK 34 and Gradle dependencies.
3. Adjust `BACKEND_BASE_URL` in `app/build.gradle.kts` if needed.
4. Build debug APK, then create a signed release.

## Railway backend

1. Deploy `backend/`.
2. Set the values from `backend/.env.example`.
3. Add your Mongo cluster URI and JWT secret.
4. Point `api.tacuns.net` to the Railway service.
5. Keep every real secret only in Railway environment variables.

## Website

1. Host `site/` on Vercel or your own `tacuns.net` hosting.
2. Publish `/privacy` and `/support`.
3. Use those URLs in the app and Google Play.

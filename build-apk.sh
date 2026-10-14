#!/usr/bin/env bash
# ========================================================
# PulseMeet Local Android APK Build Script
# ========================================================

set -e

echo "🚀 [1/3] Building PulseMeet Frontend..."
cd frontend
npm run build

echo "📱 [2/3] Syncing Capacitor Android assets..."
npx cap sync android

echo "🔨 [3/3] Compiling Android APK with Gradle..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug

echo "🎉 Build Complete!"
echo "APK location: frontend/android/app/build/outputs/apk/debug/app-debug.apk"

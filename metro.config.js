// Expo 57 otherwise boots the standalone DevTools shell for a --version check
// on every Metro start. That Electron process aborts on this Mac, even when no
// debugger was requested. Headless keeps the inspector/browser fallback and
// Fast Refresh available without spawning the desktop shell.
process.env.EXPO_UNSTABLE_HEADLESS ??= "1";

const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;

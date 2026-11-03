# Local development and automated QA

- Start Expo with `EXPO_UNSTABLE_HEADLESS=1 yarn expo start` (plus the required port/platform arguments). The Metro config also defaults this setting so direct starts do not prepare the crashing standalone React Native DevTools app.
- Do not start or reopen the standalone DevTools app for routine feature work. Its automatic `--version` probe aborts on this Mac and creates repeated macOS crash dialogs. Use Metro logs, native logs, and the inspector endpoints; open a browser debugger only when interactive debugging is actually needed.
- Do not use `CI=1` just to suppress DevTools: CI can disable file watching. Keep Fast Refresh available for feature work. Do not disable macOS crash reporting, remove debugger binaries, or patch `node_modules` to hide the failure.
- Reuse an appropriate running Metro server before starting another one. Stop only servers created for the current task, and do not retry a crashing GUI tool in a loop.
- `EXPO_UNSTABLE_HEADLESS=0 yarn start` is an explicit desktop-debugger opt-in for manual compatibility checks, not an automated QA default. Recheck this workaround when upgrading Expo because the headless flag is internal.

## iOS framework cache

- `patches/expo-modules-jsi+57.1.2.patch` includes the Xcode build and SDK inventory in the ExpoModulesJSI cache key. Xcode versions can share a Swift compiler while shipping incompatible SDKs; otherwise a stale binary module falls back to a C++ Swift interface that fails with `cannot find type '__ObjC::expo'`. See https://github.com/expo/expo/issues/50365.
- Keep this patch applied through the existing Yarn `postinstall`. Recheck the upstream cache key when upgrading `expo-modules-jsi`, and remove the patch once the installed version handles Xcode/SDK changes itself.

## Shared modal presentation

- Use `components/ui/AppModal.tsx` for local modals and `MODAL_ROUTE_ANIMATION` for modal routes. Open from the bottom, like the Premium paywall; do not add a fade or a second local `translateY` animation. Keep reduced-motion behavior.
- Use the shared `onDismiss` handoff before opening a second modal or navigating from one, including Android. Keep keyboard handling and safe areas appropriate to the content.

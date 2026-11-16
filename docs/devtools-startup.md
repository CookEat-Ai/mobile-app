# React Native DevTools startup on macOS

CookEat defaults `EXPO_UNSTABLE_HEADLESS` to `1` in `metro.config.js`. This is a development-server setting, not a change to the shipped app. An explicitly supplied value takes precedence.

On the installed Expo 57 / React Native 0.86 toolchain, creating the debugger middleware immediately prepares the standalone debugger shell. Preparation executes the native app with `--version`. The macOS reports from 20 October 2026 show that process aborting during application registration (`SIGABRT`, `_RegisterApplication`, before connecting to CookEat). Repeated Metro starts therefore produce repeated crash dialogs even without opening the debugger.

Expo's headless mode disables that shell preparation and leaves the CDP inspector and browser debugger fallback available. It does not set `CI` or disable Metro's file watcher. Check the installed implementation again on an Expo upgrade; this flag is internal and its behavior may change.

For automated work:

```sh
EXPO_UNSTABLE_HEADLESS=1 yarn expo start --localhost --port 8081
```

Use a free port or reuse the existing server rather than replacing another session. To deliberately test the desktop shell manually, use `EXPO_UNSTABLE_HEADLESS=0 yarn start`; this can reproduce the crash on the affected Mac.

Sources: [Expo debugger middleware](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/metro/debugging/createDebugMiddleware.ts), installed `@react-native/debugger-shell/dist/node/index.js` and `@react-native/dev-middleware/dist/middleware/openDebuggerMiddleware.js`.

Validation on 20 October 2026: two successive actual Expo starts on temporary port 8129 reached `packager-status:running`; `/json/list` remained available. The DevTools crash-report count stayed at 18 with no new report. A separate check using the actual middleware and a mocked shell launcher confirmed zero preparation calls by default and preserved the explicit `0` override without launching the native app. Both temporary servers were stopped. The desktop binary's macOS incompatibility itself has not been repaired; this change prevents its unsolicited startup.

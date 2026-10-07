# Production API — 7 October 2026

Store and TestFlight distribution use the EAS `production` profile and https://cookeat.info/api. The former `testflight` build/submit profiles are removed. Production configuration rejects a different API URL. Tests run against the local API.

Already installed iOS 1.7.0 (17) and the 1.7.1 (19) candidate embed /testflight/api. That historical URL is retained as an Apache alias to the sole production API, including WebSocket connections; no separate TestFlight container is required. A future binary uses /api directly.

The 1.7.0 Store onboarding expects every requested day. API 1.9.4 generates a complete initial week on any weekday and repairs incomplete saved previews in their original week, preserving original choices and complete days. It never grants a second free week.

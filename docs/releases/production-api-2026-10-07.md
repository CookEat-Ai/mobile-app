# Production API — 7 October 2026

Store and TestFlight distribution use the EAS `production` profile and https://cookeat.info/api. The former `testflight` build/submit profiles are removed. Production configuration rejects a different API URL. Tests run against the local API.

Already installed iOS 1.7.0 (17) and the 1.7.1 (19) candidate embed /testflight/api. That historical URL is retained as an Apache alias to the sole production API, including WebSocket connections; no separate TestFlight container is required. A future binary uses /api directly.

The 1.7.0 Store onboarding expects every requested day. API 1.9.4 generates a complete initial week on any weekday and repairs incomplete saved previews in their original week, preserving original choices and complete days. It never grants a second free week.

## Verified deployment

- Sole API container: `cookeat-api-prod:1.9.4`, source `e60651069714c3216f81d909f7c1e5c8e1ca79b6`.
- Mobile configuration commit: `a8cb77e7ffd8b1efbdf16be6712183ad30c36e7f`. Future builds use the production profile and /api. No new binary or OTA was published in this task.
- Apple live Store version verified as 1.7.0 (17). Its embedded historical address now resolves to the production service.
- TestFlight container stopped and removed; port 8084 closed. MongoDB, Redis and uploads volume retained.
- Full API test suite, TypeScript builds, endpoint regression and local HTTP reproduction/repair passed. Live HTTPS session, 20-meal creation/restore, published build 17 validation and onboarding shopping list passed; QA fixture removed.
- Minimum client raised to 1.7.0 because older clients lack authenticated sessions. Existing compatible accounts and histories are retained.
- Recovery files and rollback images retained under `/root/cookeat-release-backups/2026-10-07-production`; API source checkout is `/root/api` on `release/production-1.9.4`.

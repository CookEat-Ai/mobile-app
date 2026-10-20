# CookEat 1.8.0 — source corrections, October 20, 2026

API 1.10.2, commit `abad58d37301d7fa0da8c92aca86eca49f073252`, deployed to cookeat.info with public health HTTP 200. Docker image `cookeat-api-prod:1.10.2`; previous image `cookeat-api-prod:1.10.1` retained for rollback. No migration required for the additive regeneration history field.

Mobile source commit `c258f65f48e59feee2cfdd8ae0f51c1eaee89898` is pushed. The existing uploaded Android 12 / iOS 25 binaries predate the latest source corrections. No new mobile build, OTA update, Store review submission or publication was triggered.

## Validation

- Complete API `yarn test`: passed, including 72 synthetic weeks / 504 days and controller checks.
- Actual published catalogue (1,625 recipes), local MongoDB: 26 configurations, 120 generations, 2,400 meals, passed.
- HTTP + local MongoDB: 14 generated plans / 280 meals, 8 idempotent restorations, same-week regeneration history and strict-pantry recovery, passed.
- Reported configuration: 1 person, 5 days, 45 EUR, beginner, oven and microwave, max 60 minutes, African/Italian/Middle Eastern/Thai, halal, pork and milk excluded. Four calorie targets across eight successive weeks each; no overlap with the immediately preceding week in those cases. This guarantee is not generalized to every narrow catalogue.
- Strict pantry with the screenshot inventory has insufficient compatible recipes; priority pantry succeeds. The mobile recovery CTA explicitly asks to allow supplementary groceries and retains budget, exclusions, equipment, days and household size. User pantry-mode confirmation remains outstanding.
- Mobile: 17 suites passed; TypeScript passed; lint has 0 errors and 61 existing warnings.
- iPhone, iPad and Android emulator screenshots visually inspected. Store billing purchase/restore on physical devices remains unverified.

## Store drafts and annual price experiment

Four-slide story: meal analysis with accumulated calories and an ingredient circled; weekly recipe planning; budget grocery list; goal. French titles: “Analyse tes repas” and “Planifie ta semaine de repas”. 108 PNGs cover 3 devices and 9 locales/regions. App Store Connect: 18 sets / 72 files, COMPLETE, ordered filenames and source checksums read back. Google Play: all 9 locale drafts saved and read back with 4 ordered phone screenshots; exact file names are recorded in google-story-v3-readback.json.

Annual experiment compares 49.99 EUR/USD and 39.99 EUR/USD using the existing custom paywall. RevenueCat experiment remains DRAFT. Apple products are prepared; Google base-plan configuration is still blocked by the Console save error. No hosted RevenueCat paywall or default offering was substituted.

Production fixture creation, review submission, publication, and experiment activation were not performed.

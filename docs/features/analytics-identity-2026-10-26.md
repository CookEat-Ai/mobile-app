# Analytics identity correction — 26 October 2026

The first launch previously called PostHog `identify` with the installation UUID and later with the backend user ID. These are two identified profiles, so PostHog cannot automatically merge the acquisition events into the backend profile. A delayed AppsFlyer initialization could also reapply the earlier UUID.

## Identity contract

- The installation UUID remains the API/device-storage key. It is not identified as a PostHog person.
- Before a backend user exists, PostHog uses its own persisted anonymous distinct ID. AppsFlyer uses this ID as its provisional customer user ID. RevenueCat keeps a real anonymous customer and receives the actual PostHog distinct ID in `$posthogUserId`.
- Once the backend ID is known, PostHog identifies it, preserving the anonymous history. AppsFlyer CUID and RevenueCat app user ID use that backend ID; `$appsflyerId` remains the vendor's install UID.
- `AnalyticsService` owns RevenueCat login/logout and serializes identity mutations. Version checks discard work for an earlier identity after asynchronous calls.
- AppsFlyer waits for native CUID callbacks before SDK start and queued event delivery. Initialization can retry after failure. Conversion/deep-link listeners remain registered before SDK initialization.
- First-touch acquisition dimensions are preserved. RevenueCat remains the only source of subscription revenue events sent to AppsFlyer. ATT refresh updates permitted identifiers without identifying an anonymous person.
- PostHog waits for storage readiness. Startup is single-flight, and `first_open` precedes queued onboarding events.
- Deletion/reset creates a new anonymous PostHog identity, restores environment/language context, updates AppsFlyer CUID, and logs RevenueCat out without identifying the rotated installation UUID.
- A canonical ID arriving while RevenueCat is configuring is read again before initialization completes.

For a legacy local PostHog identity equal to the installation UUID, with no stored backend ID, reset to an anonymous SDK identity. This does not merge existing server-side profiles or rewrite historical analytics. No dangerous merge or external vendor configuration mutation is performed.

## Screen measurement

Existing event names remain intact. Add `onboarding_screen_viewed` with `screen_id` on onboarding route transitions, and `fitness_onboarding_step_viewed` with `step_id` and `step_index` for the questionnaire. Questionnaire persistence also forwards any recovered backend ID to analytics.

Older builds measured questionnaire answers/completions, not all screen views. The 23–26 October report therefore labels these as validations; conditional steps and differences between app versions are not interpreted as drop-offs. The weekly planning screen's entry view is unavailable for that historical window; generation start/completion remain separate actions.

## Verification and release boundary

- `yarn test:analytics-identity`: anonymous-to-known linkage, concurrent initialization, first-event order, returning/legacy users, identity before storage readiness, delayed AppsFlyer callbacks, account changes/deletion, ATT denied, RevenueCat configure race, reserved attributes, first-touch preservation, deep links, no duplicate subscription revenue, AppsFlyer retries.
- `yarn test:onboarding-planning`: existing planning flow regression.
- TypeScript and targeted ESLint; existing import warnings in root layout and questionnaire remain.
- Production Metro exports for iOS and Android, with `EXPO_UNSTABLE_HEADLESS=1`.

Native SDK calls are mocked in regression tests. A fresh-install and returning-user smoke test on release-like iOS/Android builds, ATT allowed/denied, vendor dashboard identity inspection, and a RevenueCat sandbox purchase/restore still need device verification. No EAS update, store submission, or production diagnostic event is included in this change. Existing deployed versions retain their previous behavior until delivery.

References: [PostHog identification](https://posthog.com/docs/product-analytics/identify), [AppsFlyer CUID timing](https://dev.appsflyer.com/hc/docs/rn_api#setcustomeruserid), [RevenueCat PostHog](https://www.revenuecat.com/docs/integrations/third-party-integrations/posthog), [RevenueCat AppsFlyer](https://www.revenuecat.com/docs/integrations/attribution/appsflyer).

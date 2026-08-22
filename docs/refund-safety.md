# Refund Safety Gate - CookEat AI

## Ownership and data flow

- Store reports: final transaction and refund reconciliation.
- RevenueCat project `CookEat AI`: subscription lifecycle, refunded revenue, refund-rate monitoring, and Apple refund requests.
- AppsFlyer: first-touch campaign, ad group, ad, and creative attribution.
- PostHog: product, paywall, and acquisition-cohort diagnosis.

The app must not emit client revenue or refund events when RevenueCat already sends the authoritative server events.

## Product safeguards

- Show trial wording only after Store eligibility is confirmed for the current user.
- Derive price, period, savings, and trial duration from the Store product.
- State automatic renewal and cancellation on primary and exit paywalls.
- Keep restore, legal, support, and Store subscription-management paths accessible.
- Schedule a reminder only after RevenueCat confirms an active trial.

## Operational thresholds

Measure refunds on mature purchase cohorts and segment by product, country, OS, app version, paywall source/variant, media source, campaign, ad group, ad, and creative.

Current operating mode: **observation only**. Send alert emails to
`hadjadjirayane@outlook.fr`. Never pause a TikTok campaign, ad group, ad, or
creative; never change a bid or budget. Threshold crossings are recommendations
for manual review only.

RevenueCat lifecycle events are ingested by the CookEat API. Refund alerts come
from `CANCELLATION` events with `cancel_reason=CUSTOMER_SUPPORT`;
`REFUND_REVERSED` and RevenueCat test events are also emailed.

| Refund rate | Action |
|---|---|
| < 4% | Normal monitoring |
| 4% to 5% | Inspect segments and product experience |
| > 5% | Email alert; recommend stopping budget increases |
| > 8% | Urgent email; recommend reviewing the affected paid segment |
| > 10% | Critical email; recommend incident review |

## Dashboard checklist

- [ ] Apple App Store Server Notifications V2 points to RevenueCat production and sandbox endpoints.
- [ ] RevenueCat Refund Rate, Refunds, Trial Cancellation Rate, and App Store Refund Requests charts are reviewed weekly.
- [ ] RevenueCat server events reach PostHog once and retain AppsFlyer attribution dimensions.
- [ ] PostHog refund dashboard segments product, country, app version, paywall source, campaign, ad group, ad, and creative.
- [ ] Email `hadjadjirayane@outlook.fr` at 5%, 8%, and 10%, with deduplication and recovery notices.
- [ ] Verify that monitoring has no TikTok Ads write credential and cannot mutate campaigns or budgets.
- [ ] Store and RevenueCat totals are reconciled before acting on an anomaly.

## Incident procedure

Confirm data maturity, isolate the smallest harmful segment, preserve campaign history, compare the ad promise with onboarding/paywall/value delivery, pause scaling, correct the cause, and require a new mature cohort before resuming.

# CookEat — healthy & fitness product contract

## Promise

CookEat generates a meal plan within a Monday-to-Sunday week for one person, aligned with a realistic nutrition goal, then turns that plan into an interactive shopping list.

## Primary loop

1. The user chooses a goal: lose weight, build muscle, gain weight, maintain weight, or eat a balanced diet.
2. Age, biological sex (optional), height, weight, activity, and training frequency produce estimated calorie and macro targets.
3. For weight-change goals, the user enters kilograms; CookEat estimates a gradual duration. Unsupported targets are rejected. Once saved, the absolute target is preserved as weight is logged.
4. Preferences only cover diet, cooking time, preferred cuisines, optional snack, and ingredients to avoid. The user does not enter available ingredients.
5. The user selects cooking days. The onboarding preview includes breakfast, lunch, dinner and an optional snack; the main planner supports choosing meal slots per day, defaulting to weekday dinners.
6. The plan provides nutrition estimates; the onboarding preview includes its aggregated shopping list before payment, with checking, copying, and sharing. Other weeks require premium access to generate or update their shopping lists. Items can be checked or marked as already owned while shopping.
7. Published catalogue recipes include reviewed photos and steps, available as soon as the plan is created.

## Generation and duplicate contract

- Recipes are selected from the published catalogue with approved images and nutrition data.
- The same week is restored unless the user explicitly regenerates it with premium access.
- Selection respects diet, exclusions, cuisine, equipment and duration. Recent recipes and repeated families are penalized; identical catalogue identities cannot repeat within a generated week.
- Replacement strictly excludes the current recipe and its catalogue identity.
- Insufficient coverage returns a recoverable error. The user can change cooking days or preferences; allergy constraints are never silently relaxed.
- Imported recipes keep their source serving count when computing shopping quantities.

## Nutrition and safety

- BMI uses height and weight. Calorie estimates additionally use age, biological sex, and activity.
- Weight curves and macro targets are planning estimates, never guarantees or medical advice.
- Weight-loss pace is capped at the safer of 1 kg/week and 1% of body weight/week.
- Weight-gain pace is capped between 0.25 and 0.5 kg/week according to body weight.
- A weight-loss target leading below BMI 18.5 is rejected.

## Commercial contract

- No sign-up is required. A device session is created automatically and stored securely. Server checks bind private data to that session.\n- One completed preview week is available before payment; premium operations require server-verified RevenueCat entitlement or a server-validated full-access code.\n- Trial duration and eligibility come from the Store through RevenueCat; no free claim is shown when eligibility is unknown or negative.
- Reminder intent is collected before purchase; scheduling requires confirmed trial dates and notification permission.
- Social proof stays in the journey, using the existing CookEat testimonial corpus and copy adapted to weekly planning.
- Paywall value leads with complete weekly planning, personalized calories/macros, and the interactive shopping list. Import and single-recipe generation remain secondary features.

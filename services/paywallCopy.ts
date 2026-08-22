import type { PurchasesOffering } from 'react-native-purchases';
import type { TFunction } from 'i18next';
import type { EntryFeature } from './analytics';
import type { OnboardingProfile } from './onboardingProfile';

/**
 * Contenu affiché par le paywall. L'UI vit dans le code, mais le contenu reste
 * pilotable à distance via le champ `metadata` de l'offering RevenueCat : on
 * peut donc réécrire un titre ou un bénéfice depuis le dashboard, sans build ni
 * passage en review. Les traductions embarquées servent de filet quand le
 * metadata est absent, incomplet ou mal rempli.
 */
export type PaywallCopy = {
  variant: 'generate' | 'import';
  headline: string;
  subheadline: string;
  cta: string;
  testimonialKey: string;
  personalizationSegment: string;
};

/**
 * Le metadata accepte soit une chaîne, soit un objet localisé :
 *   "headline": "Ne perds plus jamais une recette"
 *   "headline": { "fr": "…", "en": "…" }
 */
type LocalizedValue = unknown;

function pickLocalized(value: LocalizedValue, language: string): string | null {
  if (typeof value === 'string') return value.trim() || null;

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const dict = value as Record<string, unknown>;
    const short = language.split('-')[0];
    const candidate = dict[language] ?? dict[short] ?? dict.en;
    return typeof candidate === 'string' ? candidate.trim() || null : null;
  }

  return null;
}

/**
 * Variante de contenu embarquée, choisie sur le motif d'installation déclaré :
 * on mène avec la feature pour laquelle l'utilisateur a installé l'app, et on
 * présente l'autre en bonus plutôt que de la masquer.
 */
function fallbackCopy(
  t: TFunction,
  entryFeature: EntryFeature | null,
  profile: OnboardingProfile | null,
): PaywallCopy {
  const variant = entryFeature === 'import' ? 'import' : 'generate';
  const goal = profile?.hasGoalAnswer ? profile.goal : null;
  const focusKey = variant === 'generate'
    ? profile?.cookingTime === 'less_than_30_minutes'
      ? 'quick'
      : profile?.cookingLevel === 'beginner'
        ? 'beginner'
        : null
    : null;
  const baseSubheadline = goal
    ? t(`paywall.personalization.goals.${goal}.subheadline`)
    : t(`paywall.variants.${variant}.subheadline`);
  const focus = focusKey
    ? t(`paywall.personalization.focus.${focusKey}`, { defaultValue: '' })
    : '';

  return {
    variant,
    headline: goal
      ? t(`paywall.personalization.goals.${goal}.headline`)
      : t(`paywall.variants.${variant}.headline`),
    subheadline: [baseSubheadline, focus].filter(Boolean).join(' '),
    cta: t(`paywall.variants.${variant}.cta`),
    testimonialKey: goal
      ? `onboarding.proof.goal.${goal}.review`
      : variant === 'import'
        ? 'onboarding.proof.import.review'
        : 'onboarding.proof.goal.ideas.review',
    personalizationSegment: goal ? `goal_${goal}` : `entry_${variant}`,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function resolvePaywallCopy(options: {
  offering: PurchasesOffering | null;
  entryFeature: EntryFeature | null;
  profile: OnboardingProfile | null;
  language: string;
  t: TFunction;
}): PaywallCopy {
  const { offering, entryFeature, profile, language, t } = options;
  const fallback = fallbackCopy(t, entryFeature, profile);

  const metadata = offering?.metadata as Record<string, unknown> | undefined;
  if (!metadata) return fallback;

  // Un texte distant générique ne doit pas effacer la personnalisation locale.
  // RevenueCat peut néanmoins piloter une variante précise via
  // `metadata.personalization.<goal>` ou `metadata.variants.<entryFeature>`.
  const personalizedMetadata = profile?.hasGoalAnswer
    ? asRecord(asRecord(metadata.personalization)?.[profile.goal])
    : null;
  const entryMetadata = asRecord(asRecord(metadata.variants)?.[fallback.variant]);
  const contextualMetadata = personalizedMetadata ?? entryMetadata;
  const headlineSource = contextualMetadata?.headline
    ?? (profile?.hasGoalAnswer ? undefined : metadata.headline);
  const subheadlineSource = contextualMetadata?.subheadline
    ?? (profile?.hasGoalAnswer ? undefined : metadata.subheadline);

  // Chaque champ retombe indépendamment sur la traduction embarquée : un
  // metadata partiel ne doit pas produire un paywall à moitié vide.
  return {
    variant: fallback.variant,
    headline: pickLocalized(headlineSource, language) ?? fallback.headline,
    subheadline: pickLocalized(subheadlineSource, language) ?? fallback.subheadline,
    cta: pickLocalized(contextualMetadata?.cta ?? metadata.cta, language) ?? fallback.cta,
    testimonialKey: fallback.testimonialKey,
    personalizationSegment: fallback.personalizationSegment,
  };
}

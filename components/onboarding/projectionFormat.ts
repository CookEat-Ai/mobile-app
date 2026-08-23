import type { ProjectionUnit } from '../../services/onboardingProfile';
import { getLanguageLocale } from '../../i18n';

/**
 * Date cible de la projection, en toutes lettres et sans l'année : « 1 septembre »
 * plutôt que « 01/09/2026 ». Un engagement se prend sur une date qu'on se
 * représente, pas sur un format ISO.
 */
export function formatTargetDate(date: Date, language: string): string {
  const locale = getLanguageLocale(language);
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
  } catch {
    // Certains moteurs Hermes anciens n'embarquent pas Intl complet.
    return date.toLocaleDateString();
  }
}

/** Séparateur de milliers selon la locale (10 000 vs 10,000). */
export function formatNumber(value: number, language: string): string {
  const locale = getLanguageLocale(language);
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
}

/** Clé i18n de l'unité, pour afficher « 38 € » ou « 16 recettes ». */
export const UNIT_KEY: Record<ProjectionUnit, string> = {
  eur: 'onboarding.projection.units.eur',
  kg: 'onboarding.projection.units.kg',
  recipes: 'onboarding.projection.units.recipes',
  hours: 'onboarding.projection.units.hours',
  meals: 'onboarding.projection.units.meals',
};

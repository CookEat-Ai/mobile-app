import { Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PACKAGE_TYPE,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import revenueCatService from '../config/revenuecat';
import type { EntryFeature } from './analytics';

export type TrialEligibilityStatus = 'eligible' | 'ineligible' | 'unknown';

export type TrialEligibility = {
  status: TrialEligibilityStatus;
  days: number | null;
};

export type ResolvedTrialOffer = TrialEligibility & {
  offering: PurchasesOffering | null;
  package: PurchasesPackage | null;
};

const UNKNOWN_TRIAL: TrialEligibility = { status: 'unknown', days: null };

/**
 * En sandbox iOS, un compte neuf peut ne pas encore avoir de reçu local.
 * RevenueCat renvoie alors `unknown` même si StoreKit expose bien l'essai sur
 * le produit. Cela rendait les builds de développement impossibles à valider :
 * le CTA passait à tort sur la variante payante.
 *
 * Le repli est volontairement limité à `__DEV__` et uniquement aux produits
 * dont le Store expose une phase réellement gratuite. Une inéligibilité
 * explicite reste toujours prioritaire, et la production ne promet jamais un
 * essai quand RevenueCat ne peut pas confirmer l'éligibilité.
 */
function developmentSandboxFallback(pack: PurchasesPackage): TrialEligibility {
  const days = configuredTrialDays(pack);
  return __DEV__ && days
    ? { status: 'eligible', days }
    : UNKNOWN_TRIAL;
}

function periodToDays(unit: string | undefined, value: number | null | undefined): number | null {
  const units = Number(value ?? 0);
  if (!Number.isFinite(units) || units <= 0) return null;

  switch (unit) {
    case 'DAY':
      return units;
    case 'WEEK':
      return units * 7;
    case 'MONTH':
      return units * 30;
    case 'YEAR':
      return units * 365;
    default:
      return null;
  }
}

/**
 * Durée gratuite réellement exposée par le Store pour ce package.
 *
 * Sur iOS, StoreKit l'expose via `introPrice`. Sur Android, l'API
 * d'éligibilité iOS renvoie toujours `unknown` : la source fiable est donc la
 * `freePhase` de l'option Google Play que Billing a rendue disponible à cet
 * utilisateur.
 */
export function configuredTrialDays(pack: PurchasesPackage): number | null {
  if (Platform.OS === 'android') {
    const freePhase = pack.product.defaultOption?.freePhase;
    if (!freePhase || freePhase.price.amountMicros !== 0) return null;
    return periodToDays(freePhase.billingPeriod.unit, freePhase.billingPeriod.value);
  }

  const intro = pack.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  return periodToDays(intro.periodUnit, intro.periodNumberOfUnits);
}

export async function resolveTrialEligibilityForPackages(
  packages: PurchasesPackage[],
): Promise<Record<string, TrialEligibility>> {
  const resolved: Record<string, TrialEligibility> = {};

  if (Platform.OS === 'android') {
    for (const pack of packages) {
      const days = configuredTrialDays(pack);
      resolved[pack.identifier] = days
        ? { status: 'eligible', days }
        : { status: 'ineligible', days: null };
    }
    return resolved;
  }

  if (Platform.OS !== 'ios') {
    for (const pack of packages) resolved[pack.identifier] = UNKNOWN_TRIAL;
    return resolved;
  }

  const candidates = packages.filter((pack) => configuredTrialDays(pack) !== null);
  for (const pack of packages) {
    resolved[pack.identifier] = configuredTrialDays(pack)
      ? UNKNOWN_TRIAL
      : { status: 'ineligible', days: null };
  }
  if (candidates.length === 0) return resolved;

  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(
      candidates.map((pack) => pack.product.identifier),
    );

    for (const pack of candidates) {
      const status = eligibility[pack.product.identifier]?.status;
      if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
        resolved[pack.identifier] = {
          status: 'eligible',
          days: configuredTrialDays(pack),
        };
      } else if (
        status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ||
        status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS
      ) {
        resolved[pack.identifier] = { status: 'ineligible', days: null };
      } else {
        resolved[pack.identifier] = developmentSandboxFallback(pack);
      }
    }
  } catch {
    // Une éligibilité inconnue ne doit jamais devenir une promesse d'essai.
    // Exception strictement locale : en sandbox de développement, StoreKit
    // peut exposer l'essai tout en n'ayant pas encore généré de reçu.
    for (const pack of candidates) {
      resolved[pack.identifier] = developmentSandboxFallback(pack);
    }
  }

  return resolved;
}

export async function resolveTrialEligibilityForPackage(
  pack: PurchasesPackage,
): Promise<TrialEligibility> {
  const result = await resolveTrialEligibilityForPackages([pack]);
  return result[pack.identifier] ?? UNKNOWN_TRIAL;
}

function annualPackage(
  offering: PurchasesOffering | null | undefined,
  productId?: string,
): PurchasesPackage | null {
  const packages = offering?.availablePackages ?? [];
  return (
    (productId ? packages.find((pack) => pack.product.identifier === productId) : undefined) ??
    packages.find((pack) => pack.packageType === PACKAGE_TYPE.ANNUAL) ??
    null
  );
}

async function resolveOfferingTrial(
  offering: PurchasesOffering | null | undefined,
  productId?: string,
): Promise<ResolvedTrialOffer> {
  const pack = annualPackage(offering, productId);
  if (!offering || !pack) {
    return { ...UNKNOWN_TRIAL, offering: offering ?? null, package: null };
  }

  const eligibility = await resolveTrialEligibilityForPackage(pack);
  return { ...eligibility, offering, package: pack };
}

export async function resolveQuickActionTrial(
  offeringId: string,
  productId: string,
): Promise<ResolvedTrialOffer> {
  try {
    await revenueCatService.initialize();
    const offerings = await Purchases.getOfferings();
    return resolveOfferingTrial(offerings.all[offeringId], productId);
  } catch {
    return { ...UNKNOWN_TRIAL, offering: null, package: null };
  }
}

export async function resolveOnboardingAnnualTrial(
  entryFeature: EntryFeature | null,
): Promise<ResolvedTrialOffer> {
  try {
    await revenueCatService.initialize();
    const offerings = await Purchases.getOfferings();
    const branchSuffix = entryFeature === 'import' ? '_import' : '_generate';
    const targetPlacement = `onboarding_paywall${branchSuffix}`;
    const basePlacement = 'onboarding_paywall';
    const purchasesWithPlacement = Purchases as unknown as {
      getCurrentOfferingForPlacement?: (placementIdentifier: string) => Promise<PurchasesOffering | null>;
    };

    let offering = offerings.current;
    if (typeof purchasesWithPlacement.getCurrentOfferingForPlacement === 'function') {
      offering =
        (await purchasesWithPlacement.getCurrentOfferingForPlacement(targetPlacement)) ||
        (await purchasesWithPlacement.getCurrentOfferingForPlacement(basePlacement)) ||
        offerings.current;
    }

    return resolveOfferingTrial(offering);
  } catch {
    return { ...UNKNOWN_TRIAL, offering: null, package: null };
  }
}

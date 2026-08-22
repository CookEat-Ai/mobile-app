import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  PACKAGE_TYPE,
  type PurchasesPackage,
  type PurchasesOffering,
} from 'react-native-purchases';
import { Colors } from '../constants/Colors';
import {
  font,
  getPaywallCloseTopInset,
  ONBOARDING_CTA_BOTTOM_GAP,
} from '../constants/Layout';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { getPrivacyPolicyUrl, getTermsUrl } from '../config/legal';
import type { PaywallCopy } from '../services/paywallCopy';
import {
  configuredTrialDays,
  resolveTrialEligibilityForPackages,
  type TrialEligibility,
} from '../services/trialEligibility';
import {
  TrialConversionFooter,
  TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT,
} from './onboarding/TrialConversionFooter';
import { PaywallTestimonial } from './PaywallTestimonial';

type Props = {
  offering: PurchasesOffering;
  copy: PaywallCopy;
  onPurchase: (pack: PurchasesPackage) => void;
  onRestore: () => void;
  /** Absent = paywall non fermable (hard). Présent = croix affichée. */
  onClose?: () => void;
  /** Délai avant l'apparition de la croix, en ms. 0 = immédiate. */
  closeDelayMs?: number;
  isPurchasing?: boolean;
  isRestoring?: boolean;
  /** Remise en cours (roue ou code promo), affichée telle quelle. */
  discountPercent?: number | null;
  /**
   * N'afficher qu'un seul plan. Utilisé par le paywall « code promo » : la
   * remise porte sur une offre précise, présenter les autres plans à côté
   * inviterait à comparer une offre remisée avec des offres qui ne le sont pas.
   * Ne remplace pas la composition de l'offering côté RevenueCat, c'est une
   * garantie d'affichage.
   */
  singleOffer?: boolean;
};

/** L'annuel reste le choix recommandé, le mensuel l'alternative principale. */
const PACKAGE_ORDER: string[] = [PACKAGE_TYPE.ANNUAL, PACKAGE_TYPE.MONTHLY, PACKAGE_TYPE.WEEKLY];

function sortPackages(packages: PurchasesPackage[]): PurchasesPackage[] {
  return [...packages].sort((a, b) => {
    const indexA = PACKAGE_ORDER.indexOf(a.packageType);
    const indexB = PACKAGE_ORDER.indexOf(b.packageType);
    // Les types hors liste (custom, lifetime) sont renvoyés en fin de rangée.
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });
}

export function PaywallView({
  offering,
  copy,
  onPurchase,
  onRestore,
  onClose,
  closeDelayMs = 0,
  isPurchasing,
  isRestoring,
  discountPercent,
  singleOffer,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isShortScreen } = useResponsive();
  // Le paywall couvre maintenant tout l'écran sur les deux plateformes : la
  // croix doit donc tenir compte de la vraie zone système, y compris sur iOS.
  const overlayHeaderInset = getPaywallCloseTopInset(insets.top);

  const language = i18n.language || 'en';

  const allPackages = useMemo(() => sortPackages(offering.availablePackages || []), [offering]);

  const purchasablePackages = useMemo(() => {
    if (!singleOffer || allPackages.length === 0) return allPackages;
    // L'annuel reste prioritaire, comme partout ailleurs dans l'écran.
    const annual = allPackages.find((pack) => pack.packageType === PACKAGE_TYPE.ANNUAL);
    return [annual ?? allPackages[0]];
  }, [allPackages, singleOffer]);

  const [showAllPlans, setShowAllPlans] = useState(false);
  useEffect(() => setShowAllPlans(false), [offering.identifier, singleOffer]);

  const packages = useMemo(() => {
    if (singleOffer || showAllPlans) return purchasablePackages;

    const primary = purchasablePackages.filter(
      (pack) => pack.packageType === PACKAGE_TYPE.ANNUAL
        || pack.packageType === PACKAGE_TYPE.MONTHLY
    );
    if (primary.length >= 2) return primary;

    // Si un store ne renvoie pas le mensuel, garder deux choix opérationnels
    // plutôt que de produire artificiellement un écran à une seule offre.
    return [...primary, ...purchasablePackages.filter((pack) => !primary.includes(pack))].slice(0, 2);
  }, [purchasablePackages, showAllPlans, singleOffer]);

  const hasHiddenPlans = packages.length < purchasablePackages.length;

  const defaultPackage = useMemo(
    () => packages.find((pack) => pack.packageType === PACKAGE_TYPE.ANNUAL) || packages[0],
    [packages]
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultPackage?.identifier);
  const [trialEligibility, setTrialEligibility] = useState<Record<string, TrialEligibility>>({});

  useEffect(() => {
    let cancelled = false;
    if (purchasablePackages.length === 0) return;

    void resolveTrialEligibilityForPackages(purchasablePackages)
      .then((result) => {
        if (!cancelled) {
          if (__DEV__) {
            console.info(
              '[Paywall][TrialEligibility]',
              purchasablePackages.map((pack) => ({
                productId: pack.product.identifier,
                packageType: pack.packageType,
                configuredTrialDays: configuredTrialDays(pack),
                resolved: result[pack.identifier] ?? null,
              }))
            );
          }
          setTrialEligibility(result);
        }
      })
      .catch(() => {
        // En cas d'incertitude, ne pas promettre un essai que le Store pourrait
        // refuser. La feuille native reste l'autorité au moment de l'achat.
        if (!cancelled) setTrialEligibility({});
      });

    return () => {
      cancelled = true;
    };
  }, [purchasablePackages]);

  // L'offering change quand une remise s'applique : la sélection doit suivre,
  // sinon le bouton d'achat pointerait sur un package qui n'existe plus.
  useEffect(() => {
    setSelectedId(defaultPackage?.identifier);
  }, [defaultPackage?.identifier]);

  const hasCloseAction = onClose !== undefined;
  const [canClose, setCanClose] = useState(hasCloseAction && closeDelayMs === 0);
  const closeOpacity = useRef(
    new Animated.Value(hasCloseAction && closeDelayMs === 0 ? 1 : 0)
  ).current;

  useEffect(() => {
    if (!hasCloseAction) {
      setCanClose(false);
      return;
    }

    if (closeDelayMs <= 0) {
      setCanClose(true);
      return;
    }

    setCanClose(false);
    const timer = setTimeout(() => setCanClose(true), closeDelayMs);
    return () => clearTimeout(timer);
  }, [closeDelayMs, hasCloseAction]);

  useEffect(() => {
    closeOpacity.stopAnimation();

    if (!canClose) {
      closeOpacity.setValue(0);
      return;
    }

    const animation = Animated.timing(closeOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [canClose, closeOpacity]);

  const selectedPackage = purchasablePackages.find((pack) => pack.identifier === selectedId) || defaultPackage;

  /** Pastille « Meilleure Offre » sur l'annuel dans le catalogue standard. */
  const badgedPackageId = useMemo(() => {
    if (packages.length < 2) return null;
    return packages.find((pack) => pack.packageType === PACKAGE_TYPE.ANNUAL)?.identifier ?? null;
  }, [packages]);

  const trialDays = (pack: PurchasesPackage): number | null =>
    trialEligibility[pack.identifier]?.status === 'eligible'
      ? trialEligibility[pack.identifier]?.days ?? null
      : null;
  const selectedTrialDays = selectedPackage ? trialDays(selectedPackage) : null;
  const hasFreeTrial = Boolean(selectedTrialDays);
  const selectedTrialCount = selectedTrialDays ?? 7;

  const renewalNotice = selectedPackage
    ? hasFreeTrial
      ? selectedPackage.packageType === PACKAGE_TYPE.ANNUAL && selectedPackage.product.pricePerMonthString
        ? t('paywall.renewalNoticeTrialAnnual', {
          count: selectedTrialCount,
          price: selectedPackage.product.priceString,
          monthly: selectedPackage.product.pricePerMonthString,
        })
        : t('paywall.renewalNoticeTrial', {
          count: selectedTrialCount,
          price: selectedPackage.product.priceString,
          period: t(`paywall.periodLabel.${selectedPackage.packageType.toLowerCase()}`, { defaultValue: '' }),
        })
      : t('paywall.renewalNotice', {
        price: selectedPackage.product.priceString,
        period: t(`paywall.periodLabel.${selectedPackage.packageType.toLowerCase()}`, { defaultValue: '' }),
      })
    : null;

  /**
   * Économie de l'annuel face au mensuel, en pourcentage.
   *
   * Calculée sur les prix numériques du store plutôt qu'écrite en dur : le
   * ratio change avec les devises et à chaque ajustement tarifaire, et un
   * pourcentage faux sur un écran de paiement n'est pas une coquille.
   * Renvoie `null` s'il n'y a pas les deux plans à comparer.
   */
  const annualSavingsPercent = useMemo(() => {
    const annual = purchasablePackages.find((pack) => pack.packageType === PACKAGE_TYPE.ANNUAL);
    const monthly = purchasablePackages.find((pack) => pack.packageType === PACKAGE_TYPE.MONTHLY);
    if (!annual || !monthly || !monthly.product.price) return null;
    const percent = Math.round((1 - annual.product.price / 12 / monthly.product.price) * 100);
    return percent > 0 ? percent : null;
  }, [purchasablePackages]);

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'android') await Linking.openURL(url);
      else await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('[Paywall] Impossible d’ouvrir le lien légal:', error);
    }
  };

  const renderPackage = (pack: PurchasesPackage) => {
    const isSelected = pack.identifier === selectedPackage?.identifier;
    const isAnnual = pack.packageType === PACKAGE_TYPE.ANNUAL;
    // Prix mensuel équivalent fourni et formaté par le store, pas recalculé.
    const perMonth = isAnnual ? pack.product.pricePerMonthString : null;
    const days = trialDays(pack);
    const showSavings = isAnnual && annualSavingsPercent !== null;

    return (
      <TouchableOpacity
        key={pack.identifier}
        style={[
          styles.planCard,
          isAnnual && styles.annualPlanCard,
          isSelected && styles.planCardSelected,
        ]}
        onPress={() => setSelectedId(pack.identifier)}
        activeOpacity={0.9}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.planCopyColumn}>
          {/* L'essai offert prime sur « Meilleure offre » : c'est l'argument le
              plus fort, et deux pastilles sur la même carte se neutralisent. */}
          {days ? (
            <View style={[styles.planBadge, styles.planBadgeTrial]}>
              <Text style={styles.planBadgeText} numberOfLines={1}>
                {t('paywall.trialBadge', { count: days })}
              </Text>
            </View>
          ) : discountPercent ? (
            <View style={[styles.planBadge, styles.planBadgeDiscount]}>
              <Text style={styles.planBadgeText} numberOfLines={1}>
                {t('paywall.discountBadge', { percent: discountPercent })}
              </Text>
            </View>
          ) : pack.identifier === badgedPackageId ? (
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText} numberOfLines={1}>
                {t('paywall.bestOffer')}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.planTitle,
              isAnnual && styles.annualPlanTitle,
              isSelected && styles.planTitleSelected,
            ]}
            numberOfLines={1}
          >
            {t(`paywall.plans.${pack.packageType.toLowerCase()}`, { defaultValue: pack.product.title })}
          </Text>
          {showSavings ? (
            <Text style={styles.planSavings} numberOfLines={1}>
              {t('paywall.savePercent', { percent: annualSavingsPercent })}
            </Text>
          ) : null}
        </View>

        <View style={styles.planPriceColumn}>
          <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
            {isSelected ? <Ionicons name="checkmark" size={16} color="white" /> : null}
          </View>
          <Text
            style={[
              styles.planPrice,
              isAnnual && styles.annualPlanPrice,
              isSelected && styles.planPriceSelected,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {pack.product.priceString}
          </Text>
          {perMonth ? (
            <Text style={styles.planPerMonth} numberOfLines={1}>
              {t('paywall.perMonthEquivalent', { price: perMonth })}
            </Text>
          ) : (
            <Text style={styles.planPerMonth} numberOfLines={1}>
              {t(`paywall.per.${pack.packageType.toLowerCase()}`, { defaultValue: '' })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT
              + insets.bottom
              + ONBOARDING_CTA_BOTTOM_GAP,
          },
        ]}
      >
        {onClose ? (
          <Animated.View
            pointerEvents={canClose ? 'auto' : 'none'}
            style={[
              styles.header,
              { marginTop: overlayHeaderInset, opacity: closeOpacity },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Ionicons name="close" size={28} color={Colors.light.text} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {discountPercent ? (
          <View style={styles.discountHero}>
            <Text style={styles.discountHeroValue} numberOfLines={1} adjustsFontSizeToFit>
              −{discountPercent}%
            </Text>
            <Text style={styles.discountHeroLabel}>{t('paywall.discountApplied', { percent: discountPercent })}</Text>
          </View>
        ) : null}

        {/* Le statut d'essai est présenté par le plan, le CTA et la mention de
            renouvellement sans écraser la promesse liée au parcours d'entrée. */}
        <Text style={[styles.headline, isShortScreen && styles.headlineCompact]}>
          {copy.headline}
        </Text>
        <Text style={styles.subheadline}>{copy.subheadline}</Text>

        <PaywallTestimonial testimonialKey={copy.testimonialKey} />

        <View style={styles.plans}>{packages.map(renderPackage)}</View>
        {hasHiddenPlans ? (
          <TouchableOpacity
            style={styles.viewAllPlansButton}
            onPress={() => setShowAllPlans(true)}
            accessibilityRole="button"
          >
            <Text style={styles.viewAllPlansText}>{t('paywall.viewAllPlans')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <View style={styles.footerDock}>
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <TrialConversionFooter
            reassurance={hasFreeTrial ? t('paywall.noPaymentDueNow') : null}
            primaryLabel={hasFreeTrial
              ? t('paywall.startTrial', { count: selectedTrialCount })
              : copy.cta}
            primarySuffix="👉🏽"
            showChevron
            onPrimaryPress={() => selectedPackage && onPurchase(selectedPackage)}
            loading={isPurchasing}
            disabled={!selectedPackage}
            leadingContent={(
              renewalNotice ? (
                <Text style={styles.renewalNotice} numberOfLines={2}>
                  {renewalNotice}
                </Text>
              ) : null
            )}
            bottomContent={(
              <View style={styles.legalRow}>
                <TouchableOpacity
                  onPress={onRestore}
                  disabled={isRestoring}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLink}>
                    {isRestoring ? t('paywall.loading') : t('paywall.restore')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.legalSeparator}>·</Text>
                <TouchableOpacity
                  onPress={() => openLink(getTermsUrl(language))}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLink}>{t('paywall.terms')}</Text>
                </TouchableOpacity>
                <Text style={styles.legalSeparator}>·</Text>
                <TouchableOpacity
                  onPress={() => openLink(getPrivacyPolicyUrl(language))}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLink}>{t('paywall.privacy')}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  header: {
    alignSelf: 'flex-start',
    marginLeft: -20,
    width: 44,
    height: 44,
    marginBottom: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 249, 226, 0.92)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    ...contentColumn(),
    paddingHorizontal: 24,
  },
  discountHero: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.button,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 20,
  },
  discountHeroValue: {
    color: 'white',
    fontSize: font(48),
    lineHeight: font(54),
    fontFamily: 'Degular',
  },
  discountHeroLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: font(13),
    fontFamily: 'CronosProBold',
  },
  headline: {
    fontSize: font(32),
    lineHeight: font(38),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  headlineCompact: {
    fontSize: font(26),
    lineHeight: font(31),
  },
  subheadline: {
    fontSize: font(16),
    lineHeight: font(22),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  plans: {
    width: '100%',
    gap: 12,
  },
  planCard: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#EDE7CE',
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  annualPlanCard: {
    minHeight: 112,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 3,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  planCardSelected: {
    borderColor: Colors.light.button,
    backgroundColor: '#FFF8EC',
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.button,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    marginBottom: 5,
  },
  // L'essai offert est l'argument le plus fort de l'écran : la pastille passe en
  // contraste maximal pour se distinguer d'un simple « Meilleure offre ».
  planBadgeTrial: {
    backgroundColor: Colors.light.text,
  },
  planBadgeDiscount: {
    backgroundColor: Colors.light.text,
  },
  planBadgeText: {
    color: 'white',
    fontSize: font(11),
    fontFamily: 'CronosProBold',
  },
  planSavings: {
    fontSize: font(12),
    fontFamily: 'CronosProBold',
    color: Colors.light.button,
    marginTop: 2,
  },
  planCopyColumn: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  planPriceColumn: {
    minWidth: 114,
    maxWidth: '44%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D8D2BA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  planRadioSelected: {
    borderColor: Colors.light.button,
    backgroundColor: Colors.light.button,
  },
  planTitle: {
    fontSize: font(18),
    lineHeight: font(21),
    fontFamily: 'Degular',
    color: Colors.light.textSecondary,
  },
  planTitleSelected: {
    color: Colors.light.text,
  },
  annualPlanTitle: {
    color: Colors.light.text,
    fontSize: font(25),
    lineHeight: font(28),
  },
  planPrice: {
    fontSize: font(20),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  planPriceSelected: {
    color: Colors.light.button,
  },
  annualPlanPrice: {
    fontSize: font(24),
    lineHeight: font(28),
  },
  planPerMonth: {
    fontSize: font(12),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'right',
  },
  viewAllPlansButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewAllPlansText: {
    color: Colors.light.textSecondary,
    fontFamily: 'CronosPro',
    fontSize: font(13),
    textDecorationLine: 'underline',
  },
  footerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FDF9E2',
  },
  footer: {
    ...contentColumn(),
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  legalRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  renewalNotice: {
    paddingHorizontal: 8,
    color: Colors.light.textSecondary,
    fontFamily: 'CronosPro',
    fontSize: font(14),
    lineHeight: font(17),
    textAlign: 'center',
  },
  legalLink: {
    fontSize: font(12),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#C7C7CC',
  },
});

export default PaywallView;

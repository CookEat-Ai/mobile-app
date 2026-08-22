import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  PACKAGE_TYPE,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Colors } from '../constants/Colors';
import { font, getPaywallCloseTopInset } from '../constants/Layout';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { getPrivacyPolicyUrl, getTermsUrl } from '../config/legal';
import { resolveTrialEligibilityForPackage } from '../services/trialEligibility';
import { PaywallTestimonial } from './PaywallTestimonial';
import {
  AnimatedChevron,
  PAYWALL_CTA_HORIZONTAL_INSET,
} from './onboarding/TrialConversionFooter';

type Props = {
  /** Offering remisé : c'est lui qui est acheté. */
  offering: PurchasesOffering;
  /**
   * Offering plein tarif, uniquement pour la comparaison affichée (prix barré
   * et écart avec le mensuel). Absent = les deux mentions disparaissent plutôt
   * que d'être devinées : un prix barré faux sur un écran de paiement n'est pas
   * une coquille.
   */
  baseOffering?: PurchasesOffering | null;
  onPurchase: (pack: PurchasesPackage) => void;
  onRestore: () => void;
  onClose?: () => void;
  closeDelayMs?: number;
  isPurchasing?: boolean;
  isRestoring?: boolean;
  testimonialKey: string;
};

/** Nombre de mois couverts par un package, pour ramener les plans au même repère. */
function monthsIn(packageType: string): number | null {
  switch (packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return 12;
    case PACKAGE_TYPE.SIX_MONTH:
      return 6;
    case PACKAGE_TYPE.THREE_MONTH:
      return 3;
    case PACKAGE_TYPE.TWO_MONTH:
      return 2;
    case PACKAGE_TYPE.MONTHLY:
      return 1;
    case PACKAGE_TYPE.WEEKLY:
      return 1 / 4.345;
    default:
      return null;
  }
}

/** Étoile à quatre branches, purement décorative. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: any }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 0 C13.1 8.2 15.8 10.9 24 12 C15.8 13.1 13.1 15.8 12 24 C10.9 15.8 8.2 13.1 0 12 C8.2 10.9 10.9 8.2 12 0 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

/**
 * Paywall « offre de sortie ».
 *
 * Écran d'objection après fermeture de la feuille Store. Il mène avec l'écart
 * de prix, conserve une preuve sociale courte liée au parcours et ne présente
 * qu'un seul plan : remettre une grille complète rouvrirait l'arbitrage que
 * l'utilisateur vient de trancher.
 */
export function ExitOfferPaywallView({
  offering,
  baseOffering,
  onPurchase,
  onRestore,
  onClose,
  closeDelayMs = 0,
  isPurchasing,
  isRestoring,
  testimonialKey,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isShortScreen, layoutWidth } = useResponsive();
  const language = i18n.language || 'en';
  // Cette variante partage le contrat plein écran du paywall principal : la
  // position de fermeture part de la vraie safe area sur iOS comme sur Android.
  const closeTopInset = getPaywallCloseTopInset(insets.top);
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

  // L'annuel d'abord : c'est le plan sur lequel la remise a le plus d'effet
  // visible, et le seul que cet écran met en avant.
  const pack = useMemo(() => {
    const packages = offering.availablePackages || [];
    return packages.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL) || packages[0];
  }, [offering]);
  const [trialDays, setTrialDays] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pack) {
      setTrialDays(null);
      return;
    }

    void resolveTrialEligibilityForPackage(pack)
      .then((result) => {
        if (!cancelled) setTrialDays(result.status === 'eligible' ? result.days : null);
      })
      .catch(() => {
        if (!cancelled) setTrialDays(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pack]);

  const basePackages = baseOffering?.availablePackages;

  /** Même plan au tarif plein : référence du prix barré et de la remise affichée. */
  const basePack = useMemo(() => {
    if (!pack || !basePackages) return null;
    const equivalent = basePackages.find((item) => item.packageType === pack.packageType);
    if (!equivalent || equivalent.product.price <= pack.product.price) return null;
    return equivalent;
  }, [pack, basePackages]);

  const strikePrice = basePack?.product.priceString ?? null;

  /**
   * Écart avec le tarif mensuel ramené à l'année : 9,99 €/mois font 119,88 € sur
   * douze mois, face à 23,95 €/an — soit −80 %.
   *
   * Calculé sur les prix du store, jamais écrit en dur : le ratio bouge avec les
   * devises et à chaque ajustement tarifaire, et un pourcentage faux sur un
   * écran de paiement n'est pas une coquille. `null` s'il manque le mensuel :
   * il n'y a alors rien à comparer, et rien à deviner.
   */
  const vsMonthlyPercent = useMemo(() => {
    if (!pack || !basePackages) return null;
    const monthly = basePackages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY);
    if (!monthly || !monthly.product.price) return null;
    const months = monthsIn(pack.packageType);
    if (!months) return null;
    const percent = Math.round((1 - pack.product.price / months / monthly.product.price) * 100);
    return percent > 0 ? percent : null;
  }, [pack, basePackages]);

  /** Remise sur le tarif annuel plein : 34,99 € → 23,95 €, soit −32 %. */
  const vsAnnualPercent = useMemo(() => {
    if (!pack || !basePack?.product.price) return null;
    const percent = Math.round((1 - pack.product.price / basePack.product.price) * 100);
    return percent > 0 ? percent : null;
  }, [pack, basePack]);

  /**
   * Remise affichée dans la pastille : l'écart au tarif mensuel, pas la remise
   * sur le prix catalogue annuel.
   *
   * C'est la comparaison que fait l'utilisateur qui hésite — il raisonne en
   * mensualité, pas en prix annuel — et c'est celle que la ligne juste en
   * dessous explicite, pour que le pourcentage ne reste pas suspendu en l'air.
   * Le prix barré, lui, reste le tarif annuel plein : il répond à une autre
   * question, « combien coûte ce plan d'habitude ».
   *
   * Repli sur la remise annuelle à défaut de mensuel, puis `null` : sans prix
   * de référence chargé, la pastille disparaît au lieu d'afficher un
   * pourcentage figé dans le code. Ce serait le seul chiffre de l'écran à ne
   * pas suivre un changement de tarif — donc le seul à pouvoir mentir.
   */
  const shownDiscountPercent = vsMonthlyPercent ?? vsAnnualPercent;
  const days = pack ? trialDays : null;
  // Comme sur Dhikr Me, l'essai confirmé est l'information commerciale la
  // plus forte de la carte : sa durée réelle prime sur la remise. Un compte
  // inéligible (ou dont l'éligibilité est inconnue) ne voit jamais de promesse
  // gratuite et conserve le badge de remise calculé depuis les prix du Store.
  const hasTrialBadge = days !== null;
  const planBadgeLabel = hasTrialBadge
    ? t('paywall.trialBadge', { count: days })
    : shownDiscountPercent !== null
      ? t('paywall.discountBadge', { percent: shownDiscountPercent })
      : null;
  const periodSuffix = pack
    ? t(`paywall.per.${pack.packageType.toLowerCase()}`, { defaultValue: '' })
    : '';
  const durationLabel = pack
    ? t(`paywall.exitOffer.duration.${pack.packageType.toLowerCase()}`, { defaultValue: '' })
    : '';

  // Le pourcentage doit dominer, pas son contenant : une pastille compacte avec
  // un chiffre plus grand remplace l'ancienne carte qui occupait 62 % de l'écran.
  const badgeWidth = Math.min(layoutWidth * 0.46, 190);

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'android') await Linking.openURL(url);
      else await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('[Paywall] Impossible d’ouvrir le lien légal:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          !onClose && { paddingTop: insets.top + 20 },
          isShortScreen && styles.scrollContentCompact,
        ]}
      >
        {onClose ? (
          <Animated.View
            pointerEvents={canClose ? 'auto' : 'none'}
            style={[
              styles.header,
              { marginTop: closeTopInset, opacity: closeOpacity },
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

        <Text style={[styles.title, isShortScreen && styles.titleCompact]}>
          {t('paywall.exitOffer.title')}
        </Text>

        {shownDiscountPercent !== null ? (
          <View style={styles.badgeArea}>
            <Sparkle size={26} color={Colors.light.text} style={[styles.sparkle, { top: 18, left: 8 }]} />
            <Sparkle size={16} color="#C9BFA0" style={[styles.sparkle, { top: 58, left: 34 }]} />
            <Sparkle size={11} color="#C9BFA0" style={[styles.sparkle, { bottom: 22, left: 16 }]} />
            <Sparkle size={30} color={Colors.light.text} style={[styles.sparkle, { top: 12, right: 6 }]} />
            <Sparkle size={15} color="#C9BFA0" style={[styles.sparkle, { bottom: 30, right: 30 }]} />
            <Sparkle size={10} color="#C9BFA0" style={[styles.sparkle, { bottom: 14, right: 8 }]} />

            <LinearGradient
              colors={['#FFC93F', '#FEB50A', '#F58A0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.badge,
                { width: badgeWidth, height: badgeWidth * (isShortScreen ? 0.42 : 0.46) },
              ]}
            >
              <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit>
                −{shownDiscountPercent}%
              </Text>
            </LinearGradient>
          </View>
        ) : null}

        {pack ? (
          <View style={styles.priceLine}>
            {strikePrice ? (
              <Text style={styles.priceStrike} numberOfLines={1}>
                {strikePrice}
              </Text>
            ) : null}
            <Text style={styles.priceNow} numberOfLines={1}>
              {periodSuffix ? `${pack.product.priceString} ${periodSuffix}` : pack.product.priceString}
            </Text>
          </View>
        ) : null}

        {vsMonthlyPercent ? (
          <Text style={styles.priceComparison}>
            {t('paywall.exitOffer.vsMonthly', { percent: vsMonthlyPercent })}
          </Text>
        ) : null}

        <PaywallTestimonial testimonialKey={testimonialKey} style={styles.testimonial} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {pack ? (
          <View style={styles.planWrapper}>
            {/* L'offre unique reste immédiatement identifiable sur sa carte.
                L'essai prime quand il existe, sinon le badge reprend la remise
                réellement calculée depuis les produits du Store. */}
            {planBadgeLabel ? (
              <View style={[styles.planRibbon, hasTrialBadge && styles.planRibbonTrial]}>
                <Text
                  style={[
                    styles.planRibbonText,
                    hasTrialBadge && styles.planRibbonTrialText,
                  ]}
                  numberOfLines={1}
                >
                  {planBadgeLabel}
                </Text>
              </View>
            ) : null}

            <View style={styles.planCard}>
              <View style={styles.planCardLeft}>
                <Text style={styles.planTitle} numberOfLines={1}>
                  {t(`paywall.plans.${pack.packageType.toLowerCase()}`, {
                    defaultValue: pack.product.title,
                  })}
                </Text>
                {durationLabel ? (
                  <Text style={styles.planDuration} numberOfLines={1}>
                    {durationLabel}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.planPrice} numberOfLines={1} adjustsFontSizeToFit>
                {pack.product.priceString}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.cta, (!pack || isPurchasing) && styles.ctaDisabled]}
          onPress={() => pack && onPurchase(pack)}
          disabled={!pack || isPurchasing}
          activeOpacity={0.85}
        >
          {isPurchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.ctaContent}>
              <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit>
                {days ? t('paywall.tryFree') : t('paywall.exitOffer.cta')}
              </Text>
              <Text style={styles.ctaEmoji}>👉🏽</Text>
              <AnimatedChevron />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.reassuranceRow}>
          <Ionicons name="checkmark" size={16} color={Colors.light.text} />
          <Text style={styles.reassuranceText}>{t('paywall.exitOffer.noCommitment')}</Text>
        </View>

        {/* Mention de renouvellement : obligatoire sur un écran d'abonnement. */}
        {pack ? (
          <Text style={styles.renewalNotice}>
            {days
              ? t('paywall.renewalNoticeTrial', {
                count: days,
                price: pack.product.priceString,
                period: t(`paywall.periodLabel.${pack.packageType.toLowerCase()}`, { defaultValue: '' }),
              })
              : t('paywall.renewalNotice', {
                price: pack.product.priceString,
                period: t(`paywall.periodLabel.${pack.packageType.toLowerCase()}`, { defaultValue: '' }),
              })}
          </Text>
        ) : null}

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => openLink(getTermsUrl(language))} hitSlop={8}>
            <Text style={styles.legalLink}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>·</Text>
          <TouchableOpacity onPress={() => openLink(getPrivacyPolicyUrl(language))} hitSlop={8}>
            <Text style={styles.legalLink}>{t('paywall.privacy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>·</Text>
          <TouchableOpacity onPress={onRestore} disabled={isRestoring} hitSlop={8}>
            <Text style={styles.legalLink}>
              {isRestoring ? t('paywall.loading') : t('paywall.restore')}
            </Text>
          </TouchableOpacity>
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
  scroll: {
    flex: 1,
  },
  header: {
    alignSelf: 'flex-start',
    marginLeft: -20,
    width: 44,
    height: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 249, 226, 0.94)',
  },
  scrollContent: {
    ...contentColumn(),
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  scrollContentCompact: {
    paddingTop: 0,
  },
  title: {
    fontSize: font(38),
    lineHeight: font(44),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  titleCompact: {
    fontSize: font(30),
    lineHeight: font(36),
    marginBottom: 18,
  },
  badgeArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sparkle: {
    position: 'absolute',
  },
  badge: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: font(60),
    lineHeight: font(66),
    fontFamily: 'Degular',
  },
  priceLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  priceStrike: {
    fontSize: font(26),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textDecorationLine: 'line-through',
  },
  priceNow: {
    fontSize: font(26),
    fontFamily: 'Degular',
    color: Colors.light.textSecondary,
  },
  priceComparison: {
    fontSize: font(19),
    lineHeight: font(25),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  testimonial: {
    marginTop: 18,
  },
  footer: {
    ...contentColumn(),
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  planWrapper: {
    position: 'relative',
    paddingTop: 12,
    marginTop: 2,
  },
  planRibbon: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 2,
    maxWidth: '86%',
    paddingHorizontal: PAYWALL_CTA_HORIZONTAL_INSET,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  planRibbonText: {
    color: 'white',
    fontSize: font(16),
    fontFamily: 'CronosProBold',
  },
  // Géométrie reprise du badge d'essai Dhikr Me, recolorée avec les tokens
  // CookEat Ai : petite pastille attachée à la carte, lisible sans la dominer.
  planRibbonTrial: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.light.button,
    shadowOpacity: 0,
    elevation: 0,
  },
  planRibbonTrialText: {
    color: Colors.light.text,
    fontSize: font(11),
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 86,
    backgroundColor: '#FFF8EC',
    borderRadius: 26,
    borderWidth: 3,
    borderColor: Colors.light.button,
    paddingTop: 19,
    paddingBottom: 12,
    paddingHorizontal: 18,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  planCardLeft: {
    flex: 1,
  },
  planTitle: {
    fontSize: font(25),
    lineHeight: font(28),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  planDuration: {
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
    marginTop: 2,
  },
  planPrice: {
    fontSize: font(25),
    lineHeight: font(28),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  cta: {
    backgroundColor: Colors.light.button,
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    flexShrink: 1,
    color: 'white',
    fontSize: font(19),
    fontFamily: 'Degular',
    textAlign: 'center',
  },
  ctaContent: {
    position: 'relative',
    width: '100%',
    minHeight: 25,
    paddingHorizontal: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaEmoji: {
    marginLeft: 6,
    fontSize: font(18),
    lineHeight: font(22),
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reassuranceText: {
    fontSize: font(14),
    fontFamily: 'CronosProBold',
    color: Colors.light.text,
  },
  renewalNotice: {
    fontSize: font(11),
    lineHeight: font(15),
    fontFamily: 'CronosPro',
    color: '#9A9A9F',
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
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

export default ExitOfferPaywallView;

import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Animated, Easing, Image, Platform, BackHandler, Alert, Modal, TextInput, Keyboard, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { PaywallView } from '../components/PaywallView';
import { ExitOfferPaywallView } from '../components/ExitOfferPaywallView';
import { resolvePaywallCopy } from '../services/paywallCopy';
import type { EntryFeature } from '../services/analytics';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path } from 'react-native-svg';
import analytics from '../services/analytics';
import apiService from '../services/api';
import { getUniqueDeviceId } from '../services/deviceStorage';
import { Colors } from '../constants/Colors';
import { CONTENT_MAX_WIDTH, font } from '../constants/Layout';
import { useResponsive } from '../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import revenueCatService, { ENTITLEMENT_ID } from '../config/revenuecat';
import {
  hasShownWheelInSession,
  markWheelShownInSession,
  hasShownExitOfferInSession,
  markExitOfferShownInSession,
} from '../services/sessionFlags';
import { LUCKY_WHEEL_ENABLED } from '../config/features';
import {
  TRY_FREE_OFFERING_ID,
  TRY_FREE_ANDROID_PRODUCT_ID,
  TRY_FREE_IOS_PRODUCT_ID,
  QUICK_ACTION_ANALYTICS_SOURCE,
  QUICK_ACTION_ENTRY_POINT,
  isTryFreeQuickActionSource,
} from '../services/quickActions';
import { resolveTrialEligibilityForPackage } from '../services/trialEligibility';
import { syncTrialReminderWithCustomerInfo } from '../services/trialReminder';
import {
  loadOnboardingProfile,
  type OnboardingProfile,
} from '../services/onboardingProfile';


type PaywallState = 'STANDARD' | 'WHEEL' | 'DISCOUNTED' | 'PROMO_DISCOUNTED';

/**
 * Remise de l'offre de sortie.
 *
 * Anciennement tirée au sort par la roue (33 / 25 / 20 / 15). Les produits
 * Apple et Google Play dédiés comparent maintenant l'annuel à
 * douze mensualités et affichent environ 80 % d'économie. La valeur doit
 * correspondre à l'offering `discount_80` côté RevenueCat.
 */
const EXIT_OFFER_DISCOUNT = 80;
const PAYWALL_DESIGN_VARIANT = 'short_contextual_proof_v1';

export default function PaywallScreen() {
  const hasActiveSubscription = (customerInfo: any): boolean => {
    const active = customerInfo?.entitlements?.active || {};
    return Boolean(active[ENTITLEMENT_ID]) || Object.keys(active).length > 0;
  };

  const { t, i18n } = useTranslation();
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [entryFeature, setEntryFeature] = useState<EntryFeature | null>(null);
  const [isPersonalizationResolved, setIsPersonalizationResolved] = useState(false);
  const params = useLocalSearchParams();
  const routeSource = Array.isArray(params.source)
    ? params.source[0]
    : params.source?.toString();
  const isFromQuickAction = isTryFreeQuickActionSource(routeSource);
  const quickActionProductId = Platform.OS === 'android'
    ? TRY_FREE_ANDROID_PRODUCT_ID
    : TRY_FREE_IOS_PRODUCT_ID;
  const analyticsSource = isFromQuickAction
    ? QUICK_ACTION_ANALYTICS_SOURCE
    : routeSource || 'direct';
  const isFromOnboarding = Boolean(routeSource?.includes('onboarding'));
  const paywallAnalyticsProperties = useMemo(() => ({
    source: analyticsSource,
    paywall_design_variant: PAYWALL_DESIGN_VARIANT,
    personalization_segment: onboardingProfile?.hasGoalAnswer
      ? `goal_${onboardingProfile.goal}`
      : `entry_${entryFeature === 'import' ? 'import' : 'generate'}`,
    placement: isFromQuickAction
      ? 'quick_action_offer'
      : isFromOnboarding
        ? 'onboarding_paywall'
        : 'in_app_paywall',
    ...(isFromQuickAction
      ? {
        source_detail: routeSource,
        entry_point: QUICK_ACTION_ENTRY_POINT,
      }
      : {}),
  }), [analyticsSource, entryFeature, isFromOnboarding, isFromQuickAction, onboardingProfile, routeSource]);
  const shouldCompleteOnPurchase =
    isFromOnboarding || params.completeOnPurchase?.toString() === 'true';
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height, layoutWidth } = useResponsive();
  // La roue était calée sur 75% de la largeur : 768pt de diamètre sur iPad, et
  // un débordement vertical dès que l'écran était court. On la borne par les deux.
  const wheelSize = Math.min(layoutWidth * 0.75, height * 0.38);

  const getInitialState = useCallback((): PaywallState => {
    const s = Array.isArray(params.initialState) ? params.initialState[0] : params.initialState;
    // Roue désactivée : les appelants qui la demandent encore retombent sur le
    // paywall plein tarif plutôt que sur un écran vide.
    if (s === 'WHEEL') return LUCKY_WHEEL_ENABLED ? 'WHEEL' : 'STANDARD';
    if (s === 'DISCOUNTED') return 'DISCOUNTED';
    if (s === 'PROMO_DISCOUNTED') return 'PROMO_DISCOUNTED';
    return 'STANDARD';
  }, [params.initialState]);

  const [viewState, setViewState] = useState<PaywallState>(getInitialState());

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadOnboardingProfile().catch(() => null),
      analytics.getEntryFeature().catch(() => null),
    ]).then(([profile, feature]) => {
      if (!mounted) return;
      setOnboardingProfile(profile);
      setEntryFeature(feature);
      setIsPersonalizationResolved(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setViewState(getInitialState());
  }, [getInitialState]);

  useEffect(() => {
    // En mode dev sur Android, on ferme le paywall automatiquement
    // if (__DEV__ && Platform.OS === 'android') {
    //   exitPaywall();
    //   return;
    // }

    if (viewState === 'WHEEL') {
      navigation.setOptions({
        gestureEnabled: false,
      });
    }

    // Bloquer le bouton retour Android sur le paywall
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // On retourne true pour dire "on a géré l'événement", ce qui bloque le retour par défaut
      return true;
    });

    return () => backHandler.remove();
  }, [viewState, navigation]);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  /**
   * Offering plein tarif, conservé à part quand un offering remisé est affiché :
   * l'offre de sortie doit pouvoir barrer le prix d'origine et le comparer au
   * mensuel, ce que l'offering remisé ne contient plus.
   */
  const [baseOffering, setBaseOffering] = useState<PurchasesOffering | null>(null);
  /**
   * Dernier offering plein tarif réellement affiché. C'est lui la référence du
   * prix barré, pas `offerings.current` : le paywall standard passe par un
   * placement par branche, qui peut porter d'autres produits — barrer un prix
   * que l'utilisateur n'a jamais vu serait faux.
   */
  const lastStandardOffering = useRef<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasOfferingsError, setHasOfferingsError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  /**
   * Saisie de code cachée, réservée au contournement du paywall.
   *
   * Sert d'abord aux relecteurs Apple et Google : le paywall est une boucle
   * fermée, et un relecteur qui passe l'écran promo du tunnel n'a plus aucun
   * moyen d'entrer dans l'app. Ce raccourci reste accessible depuis le paywall
   * lui-même, quoi qu'il ait fait avant.
   *
   * Déclenché en secouant l'appareil, plutôt que par un lien « J'ai un code
   * promo » : un lien apprendrait à tous les utilisateurs qu'une remise existe,
   * avant même qu'ils aient vu le prix plein.
   */
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  const openSecretCodeEntry = useCallback((trigger: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    analytics.track('paywall_secret_code_opened', {
      ...paywallAnalyticsProperties,
      trigger,
    });
    setCodeError('');
    setShowCodeModal(true);
  }, [paywallAnalyticsProperties]);

  /**
   * Détection de secousse.
   *
   * L'accéléromètre renvoie des g : au repos la norme du vecteur vaut ~1. On
   * exige plusieurs franchissements de seuil rapprochés — un choc isolé (poser
   * le téléphone, un pas un peu sec) ne doit pas ouvrir la saisie.
   */
  useEffect(() => {
    if (showCodeModal) return;

    const SHAKE_FORCE = 1.8;
    const SHAKE_HITS_REQUIRED = 3;
    const SHAKE_WINDOW_MS = 1200;

    let hits: number[] = [];
    let cancelled = false;

    Accelerometer.setUpdateInterval(80);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (cancelled) return;
      const force = Math.sqrt(x * x + y * y + z * z);
      if (force < SHAKE_FORCE) return;

      const now = Date.now();
      hits = [...hits.filter((at) => now - at < SHAKE_WINDOW_MS), now];
      if (hits.length >= SHAKE_HITS_REQUIRED) {
        hits = [];
        cancelled = true;
        openSecretCodeEntry('shake');
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [showCodeModal, openSecretCodeEntry]);

  const handleSubmitSecretCode = async () => {
    const trimmed = codeInput.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setCodeError('');
    setCodeLoading(true);
    try {
      const response = await apiService.validatePromoCode(trimmed);
      const discount = response.data?.discountPercentage;
      if (!response.data?.isValid || !discount) {
        setCodeError(response.error || t('paywall.promoCodeInvalidMessage'));
        return;
      }

      // 100 % = accès complet immédiat, sans repasser par le paywall.
      if (discount === 100) {
        await revenueCatService.activatePromoCode(trimmed);
        await analytics.completeOnboarding({
          ...paywallAnalyticsProperties,
          completion_method: 'promo_code',
        });
        analytics.track('paywall_secret_code_premium', paywallAnalyticsProperties);
        setShowCodeModal(false);
        router.replace('/(tabs)');
        return;
      }

      // Code partiel : on réutilise le circuit remisé existant.
      await AsyncStorage.multiSet([
        ['pending_promo_code', trimmed.toUpperCase()],
        ['pending_promo_discount', String(discount)],
      ]);
      analytics.track('paywall_secret_code_discount', { discount });
      setShowCodeModal(false);
      // Met à jour la modale existante sans remplacer sa route : remplacer le
      // paywall risquerait de perdre son contexte de présentation.
      router.setParams({
        source: 'paywall_code_entry',
        initialState: 'PROMO_DISCOUNTED',
        promoDiscount: String(discount),
      });
    } catch {
      setCodeError(t('paywall.promoCodeError'));
    } finally {
      setCodeLoading(false);
    }
  };

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [wheelVariant, setWheelVariant] = useState<'A' | 'B'>('A');

  /**
   * Sortie de l'écran roue.
   *
   * La croix n'existait qu'en `__DEV__` : en production, une fois sur la roue,
   * il fallait tourner pour continuer. Tant que la roue ne s'affichait qu'au
   * lancement c'était déjà limite ; maintenant qu'elle intercepte la fermeture
   * du paywall, un testeur d'App Review qui appuie sur la croix se retrouve
   * enfermé — motif de rejet.
   *
   * On la révèle après un court délai : la roue garde sa chance d'être tournée,
   * mais l'écran a toujours une issue.
   */
  const [canCloseWheel, setCanCloseWheel] = useState(false);

  useEffect(() => {
    if (viewState !== 'WHEEL') {
      setCanCloseWheel(false);
      return;
    }
    const timer = setTimeout(() => setCanCloseWheel(true), 2500);
    return () => clearTimeout(timer);
  }, [viewState]);

  // Déclaré après `spinResult`, dont il dépend.
  const activeDiscountPercent = useMemo(() => {
    if (viewState === 'PROMO_DISCOUNTED') {
      const raw = params.promoDiscount?.toString().replace('%', '').trim();
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (viewState === 'DISCOUNTED') return spinResult || EXIT_OFFER_DISCOUNT;
    return null;
  }, [viewState, params.promoDiscount, spinResult]);

  // Contenu : metadata de l'offering en priorité (modifiable depuis le dashboard
  // RevenueCat, sans build), traductions embarquées en repli. En état remisé,
  // l'offre prime sur l'argumentaire de la feature : le titre passe au rabais.
  const paywallCopy = useMemo(() => {
    const base = resolvePaywallCopy({
      offering,
      entryFeature,
      profile: onboardingProfile,
      language: i18n.language || 'en',
      t,
    });
    if (!activeDiscountPercent) return base;

    return {
      ...base,
      headline: t('paywall.discountHeadline'),
      subheadline: t('paywall.discountSubheadline', { percent: activeDiscountPercent }),
    };
  }, [offering, entryFeature, onboardingProfile, i18n.language, t, activeDiscountPercent]);

  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lastHapticAngle = useRef(0);

  const discounts = [33, 20, 15, 25, 33, 20, 15, 25];

  // Bloquer l'accès à la roue dès l'ouverture si l'utilisateur est déjà abonné
  useEffect(() => {
    if (viewState !== 'WHEEL') return;

    const checkSubscriptionOnWheelMount = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const isSubscribed = hasActiveSubscription(customerInfo);
        if (isSubscribed) {
          if (isFromOnboarding) {
            await exitPaywall();
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Erreur vérification abonnement à l\'ouverture de la roue:', error);
      }
    };

    checkSubscriptionOnWheelMount();
  }, [viewState]);

  useEffect(() => {
    const loadVariant = async () => {
      const variant = await analytics.getLuckyWheelVariant();
      setWheelVariant(variant);
    };
    loadVariant();
  }, []);

  // Listener pour l'haptique "click-click"
  useEffect(() => {
    const listenerId = spinValue.addListener(({ value }) => {
      const step = 40; // Déclenche un haptique tous les 40 degrés
      if (Math.abs(value - lastHapticAngle.current) >= step) {
        lastHapticAngle.current = value;
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    });

    return () => spinValue.removeListener(listenerId);
  }, []);

  useEffect(() => {
    if (!isPersonalizationResolved) return;
    analytics.track('paywall_viewed', {
      ...paywallAnalyticsProperties,
      initial_state: viewState,
      is_onboarding: isFromOnboarding,
      is_discounted: viewState === 'DISCOUNTED' || viewState === 'PROMO_DISCOUNTED',
    });
  }, [isFromOnboarding, isPersonalizationResolved, paywallAnalyticsProperties, viewState]);

  useEffect(() => {
    const loadOfferings = async () => {
      setLoading(true);
      setHasOfferingsError(false);
      try {
        // Un deep link, le quick action ou le reset DEV peuvent monter cet
        // écran avant la fin de l'initialisation asynchrone du layout racine.
        // Interroger Purchases trop tôt renvoie alors une fausse panne réseau.
        await revenueCatService.initialize();
        console.log('[RC][Paywall] loadOfferings:start', {
          viewState,
          source: routeSource || 'direct',
        });

        if (viewState === 'PROMO_DISCOUNTED') {
          let promoDiscountRaw = params.promoDiscount?.toString();

          // Fallback sur AsyncStorage si le paramètre est absent
          if (!promoDiscountRaw)
            promoDiscountRaw = await AsyncStorage.getItem('pending_promo_discount') || '15';

          const promoDiscount = promoDiscountRaw.replace('%', '').trim();

          const offerings = await Purchases.getOfferings();
          const promoOfferingKey = `discount_${promoDiscount}`;
          const promoOffering = offerings.all[promoOfferingKey];

          setBaseOffering(lastStandardOffering.current ?? offerings.current);
          setOffering(promoOffering || offerings.current);
        } else if (viewState === 'DISCOUNTED') {
          const offerings = await Purchases.getOfferings();
          // La roue fixait la remise ; sans elle, c'est la valeur de l'offre de sortie.
          const discountValue = spinResult || EXIT_OFFER_DISCOUNT;
          const discountedOffering = offerings.all[`discount_${discountValue}`];

          if (isFromQuickAction) {
            const quickActionOffering = offerings.all[TRY_FREE_OFFERING_ID];
            const annualDiscountPackage = quickActionOffering?.availablePackages?.find(
              (item) => item.product.identifier === quickActionProductId
            );

            // Cette entrée promet un produit précis. Un fallback silencieux vers
            // l'offering courant afficherait « -80 % » tout en présentant un
            // autre prix : mieux vaut rendre l'erreur récupérable que mentir.
            if (!quickActionOffering || !annualDiscountPackage) {
              analytics.track('paywall_expected_offering_missing', {
                ...paywallAnalyticsProperties,
                offering_id: TRY_FREE_OFFERING_ID,
                product_id: quickActionProductId,
              });
              throw new Error(
                `[RevenueCat] Offering ${TRY_FREE_OFFERING_ID} or product ${quickActionProductId} is unavailable`
              );
            }

            setBaseOffering(lastStandardOffering.current ?? offerings.current);
            setOffering({
              ...quickActionOffering,
              availablePackages: [annualDiscountPackage],
            });
            return;
          }

          setBaseOffering(lastStandardOffering.current ?? offerings.current);
          setOffering(discountedOffering || offerings.current);
        } else {
          // Un placement par branche : l'utilisateur venu pour l'import et celui
          // venu pour la génération n'ont pas la même promesse à se voir vendre.
          // Les deux placements peuvent pointer sur les mêmes produits — seul le
          // metadata (donc le contenu) change.
          const branch = entryFeature ?? (await analytics.getEntryFeature());
          const isOnboarding = routeSource?.includes('onboarding');
          const branchSuffix = branch === 'import' ? '_import' : '_generate';
          const basePlacement = isOnboarding ? 'onboarding_paywall' : 'in_app_paywall';
          const targetPlacement = `${basePlacement}${branchSuffix}`;

          const offerings = await Purchases.getOfferings();

          const purchasesWithPlacement = Purchases as unknown as {
            getCurrentOfferingForPlacement?: (placementIdentifier: string) => Promise<PurchasesOffering | null>;
          };

          if (typeof purchasesWithPlacement.getCurrentOfferingForPlacement === 'function') {
            const resolvePlacement = async (identifier: string): Promise<PurchasesOffering | null> => {
              try {
                return await purchasesWithPlacement.getCurrentOfferingForPlacement!(identifier);
              } catch (placementError) {
                console.error('[RC][Paywall] placement resolve error', {
                  placementRequested: identifier,
                  error: placementError,
                });
                return null;
              }
            };

            // Repli en cascade : tant que les placements par branche n'existent
            // pas côté dashboard, on doit continuer d'honorer les placements
            // actuels plutôt que de sauter directement à l'offering par défaut.
            const placementOffering =
              (await resolvePlacement(targetPlacement)) || (await resolvePlacement(basePlacement));

            console.log('[RC][Paywall] placement resolved', {
              requested: targetPlacement,
              fallback: basePlacement,
              resolved: placementOffering?.identifier ?? 'current',
            });

            lastStandardOffering.current = placementOffering || offerings.current;
            setOffering(placementOffering || offerings.current);
          } else {
            console.log('[RC][Paywall] getCurrentOfferingForPlacement unavailable in SDK');
            lastStandardOffering.current = offerings.current;
            setOffering(offerings.current);
          }
        }
      } catch (e) {
        console.error('❌ Erreur lors du chargement des offres RevenueCat:', e);
        // Le raccourci promet le produit annuel -80 % précis. Si RevenueCat ne
        // le renvoie pas, ne jamais substituer le tarif courant sous un écran
        // remisé : on affiche l'état récupérable et on mesure l'incident.
        if (isFromQuickAction) {
          setOffering(null);
          setHasOfferingsError(true);
          analytics.track('paywall_offerings_unavailable', {
            ...paywallAnalyticsProperties,
            expected_offering_id: TRY_FREE_OFFERING_ID,
            expected_product_id: quickActionProductId,
            error: String(e),
          });
          return;
        }
        try {
          const offerings = await Purchases.getOfferings();
          setOffering(offerings.current);
        } catch (innerError) {
          console.error('❌ Erreur critique fallback offerings:', innerError);
          // Sans offering, l'écran ne peut afficher aucun prix. Il faut le dire
          // et laisser sortir : le retour Android est bloqué ici et, en fin
          // d'onboarding, l'utilisateur n'a aucune autre issue.
          setHasOfferingsError(true);
          analytics.track('paywall_offerings_unavailable', {
            ...paywallAnalyticsProperties,
            error: String(innerError),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadOfferings();
  }, [
    params.promoDiscount,
    viewState,
    spinResult,
    reloadToken,
    entryFeature,
    routeSource,
    isFromQuickAction,
    quickActionProductId,
    paywallAnalyticsProperties,
  ]);

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    analytics.track('lucky_wheel_spun');

    // Choisir un résultat au hasard parmi nos segments
    const randomIndex = Math.floor(Math.random() * discounts.length);
    const result = discounts[randomIndex];

    // Calculer l'angle final (plusieurs tours + l'angle du segment inversé pour la rotation)
    const baseRotation = 360 * 5; // 5 tours complets
    const segmentAngle = 360 / discounts.length;
    // On inverse le calcul pour que l'index visé arrive en haut (sous la flèche)
    const finalAngle = baseRotation + (360 - (randomIndex * segmentAngle + segmentAngle / 2));

    Animated.timing(spinValue, {
      toValue: finalAngle,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinResult(result);
      setIsSpinning(false);
      analytics.track('lucky_wheel_result', { discount: result });

      // Attendre 1 seconde puis afficher le paywall avec réduction automatiquement
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setViewState('DISCOUNTED');
          fadeAnim.setValue(1);
        });
      }, 1000);
    });
  };

  const handleDismiss = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isSubscribed = hasActiveSubscription(customerInfo);

      if (isSubscribed) {
        analytics.track('paywall_dismissed_subscribed', paywallAnalyticsProperties);
        await closePaywallAfterAccess();
        return;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d’abonnement avant la fermeture:', error);
    }

    // Ancienne intention de sortie : la croix ouvrait la roue.
    //
    // Remplacée par l'offre de sortie déclenchée à la fermeture de la feuille de
    // paiement du store (`maybeShowExitOffer`). Fermer le paywall n'exprime
    // qu'un « pas maintenant » ; refermer la feuille de paiement veut dire que
    // l'utilisateur était prêt à payer et s'est ravisé — c'est là que la remise
    // répond à une objection réelle.
    //
    // Le bloc reste câblé pour que rallumer `LUCKY_WHEEL_ENABLED` suffise.
    if (LUCKY_WHEEL_ENABLED && viewState === 'STANDARD' && !hasShownWheelInSession()) {
      markWheelShownInSession();
      analytics.track('paywall_exit_intent_wheel_shown', {
        ...paywallAnalyticsProperties,
      });
      setViewState('WHEEL');
      return;
    }

    // Paywall dur : refuser ne fait pas entrer dans l'app.
    //
    // On renvoie sur `offerTrial`, l'écran qui ouvre la fin de tunnel, plutôt
    // que d'appeler `exitPaywall` — celui-ci poserait `onboarding_completed` et
    // déposerait l'utilisateur sur le home avec un accès qu'il n'a pas pris. La
    // boucle offerTrial → reminder → paywall → roue → offerTrial reste
    // navigable de bout en bout (aucun écran sans issue, restauration et
    // mentions légales toujours accessibles depuis le paywall), et elle survit
    // à un redémarrage puisque l'onboarding n'est jamais marqué terminé.
    if (isFromOnboarding) {
      analytics.track('paywall_declined_onboarding', {
        ...paywallAnalyticsProperties,
        from_state: viewState,
      });

      // Le code promo a sa propre boucle : on revient à l'écran de saisie, où le
      // code est restauré. L'envoyer sur `offerTrial` lui promettrait un essai
      // gratuit que l'offre remisée ne contient pas.
      //
      // Retour arrière quand c'est possible : l'écran promo est alors celui
      // qu'on vient de quitter, avec son état intact, et la pile ne grossit pas
      // d'une entrée à chaque aller-retour. Le `replace` ne sert que si le
      // paywall a été ouvert autrement (reprise d'onboarding, par exemple), et
      // l'écran restaure alors le code depuis le stockage.
      if (viewState === 'PROMO_DISCOUNTED') {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/onboarding/promoCode');
        }
        return;
      }

      router.replace({
        pathname: '/onboarding/offerTrial',
        params: { source: routeSource || 'onboarding_paywall' },
      });
      return;
    }

    // Hors onboarding (paywall ouvert depuis l'app), on rend simplement la main.
    if (router.canGoBack()) {
      router.back();
    } else if (isFromQuickAction) {
      // L'action iOS peut lancer l'app sans pile precedente. Repasser par `/`
      // rend alors la main au routage normal (onboarding ou app selon l'etat)
      // sans valider artificiellement l'onboarding.
      router.replace('/');
    } else {
      await exitPaywall();
    }
  };

  const exitPaywall = async () => {
    // Si on est dans l'onboarding, on marque comme terminé
    if (isFromOnboarding) {
      await analytics.completeOnboarding({
        ...paywallAnalyticsProperties,
        completion_method: 'entitled_access',
      });
      // Reset complet de la pile pour empêcher de revenir à l'onboarding
      navigation.reset({
        index: 0,
        routes: [{ name: '(tabs)' as never }],
      });
      return;
    }

    // Fermer toutes les modales et aller sur home sans retour possible
    router.replace('/(tabs)');
  };

  const closePaywallAfterAccess = async () => {
    if (shouldCompleteOnPurchase) {
      await analytics.completeOnboarding({
        ...paywallAnalyticsProperties,
        completion_method: 'entitled_access',
      });
      navigation.reset({
        index: 0,
        routes: [{ name: '(tabs)' as never }],
      });
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  };

  /**
   * Offre de sortie.
   *
   * Déclenchée quand l'utilisateur referme la feuille de paiement du store sans
   * acheter. C'est le signal d'intention le plus fort du tunnel : il a choisi un
   * plan, ouvert la feuille de paiement, puis reculé. Une remise à ce moment
   * répond à l'objection qu'il vient tout juste d'exprimer.
   *
   * Une seule fois par session, et uniquement depuis un paywall plein tarif :
   * remiser une offre déjà remisée (`DISCOUNTED`, `PROMO_DISCOUNTED`) n'a pas de
   * sens, et une remise qui revient à chaque annulation devient le tarif.
   */
  const maybeShowExitOffer = useCallback((): boolean => {
    if (viewState !== 'STANDARD') return false;
    if (hasShownExitOfferInSession()) return false;

    markExitOfferShownInSession();
    analytics.track('paywall_exit_offer_shown', {
      ...paywallAnalyticsProperties,
      discount: EXIT_OFFER_DISCOUNT,
    });
    setViewState('DISCOUNTED');
    return true;
  }, [viewState, paywallAnalyticsProperties]);

  /**
   * Achat déclenché par notre UI. RevenueCat reste la seule source de vérité sur
   * la transaction : on ne fait que remplacer le rendu, pas la facturation.
   */
  const handlePurchasePackage = async (pack: PurchasesPackage) => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const trial = await resolveTrialEligibilityForPackage(pack);
    analytics.track('purchase_started', {
      ...paywallAnalyticsProperties,
      product_id: pack.product.identifier,
      package_type: pack.packageType,
      price: pack.product.price,
      currency: pack.product.currencyCode,
      entry_feature: entryFeature,
      trial_eligibility: trial.status,
      trial_days: trial.days,
    });

    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      await handlePurchaseCompleted(customerInfo, { productIdentifier: pack.product.identifier });
    } catch (error: any) {
      // L'annulation par l'utilisateur n'est pas une erreur : on ne la remonte ni
      // à Sentry ni comme échec d'achat, sinon le taux d'échec est ininterprétable.
      if (error?.userCancelled) {
        analytics.track('purchase_cancelled', {
          ...paywallAnalyticsProperties,
          product_id: pack.product.identifier,
        });
        maybeShowExitOffer();
      } else {
        console.error('[Paywall] Erreur achat:', error);
        analytics.track('purchase_failed', {
          error: error?.message || String(error),
          ...paywallAnalyticsProperties,
          is_discounted: viewState === 'DISCOUNTED',
          product_id: pack.product.identifier,
        });
        Alert.alert(t('paywall.purchaseErrorTitle'), t('paywall.purchaseErrorDescription'));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePress = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (hasActiveSubscription(customerInfo)) {
        await handleRestoreCompleted(customerInfo);
      } else {
        analytics.track('restore_empty', paywallAnalyticsProperties);
        Alert.alert(t('paywall.restoreTitle'), t('paywall.restoreEmpty'));
      }
    } catch (error) {
      console.error('[Paywall] Erreur restauration:', error);
      Alert.alert(t('paywall.restoreTitle'), t('paywall.restoreError'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePurchaseCompleted = async (info: any, storeTransaction?: any) => {
    // Le prix n'est pas dans la transaction : on le retrouve dans l'offering
    // affiché. Sans ces propriétés, PostHog ne peut comparer que des volumes
    // d'achats, pas du revenu — donc pas les features entre elles.
    const purchasedProduct = storeTransaction?.productIdentifier
      ? offering?.availablePackages?.find(
        (pkg: any) => pkg.product?.identifier === storeTransaction.productIdentifier
      )?.product
      : undefined;

    const activeEntitlement = info?.entitlements?.active?.[ENTITLEMENT_ID];
    analytics.track('subscription_started', {
      entitlements: info.entitlements.active,
      ...paywallAnalyticsProperties,
      is_discounted: viewState === 'DISCOUNTED' || viewState === 'PROMO_DISCOUNTED',
      discount_amount: activeDiscountPercent,
      product_id: storeTransaction?.productIdentifier ?? null,
      price: purchasedProduct?.price ?? null,
      currency: purchasedProduct?.currencyCode ?? null,
      period: purchasedProduct?.subscriptionPeriod ?? null,
      // Un essai gratuit ne produit aucun revenu immédiat : sans ce drapeau, les
      // deux cas se confondent dans les mêmes chiffres.
      is_trial: activeEntitlement
        ? String(activeEntitlement.periodType || '').toUpperCase() === 'TRIAL'
        : null,
      offering_id: offering?.identifier ?? null,
    });

    if (viewState === 'PROMO_DISCOUNTED') {
      try {
        const promoCode = await AsyncStorage.getItem('pending_promo_code');
        const mobileId = await getUniqueDeviceId();
        if (promoCode && mobileId) {
          await apiService.markPromoCodeUsed(promoCode, mobileId);
          await AsyncStorage.removeItem('pending_promo_code');
          await AsyncStorage.removeItem('pending_promo_discount');
        }
      } catch (e) {
        console.error('Erreur marquage code promo utilisé:', e);
      }
    }

    try {
      await syncTrialReminderWithCustomerInfo(info);
    } catch (error) {
      // L'achat reste valide même si le rappel local échoue. L'événement de
      // diagnostic est émis par le service ; on ne bloque jamais l'accès.
      console.warn('[Paywall] Rappel d’essai non planifié:', error);
    }
    await closePaywallAfterAccess();
  };

  const handleRestoreCompleted = async (info: any) => {
    const isSubscribed = hasActiveSubscription(info);

    analytics.track('restore_completed', {
      ...paywallAnalyticsProperties,
      is_discounted: viewState === 'DISCOUNTED',
      restored_subscription: isSubscribed,
    });

    if (!isSubscribed) return;

    await closePaywallAfterAccess();
  };

  const rotation = spinValue.interpolate({
    inputRange: [0, 3600],
    outputRange: ['0deg', '3600deg'],
  });

  return (
    <View style={styles.container}>
      {/* Repli à l'appui long (2s), invisible, en haut à droite pour ne pas
          concurrencer la croix de fermeture. Un émulateur n'a pas
          d'accéléromètre : sans ce repli, la secousse ne déclencherait rien lors
          d'une relecture menée sur émulateur. Supprimable si tu n'en veux pas. */}
      <Pressable
        onLongPress={() => openSecretCodeEntry('long_press')}
        delayLongPress={2000}
        style={[styles.secretTapZone, { top: insets.top }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />

      <Modal
        visible={showCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCodeModal(false)}
      >
        <Pressable style={styles.codeBackdrop} onPress={() => setShowCodeModal(false)}>
          <Pressable style={styles.codeCard} onPress={() => { }}>
            <Text style={styles.codeTitle}>{t('paywall.promoCodeTitle')}</Text>
            <Text style={styles.codeDescription}>{t('paywall.promoCodeDescription')}</Text>

            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={(text) => { setCodeInput(text.toUpperCase()); setCodeError(''); }}
              placeholder={t('paywall.promoCodePlaceholder')}
              placeholderTextColor="#AEAEB2"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmitSecretCode}
              editable={!codeLoading}
            />

            {codeError ? <Text style={styles.codeError}>{codeError}</Text> : null}

            <TouchableOpacity
              style={[styles.codeSubmit, (!codeInput.trim() || codeLoading) && styles.codeSubmitDisabled]}
              onPress={handleSubmitSecretCode}
              disabled={!codeInput.trim() || codeLoading}
              activeOpacity={0.85}
            >
              {codeLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.codeSubmitText}>{t('onboardingPromoCode.validate')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowCodeModal(false)} hitSlop={8}>
              <Text style={styles.codeCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {viewState === 'WHEEL' ? (
        <Animated.View style={[styles.container, styles.wheelContainer, { opacity: fadeAnim }]}>
          {(__DEV__ || canCloseWheel) && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Ionicons name="close" size={28} color={Colors.light.text} />
            </TouchableOpacity>
          )}

          <View style={styles.wheelHeader}>
            <Text style={styles.wheelTitle}>
              {t(`luckyWheel.title_${wheelVariant}`)}
            </Text>
            <Text style={styles.wheelSubtitle}>
              {t(`luckyWheel.subtitle_${wheelVariant}`)}
            </Text>
          </View>

          <View style={[styles.visualContainer, { height: wheelSize * 1.07 }]}>
            <View style={styles.pointerContainer}>
              <Ionicons name="triangle" size={45} color={Colors.light.button} />
            </View>

            <Animated.View
              style={[
                styles.wheelFrame,
                { width: wheelSize, height: wheelSize, borderRadius: wheelSize / 2 },
                { transform: [{ rotate: rotation }] },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <G rotation="-90" origin="50, 50">
                  {/* Segment 1 (0-45°) - 33% - Noir */}
                  <Path d="M50,50 L100,50 A50,50 0 0,1 85.35,85.35 Z" fill="#000000" />
                  {/* Segment 2 (45-90°) - 20% - Couleur bouton */}
                  <Path d="M50,50 L85.35,85.35 A50,50 0 0,1 50,100 Z" fill={Colors.light.button} />
                  {/* Segment 3 (90-135°) - 15% - Blanc */}
                  <Path d="M50,50 L50,100 A50,50 0 0,1 14.65,85.35 Z" fill="#FFFFFF" />
                  {/* Segment 4 (135-180°) - 25% - Couleur bouton */}
                  <Path d="M50,50 L14.65,85.35 A50,50 0 0,1 0,50 Z" fill={Colors.light.button} />
                  {/* Segment 5 (180-225°) - 33% - Noir */}
                  <Path d="M50,50 L0,50 A50,50 0 0,1 14.65,14.65 Z" fill="#000000" />
                  {/* Segment 6 (225-270°) - 20% - Couleur bouton */}
                  <Path d="M50,50 L14.65,14.65 A50,50 0 0,1 50,0 Z" fill={Colors.light.button} />
                  {/* Segment 7 (270-315°) - 15% - Blanc */}
                  <Path d="M50,50 L50,0 A50,50 0 0,1 85.35,14.65 Z" fill="#FFFFFF" />
                  {/* Segment 8 (315-360°) - 25% - Couleur bouton */}
                  <Path d="M50,50 L85.35,14.65 A50,50 0 0,1 100,50 Z" fill={Colors.light.button} />
                </G>
              </Svg>

              {/* Textes positionnés par-dessus (tous les 45°) */}
              <View style={[styles.segment, { transform: [{ rotate: '22.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>33%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '67.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>20%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '112.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#000', fontSize: 18 }]}>15%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '157.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>25%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '202.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>33%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '247.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>20%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '292.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#000', fontSize: 18 }]}>15%</Text>
              </View>
              <View style={[styles.segment, { transform: [{ rotate: '337.5deg' }] }]}>
                <Text style={[styles.segmentText, { color: '#fff', fontSize: 18 }]}>25%</Text>
              </View>

              {/* Centre de la roue avec mascotte */}
              <View style={styles.wheelCenter}>
                <Image
                  source={require('../assets/images/mascot.png')}
                  style={styles.wheelMascot}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </View>

          {/* `insets.bottom` seul collait le bouton au bord sur les appareils
              sans home indicator (iPhone SE, Android à boutons). */}
          <View style={[styles.wheelFooter, { bottom: Math.max(insets.bottom, 20) + 12 }]}>
            {spinResult ? (
              <Animated.View style={styles.resultContainer}>
                <Text style={styles.congratsText}>{t('luckyWheel.congrats')}</Text>
                <Text style={styles.resultText}>
                  {t('luckyWheel.result', { discount: spinResult })}
                </Text>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[styles.spinButton, isSpinning && styles.disabledButton]}
                onPress={handleSpin}
                disabled={isSpinning}
              >
                <Text style={styles.spinButtonText}>
                  {t('luckyWheel.spin')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <View style={styles.loadingModalOverlay}>
              <ActivityIndicator size="large" color={Colors.light.button} />
              <Text style={styles.loadingText}>
                {t('paywall.loading')}
              </Text>
            </View>
          ) : hasOfferingsError || !offering ? (
            // Aucun prix affichable : on ne retient pas l'utilisateur sur un
            // écran vide, il doit pouvoir réessayer ou continuer sans payer.
            <View style={styles.loadingModalOverlay}>
              <Ionicons name="cloud-offline-outline" size={44} color={Colors.light.textSecondary} />
              <Text style={styles.loadingText}>{t('paywall.offeringsUnavailable')}</Text>
              <TouchableOpacity
                style={styles.errorRetryButton}
                onPress={() => setReloadToken((token) => token + 1)}
                activeOpacity={0.85}
              >
                <Text style={styles.errorRetryText}>{t('shareIntent.retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDismiss} activeOpacity={0.7} style={{ paddingVertical: 12 }}>
                <Text style={styles.errorDismissText}>{t('paywall.continueWithoutOffer')}</Text>
              </TouchableOpacity>
            </View>
          ) : viewState === 'DISCOUNTED' ? (
            <ExitOfferPaywallView
              key={offering.identifier || 'discount'}
              offering={offering}
              baseOffering={baseOffering}
              onPurchase={handlePurchasePackage}
              onRestore={handleRestorePress}
              onClose={handleDismiss}
              closeDelayMs={3000}
              testimonialKey={paywallCopy.testimonialKey}
              isPurchasing={isPurchasing}
              isRestoring={isRestoring}
            />
          ) : (
            <PaywallView
              key={offering.identifier || 'default'}
              offering={offering}
              copy={paywallCopy}
              onPurchase={handlePurchasePackage}
              onRestore={handleRestorePress}
              onClose={handleDismiss}
              closeDelayMs={3000}
              singleOffer={viewState === 'PROMO_DISCOUNTED'}
              isPurchasing={isPurchasing}
              isRestoring={isRestoring}
              discountPercent={activeDiscountPercent}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secretTapZone: {
    position: 'absolute',
    right: 0,
    width: 72,
    height: 72,
    zIndex: 50,
  },
  codeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  codeCard: {
    backgroundColor: '#FDF9E2',
    borderRadius: 24,
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  codeTitle: {
    fontSize: font(22),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
  },
  codeDescription: {
    fontSize: font(14),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: font(18),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
  },
  codeError: {
    fontSize: font(13),
    fontFamily: 'CronosPro',
    color: '#D9534F',
    textAlign: 'center',
  },
  codeSubmit: {
    width: '100%',
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  codeSubmitDisabled: {
    opacity: 0.5,
  },
  codeSubmitText: {
    color: '#fff',
    fontSize: font(17),
    fontFamily: 'Degular',
  },
  codeCancel: {
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 10,
  },
  wheelContainer: {
    paddingTop: 70,
    alignItems: 'center',
    backgroundColor: '#FDF9E2',
  },
  wheelHeader: {
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 40,
  },
  wheelTitle: {
    fontSize: font(32),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Degular'
  },
  wheelSubtitle: {
    fontSize: font(16),
    fontFamily: 'CronosPro',
    color: '#8C8C8C',
    textAlign: 'center',
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    // height fourni à l'usage (dérivé de wheelSize).
  },
  pointerContainer: {
    position: 'absolute',
    top: -10,
    zIndex: 5,
    transform: [{ rotate: '180deg' }],
  },
  wheelFrame: {
    // width / height / borderRadius fournis à l'usage.
    borderWidth: 8,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  segment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  segmentText: {
    fontSize: 24,
    transform: [{ rotate: '0deg' }],
    fontFamily: 'Degular'
  },
  wheelCenter: {
    position: 'absolute',
    top: '35%',
    left: '35%',
    width: '30%',
    height: '30%',
    backgroundColor: 'white',
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  wheelMascot: {
    width: '100%',
    height: '100%',
  },
  wheelFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    maxWidth: CONTENT_MAX_WIDTH + 60,
    alignSelf: 'center',
  },
  spinButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  spinButtonText: {
    color: 'white',
    fontSize: font(20),
    fontFamily: 'Degular'
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  resultContainer: {
    alignItems: 'center',
    gap: 10,
  },
  congratsText: {
    fontSize: 24,
    color: Colors.light.button,
    fontFamily: 'Degular'
  },
  resultText: {
    fontSize: 18,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  claimButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
  },
  claimButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Degular'
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
    paddingHorizontal: 32,
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
  errorRetryButton: {
    marginTop: 24,
    backgroundColor: Colors.light.button,
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  errorRetryText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Degular',
  },
  errorDismissText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
});

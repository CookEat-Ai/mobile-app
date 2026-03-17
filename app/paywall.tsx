import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Animated, Easing, Alert, Dimensions, Image, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path } from 'react-native-svg';
import analytics from '../services/analytics';
import apiService from '../services/api';
import { getUniqueDeviceId } from '../services/deviceStorage';
import { Colors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { ENTITLEMENT_ID } from '../config/revenuecat';
import { hasShownWheelInSession, markWheelShownInSession } from '../services/sessionFlags';

const { width } = Dimensions.get('window');

type PaywallState = 'STANDARD' | 'WHEEL' | 'DISCOUNTED' | 'PROMO_DISCOUNTED';
const TRIAL_REMINDER_TYPE = 'trial_ending_reminder';

export default function PaywallScreen() {
  const scheduleTrialReminderIfNeeded = async (customerInfo: any): Promise<void> => {
    try {
      const activeEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      if (!activeEntitlement) return;

      const periodType = String(activeEntitlement.periodType || '').toUpperCase();
      if (periodType !== 'TRIAL') return;

      const expirationDate = activeEntitlement.expirationDate
        ? new Date(activeEntitlement.expirationDate)
        : null;
      if (!expirationDate || Number.isNaN(expirationDate.getTime())) return;

      const reminderDate = new Date(expirationDate.getTime() - (24 * 60 * 60 * 1000));
      if (reminderDate.getTime() <= Date.now()) {
        console.log('[Notifications] Trial reminder skipped: reminder date already passed');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const permissionResponse = await Notifications.requestPermissionsAsync();
        finalStatus = permissionResponse.status;
      }
      if (finalStatus !== 'granted') {
        console.log('[Notifications] Trial reminder skipped: permissions not granted');
        return;
      }

      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduledNotifications
          .filter((notification) => notification?.content?.data?.type === TRIAL_REMINDER_TYPE)
          .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.trialEndingTitle'),
          body: t('notifications.trialEndingBody'),
          data: { type: TRIAL_REMINDER_TYPE },
        },
        trigger: reminderDate as any,
      });

      console.log('[Notifications] Trial reminder scheduled at', reminderDate.toISOString());
    } catch (error) {
      console.error('[Notifications] Failed to schedule trial reminder:', error);
    }
  };

  const hasActiveSubscription = (customerInfo: any): boolean => {
    const active = customerInfo?.entitlements?.active || {};
    return Boolean(active[ENTITLEMENT_ID]) || Object.keys(active).length > 0;
  };

  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const getInitialState = useCallback((): PaywallState => {
    const s = Array.isArray(params.initialState) ? params.initialState[0] : params.initialState;
    if (s === 'WHEEL') return 'WHEEL';
    if (s === 'DISCOUNTED') return 'DISCOUNTED';
    if (s === 'PROMO_DISCOUNTED') return 'PROMO_DISCOUNTED';
    return 'STANDARD';
  }, [params.initialState]);

  const [viewState, setViewState] = useState<PaywallState>(getInitialState());

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
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [wheelVariant, setWheelVariant] = useState<'A' | 'B'>('A');

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
          if (params.source?.toString().includes('onboarding')) {
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
    if (viewState === 'STANDARD' || (viewState === 'WHEEL' && params.initialState === 'WHEEL')) {
      const isFromOnboarding = params.source?.toString().includes('onboarding');
      analytics.track('paywall_viewed', {
        source: params.source || 'direct',
        initial_state: viewState,
        is_onboarding: !!isFromOnboarding
      });
    }

    const loadOfferings = async () => {
      setLoading(true);
      try {
        console.log('[RC][Paywall] loadOfferings:start', {
          viewState,
          source: params.source || 'direct',
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

          setOffering(promoOffering || offerings.current);
        } else if (viewState === 'DISCOUNTED') {
          const offerings = await Purchases.getOfferings();
          // Utiliser spinResult s'il existe, sinon fallback sur 33
          const discountValue = spinResult || 33;
          const discountedOffering = offerings.all[`discount_${discountValue}`];

          setOffering(discountedOffering || offerings.current);
        } else {
          const targetPlacement = params.source?.toString().includes('onboarding')
            ? 'onboarding_paywall'
            : 'in_app_paywall';

          const offerings = await Purchases.getOfferings();

          const purchasesWithPlacement = Purchases as unknown as {
            getCurrentOfferingForPlacement?: (placementIdentifier: string) => Promise<PurchasesOffering | null>;
          };

          if (typeof purchasesWithPlacement.getCurrentOfferingForPlacement === 'function') {
            let placementOffering: PurchasesOffering | null = null;
            try {
              placementOffering = await purchasesWithPlacement.getCurrentOfferingForPlacement(targetPlacement);
            } catch (placementError) {
              console.error('[RC][Paywall] placement resolve error', {
                placementRequested: targetPlacement,
                error: placementError,
              });
            }

            // IMPORTANT: on résout l'offering via le placement puis on passe cette offering à RevenueCatUI.
            setOffering(placementOffering || offerings.current);
          } else {
            console.log('[RC][Paywall] getCurrentOfferingForPlacement unavailable in SDK');
            setOffering(offerings.current);
          }
        }
      } catch (e) {
        console.error('❌ Erreur lors du chargement des offres RevenueCat:', e);
        try {
          const offerings = await Purchases.getOfferings();
          setOffering(offerings.current);
        } catch (innerError) {
          console.error('❌ Erreur critique fallback offerings:', innerError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadOfferings();
  }, [params.source, params.promoDiscount, viewState, spinResult]);

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
        analytics.track('paywall_dismissed_subscribed', { source: params.source || 'direct' });

        if (params.source?.toString().includes('onboarding')) {
          await exitPaywall();
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d’abonnement avant la fermeture:', error);
    }

    if (params.source?.toString().includes('onboarding')) {
      // Si on est dans l'onboarding, on affiche l'alerte de perte de données
      Alert.alert(
        t('onboarding.reminder.lossPersonalizationTitle'),
        t('onboarding.reminder.lossPersonalizationDescription'),
        [
          {
            text: t('onboarding.reminder.continueAnyway'),
            style: 'destructive',
            onPress: () => {
              exitPaywall();
            }
          },
          {
            text: t('onboarding.reminder.goBack'),
            style: 'cancel',
            onPress: () => {
              analytics.track('onboarding_retention_alert_stay');
            }
          }
        ]
      );
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        exitPaywall();
      }
    }
  };

  const exitPaywall = async () => {
    // Si on est dans l'onboarding, on marque comme terminé
    if (params.source?.toString().includes('onboarding')) {
      await AsyncStorage.setItem('onboarding_completed', 'true');
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
    if (params.source?.toString().includes('onboarding')) {
      await exitPaywall();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  };

  const handlePurchaseCompleted = async (info: any) => {
    analytics.track('subscription_started', {
      entitlements: info.entitlements.active,
      source: params.source,
      is_discounted: viewState === 'DISCOUNTED' || viewState === 'PROMO_DISCOUNTED',
      discount_amount: viewState === 'PROMO_DISCOUNTED' ? params.promoDiscount : spinResult,
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

    await scheduleTrialReminderIfNeeded(info);
    await closePaywallAfterAccess();
  };

  const handleRestoreCompleted = async (info: any) => {
    const isSubscribed = hasActiveSubscription(info);

    analytics.track('restore_completed', {
      source: params.source || 'direct',
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
      {viewState === 'WHEEL' ? (
        <Animated.View style={[styles.container, styles.wheelContainer, { opacity: fadeAnim }]}>
          {__DEV__ && <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
            <Ionicons name="close" size={28} color={Colors.light.text} />
          </TouchableOpacity>}

          <View style={styles.wheelHeader}>
            <Text style={styles.wheelTitle}>
              {t(`luckyWheel.title_${wheelVariant}`)}
            </Text>
            <Text style={styles.wheelSubtitle}>
              {t(`luckyWheel.subtitle_${wheelVariant}`)}
            </Text>
          </View>

          <View style={styles.visualContainer}>
            <View style={styles.pointerContainer}>
              <Ionicons name="triangle" size={45} color={Colors.light.button} />
            </View>

            <Animated.View style={[styles.wheelFrame, { transform: [{ rotate: rotation }] }]}>
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

          <View style={[styles.wheelFooter, { bottom: Platform.OS === 'android' ? insets.bottom + 20 : insets.bottom }]}>
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
          {loading || !offering ? (
            <View style={styles.loadingModalOverlay}>
              <ActivityIndicator size="large" color={Colors.light.button} />
              <Text style={styles.loadingText}>
                {t('paywall.loading')}
              </Text>
            </View>
          ) : (
            <RevenueCatUI.Paywall
              key={offering.identifier || 'default'}
              options={{ offering }}
              onDismiss={handleDismiss}
              onPurchaseCompleted={({ customerInfo: info }) => {
                handlePurchaseCompleted(info);
              }}
              onRestoreCompleted={({ customerInfo: info }) => {
                handleRestoreCompleted(info);
              }}
              onPurchaseError={({ error }) => {
                analytics.track('purchase_failed', {
                  error: error.message,
                  source: params.source,
                  is_discounted: viewState === 'DISCOUNTED'
                });
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 32,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Degular'
  },
  wheelSubtitle: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: '#8C8C8C',
    textAlign: 'center',
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: width * 0.8,
    width: width,
  },
  pointerContainer: {
    position: 'absolute',
    top: -10,
    zIndex: 5,
    transform: [{ rotate: '180deg' }],
  },
  wheelFrame: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
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
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
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
    fontSize: 20,
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
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
});

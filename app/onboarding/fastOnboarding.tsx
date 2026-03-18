import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import apiService from '../../services/api';
import revenueCatService from '../../config/revenuecat';
import { IconSymbol } from '../../components/ui/IconSymbol';

const { width } = Dimensions.get('window');

const TUTORIAL_IMAGES_IOS = [
  require('../../assets/images/tuto/ios/tuto-import-tiktok-1.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-2.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-3.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-4.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-5.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-6.png'),
];

const TUTORIAL_IMAGES_ANDROID = [
  require('../../assets/images/tuto/android/tuto-import-tiktok-1.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-2.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-3.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-4.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-5.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-6.png'),
];

const RatingBadge = ({ style }: { style?: any }) => {
  return (
    <Animated.View style={[styles.ratingBadgeContainer, style]}>
      <View style={styles.ratingBadgeContent}>
        <View style={styles.laurelContainer}>
          <Ionicons
            name="leaf"
            size={32}
            color="#F3D0B0"
            style={{ transform: [{ scaleX: -1 }, { rotate: '-30deg' }] }}
          />
        </View>
        <View style={styles.ratingBadgeCenter}>
          <Text style={styles.ratingBadgeScore}>5.0</Text>
          <View style={styles.ratingBadgeStars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name="star" size={16} color="#FEB50A" />
            ))}
          </View>
        </View>
        <View style={styles.laurelContainer}>
          <Ionicons
            name="leaf"
            size={32}
            color="#F3D0B0"
            style={{ transform: [{ rotate: '30deg' }] }}
          />
        </View>
      </View>
    </Animated.View>
  );
};

export default function FastOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const [step, setStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);

  // Anims
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;

  // Step 1: Tutorial State
  const [activeTutoIndex, setActiveTutoIndex] = useState(0);
  const TUTORIAL_IMAGES = Platform.OS === 'ios' ? TUTORIAL_IMAGES_IOS : TUTORIAL_IMAGES_ANDROID;

  // Step 3: Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);

  // Step 4: Personalized Recipes State
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    // Preload tutorial images
    Asset.loadAsync([
      ...TUTORIAL_IMAGES,
      require('../../assets/images/iphone.png'),
      require('../../assets/images/android.png'),
    ]);

    // Set total steps based on variant
    (async () => {
      const v = await analytics.getOnboardingVariant();
      setTotalSteps(v === 'E' ? 4 : 6);
    })();

    // Load answers for personalization (even if empty for E/F, we try)
    const loadAnswers = async () => {
      try {
        const keys = ['cookingTime', 'question_13', 'diet', 'question_17'];
        const results = await Promise.all(keys.map((k) => AsyncStorage.getItem(k)));
        const answers: Record<string, string> = {};
        keys.forEach((key, i) => {
          if (results[i]) answers[key] = results[i]!;
        });
        setUserAnswers(answers);
      } catch { }
    };
    loadAnswers();

    // Initial Mascot Anim
    Animated.timing(mascotOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Update Progress Bar
    const progress = step / (totalSteps - 1); // Full bar on last step
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Track step
    const stepNames = ['ahaMoment', 'tutorial', 'socialProof', 'promoCode', 'personalized', 'reminder'];
    analytics.track(`onboarding_fast_${stepNames[step]}_viewed`);

    if (step === 3) {
      setTimeout(() => {
        analytics.requestTrackingPermission();
      }, 1000);
    }
  }, [step, totalSteps]);

  const nextStep = async () => {
    const variant = await analytics.getOnboardingVariant();

    // Logic for branching between E and F
    if (step === 3 && variant === 'E') {
      // Variant E skips Personalized and Reminder
      finishOnboarding();
      return;
    }

    // Si on a un code promo 100%, on ne montre pas le reminder (étape 5)
    if (step === 4 && discountPercent === 100) {
      finishOnboarding();
      return;
    }

    if (step < totalSteps - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setStep(step + 1);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    const variant = await analytics.getOnboardingVariant();

    // For fast onboarding, we always go to paywall at the end of the flow
    const source = variant === 'E' ? 'onboarding_variant_e' : 'onboarding_variant_f';
    
    // Vérifier si un code promo premium a déjà été activé
    const isPremium = await revenueCatService.isPromoCodeActivated();
    if (isPremium) {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(tabs)');
      return;
    }

    const pendingDiscount = await AsyncStorage.getItem('pending_promo_discount');

    if (pendingDiscount) {
      router.replace({
        pathname: '/paywall',
        params: {
          source,
          initialState: 'PROMO_DISCOUNTED',
          promoDiscount: pendingDiscount,
        },
      });
    } else {
      router.replace({ pathname: '/paywall', params: { source } });
    }
  };

  const handlePromoValidate = async () => {
    if (!promoCode.trim()) return;
    Keyboard.dismiss();
    setPromoError('');
    setIsPromoLoading(true);

    try {
      const response = await apiService.validatePromoCode(promoCode.trim());
      if (response.data?.isValid && response.data.discountPercentage) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPromoSuccess(true);
        setDiscountPercent(response.data.discountPercentage);

        // Si c'est un code premium (100% de réduction), on l'active directement
        if (response.data.discountPercentage === 100) {
          await revenueCatService.activatePromoCode(promoCode.trim());
          analytics.track('onboarding_fast_promo_premium_activated');
        } else {
          await AsyncStorage.setItem('pending_promo_code', promoCode.trim().toUpperCase());
          await AsyncStorage.setItem('pending_promo_discount', String(response.data.discountPercentage));
        }

        analytics.track('onboarding_fast_promo_valid', { discount: response.data.discountPercentage });
        setTimeout(() => nextStep(), 1200);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPromoError(response.error || t('onboardingPromoCode.invalid'));
      }
    } catch {
      setPromoError(t('onboardingPromoCode.error'));
    } finally {
      setIsPromoLoading(false);
    }
  };

  // --- RENDER STEPS ---

  const renderAhaMoment = () => (
    <View style={{ ...styles.stepContent, justifyContent: 'center' }}>
      <View style={styles.ahaIconContainer}>
        <Text style={styles.emojiLarge}>📷</Text>
      </View>
      <Text style={styles.title}>{t('onboarding.ahaMoment.title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.ahaMoment.subtitle')}</Text>
    </View>
  );

  const renderTutorial = () => {
    const itemWidth = width - 140;
    const padding = 70;

    const renderTutoItem = ({ item, index }: { item: any; index: number }) => (
      <View style={[styles.tutoCarouselItem, { width: itemWidth }]}>
        <View style={styles.iphoneWrapper}>
          <Image source={item} style={styles.tutoImage} priority={index === 0 ? 'high' : 'normal'} />
          <Image
            source={
              Platform.OS === 'ios'
                ? require('../../assets/images/iphone.png')
                : require('../../assets/images/android.png')
            }
            style={styles.iphoneFrame}
          />
        </View>
      </View>
    );

    return (
      <View style={[styles.stepContent, { paddingTop: 0 }]}>
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={styles.titleSmall}>{t('onboardingVideoImport.title')}</Text>
          <Text style={styles.subtitleSmall}>{t('onboardingVideoImport.subtitle')}</Text>
          <Text style={styles.howToText}>{t('onboardingVideoImport.howTo')}</Text>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            data={TUTORIAL_IMAGES}
            renderItem={renderTutoItem}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={itemWidth}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
              if (idx !== activeTutoIndex) {
                setActiveTutoIndex(idx);
                Haptics.selectionAsync();
              }
            }}
            scrollEventThrottle={16}
            style={styles.flatList}
            contentContainerStyle={{ paddingHorizontal: padding }}
            removeClippedSubviews={false}
          />
          <View style={styles.pagination}>
            {TUTORIAL_IMAGES.map((_, i) => (
              <View key={i} style={[styles.dot, activeTutoIndex === i && styles.activeDot]} />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderSocialProof = () => {
    const count = i18n.language.startsWith('fr') ? '10 000' : '10,000';
    const parts = (t as any)('onboarding.socialProof.title', { count }).split(
      new RegExp(`(${count})`)
    );
    const reviews = [
      {
        id: 1,
        name: 'Marie L.',
        rating: 5,
        text: t('onboarding.socialProof.review1'),
      },
      {
        id: 2,
        name: 'Thomas D.',
        rating: 5,
        text: t('onboarding.socialProof.review2'),
      },
      {
        id: 3,
        name: 'Julie M.',
        rating: 5,
        text: t('onboarding.socialProof.review3'),
      },
    ];

    return (
      <View style={styles.stepContent}>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>{t('onboarding.socialProof.topBadge')}</Text>
        </View>
        <Text style={styles.title}>
          {parts.map((p: string, i: number) => (
            <Text key={i} style={p === count ? styles.highlight : null}>
              {p}
            </Text>
          ))}
          <Text> 🎉</Text>
        </Text>
        <View style={styles.ratingSection}>
          <Text style={styles.ratingPrompt}>{t('onboarding.socialProof.subtitle')}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name="star" size={28} color="#FEB50A" />
            ))}
          </View>
        </View>
        <View style={styles.reviewsContainer}>
          {reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.name}</Text>
                <View style={styles.starsSmall}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star" size={12} color="#FEB50A" />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPromoCode = () => (
    <View style={styles.stepContent}>
      <View style={styles.promoIconContainer}>
        <Ionicons name="pricetag" size={48} color={Colors.light.button} />
      </View>
      <Text style={styles.title}>{t('onboardingPromoCode.title')}</Text>
      <Text style={styles.subtitle}>{t('onboardingPromoCode.subtitle')}</Text>

      <View
        style={[
          styles.inputContainer,
          promoError ? styles.inputError : null,
          promoSuccess ? styles.inputSuccess : null,
        ]}
      >
        <TextInput
          style={styles.input}
          value={promoCode}
          onChangeText={(txt) => {
            setPromoCode(txt.toUpperCase());
            setPromoError('');
          }}
          placeholder={t('onboardingPromoCode.placeholder')}
          autoCapitalize="characters"
          editable={!promoSuccess}
        />
        {promoSuccess && <Ionicons name="checkmark-circle" size={24} color="#34C759" />}
      </View>
      {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}
      {promoSuccess && discountPercent && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            {t('onboardingPromoCode.success', { discount: discountPercent })}
          </Text>
        </View>
      )}
    </View>
  );

  const renderPersonalizedRecipes = () => {
    const categories = [
      {
        id: '1',
        emoji: '🕒',
        title: t('onboarding.personalizedCategories.quick.title'),
        description: t('onboarding.personalizedCategories.quick.description'),
        rotation: '-2deg',
      },
      {
        id: '2',
        emoji: '🌍',
        title: t('onboarding.personalizedCategories.chef.title'),
        description: t('onboarding.personalizedCategories.chef.description'),
        rotation: '1.5deg',
      },
      {
        id: '3',
        emoji: '🥗',
        title: t('onboarding.personalizedCategories.balanced.title'),
        description: t('onboarding.personalizedCategories.balanced.description'),
        rotation: '-1deg',
      },
      {
        id: '4',
        emoji: '🔥',
        title: t('onboarding.personalizedCategories.gourmet.title'),
        description: t('onboarding.personalizedCategories.gourmet.description'),
        rotation: '2deg',
      },
    ];

    return (
      <View style={styles.stepContent}>
        <View style={styles.cardsContainerPersonalized}>
          {categories.map((item) => (
            <View key={item.id} style={[styles.cardPersonalized, { transform: [{ rotate: item.rotation }] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.emojiContainerSmall}>
                  <Text style={styles.emojiSmall}>{item.emoji}</Text>
                </View>
                <Text style={styles.cardTitleSmall}>{item.title}</Text>
              </View>
              <Text style={styles.cardDescriptionSmall}>{item.description}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.title, { marginTop: 10 }]}>{t('onboarding.personalizedTitle')}</Text>
      </View>
    );
  };

  const renderReminder = () => {
    const fullText = t('onboarding.reminder.title', { days: '1' });
    const parts = fullText.split(/(1 jour|1 day)/);

    return (
      <View style={styles.stepContent}>
        <View style={styles.centerSectionReminder}>
          <Text style={styles.emojiLarge}>🔔</Text>
          <Text style={styles.title}>
            {parts.map((part, index) => (
              <Text key={index} style={part.match(/1 jour|1 day/) ? styles.highlight : null}>
                {part}
              </Text>
            ))}
          </Text>
        </View>
        <View style={styles.checkContainer}>
          <Ionicons name="checkmark" size={20} color={Colors.light.text} />
          <Text style={styles.checkText}>{t('onboarding.offerTrial.noPayment')}</Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: Platform.OS === 'ios' ? 40 : insets.bottom + 20,
        },
      ]}
    >
      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Animated.View style={[styles.mascotHeader, { opacity: mascotOpacity }]}>
          <Image
            source={require('../../assets/images/mascot.png')}
            style={styles.mascotSmall}
          />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {step === 1 ? (
            /* Pour l'étape 1 (Tuto), on n'utilise pas de ScrollView parente et pas de TouchableWithoutFeedback */
            <View style={styles.stepContentFull}>{renderTutorial()}</View>
          ) : step === 4 ? (
            /* Pour l'étape 4 (Recettes perso), on veut que ça tienne sur un écran sans scroll */
            <View style={{ flex: 1, paddingHorizontal: 24 }}>{renderPersonalizedRecipes()}</View>
          ) : step === 3 ? (
            /* Uniquement pour le Code Promo, on gère la fermeture du clavier */
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1, paddingHorizontal: 24 }}>{renderPromoCode()}</View>
            </TouchableWithoutFeedback>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {step === 0 && renderAhaMoment()}
              {step === 2 && renderSocialProof()}
              {step === 5 && renderReminder()}
            </ScrollView>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.bottomSection}>
          {step === 0 && (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mainButton}
                onPress={() => {
                  analytics.track('onboarding_fast_camera_click');
                  router.push({ pathname: '/camera', params: { isOnboarding: 'true' } });
                }}
              >
                <IconSymbol name="camera.fill" size={24} color="white" />
                <Text style={styles.mainButtonText}>{t('onboarding.ahaMoment.cameraButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={nextStep}>
                <Text style={styles.skipButtonText}>{t('onboarding.ahaMoment.skip')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 1 && (
            <TouchableOpacity activeOpacity={0.8} style={styles.mainButton} onPress={nextStep}>
              <Text style={styles.mainButtonText}>{t('onboardingVideoImport.button')}</Text>
            </TouchableOpacity>
          )}

          {step === 2 && (
            <TouchableOpacity activeOpacity={0.8} style={styles.mainButton} onPress={nextStep}>
              <Text style={styles.mainButtonText}>{t('onboarding.socialProof.button')}</Text>
            </TouchableOpacity>
          )}

          {step === 3 && (
            <>
              {!promoSuccess && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.mainButton, !promoCode.trim() && styles.disabledButton]}
                  onPress={handlePromoValidate}
                  disabled={!promoCode.trim() || isPromoLoading}
                >
                  {isPromoLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.mainButtonText}>{t('onboardingPromoCode.validate')}</Text>
                  )}
                </TouchableOpacity>
              )}
              {!promoSuccess && (
                <TouchableOpacity style={styles.skipButton} onPress={nextStep}>
                  <Text style={styles.skipButtonText}>{t('onboardingPromoCode.skip')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {step === 4 && (
            <TouchableOpacity activeOpacity={0.8} style={styles.mainButton} onPress={nextStep}>
              <Text style={styles.mainButtonText}>{t('onboarding.go')}</Text>
            </TouchableOpacity>
          )}

          {step === 5 && (
            <TouchableOpacity activeOpacity={0.8} style={styles.mainButton} onPress={nextStep}>
              <Text style={styles.mainButtonText}>{t('onboarding.reminder.button')}</Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 10,
    backgroundColor: '#F1EACB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.button,
    borderRadius: 10,
  },
  mascotHeader: {
    marginTop: 20,
    transform: [{ rotate: '15deg' }],
  },
  mascotSmall: {
    width: 60,
    height: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  stepContent: {
    alignItems: 'center',
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.1,
    marginBottom: 12,
  },
  titleSmall: {
    fontSize: 24,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'CronosPro',
    color: '#8C8C8C',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  subtitleSmall: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  bottomSection: {
    paddingTop: 10,
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  mainButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  stepContentFull: {
    flex: 1,
  },

  // Aha
  ahaIconContainer: {
    marginBottom: 20,
  },
  emojiLarge: {
    fontSize: width * 0.15,
  },

  // Tuto
  carouselContainer: {
    width: '100%',
    marginTop: 10,
  },
  flatList: {
    flexGrow: 0,
  },
  tutoCarouselItem: {
    alignItems: 'center',
  },
  iphoneWrapper: {
    width: width * 0.55,
    aspectRatio: 538 / 1076,
    position: 'relative',
  },
  iphoneFrame: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    zIndex: 2,
  },
  tutoImage: {
    position: 'absolute',
    width: '89.5%',
    height: '98%',
    top: '2%',
    left: '5.25%',
    borderRadius: 24,
    zIndex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  activeDot: {
    backgroundColor: Colors.light.button,
    width: 16,
  },
  howToText: {
    fontSize: 15,
    fontFamily: 'CronosProBold',
    color: Colors.light.text,
    textAlign: 'center'
  },

  // Social Proof
  topBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FEB50A',
    marginBottom: 16,
  },
  topBadgeText: {
    color: '#FEB50A',
    fontSize: 14,
    fontFamily: 'Degular',
  },
  highlight: {
    color: Colors.light.button,
  },
  ratingSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingPrompt: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Degular',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewsContainer: {
    width: '100%',
    gap: 10,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewName: {
    fontSize: 15,
    color: Colors.light.text,
    fontFamily: 'Degular',
  },
  starsSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontFamily: 'CronosPro',
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  // Promo
  promoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(254, 181, 10, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#F2F2F7',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputSuccess: {
    borderColor: '#34C759',
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Degular',
    color: Colors.light.text,
    paddingVertical: 14,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'CronosPro',
    marginTop: 8,
    textAlign: 'center',
  },
  successContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
  },
  successText: {
    color: '#34C759',
    fontSize: 15,
    fontFamily: 'CronosProBold',
    textAlign: 'center',
  },

  // Personalized
  cardsContainerPersonalized: {
    width: '100%',
    gap: -15,
  },
  cardPersonalized: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 12,
    gap: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emojiContainerSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiSmall: {
    fontSize: 22,
  },
  cardTitleSmall: {
    fontSize: 22,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardDescriptionSmall: {
    fontSize: 16,
    fontFamily: 'CronosProBold',
    color: '#8C8C8C',
    lineHeight: 16,
  },

  // Reminder
  centerSectionReminder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.7,
    marginTop: 20,
  },
  checkText: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
  },

  ratingBadgeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadgeCenter: {
    alignItems: 'center',
  },
  ratingBadgeScore: {
    fontSize: 32,
    color: '#333',
    lineHeight: 36,
    fontFamily: 'Degular',
  },
  ratingBadgeStars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -4,
  },
  laurelContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

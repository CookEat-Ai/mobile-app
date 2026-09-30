import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { feedback } from '../../services/haptics';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import apiService from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { formatNumber } from '../../components/onboarding/projectionFormat';

/** Écran d'accueil du parcours unique de planification hebdomadaire. */
export default function WelcomeVideoScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { width, height, layoutWidth, font } = useResponsive();
  const { fontScale } = useWindowDimensions();
  const [bodyHeight, setBodyHeight] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  // Le texte prend sa hauteur naturelle ; la mascotte utilise la place restante.
  const mascotSize = Math.min(layoutWidth * 0.8, heroHeight * 0.9);
  const copyBudget = bodyHeight * 0.72;
  const curveWidth = width * 2.5;
  const curveHeight = curveWidth * 1.026;
  const curveLeft = -(curveWidth - width) / 2;

  const [isStarting, setIsStarting] = useState(false);

  const mascotTranslateY = useRef(new Animated.Value(height * 0.25)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    analytics.track('onboarding_started');
    analytics.track('onboarding_welcome_viewed', {
      onboarding_focus: 'weekly_planning',
      planning_horizon_days: 7,
    });

    // AppsFlyer attend au maximum 10 secondes la réponse ATT. La demander sur
    // le véritable premier écran garde l'IDFA disponible pour l'attribution de
    // l'installation au lieu d'attendre la fin de l'onboarding.
    const trackingTimer = setTimeout(() => {
      analytics.requestTrackingPermission();
    }, 800);

    return () => clearTimeout(trackingTimer);
  }, []);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(mascotTranslateY, {
        toValue: 0,
        stiffness: 110,
        damping: 13,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]);

    const content = Animated.stagger(320, [
      Animated.delay(320),
      Animated.timing(titleOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(socialOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(cardsOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotScale, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mascotScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    entrance.start(() => pulse.start());
    content.start();

    return () => pulse.stop();
  }, [cardsOpacity, mascotOpacity, mascotScale, mascotTranslateY, socialOpacity, titleOpacity]);

  const handleMascotPress = () => {
    feedback.confirm();
    pressRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(pressScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence(
        [1, -1, 1, -1, 0].map((toValue) =>
          Animated.timing(pressRotate, { toValue, duration: 60, useNativeDriver: true })
        )
      ),
    ]).start();
  };

  const handleContinue = async () => {
    if (isStarting) return;
    setIsStarting(true);
    feedback.light();

    // L'onboarding n'a plus deux branches. La génération reste le premier aha
    // moment et l'import est proposé plus tard comme essai facultatif.
    await analytics.setEntryFeature('generate', {
      chosen_from: 'weekly_planning_welcome',
      onboarding_focus: 'weekly_planning',
      planning_horizon_days: 7,
    });

    // Création de l'utilisateur anonyme en tâche de fond : on ne bloque pas
    // l'entrée dans le tunnel sur un aller-retour réseau.
    (async () => {
      try {
        const mobileId = await getUniqueDeviceId();
        const timezone = Localization.getCalendars()[0].timeZone || undefined;
        const response = await apiService.initUser(mobileId, timezone);
        if (response.data?.userId) {
          await AsyncStorage.setItem('userId', response.data.userId);
          analytics.identify(response.data.userId);
        }
      } catch { }
    })();

    router.replace('/onboarding/formQuestion');
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: 0 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { fontSize: font(26) }]} maxFontSizeMultiplier={1.3}>CookEat</Text>
      </View>
      <View style={styles.body} onLayout={({ nativeEvent }) => setBodyHeight(nativeEvent.layout.height)}>
        <View style={styles.illustrationWrapper} onLayout={({ nativeEvent }) => setHeroHeight(nativeEvent.layout.height)}>
          <Animated.View
            style={{
              opacity: mascotOpacity,
              transform: [
                { translateY: mascotTranslateY },
                { scale: Animated.multiply(mascotScale, pressScale) },
                {
                  rotate: pressRotate.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require('../../assets/images/mascot.png')}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
              style={{ width: mascotSize, height: mascotSize, transform: [{ rotate: '20deg' }] }}
            />
          </Animated.View>
          <Pressable
            onPress={handleMascotPress}
            accessibilityRole="button"
            style={[styles.mascotHitArea, { width: mascotSize * 0.6, height: mascotSize * 0.6 }]}
          />
        </View>
        <View style={styles.bottomSection}>
          <View pointerEvents="none" style={{
            position: 'absolute',
            left: curveLeft,
            top: -width * 0.11,
            backgroundColor: '#FDF9E2',
            width: curveWidth,
            height: curveHeight,
            borderRadius: curveHeight,
          }} />
          {bodyHeight > 0 && <WelcomeCopy
            key={`${width}:${copyBudget}:${fontScale}:${i18n.language}`}
            maxHeight={copyBudget}
            titleOpacity={titleOpacity}
            socialOpacity={socialOpacity}
            subtitleOpacity={cardsOpacity}
          />}
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + ONBOARDING_CTA_BOTTOM_GAP }]}>
        <Animated.View style={[styles.bottomAction, { opacity: cardsOpacity }]}>
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.85}
            disabled={isStarting}
            onPress={handleContinue}
            accessibilityRole="button"
          >
            <Text style={[styles.continueButtonText, { fontSize: font(20) }]}
              adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={2}
            >{t('onboarding.welcomeCta')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

/** Mesure le texte complet, sans ellipsis, avec les métriques de la police native. */
function WelcomeCopy({ maxHeight, titleOpacity, socialOpacity, subtitleOpacity }: {
  maxHeight: number;
  titleOpacity: Animated.Value;
  socialOpacity: Animated.Value;
  subtitleOpacity: Animated.Value;
}) {
  const { t, i18n } = useTranslation();
  const { font } = useResponsive();
  const [scale, setScale] = useState(1);
  const [fitted, setFitted] = useState(false);
  const bounds = useRef({ min: 0, max: 1 });
  const textSize = (size: number) => font(size) * scale;

  return (
    <View
      key={scale}
      style={[styles.copy, { gap: 18 * scale, paddingVertical: 16 * scale, opacity: fitted ? 1 : 0 }]}
      onLayout={({ nativeEvent }) => {
        const measuredHeight = nativeEvent.layout.height;
        const fits = measuredHeight <= maxHeight + 0.5;
        if (fits && scale === 1) {
          setFitted(true);
          return;
        }
        if (fits) bounds.current.min = scale;
        else bounds.current.max = scale;

        // Chercher la plus grande taille qui tient. Un simple ratio de hauteurs
        // réduit trop les caractères lorsque de nombreuses lignes se regroupent.
        // La clé force une mesure même si deux tailles ont la même hauteur arrondie.
        if (bounds.current.max - bounds.current.min > 0.005) {
          setScale((bounds.current.min + bounds.current.max) / 2);
        } else if (!fits) {
          setScale(bounds.current.min);
        } else {
          setFitted(true);
        }
      }}
    >
      <Animated.View style={{ opacity: titleOpacity }}>
        <Text style={[styles.title, { fontSize: textSize(34), lineHeight: textSize(39) }]}>{t('onboarding.welcomeTitle')}</Text>
      </Animated.View>
      <Animated.View style={{ opacity: socialOpacity }}>
        <View style={[styles.socialProof, { gap: 10 * scale }]}>
          <Ionicons name="leaf" size={22 * scale} color="#C9903A" style={{ transform: [{ scaleX: -1 }, { rotate: '-25deg' }] }} />
          <Text style={[styles.socialProofText, { fontSize: textSize(16), lineHeight: textSize(20) }]}>
            {t('onboarding.welcomeSocialProof', { total: formatNumber(10000, i18n.language) })}
          </Text>
          <Ionicons name="leaf" size={22 * scale} color="#C9903A" style={{ transform: [{ rotate: '25deg' }] }} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={[styles.subtitle, { fontSize: textSize(21), lineHeight: textSize(26) }]}>{t('onboarding.welcomeSubtitle')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0B84F',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  body: { flex: 1, minHeight: 0 },
  brand: {
    fontFamily: 'Degular',
    color: Colors.light.text,
    alignSelf: 'flex-end',
  },
  illustrationWrapper: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotHitArea: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bottomSection: {
    flexShrink: 0,
    backgroundColor: '#FDF9E2',
  },
  copy: {
    ...contentColumn(),
    paddingHorizontal: 24,
  },
  footer: {
    backgroundColor: '#FDF9E2',
    paddingTop: 8,
  },
  bottomAction: {
    ...contentColumn(),
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: 'CronosPro',
    color: Colors.light.text,
  },
  socialProof: {
    width: '90%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialProofText: {
    fontFamily: 'Degular',
    color: Colors.light.text,
    flexShrink: 1,
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.button,
    borderRadius: 200,
    paddingHorizontal: 24,
    height: 56,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    width: '100%',
    maxHeight: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'Degular',
    color: 'white',
  },
});

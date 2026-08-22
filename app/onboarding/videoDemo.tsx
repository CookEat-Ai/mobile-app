import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP, rh, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IphoneVideoDemo from '../../components/IphoneVideoDemo';


// La maquette de téléphone fait le double de sa largeur en hauteur : la borner
// seulement par la largeur la faisait passer sous le bouton sur petit écran.
const PHONE_ASPECT = 538 / 1076;
const PHONE_CLEARANCE = 24;

export default function AppDemoScreen() {
  const insets = useSafeAreaInsets();
  const { layoutWidth } = useResponsive();
  const [mockupAreaHeight, setMockupAreaHeight] = useState(0);
  const phoneWidth = mockupAreaHeight > 0
    ? Math.min(layoutWidth * 0.6, Math.max(mockupAreaHeight - PHONE_CLEARANCE, 0) * PHONE_ASPECT)
    : layoutWidth * 0.6;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { t } = useTranslation();

  useEffect(() => {
    analytics.track('onboarding_app_demo_viewed');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = async () => {
    analytics.track('onboarding_app_demo_continue');
    const variant = await analytics.getOnboardingVariant();

    if (variant === 'D') {
      router.replace('/onboarding/personalizedRecipes');
    } else {
      // Le paywall n'est plus atteint directement : la fin de tunnel commence
      // par `offerTrial` (vente de l'essai), puis `reminder`. C'est aussi le
      // point de retour du paywall quand l'utilisateur refuse.
      router.replace({
        pathname: '/onboarding/offerTrial',
        params: { source: 'onboarding_variant_c' },
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Bouton Restore discret */}
      {/* <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore</Text>
      </TouchableOpacity> */}

      <View style={styles.content}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{t('onboarding.videoDemo.title')}</Text>
        </Animated.View>

        {/* Mockup iPhone avec Vidéo */}
        <Animated.View
          style={[styles.mockupContainer, { opacity: fadeAnim }]}
          onLayout={(e) => setMockupAreaHeight(e.nativeEvent.layout.height)}
        >
          <IphoneVideoDemo style={{ width: phoneWidth }} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
        {/* Reassurance CookEat Style */}
        <View style={styles.reassuranceRow}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.light.button} />
          <Text style={styles.reassuranceText}>{t('onboarding.offerTrial.reviewOffer')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>

        {/* <Text style={styles.pricingText}>
          {i18n.language.startsWith('fr') ? 'Seulement 5,99€ / mois' : 'Just $5.99 / month'}
        </Text> */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2', // Ton jaune clair CookEat
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrackContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#F1EACB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.light.button,
  },
  restoreButton: {
    position: 'absolute',
    right: 24,
    top: 60,
    zIndex: 10,
  },
  restoreText: {
    color: '#8C8C8C',
    fontSize: 14,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
    minHeight: 0,
    ...contentColumn(),
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: rw(0.05),
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
  },
  mockupContainer: {
    flex: 1,
    minHeight: 0,
    marginTop: rh(0.02),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    // Remise dans le flux : en absolu avec un `bottom` en dur, la maquette
    // passait dessous au lieu d'être contrainte par la place restante.
    ...contentColumn(),
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: ONBOARDING_CTA_BOTTOM_GAP,
    alignItems: 'center',
    gap: 12,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reassuranceText: {
    fontSize: 17,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  continueButton: {
    backgroundColor: Colors.light.button, // Ton bouton orange/jaune
    paddingVertical: 18,
    borderRadius: 100, // Bouton très arrondi
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular'
  },
  pricingText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontFamily: 'CronosPro',
    marginTop: 4,
  },
});

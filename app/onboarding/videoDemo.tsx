import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IphoneVideoDemo from '../../components/IphoneVideoDemo';

const { height, width } = Dimensions.get('window');

export default function AppDemoScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, []);

  const handleContinue = async () => {
    analytics.track('onboarding_app_demo_continue');
    const variant = await analytics.getOnboardingVariant();

    if (variant === 'D') {
      router.replace('/onboarding/personalizedRecipes');
    } else {
      router.push({ pathname: '/paywall', params: { source: 'onboarding_variant_c' } });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
      {/* Bouton Restore discret */}
      {/* <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore</Text>
      </TouchableOpacity> */}

      <View style={styles.content}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{I18n.t('onboarding.videoDemo.title')}</Text>
        </Animated.View>

        {/* Mockup iPhone avec Vidéo */}
        <Animated.View style={[styles.mockupContainer, { opacity: fadeAnim }]}>
          <IphoneVideoDemo style={styles.phoneWrapper} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
        {/* Reassurance CookEat Style */}
        <View style={styles.reassuranceRow}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.light.button} />
          <Text style={styles.reassuranceText}>{I18n.t('onboarding.offerTrial.noPayment')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>{I18n.t('onboarding.continue')}</Text>
        </TouchableOpacity>

        {/* <Text style={styles.pricingText}>
          {I18n.locale.startsWith('fr') ? 'Seulement 5,99€ / mois' : 'Just $5.99 / month'}
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
    fontFamily: 'Cronos Pro',
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: width * 0.05,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    fontWeight: '800',
  },
  mockupContainer: {
    flex: 1,
    marginTop: height * 0.02,
    alignItems: 'center'
  },
  phoneWrapper: {
    width: width * 0.6,
    justifyContent: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
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
    fontFamily: 'Degular',
    fontWeight: '600',
    color: Colors.light.text,
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
    fontFamily: 'Degular',
    fontWeight: 'bold',
  },
  pricingText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontFamily: 'Cronos Pro',
    marginTop: 4,
  },
});

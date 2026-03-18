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
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';

const { width } = Dimensions.get('window');

export default function AhaMomentScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { t } = useTranslation();

  useEffect(() => {
    analytics.track('onboarding_aha_moment_viewed');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Platform.OS === 'android' ? 400 : 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: Platform.OS === 'android' ? 400 : 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCameraPress = () => {
    analytics.track('Onboarding - Aha Moment Camera Click');
    router.push({
      pathname: '/camera',
      params: { isOnboarding: 'true' }
    });
  };

  const handleSkip = async () => {
    analytics.track('Onboarding - Aha Moment Skip');
    const variant = await analytics.getOnboardingVariant();
    if (variant === 'E' || variant === 'F') {
      router.replace('/onboarding/videoImportTutorial');
    } else {
      router.push('/onboarding/ingredientSelection');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}
            needsOffscreenAlphaCompositing={true}
            renderToHardwareTextureAndroid={Platform.OS === 'android'}
          >
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.title}>{t('onboarding.ahaMoment.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.ahaMoment.subtitle')}</Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[styles.bottomSection, { opacity: fadeAnim }]}
        needsOffscreenAlphaCompositing={true}
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.cameraButton}
          onPress={handleCameraPress}
        >
          <IconSymbol name="camera.fill" size={24} color="white" />
          <Text style={styles.buttonText}>{t('onboarding.ahaMoment.cameraButton')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>{t('onboarding.ahaMoment.skip')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 150,
  },
  emoji: {
    fontSize: width * 0.15,
    marginBottom: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'CronosPro',
    color: '#8C8C8C',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 75,
    left: 24,
    right: 24,
    gap: 16,
  },
  cameraButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    borderRadius: 200,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.05,
    fontFamily: 'Degular'
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
});

import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import IphoneVideoDemo from '../../components/IphoneVideoDemo';

const { width } = Dimensions.get('window');

export default function WelcomeVideoScreen() {
  const insets = useSafeAreaInsets();
  const mascotTranslateX = useRef(new Animated.Value(-width - 40)).current;

  useEffect(() => {
    Animated.timing(mascotTranslateX, {
      toValue: 0,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mascotTranslateX]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: Platform.OS === 'ios' ? 28 : insets.bottom + 20 },
      ]}
    >
      <View style={styles.brandRow}>
        <Animated.Image
          source={require('../../assets/images/mascot.png')}
          style={[styles.brandMascot, { transform: [{ translateX: mascotTranslateX }, { rotate: '20deg' }] }]}
        />
        <Text style={styles.brand}>CookEat Ai</Text>
      </View>

      {/* iphone component video demo */}
      <View style={styles.topSection}>
        <Text style={styles.tagline}>
          {I18n.t('onboarding.welcomeTagline')}
        </Text>
        <IphoneVideoDemo style={styles.phoneWrapper} />
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.continueButton}
        onPress={() => router.replace('/onboarding/formQuestion')}
      >
        <Text style={styles.buttonText}>{I18n.t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  tagline: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontFamily: 'Cronos Pro Bold',
    fontSize: width * 0.043,
    paddingHorizontal: 6,
    lineHeight: width * 0.055,
    maxWidth: '92%',
  },
  phoneWrapper: {
    width: width * 0.68,
  },
  brand: {
    fontSize: 24,
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  brandRow: {
    alignSelf: 'flex-end',
    marginRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMascot: {
    width: 40,
    height: 40,
  },
  continueButton: {
    backgroundColor: Colors.light.button,
    width: '100%',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontFamily: 'Degular',
  },
});

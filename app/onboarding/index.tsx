import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    analytics.track('onboarding_started');
  }, []);

  const imageTranslate = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const descriptionOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnimation = Animated.parallel([
      Animated.sequence([
        Animated.timing(imageTranslate, {
          toValue: -120,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(imageTranslate, {
          toValue: 0,
          stiffness: 120,
          damping: 12,
          mass: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ])

    const descriptionAnimation = Animated.sequence([
      Animated.stagger(450, [
        Animated.delay(450),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(descriptionOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(socialOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        })
      ]),
    ])

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(imageScale, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(imageScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start(() => {
      pulseAnimation.start();
    });

    descriptionAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [buttonOpacity, descriptionOpacity, imageOpacity, imageScale, imageTranslate, socialOpacity, titleOpacity]);

  const handleMascotPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pressScale.setValue(1);
    pressRotate.setValue(0);

    const wiggle = Animated.sequence([
      Animated.timing(pressRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(pressRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(pressRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(pressRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(pressRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(pressRotate, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(pressScale, {
          toValue: 1.06,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pressScale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      wiggle,
    ]).start();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
      <View style={styles.topSection}>
        <Text style={styles.brand}>CookEat Ai</Text>
        <View style={styles.illustrationWrapper}>
          <Animated.View
            style={{
              opacity: imageOpacity,
              transform: [
                { translateY: imageTranslate },
                { scale: Animated.multiply(imageScale, pressScale) },
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
              style={[
                styles.illustration,
                { transform: [{ rotate: '20deg' }] }
              ]}
            />
          </Animated.View>
          <Pressable onPress={handleMascotPress} style={styles.mascotHitArea} />
        </View>
      </View>

      {/* curve */}
      <View style={{ zIndex: 1, position: 'absolute', left: -300, bottom: -550, backgroundColor: "#FDF9E2", width: '250%', height: 1000, borderRadius: 1000 }} />

      <View style={styles.bottomSection}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={styles.title}>{t('onboarding.title')}</Text>
          </Animated.View>
          <Animated.View style={{ opacity: descriptionOpacity }}>
            <Text style={styles.description}>{t('onboarding.description')}</Text>
          </Animated.View>

          <Animated.View style={{ opacity: socialOpacity }}>
            <View style={styles.socialProof}>
              <View style={styles.laurel} />
              <Text style={styles.socialProofText}>{t('onboarding.socialProof.title', { count: i18n.language.startsWith('fr') ? '10 000' : '10,000' })}</Text>
              <View style={styles.laurel} />
            </View>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: buttonOpacity, width: '100%' }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.continueButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace('/onboarding/formQuestion');
            }}
          >
            <Text style={styles.buttonText}>{t('onboarding.continue')}</Text>
            {/* <IconSymbol
              style={styles.buttonIcon}
              name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
              size={width * 0.06}
              color="white"
            /> */}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0B84F',
  },
  topSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  brand: {
    fontSize: 26,
    fontFamily: 'Degular',
    color: Colors.light.text,
    alignSelf: 'flex-end',
  },
  illustrationWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: width * 0.09,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: width * 0.1,
  },
  description: {
    textAlign: 'center',
    fontSize: width * 0.046,
    fontFamily: 'CronosProBold',
    color: Colors.light.textSecondary,
    marginTop: 10,
  },
  illustration: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  mascotHitArea: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.6,
    top: width * 0.05,
    alignSelf: 'center',
  },
  bottomSection: {
    zIndex: 10,
    flex: 1,
    // justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    alignItems: 'center',
    elevation: 10,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 18,
  },
  socialProofText: {
    fontFamily: 'Degular',
    fontSize: width * 0.045,
    color: Colors.light.text,
    marginHorizontal: 12,
  },
  laurel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.light.text,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 200,
    shadowColor: Colors.light.button,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 6,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.05,
    fontFamily: 'Degular',
  },
  buttonIcon: {
    position: 'absolute',
    right: 20,
  },
}); 
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { font, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { formatNumber } from '../../components/onboarding/projectionFormat';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { width, height, layoutWidth, isShortScreen } = useResponsive();
  // La mascotte était dimensionnée à 100% de la largeur : 1024pt de haut sur iPad,
  // et un débordement vertical sur les écrans courts (iPhone SE). On la borne par
  // la hauteur disponible autant que par la largeur.
  const mascotSize = Math.min(layoutWidth, height * (isShortScreen ? 0.3 : 0.36));
  // Grand cercle crème qui déborde des deux côtés. Les valeurs d'origine (-300 /
  // -550 / 1000) étaient calées sur un écran de 390pt ; on garde exactement les
  // mêmes proportions mais dérivées de la largeur réelle.
  const curveWidth = width * 2.5;
  const curveHeight = curveWidth * 1.026;
  const curveLeft = -(curveWidth - width) / 2;
  const curveBottom = height * 0.53 - curveHeight;

  // Point de départ de l'animation d'entrée : hors écran par le bas.
  const imageTranslate = useRef(new Animated.Value(height)).current;
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
    // Un `SafeAreaView` de react-native + `paddingTop: insets.top` cumulait deux
    // fois la zone sûre haute sur iOS. On applique les insets une seule fois.
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
                { width: mascotSize, height: mascotSize, transform: [{ rotate: '20deg' }] }
              ]}
            />
          </Animated.View>
          {/* La zone tactile suit la mascotte : elle est centrée sur l'illustration
              plutôt que positionnée à un offset calculé sur la largeur d'écran. */}
          <Pressable
            onPress={handleMascotPress}
            accessibilityRole="button"
            style={[
              styles.mascotHitArea,
              { width: mascotSize * 0.6, height: mascotSize * 0.6 },
            ]}
          />
        </View>
      </View>

      {/* curve */}
      <View
        pointerEvents="none"
        style={{
          zIndex: 1,
          position: 'absolute',
          left: curveLeft,
          bottom: curveBottom,
          backgroundColor: '#FDF9E2',
          width: curveWidth,
          height: curveHeight,
          borderRadius: curveHeight,
        }}
      />

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
              <Text style={styles.socialProofText}>{t('onboarding.socialProof.title', { total: formatNumber(10000, i18n.language) })}</Text>
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
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
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
    fontSize: font(26),
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
    fontSize: rw(0.09),
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: rw(0.1),
  },
  description: {
    textAlign: 'center',
    fontSize: rw(0.046),
    fontFamily: 'CronosProBold',
    color: Colors.light.textSecondary,
    marginTop: 10,
  },
  illustration: {
    // width / height sont fournis à l'usage : bornés par la hauteur disponible.
    resizeMode: 'contain',
  },
  mascotHitArea: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bottomSection: {
    zIndex: 10,
    flex: 1,
    ...contentColumn(),
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
    fontSize: rw(0.045),
    color: Colors.light.text,
    marginHorizontal: 12,
    flexShrink: 1,
    textAlign: 'center',
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
    fontSize: rw(0.05),
    fontFamily: 'Degular',
  },
  buttonIcon: {
    position: 'absolute',
    right: 20,
  },
});

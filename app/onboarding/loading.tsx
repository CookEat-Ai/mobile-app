import { router } from "expo-router";
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import I18n from '../../i18n';
import analytics from "../../services/analytics";

const { width } = Dimensions.get('window');

export default function LoadingScreen() {
  const insets = useSafeAreaInsets();
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const loadingMessages = useMemo(() => I18n.t('onboarding_loading.messages'), []);

  React.useEffect(() => {
    // Listener pour le pourcentage
    const listenerId = loadingProgress.addListener(({ value }) => {
      setPercent(Math.floor(value * 100));
    });

    // Animation de la barre de progression sur 7 secondes
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 7000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Animation de pulsation pour la mascotte (grossir et rétrécir)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cycle des messages (les 4 premiers messages sur 7s)
    const messageInterval = setInterval(() => {
      setLoadingTextIndex((currentIndex) => {
        if (currentIndex < loadingMessages.length - 2) {
          const nextIndex = currentIndex + 1;

          analytics.track('onboarding_loading_step', {
            step_index: nextIndex,
            step_text: loadingMessages[nextIndex]
          });

          // 1. On lance la disparition du texte actuel
          Animated.timing(loadingTextOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // 2. Une fois invisible, on change le texte
            setLoadingTextIndex(currentIndex + 1);

            // 3. On fait apparaître le nouveau texte
            Animated.timing(loadingTextOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
        }
        return currentIndex;
      });
    }, 1750); // 7000ms / 4 messages = 1750ms par message

    // Demande de permission de tracking après 2.5 secondes
    const trackingTimer = setTimeout(() => {
      analytics.requestTrackingPermission();
    }, 2500);

    // Afficher "C'est prêt !" à la fin de la progression (7s)
    const readyTimer = setTimeout(() => {
      clearInterval(messageInterval);
      Animated.timing(loadingTextOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setLoadingTextIndex(loadingMessages.length - 1); // "C'est prêt !"
        Animated.timing(loadingTextOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 7000);

    // Navigation finale après 8 secondes (7s + 1s d'attente)
    const finalTimer = setTimeout(async () => {
      // Une fois le calcul IA fini, on montre le plan final (Dashboard)
      router.replace('/onboarding/onboardingProfileReady');
    }, 8000);

    return () => {
      loadingProgress.removeListener(listenerId);
      clearInterval(messageInterval);
      clearTimeout(readyTimer);
      clearTimeout(finalTimer);
      clearTimeout(trackingTimer);
    };
  }, [loadingMessages.length, loadingProgress, loadingTextOpacity, scaleAnim]);

  return (
    <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.loadingContent}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image
            source={require('../../assets/images/mascot.png')}
            contentFit="contain"
            transition={0}
            cachePolicy="memory-disk"
            style={styles.loadingMascot}
          />
        </Animated.View>

        <View style={styles.percentContainer}>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>

        <View style={styles.loadingTextWrapper}>
          <Animated.Text style={[styles.loadingText, { opacity: loadingTextOpacity }]}>
            {loadingMessages[loadingTextIndex]}
          </Animated.Text>
        </View>

        <View style={styles.loadingBarTrack}>
          <Animated.View
            style={[
              styles.loadingBarFill,
              {
                width: loadingProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF9E2",
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingContent: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  loadingMascot: {
    width: width * 0.5,
    height: width * 0.5,
    transform: [{ rotate: '20deg' }],
  },
  percentContainer: {
    backgroundColor: 'rgba(254, 181, 10, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  percentText: {
    fontSize: 24,
    color: Colors.light.button,
    fontFamily: 'Degular'
  },
  loadingTextWrapper: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Degular',
    fontSize: width * 0.06,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.07,
  },
  loadingBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1EACB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: Colors.light.button,
    borderRadius: 5,
  },
});

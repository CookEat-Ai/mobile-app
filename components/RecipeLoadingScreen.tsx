import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import I18n from '../i18n';
import recipeStreamManager from '../services/recipeStreamManager';

const { width } = Dimensions.get('window');

type LoadingParams = {
  durationMs?: string;
  dismissOnly?: string;
  nextPath?: string;
  nextParams?: string;
  startGeneration?: string;
};

export default function RecipeLoadingScreen({ modalDefault = false }: { modalDefault?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<LoadingParams>();

  const duration = Number(params.durationMs ?? 5000);
  const dismissOnly = params.dismissOnly === 'true' || modalDefault;
  const prefetchStreamIdRef = useRef<string | null>(null);

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const progressValueRef = useRef(0);
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const loadingMessages = useMemo(() => {
    const msgs = I18n.t('recipe_loading.messages');
    return Array.isArray(msgs) ? msgs : ['Veuillez patienter...'];
  }, []);

  useEffect(() => {
    const listenerId = loadingProgress.addListener(({ value }) => {
      progressValueRef.current = value;
    });

    // Mettre à jour le pourcentage moins souvent évite les re-renders à chaque frame.
    const percentInterval = setInterval(() => {
      setPercent(Math.floor(progressValueRef.current * 100));
    }, 100);

    Animated.timing(loadingProgress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

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

    const transitionCount = Math.max(1, loadingMessages.length - 1);
    const stepDuration = Math.max(300, Math.floor(duration / transitionCount));

    const messageInterval = setInterval(() => {
      setLoadingTextIndex((currentIndex) => {
        if (currentIndex >= loadingMessages.length - 1) {
          return currentIndex;
        }

        Animated.timing(loadingTextOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setLoadingTextIndex((prev) => Math.min(prev + 1, loadingMessages.length - 1));
          Animated.timing(loadingTextOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start();
        });
        return currentIndex;
      });
    }, stepDuration);

    const doneTimer = setTimeout(() => {
      if (dismissOnly) {
        router.back();
        return;
      }

      const nextPath = params.nextPath;
      if (!nextPath) {
        router.back();
        return;
      }

      let nextRouteParams: Record<string, string> = {};
      if (typeof params.nextParams === 'string') {
        try {
          nextRouteParams = JSON.parse(params.nextParams);
        } catch {
          nextRouteParams = {};
        }
      }

      if (prefetchStreamIdRef.current) {
        nextRouteParams.prefetchStreamId = prefetchStreamIdRef.current;
      }

      router.replace({
        pathname: nextPath as '/recipe-detail',
        params: nextRouteParams,
      });
    }, duration);

    return () => {
      loadingProgress.removeListener(listenerId);
      clearInterval(percentInterval);
      clearInterval(messageInterval);
      clearTimeout(doneTimer);
    };
  }, [dismissOnly, duration, loadingMessages, loadingProgress, loadingTextOpacity, params.nextParams, params.nextPath, router, scaleAnim]);

  useEffect(() => {
    if (params.startGeneration !== 'true') return;
    if (prefetchStreamIdRef.current) return;
    if (typeof params.nextParams !== 'string') return;

    try {
      const parsed = JSON.parse(params.nextParams) as {
        ingredients?: string;
        preferences?: string;
      };
      if (!parsed.ingredients || !parsed.preferences) return;

      const preferences = JSON.parse(parsed.preferences);
      prefetchStreamIdRef.current = recipeStreamManager.start({
        ingredients: parsed.ingredients,
        preferences,
        isSubscribed: false,
      });
    } catch {
      // Ignore parsing errors: fallback to existing generation behavior.
    }
  }, [params.nextParams, params.startGeneration]);

  return (
    <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.loadingContent}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image
            source={require('../assets/images/mascot.png')}
            resizeMode="contain"
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
    backgroundColor: '#FDF9E2',
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

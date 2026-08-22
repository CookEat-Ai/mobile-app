import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TextInput, View, Image } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing as ReanimatedEasing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { rw } from '../constants/Layout';
import { useTranslation } from 'react-i18next';
import recipeStreamManager from '../services/recipeStreamManager';
import revenueCatService from '../config/revenuecat';
import { subscribeGenerationLoading } from '../services/generationLoadingCoordinator';


type LoadingParams = {
  durationMs?: string;
  dismissOnly?: string;
  nextPath?: string;
  nextParams?: string;
  startGeneration?: string;
  completionKey?: string;
  maxWaitMs?: string;
};

const AnimatedPercentText = Reanimated.createAnimatedComponent(TextInput);

export default function RecipeLoadingScreen({ modalDefault = false }: { modalDefault?: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<LoadingParams>();

  const requestedDuration = Number(params.durationMs ?? 10000);
  const duration = Number.isFinite(requestedDuration) && requestedDuration > 0
    ? requestedDuration
    : 10000;
  const dismissOnly = params.dismissOnly === 'true' || modalDefault;
  const isDataDrivenGeneration = params.startGeneration === 'true'
    || typeof params.completionKey === 'string';
  const prefetchStreamIdRef = useRef<string | null>(null);
  // Un ref ne provoque pas de re-render : sans cet état, l'effet d'attente
  // ne se relancerait jamais une fois le flux démarré.
  const [streamId, setStreamId] = useState<string | null>(null);

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const loadingProgress = useSharedValue(0);
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(progressTrackWidth / 2) * (1 - loadingProgress.value) },
      { scaleX: loadingProgress.value },
    ],
  }), [progressTrackWidth]);

  const percentAnimatedProps = useAnimatedProps(() => {
    const maximum = isDataDrivenGeneration ? 99 : 100;
    const percent = Math.min(maximum, Math.floor(loadingProgress.value * 100));
    return {
      text: `${percent}%`,
      defaultValue: `${percent}%`,
    } as any;
  }, [isDataDrivenGeneration]);

  const loadingMessages = useMemo(() => {
    const msgs = t('recipe_loading.messages', { returnObjects: true });
    return Array.isArray(msgs) ? msgs : ['Veuillez patienter...'];
  }, [t]);

  useEffect(() => {
    loadingProgress.value = isDataDrivenGeneration
      ? withSequence(
          withTiming(0.9, { duration, easing: ReanimatedEasing.linear }),
          withTiming(0.9995, { duration: 30000, easing: ReanimatedEasing.linear }),
        )
      : withTiming(1, { duration, easing: ReanimatedEasing.linear });

    const pulseAnimation = Animated.loop(
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
    );
    pulseAnimation.start();

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

    // Pour une génération, la donnée pilote la navigation : un délai fixe peut
    // ouvrir la fiche avant son titre/image ou, inversement, retenir une recette
    // déjà prête. Les loaders purement décoratifs conservent leur minuterie.
    const doneTimer = isDataDrivenGeneration
      ? null
      : setTimeout(() => navigateNextRef.current(), duration);

    return () => {
      cancelAnimation(loadingProgress);
      pulseAnimation.stop();
      clearInterval(messageInterval);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [duration, isDataDrivenGeneration, loadingMessages, loadingProgress, loadingTextOpacity, scaleAnim]);

  const navigateNextRef = useRef<() => void>(() => { });
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    navigateNextRef.current = () => {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      // Sortie anticipée : on complète la barre plutôt que de la laisser figée.
      loadingProgress.value = withTiming(1, { duration: 180, easing: ReanimatedEasing.linear });

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
    };
  }, [dismissOnly, loadingProgress, params.nextParams, params.nextPath, router]);

  useEffect(() => {
    if (typeof params.completionKey !== 'string') return;
    const unsubscribe = subscribeGenerationLoading(
      params.completionKey,
      () => navigateNextRef.current(),
    );
    const requestedMaxWait = Number(params.maxWaitMs ?? 30000);
    const maxWait = Number.isFinite(requestedMaxWait) && requestedMaxWait > 0
      ? requestedMaxWait
      : 30000;
    const safetyTimer = setTimeout(() => navigateNextRef.current(), maxWait);
    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [params.completionKey, params.maxWaitMs]);

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
      
      const startStream = async () => {
        const { isSubscribed } = await revenueCatService.getSubscriptionStatus();
        const id = recipeStreamManager.start({
          ingredients: parsed.ingredients!,
          preferences,
          isSubscribed,
        });
        prefetchStreamIdRef.current = id;
        setStreamId(id);
      };
      
      startStream();
    } catch {
      // Ignore parsing errors: fallback to existing generation behavior.
    }
  }, [params.nextParams, params.startGeneration]);

  // Termine le chargement dès que la recette est réellement affichable : titre
  // ET image présents. Si aucune photo pertinente n'existe, on attend la fin du
  // flux et la fin de la recherche, puis la fiche utilise son état sans image.
  useEffect(() => {
    if (!streamId || dismissOnly) return;

    const check = (snapshot: {
      recipe: Record<string, any>;
      imageResolved?: boolean;
      isDone?: boolean;
      error?: string;
    }) => {
      if (snapshot.error) {
        navigateNextRef.current();
        return;
      }
      const hasTitleAndImage = Boolean(snapshot.recipe?.title && snapshot.recipe?.image);
      const finishedWithoutImage = Boolean(
        snapshot.recipe?.title && snapshot.isDone && snapshot.imageResolved,
      );
      if (hasTitleAndImage || finishedWithoutImage) navigateNextRef.current();
    };

    check(recipeStreamManager.getSnapshot(streamId) ?? { recipe: {} });
    const unsubscribe = recipeStreamManager.subscribe(streamId, check);
    return unsubscribe;
  }, [dismissOnly, streamId]);

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
          <AnimatedPercentText
            animatedProps={percentAnimatedProps}
            editable={false}
            pointerEvents="none"
            style={styles.percentText}
            underlineColorAndroid="transparent"
          />
        </View>

        <View style={styles.loadingTextWrapper}>
          <Animated.Text style={[styles.loadingText, { opacity: loadingTextOpacity }]}>
            {loadingMessages[loadingTextIndex]}
          </Animated.Text>
        </View>

        <View
          style={styles.loadingBarTrack}
          onLayout={(event) => setProgressTrackWidth(event.nativeEvent.layout.width)}
        >
          <Reanimated.View
            style={[
              styles.loadingBarFill,
              progressFillStyle,
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
    width: rw(0.5),
    height: rw(0.5),
    transform: [{ rotate: '20deg' }],
  },
  percentContainer: {
    backgroundColor: 'rgba(254, 181, 10, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  percentText: {
    minWidth: 54,
    padding: 0,
    fontSize: 24,
    color: Colors.light.button,
    fontFamily: 'Degular',
    textAlign: 'center',
  },
  loadingTextWrapper: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Degular',
    fontSize: rw(0.06),
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: rw(0.07),
  },
  loadingBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1EACB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.button,
    borderRadius: 5,
  },
});

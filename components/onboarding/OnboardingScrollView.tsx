import { useFocusEffect } from 'expo-router';
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Animated, ScrollView } from 'react-native';

type Props = Omit<React.ComponentProps<typeof Animated.ScrollView>, 'ref'> & {
  stepKey?: string | number;
};

/** Chaque écran/étape repart en haut, sans réinitialiser les réponses du parent. */
export function OnboardingScrollView({ stepKey, ...props }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const reset = useCallback(() => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false }), []);

  // Keep the native view and its children mounted when the question changes.
  useLayoutEffect(() => { reset(); }, [reset, stepKey]);

  useFocusEffect(useCallback(() => {
    reset();
    // Réappliquer après le rattachement de la vue native au retour d'une route.
    const frame = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(frame);
  }, [reset]));

  return <Animated.ScrollView {...props} ref={scrollRef} />;
}

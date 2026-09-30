import React, { useCallback, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, type TouchableOpacityProps, type ViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { useMotionAllowed } from '../../contexts/MotionPreferences';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
type EntranceProps = { entranceIndex?: number; entranceKey?: string | number; entranceEnabled?: boolean };

function useEntrance({ entranceIndex = 0, entranceKey, entranceEnabled = true }: EntranceProps) {
  const allowed = useMotionAllowed();
  const shouldReplay = useEntranceReplay();
  const progress = useRef(new Animated.Value(1)).current;
  useFocusEffect(useCallback(() => {
    const replay = shouldReplay();
    if (!replay || !allowed || !entranceEnabled) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 340, delay: Math.min(Math.max(entranceIndex, 0), 5) * 45,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
    // Step identity is deliberately an entrance trigger, independent of rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, entranceEnabled, entranceIndex, entranceKey, progress, shouldReplay]));
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
}

/** Same layout node as View: margins, flex, widths and accessibility stay intact. */
export function EntranceView({ entranceIndex, entranceKey, entranceEnabled, style, ...props }: ViewProps & EntranceProps) {
  const animation = useEntrance({ entranceIndex, entranceKey, entranceEnabled });
  return <Animated.View {...props} style={[style, animation]} />;
}

export function EntranceTouchable({ entranceIndex, entranceKey, entranceEnabled, style, ...props }: TouchableOpacityProps & EntranceProps) {
  const animation = useEntrance({ entranceIndex, entranceKey, entranceEnabled });
  return <AnimatedTouchableOpacity {...props} style={[style, animation]} />;
}

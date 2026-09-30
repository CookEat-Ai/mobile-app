import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export function OnboardingProgressBar({ progress }: { progress: number }) {
  const value = Math.max(0, Math.min(1, progress));
  const animatedProgress = useRef(new Animated.Value(value)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.setValue(value);
      return;
    }
    const animation = Animated.timing(animatedProgress, {
      toValue: value,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animatedProgress, reduceMotion, value]);

  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, {
        width: animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', height: 12, borderRadius: 999, backgroundColor: '#F1EACB', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: Colors.light.button },
});

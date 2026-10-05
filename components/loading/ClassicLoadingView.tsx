import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { rw } from '../../constants/Layout';

type ClassicLoadingViewProps = {
  messageKey: string;
  durationMs?: number;
  mode?: 'timed' | 'indeterminate' | 'request';
  ready?: boolean;
  onComplete?: () => void;
};

export function ClassicLoadingView({ messageKey, durationMs = 7000, mode = 'indeterminate', ready = false, onComplete }: ClassicLoadingViewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messageIndex, setMessageIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const [messageHeights, setMessageHeights] = useState<Record<number, number>>({});
  const progress = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const travel = useRef(new Animated.Value(0)).current;
  const completion = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (mode !== 'request') return;
    completion.setValue(0);
    travel.setValue(0);
    const animation = ready
      ? Animated.timing(completion, { toValue: 1, duration: reduceMotion ? 0 : 350, useNativeDriver: false })
      : Animated.loop(Animated.timing(travel, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }));
    if (ready || !reduceMotion) animation.start(({ finished }) => { if (ready && finished) onComplete?.(); });
    return () => animation.stop();
  }, [completion, mode, onComplete, ready, reduceMotion, travel]);
  const messages = useMemo(() => {
    const value = t(messageKey, { returnObjects: true });
    return Array.isArray(value) ? value.map(String) : [String(value)];
  }, [messageKey, t]);

  useEffect(() => {
    setMessageIndex(0);
    messageOpacity.setValue(1);
    progress.setValue(0);
    const listenerId = progress.addListener(({ value }) => {
      const maximum = mode === 'timed' ? 100 : 99;
      setPercent(Math.min(maximum, Math.floor(value * 100)));
    });

    if (mode === 'timed') {
      Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: false }).start();
    } else if (mode === 'indeterminate') {
      Animated.sequence([
        Animated.timing(progress, { toValue: 0.9, duration: durationMs, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0.995, duration: 30000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start();
    }

    const pulseAnimation = Animated.loop(Animated.sequence([
      Animated.timing(mascotScale, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(mascotScale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    if (!reduceMotion) pulseAnimation.start();

    const transitionCount = Math.max(1, messages.length - 1);
    let nextMessageIndex = 0;
    const messageInterval = messages.length > 1 ? setInterval(() => {
      nextMessageIndex += 1;
      if (nextMessageIndex >= messages.length - 1) clearInterval(messageInterval);
      Animated.timing(messageOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setMessageIndex(nextMessageIndex);
        Animated.timing(messageOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, Math.max(900, durationMs / transitionCount)) : undefined;

    return () => {
      progress.stopAnimation();
      progress.removeListener(listenerId);
      messageOpacity.stopAnimation();
      pulseAnimation.stop();
      if (messageInterval !== undefined) clearInterval(messageInterval);
    };
  }, [durationMs, mascotScale, messageOpacity, messages.length, mode, progress, reduceMotion]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: mascotScale }] }}>
          <Image source={require('../../assets/images/mascot.png')} contentFit="contain" style={styles.mascot} />
        </Animated.View>
        {mode !== 'request' && <View style={styles.percentPill}><Text style={styles.percent}>{percent}%</Text></View>}
        <View style={[styles.messageWrapper, { minHeight: Math.max(60, ...Object.values(messageHeights)) }]}>
          {/* Measure every phrase at the same width and font scale before it appears. */}
          {messages.map((message, index) => (
            <Text key={`${index}:${message}`} style={[styles.message, styles.messageMeasurement]}
              accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              onLayout={({ nativeEvent }) => {
                const height = Math.ceil(nativeEvent.layout.height);
                setMessageHeights((current) => current[index] === height ? current : { ...current, [index]: height });
              }}>
              {message}
            </Text>
          ))}
          <Animated.Text style={[styles.message, styles.messageVisible, { opacity: messageOpacity }]}>{messages[messageIndex]}</Animated.Text>
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel={messages[messageIndex]}
          accessibilityState={{ busy: mode === 'request' && !ready }}
          accessibilityValue={mode === 'request' ? (ready ? { min: 0, max: 100, now: 100 } : undefined) : { min: 0, max: 100, now: percent }}>
          {mode === 'request' && !ready
            ? <Animated.View style={[styles.progressFill, { width: '35%', left: reduceMotion ? '32.5%' : travel.interpolate({ inputRange: [0, 1], outputRange: ['-35%', '100%'] }) }]} />
            : <Animated.View style={[styles.progressFill, { width: (mode === 'request' ? completion : progress).interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF9E2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  content: { width: '100%', maxWidth: 520, alignItems: 'center', gap: 32 },
  mascot: { width: rw(0.5), height: rw(0.5), transform: [{ rotate: '20deg' }] },
  percentPill: { borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(254, 181, 10, 0.1)' },
  percent: { fontFamily: 'Degular', fontSize: 24, color: Colors.light.button },
  messageWrapper: { width: '100%', minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  message: { width: '100%', fontFamily: 'Degular', fontSize: rw(0.06), lineHeight: rw(0.07), color: Colors.light.text, textAlign: 'center' },
  messageMeasurement: { position: 'absolute', opacity: 0, pointerEvents: 'none' },
  messageVisible: { position: 'absolute' },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: '#F1EACB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: Colors.light.button },
});

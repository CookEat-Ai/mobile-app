import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type LayoutRectangle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../../constants/AppTheme';
import { consumePlanningReveal } from '../../services/planningReveal';
import { planningStyles } from './PlanningStyles';

/** Reveal each selected day, using the real plan cards and nutrition totals. */
export function usePlanningReveal(hasMeals: boolean, dayIndices: number[], selectDay: (day: number) => void, planId: string, onRevealStart?: () => void) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const allowed = useMotionAllowed();
  const [entrance, setEntrance] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealStartRef = useRef(onRevealStart);
  revealStartRef.current = onRevealStart;
  const selectRef = useRef(selectDay);
  selectRef.current = selectDay;
  const playedRequest = useRef(0);
  const daysKey = dayIndices.join(',');
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    setWaiting(false);
  }, []);
  const scheduleReplay = useCallback(() => {
    stop();
    revealStartRef.current?.();
    setWaiting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setWaiting(false);
      setEntrance(value => value + 1);
    }, 5000);
  }, [stop]);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); stop(); };
  }, [stop]));
  useLayoutEffect(() => {
    if (!focused || !hasMeals || !daysKey || !planId) { stop(); return; }
    const generated = consumePlanningReveal(planId);
    const replay = __DEV__ && entrance > playedRequest.current;
    playedRequest.current = entrance;
    if (!allowed || (!generated && !replay)) { stop(); return; }
    const days = daysKey.split(',').map(Number);
    let index = 0;
    // Reset the parent viewport only for a real reveal, including manual replay.
    revealStartRef.current?.();
    setPlaying(true);
    setStep(0);
    selectRef.current(days[0]);
    const advance = () => {
      index += 1;
      if (index >= days.length) { stop(); return; }
      setStep(index);
      selectRef.current(days[index]);
      timer.current = setTimeout(advance, index === days.length - 1 ? 500 : 360);
    };
    timer.current = setTimeout(advance, days.length === 1 ? 500 : 360);
    return stop;
  }, [allowed, daysKey, entrance, focused, hasMeals, planId, stop]);
  return {
    visibleDayCount: playing ? step + 1 : dayIndices.length,
    dayAnimationKey: playing ? `${planId}:${entrance}` : undefined,
    animationKey: focused && allowed && hasMeals && playing ? entrance * 10 + step : null,
    stopReveal: stop,
    replayButton: focused && allowed && hasMeals && (playing || __DEV__) ? <View style={styles.controls}>
      <TouchableOpacity accessibilityRole="button" onPress={playing || waiting ? stop : scheduleReplay} style={styles.replay}>
        <Ionicons name={waiting ? 'time-outline' : playing ? 'pause-outline' : 'play-outline'} size={18} color={theme.ink} />
        <Text style={styles.replayText}>{t(waiting ? 'common.cancel' : playing ? 'planningReveal.skip' : 'planningReveal.replay')}</Text>
      </TouchableOpacity>
      {waiting && <Text style={styles.progress}>5 s</Text>}
      {playing && <Text style={styles.progress}>{step + 1} / {dayIndices.length}</Text>}
    </View> : null,
  };
}

/** Each card owns a UI-thread animation, independent of React completion renders. */
function PlanningMealEntrance({ animationKey, origin, index, count, onLayout, children }: {
  animationKey: number | null;
  origin: number;
  index: number;
  count: number;
  onLayout: React.ComponentProps<typeof View>['onLayout'];
  children: ReactNode;
}) {
  const progress = useSharedValue(1);
  const startY = useSharedValue(0);
  const lastEntrance = useRef<number | null>(null);
  const entranceOrigin = useRef(origin);
  entranceOrigin.current = origin;
  const restore = useCallback(() => {
    cancelAnimation(progress);
    progress.value = 1;
  }, [progress]);
  useFocusEffect(useCallback(() => {
    return restore;
  }, [restore]));
  useLayoutEffect(() => {
    if (animationKey === null) { restore(); return; }
    if (lastEntrance.current === animationKey) return;
    lastEntrance.current = animationKey;
    // Capture the measured origin once. Later layouts must not cancel motion.
    startY.value = entranceOrigin.current + index * 4;
    progress.value = 0;
    const delay = index * 40;
    progress.value = withDelay(delay, withTiming(1, {
      duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System,
    }), ReduceMotion.System);
    // Restore even if an OS interruption drops the animation. No interaction
    // lock or React state transition is needed at the end of the motion.
    const fallback = setTimeout(restore, delay + 260 + 300);
    return () => { clearTimeout(fallback); restore(); };
  }, [animationKey, index, progress, restore, startY]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: startY.value * (1 - progress.value) },
      { rotate: `${(index % 3 - 1) * 4 * (1 - progress.value)}deg` },
      { scale: 0.94 + 0.06 * progress.value },
    ],
  }));
  return <Animated.View onLayout={onLayout} style={[{ zIndex: count - index }, animatedStyle]}>
    {children}
  </Animated.View>;
}

/** Animates the real meal cards in their normal layout positions. */
export function AnimatedPlanningMeals<T extends { slotId: string }>({ meals, animationKey, renderMeal }: {
  meals: T[];
  animationKey: number | null;
  renderMeal: (meal: T) => ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const measured = height > 0 && meals.every(meal => layouts[meal.slotId]?.height > 0);
  const waitingForLayout = animationKey !== null && !measured;
  return <View style={[planningStyles.meals, waitingForLayout && styles.measuring]}
    pointerEvents={waitingForLayout ? 'none' : 'auto'}
    accessibilityElementsHidden={waitingForLayout}
    importantForAccessibility={waitingForLayout ? 'no-hide-descendants' : 'auto'}
    onLayout={({ nativeEvent: { layout } }) => setHeight(layout.height)}>
    {meals.map((meal, index) => {
      const layout = layouts[meal.slotId];
      const origin = layout ? Math.max(0, (height - layout.height) / 2) - layout.y : 0;
      return <PlanningMealEntrance key={meal.slotId} animationKey={measured ? animationKey : null}
        origin={origin} index={index} count={meals.length}
        onLayout={({ nativeEvent: { layout: next } }) => setLayouts(previous => {
          const old = previous[meal.slotId];
          return old?.y === next.y && old?.height === next.height && old?.width === next.width ? previous : { ...previous, [meal.slotId]: next };
        })}>
        {renderMeal(meal)}
      </PlanningMealEntrance>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  measuring: { opacity: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  progress: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.muted },
  replay: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 14, borderRadius: 16, backgroundColor: theme.yellowSoft, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replayText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
});

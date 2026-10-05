import { useMotionAllowed } from '../../contexts/MotionPreferences';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { feedback } from '../../services/haptics';
import React, { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { planningStyles as styles } from './PlanningStyles';

export type PlanningDay = { key: string; dayIndex: number; short: string; number: number; label?: string };

export function PlanningDayPicker({ days, selectedDay, onSelect, visibleCount = days.length, revealKey }: {
  days: PlanningDay[]; selectedDay: number; onSelect: (day: number) => void; visibleCount?: number; revealKey?: string;
}) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    const index = days.findIndex(day => day.dayIndex === selectedDay);
    scroll.current?.scrollTo({ x: Math.max(0, index * 58 - 116), animated: true });
  }, [days, selectedDay]);
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
    {days.slice(0, visibleCount).map(day => <DayEntrance key={`${day.key}:${revealKey || 'static'}`} enabled={Boolean(revealKey)}><TouchableOpacity onPress={() => { if (day.dayIndex !== selectedDay) feedback.selection(); onSelect(day.dayIndex); }} style={[styles.day, selectedDay === day.dayIndex && styles.dayActive]}
      accessibilityRole="button" accessibilityState={{ selected: selectedDay === day.dayIndex }} accessibilityLabel={`${day.label || day.short} ${day.number}`}>
      <Text style={[styles.dayShort, selectedDay === day.dayIndex && styles.dayTextActive]}>{day.short}</Text>
      <Text style={[styles.dayNumber, selectedDay === day.dayIndex && styles.dayTextActive]}>{day.number}</Text>
    </TouchableOpacity></DayEntrance>)}
  </ScrollView>;
}

/** Newly revealed days slide in from the right; existing days stay in place. */
function DayEntrance({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const allowed = useMotionAllowed();
  const progress = useSharedValue(enabled && allowed ? 0 : 1);
  useLayoutEffect(() => {
    if (!enabled || !allowed) { progress.value = 1; return; }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(progress);
  }, [allowed, enabled, progress]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateX: 64 * (1 - progress.value) }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

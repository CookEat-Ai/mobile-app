import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type LayoutRectangle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../../constants/AppTheme';
import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { useDevShakeReveal } from '../../hooks/useDevShakeReveal';
import type { MealPlanMeal } from '../../services/api';
import { planningStyles } from './PlanningStyles';

/** The normal planning entrance, with a hidden development replay control. */
export function usePlanningReveal(hasMeals: boolean) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const allowed = useMotionAllowed();
  const [entrance, setEntrance] = useState(0);
  const unlocked = useDevShakeReveal(hasMeals);
  const shouldReplay = useEntranceReplay();
  useFocusEffect(useCallback(() => {
    setFocused(true);
    if (shouldReplay()) setEntrance(value => value + 1);
    return () => setFocused(false);
  }, [shouldReplay]));
  return {
    animationKey: focused && allowed && hasMeals ? entrance : null,
    replayButton: __DEV__ && unlocked && focused && hasMeals ? <TouchableOpacity
      accessibilityRole="button" accessibilityState={{ disabled: !allowed }} disabled={!allowed}
      onPress={() => setEntrance(value => value + 1)} style={styles.replay}>
      <Ionicons name="play-outline" size={18} color={theme.ink} /><Text style={styles.replayText}>{t('planningReveal.replay')}</Text>
    </TouchableOpacity> : null,
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
  const restore = useCallback(() => {
    cancelAnimation(progress);
    progress.value = 1;
  }, [progress]);
  useFocusEffect(useCallback(() => {
    restore();
    return restore;
  }, [restore]));
  useEffect(() => {
    if (animationKey === null) { restore(); return; }
    if (lastEntrance.current === animationKey) return;
    lastEntrance.current = animationKey;
    startY.value = origin + index * 4;
    progress.value = 0;
    const delay = 100 + index * 100;
    progress.value = withDelay(delay, withTiming(1, {
      duration: 480, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System,
    }), ReduceMotion.System);
    // Restore even if an OS interruption drops the animation. No interaction
    // lock or React state transition is needed at the end of the motion.
    const fallback = setTimeout(restore, delay + 480 + 300);
    return () => { clearTimeout(fallback); restore(); };
  }, [animationKey, index, origin, progress, restore, startY]);
  const animatedStyle = useAnimatedStyle(() => ({
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
export function AnimatedPlanningMeals({ meals, animationKey, renderMeal }: {
  meals: MealPlanMeal[];
  animationKey: number | null;
  renderMeal: (meal: MealPlanMeal) => ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const measured = height > 0 && meals.every(meal => layouts[meal.slotId]?.height > 0);
  return <View style={planningStyles.meals}
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
  replay: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 14, borderRadius: 16, backgroundColor: theme.yellowSoft, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replayText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
});

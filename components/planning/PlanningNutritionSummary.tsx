import { EntranceView } from '../motion/Entrance';
import React, { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, withRepeat, type SharedValue } from 'react-native-reanimated';
import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MealPlanMeal } from '../../services/api';
import { roundNutritionValue } from '../../services/weeklyPlanning';
import { planningStyles as styles } from './PlanningStyles';

export function PlanningNutritionSummary({ meals, dailyCalories }: { meals: MealPlanMeal[]; dailyCalories?: number }) {
  const { t } = useTranslation();
  const totals = meals.reduce((sum, meal) => ({ calories: sum.calories + (meal.calories || 0), proteins: sum.proteins + (meal.proteins || 0), carbs: sum.carbs + (meal.carbs || 0), fats: sum.fats + (meal.fats || 0) }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const calorieTarget = dailyCalories || totals.calories || 1;
  const calorieRatio = Math.min(1, totals.calories / calorieTarget);
  const calorieDifference = Math.round(calorieTarget - totals.calories);
  const targetWidth = Math.max(5, calorieRatio * 100);
  const allowed = useMotionAllowed();
  const shouldReplay = useEntranceReplay();
  const fill = useSharedValue(targetWidth);
  const particleTime = useSharedValue(0);
  const particleActive = useSharedValue(false);
  const particleOpacity = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  useFocusEffect(useCallback(() => {
    cancelAnimation(fill);
    cancelAnimation(particleTime);
    cancelAnimation(particleOpacity);
    const replay = shouldReplay();
    let particleTimeout: ReturnType<typeof setTimeout> | undefined;
    if (allowed && replay) {
      fill.value = 0;
      particleTime.value = 0;
      particleActive.value = true;
      particleOpacity.value = 1;
      particleTime.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false, undefined, ReduceMotion.System);
      fill.value = withTiming(targetWidth, { duration: 1100, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
      particleTimeout = setTimeout(() => {
        particleOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }, finished => {
          if (finished) { particleActive.value = false; cancelAnimation(particleTime); }
        });
      }, 4200);
    } else {
      fill.value = targetWidth;
      particleActive.value = false;
      particleOpacity.value = 0;
      particleTime.value = 0;
    }
    return () => { clearTimeout(particleTimeout); cancelAnimation(fill); cancelAnimation(particleTime); cancelAnimation(particleOpacity); particleOpacity.value = 0; fill.value = targetWidth; particleActive.value = false; particleTime.value = 0; };
  }, [allowed, fill, particleActive, particleOpacity, particleTime, shouldReplay, targetWidth]));
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  return <EntranceView entranceIndex={0} style={styles.summary}>
    <View style={styles.summaryTop}><View><Text style={styles.summaryEyebrow}>{t('planningNutrition.planned')}</Text><Text style={styles.summaryCalories}>{roundNutritionValue(totals.calories)} <Text style={styles.summaryUnit}>/ {roundNutritionValue(calorieTarget)} kcal</Text></Text></View></View>
    <Text style={styles.nutritionNote}>{t(calorieDifference > 0 ? 'planningNutrition.below' : calorieDifference < 0 ? 'planningNutrition.above' : 'planningNutrition.matched', { calories: Math.abs(calorieDifference) })}</Text>
    <View style={particleStyles.bar} onLayout={({ nativeEvent: { layout } }) => { trackWidth.value = layout.width; }}>
      <View style={[styles.calorieTrack, particleStyles.track]}><Animated.View style={[styles.calorieFill, fillStyle]} /></View>
      {allowed && <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <CalorieGlow fill={fill} time={particleTime} active={particleActive} opacity={particleOpacity} trackWidth={trackWidth} />
        {PARTICLES.map((particle, index) => <CalorieParticle key={index} particle={particle} fill={fill} time={particleTime} active={particleActive} opacity={particleOpacity} trackWidth={trackWidth} />)}
      </View>}
    </View>
    <NutritionMacros proteins={totals.proteins} carbs={totals.carbs} fats={totals.fats} />
  </EntranceView>;
}
const PARTICLES = Array.from({ length: 22 }, (_, index) => ({
  size: index % 3 === 0 ? 20 : 7 + index % 5,
  angle: index * Math.PI * 2 / 22,
  distance: 36 + index % 6 * 7,
  phase: index / 22,
  color: ['#FFB300', '#FFCF36', '#F28B00'][index % 3],
  star: index % 3 === 0,
}));
function CalorieGlow({ fill, time, active, opacity, trackWidth }: { fill: SharedValue<number>; time: SharedValue<number>; active: SharedValue<boolean>; opacity: SharedValue<number>; trackWidth: SharedValue<number> }) {
  const glowStyle = useAnimatedStyle(() => ({
    opacity: active.value && trackWidth.value > 0 ? 0.8 * opacity.value : 0,
    transform: [
      { translateX: Math.max(0, Math.min(trackWidth.value - 8, trackWidth.value * fill.value / 100)) - 28 },
      { scale: 0.8 + Math.sin(Math.PI * 2 * time.value) * 0.15 },
    ],
  }));
  return <Animated.View style={[particleStyles.glow, glowStyle]}>
    <View style={particleStyles.glowRing} /><View style={particleStyles.glowCore} />
  </Animated.View>;
}
function CalorieParticle({ particle, fill, time, active, opacity, trackWidth }: {
  particle: typeof PARTICLES[number]; fill: SharedValue<number>; time: SharedValue<number>; active: SharedValue<boolean>; opacity: SharedValue<number>; trackWidth: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const life = (time.value * 2 + particle.phase) % 1;
    const visible = active.value && trackWidth.value > 0;
    return {
      opacity: visible ? Math.min(1, life * 6) * Math.pow(1 - life, 0.6) * opacity.value : 0,
      transform: [
        { translateX: trackWidth.value * fill.value / 100 + Math.cos(particle.angle) * particle.distance * life - particle.size / 2 },
        { translateY: Math.sin(particle.angle) * particle.distance * life - particle.size / 2 },
        { scale: 1.2 - life * 0.65 },
        { rotate: `${life * (particle.star ? 100 : 180)}deg` },
      ],
    };
  });
  return <Animated.View style={[particleStyles.particle, { width: particle.size, height: particle.size, borderRadius: particle.star ? 0 : particle.size / 2, backgroundColor: particle.star ? 'transparent' : particle.color }, animatedStyle]}>
    {particle.star && <Text style={{ color: particle.color, fontSize: particle.size, lineHeight: particle.size, textAlign: 'center' }}>✦</Text>}
  </Animated.View>;
}
const particleStyles = StyleSheet.create({
  bar: { height: 7, marginTop: 11 },
  track: { marginTop: 0 },
  particle: { position: 'absolute', left: 0, top: 3 },
  glow: { position: 'absolute', left: 0, top: -25, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD34A55', alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#FFC21B', backgroundColor: '#FFD34A66' },
  glowCore: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#FFF9D5', borderWidth: 3, borderColor: '#FFB300' },
});

export function NutritionMacros({ proteins, carbs, fats }: { proteins: number; carbs: number; fats: number }) {
  const { t } = useTranslation();
  return <View style={styles.macros}>
    <Macro value={`${roundNutritionValue(proteins)}g`} label={t('fitnessOnboarding.projection.protein')} color="#E96C5D" />
    <Macro value={`${roundNutritionValue(carbs)}g`} label={t('fitnessOnboarding.projection.carbs')} color="#75B878" />
    <Macro value={`${roundNutritionValue(fats)}g`} label={t('fitnessOnboarding.projection.fats')} color="#5DA9E9" />
  </View>;
}
function Macro({ value, label, color }: { value: string; label: string; color: string }) {
  return <View style={styles.macro}><View style={[styles.macroDot, { backgroundColor: color }]} /><View><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroLabel}>{label}</Text></View></View>;
}

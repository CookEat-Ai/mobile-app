import { AppRadii, AppTheme as designTheme, NutritionColors } from '../../constants/AppTheme';
import { Colors } from '../../constants/Colors';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';

const PHOTO_HEIGHT = 196;
// Illustrative estimate for the bowl in the picture, not a real analysis.
const FOODS = [
  { key: 'chicken', emoji: '🍗', grams: 150, left: '4%', top: '58%' },
  { key: 'quinoa', emoji: '🌾', grams: 120, left: '30%', top: '10%' },
  { key: 'avocado', emoji: '🥑', grams: 60, left: '58%', top: '34%' },
  { key: 'tomatoes', emoji: '🍅', grams: 80, left: '56%', top: '72%' },
] as const satisfies readonly { key: string; emoji: string; grams: number; left: DimensionValue; top: DimensionValue }[];
const MACROS = [
  { key: 'proteins', grams: 53 },
  { key: 'carbs', grams: 36 },
  { key: 'fats', grams: 17 },
] as const;
const STEPS = [
  { key: 'photo', icon: 'camera' },
  { key: 'analysis', icon: 'sparkles' },
  { key: 'summary', icon: 'pie-chart' },
] as const;

/** Shows what a photo becomes: the foods spotted on the plate, then the meal's calories and macros. */
export function PhotoTrackingPreview() {
  const { t } = useTranslation();
  const motion = useMotionAllowed();
  const scan = useRef(new Animated.Value(0)).current;
  const chips = useRef(FOODS.map(() => new Animated.Value(motion ? 0 : 1))).current;

  useEffect(() => {
    if (!motion) { chips.forEach(chip => chip.setValue(1)); return; }
    const sweep = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const reveal = Animated.stagger(320, chips.map(chip => Animated.spring(chip, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true })));
    sweep.start();
    const timer = setTimeout(() => reveal.start(), 500);
    return () => { clearTimeout(timer); sweep.stop(); reveal.stop(); };
  }, [motion, scan, chips]);

  return <View style={styles.root}>
    <View style={styles.card}>
      <View style={styles.photo}>
        <Image source={require('../../assets/images/cuisines/international.webp')} contentFit="cover" transition={0} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
        <View style={styles.badge}><Text style={styles.badgeText}>{t('onboarding.photoTracking.demo.example')}</Text></View>
        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map(corner => <View key={corner} style={[styles.corner, styles[corner]]} />)}
        {motion && <Animated.View pointerEvents="none" style={[styles.scanLine, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [14, PHOTO_HEIGHT - 18] }) }] }]} />}
        {FOODS.map((food, i) => <Animated.View key={food.key} style={[styles.food, { left: food.left, top: food.top, opacity: chips[i], transform: [{ scale: chips[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
          <Text style={styles.foodEmoji}>{food.emoji}</Text>
          <Text style={styles.foodName}>{t(`onboarding.photoTracking.demo.${food.key}`)}</Text>
          <Text style={styles.foodGrams}>{food.grams} g</Text>
        </Animated.View>)}
      </View>
      <View style={styles.result}>
        <View style={styles.energy}>
          <Text style={styles.calories}>520</Text>
          <Text style={styles.caloriesUnit}>{t('tracking.kcalInMeal')}</Text>
        </View>
        <View style={styles.macros}>{MACROS.map(macro => <View key={macro.key} style={styles.macro}>
          <View style={[styles.dot, { backgroundColor: NutritionColors[macro.key] }]} />
          <Text style={styles.macroValue}>{macro.grams} g</Text>
          <Text style={styles.macroLabel} numberOfLines={1}>{t(`tracking.${macro.key}`)}</Text>
        </View>)}</View>
      </View>
    </View>
    <View style={styles.steps}>{STEPS.map((step, i) => <React.Fragment key={step.key}>
      {i > 0 && <Ionicons name="chevron-forward" size={16} color={Colors.light.textSecondary} />}
      <View style={styles.step}>
        <View style={styles.stepIcon}><Ionicons name={step.icon} size={16} color={designTheme.onPrimary} /></View>
        <Text style={styles.stepLabel} numberOfLines={2}>{t(`onboarding.photoTracking.demo.${step.key}`)}</Text>
      </View>
    </React.Fragment>)}</View>
  </View>;
}

const cornerSize = 24, cornerInset = 12;
const styles = StyleSheet.create({
  root: { width: '100%', gap: 16 },
  card: { padding: 8, borderRadius: AppRadii.card, backgroundColor: designTheme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  photo: { height: PHOTO_HEIGHT, borderRadius: AppRadii.control, overflow: 'hidden', backgroundColor: designTheme.yellowSoft },
  badge: { position: 'absolute', bottom: 14, left: cornerInset + cornerSize + 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: AppRadii.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  badgeText: { fontFamily: 'CronosProBold', fontSize: 12, color: designTheme.onPrimary },
  corner: { position: 'absolute', width: cornerSize, height: cornerSize, borderColor: Colors.light.button },
  topLeft: { top: cornerInset, left: cornerInset, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  topRight: { top: cornerInset, right: cornerInset, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bottomLeft: { bottom: cornerInset, left: cornerInset, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: cornerInset, right: cornerInset, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  scanLine: { position: 'absolute', left: cornerInset, right: cornerInset, top: 0, height: 3, borderRadius: 2, backgroundColor: Colors.light.button, shadowColor: Colors.light.button, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  food: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 6, paddingRight: 10, paddingVertical: 5, borderRadius: AppRadii.pill, backgroundColor: designTheme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
  foodEmoji: { fontSize: 15 },
  foodName: { fontFamily: 'Degular', fontSize: 15, color: Colors.light.text },
  foodGrams: { fontFamily: 'CronosPro', fontSize: 13, color: Colors.light.textSecondary },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 6 },
  energy: { minWidth: 92 },
  calories: { fontFamily: 'Degular', fontSize: 36, lineHeight: 38, color: Colors.light.text },
  caloriesUnit: { fontFamily: 'CronosPro', fontSize: 12, lineHeight: 15, color: Colors.light.textSecondary },
  macros: { flex: 1, flexDirection: 'row', gap: 6 },
  macro: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, borderRadius: AppRadii.control, backgroundColor: designTheme.cream, gap: 2 },
  dot: { width: 18, height: 4, borderRadius: 2, marginBottom: 2 },
  macroValue: { fontFamily: 'Degular', fontSize: 18, color: Colors.light.text },
  macroLabel: { fontFamily: 'CronosPro', fontSize: 12, color: Colors.light.textSecondary },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  step: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 5, paddingRight: 10, paddingVertical: 5, borderRadius: AppRadii.pill, backgroundColor: designTheme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  stepIcon: { width: 26, height: 26, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.button },
  stepLabel: { flexShrink: 1, fontFamily: 'Degular', fontSize: 14, lineHeight: 16, color: Colors.light.text },
});

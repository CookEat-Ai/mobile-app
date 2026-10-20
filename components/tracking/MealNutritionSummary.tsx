import { AppRadii, AppTheme as theme, appStyles, NutritionColors } from '../../constants/AppTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { FoodNutrition } from '../../services/mealTracking';
/** A meal's measured estimate, never a progress ring against a daily allowance. */
export function MealNutritionSummary({ nutrition, partial, compact = false, recognizing = false, userEntered = false }: {
    nutrition: FoodNutrition | null;
    partial: boolean;
    compact?: boolean;
    recognizing?: boolean;
    userEntered?: boolean;
}) {
    const { t } = useTranslation();
    const energies = nutrition ? [nutrition.proteins * 4, nutrition.carbs * 4, nutrition.fats * 9] : [0, 0, 0];
    const total = energies.reduce((sum, n) => sum + n, 0), ringSize = compact ? 64 : 112, center = ringSize/2, radius = center-10, circumference = 2 * Math.PI * radius;
    const colors = [NutritionColors.proteins, NutritionColors.carbs, NutritionColors.fats];
    let offset = 0;
    return <View style={{ gap: compact ? 10 : 14 }}>
    <View style={[styles.energy, compact && {padding:10}]}>
      <View style={{ flex: 1, gap: compact ? 4 : 8 }}><Text style={[appStyles.eyebrow, compact && {fontSize:11}]}>{t('tracking.mealEnergy')}</Text><Text accessibilityLiveRegion="polite" style={[styles.calories, compact && {fontSize:40,lineHeight:44}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.6}>{nutrition ? Math.round(nutrition.calories) : '—'}</Text><Text style={[styles.energyUnit, compact && {fontSize:14}]}>{t('tracking.kcalInMeal')}</Text></View>
      <View accessible accessibilityLabel={t('tracking.macroDistribution')} style={[styles.ring,{width:ringSize,height:ringSize}]}>
        <Svg width={ringSize} height={ringSize} style={StyleSheet.absoluteFill}><Circle cx={center} cy={center} r={radius} stroke={theme.soft} strokeWidth={compact?10:12} fill="none"/>{energies.map((energy, i) => { const length = total ? energy / total * circumference : 0; const start = offset; offset += length; return <Circle key={i} cx={center} cy={center} r={radius} fill="none" stroke={colors[i]} strokeWidth={compact?10:12} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} rotation={-90} origin={`${center},${center}`}/>; })}</Svg><View style={[styles.ringIcon,compact&&{width:32,height:32,borderRadius:AppRadii.control}]}><Ionicons name="restaurant-outline" size={compact?20:30} color={theme.onPrimary}/></View>
      </View>
    </View>
    <View style={styles.macros}>{(['proteins', 'carbs', 'fats'] as const).map((key, i) => <View key={key} style={[styles.macro,compact&&{padding:10,gap:4}]}><View style={[styles.dot, { backgroundColor: colors[i] }]}/><Text style={[styles.grams, compact && {fontSize:24}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.65}>{nutrition ? Math.round(nutrition[key]) : '—'}<Text style={styles.unit}> g</Text></Text><Text style={[styles.label, compact && {fontSize:13}]}>{t(`tracking.${key}`)}</Text></View>)}</View>
    {!recognizing && (partial || userEntered) && <View style={styles.note}><Ionicons name={partial ? 'alert-circle-outline' : userEntered ? 'create-outline' : 'sparkles-outline'} size={17} color={theme.muted}/><Text style={[appStyles.subtitle, { fontSize: 14, flex: 1 }]}>{t(partial ? 'tracking.partialEstimate' : userEntered ? 'tracking.userNutrition' : 'tracking.nutritionEstimateNote')}</Text></View>}
  </View>;
}
const styles = StyleSheet.create({ energy: { ...appStyles.card, backgroundColor: theme.surface, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 14 }, calories: { fontFamily: 'Degular', fontSize: 64, lineHeight: 68, color: theme.ink }, energyUnit: { fontFamily: 'CronosPro', fontSize: 17, color: theme.muted }, ring: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }, ringIcon: { width: 52, height: 52, borderRadius: AppRadii.card, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }, macros: { flexDirection: 'row', gap: 9 }, macro: { ...appStyles.card, flex: 1, padding: 14, gap: 7 }, dot: { height: 5, width: 22, borderRadius: 3 }, grams: { fontFamily: 'Degular', fontSize: 28, color: theme.ink }, unit: { fontFamily: 'CronosPro', fontSize: 13 }, label: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted }, note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 2 } });

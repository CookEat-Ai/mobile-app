import { AppRadii, AppTheme as theme, appStyles, NutritionColors } from '../../constants/AppTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { FoodNutrition } from '../../services/mealTracking';
const MACROS = ['proteins', 'carbs', 'fats'] as const;
const KCAL_PER_GRAM = { proteins: 4, carbs: 4, fats: 9 } as const;
/** A meal's measured estimate, never a progress bar against a daily allowance. */
export function MealNutritionSummary({ nutrition, partial, compact = false, recognizing = false, userEntered = false }: {
    nutrition: FoodNutrition | null;
    partial: boolean;
    compact?: boolean;
    recognizing?: boolean;
    userEntered?: boolean;
}) {
    const { t } = useTranslation();
    // Each macro's share of the meal's energy; the bar and the tiles show the same split in the same colours.
    const energies = MACROS.map(key => nutrition ? nutrition[key] * KCAL_PER_GRAM[key] : 0);
    const total = energies.reduce((sum, n) => sum + n, 0);
    const shares = energies.map(energy => total ? Math.round(energy / total * 100) : null);
    return <View style={{ gap: compact ? 10 : 12 }}>
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.energy}>
        <View style={{ flex: 1, gap: compact ? 2 : 4 }}>
          <Text style={[appStyles.eyebrow, compact && {fontSize:11}]}>{t('tracking.mealEnergy')}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.calories, compact && styles.caloriesCompact]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.6}>{nutrition ? Math.round(nutrition.calories) : '—'}<Text style={[styles.energyUnit, compact && styles.energyUnitCompact]}> kcal</Text></Text>
        </View>
        <View style={[styles.icon, compact && styles.iconCompact]}><Ionicons name="restaurant-outline" size={compact?17:24} color={theme.onPrimary}/></View>
      </View>
      {total > 0 && <View accessible accessibilityLabel={`${t('tracking.macroDistribution')}: ${MACROS.map((key, i) => `${t(`tracking.${key}`)} ${shares[i]} %`).join(', ')}`} style={[styles.bar, compact && styles.barCompact]}>
        {MACROS.map((key, i) => energies[i] > 0 && <View key={key} style={[styles.segment, { flex: energies[i], backgroundColor: NutritionColors[key] }]}/>)}
      </View>}
      <View style={styles.macros}>{MACROS.map((key, i) => <View key={key} style={[styles.macro,compact&&styles.macroCompact]}>
        <View style={styles.macroHead}><View style={[styles.dot, { backgroundColor: NutritionColors[key] }]}/><Text style={[styles.label, compact && {fontSize:12}]} numberOfLines={1}>{t(`tracking.${key}`)}</Text></View>
        <Text style={[styles.grams, compact && {fontSize:22}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.65}>{nutrition ? Math.round(nutrition[key]) : '—'}<Text style={styles.unit}> g</Text></Text>
        {shares[i] !== null && !compact && <Text style={styles.share} numberOfLines={1}>{t('tracking.energyShare', { percent: shares[i] })}</Text>}
      </View>)}</View>
    </View>
    {!recognizing && (partial || userEntered) && <View style={styles.note}><Ionicons name={partial ? 'alert-circle-outline' : userEntered ? 'create-outline' : 'sparkles-outline'} size={17} color={theme.muted}/><Text style={[appStyles.subtitle, { fontSize: 14, flex: 1 }]}>{t(partial ? 'tracking.partialEstimate' : userEntered ? 'tracking.userNutrition' : 'tracking.nutritionEstimateNote')}</Text></View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 20, gap: 16, borderRadius: AppRadii.card, backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  cardCompact: { padding: 12, gap: 10 },
  energy: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  calories: { fontFamily: 'Degular', fontSize: 60, lineHeight: 64, color: theme.ink },
  caloriesCompact: { fontSize: 38, lineHeight: 42 },
  energyUnit: { fontFamily: 'Degular', fontSize: 24, color: theme.muted },
  energyUnitCompact: { fontSize: 17 },
  icon: { width: 48, height: 48, borderRadius: AppRadii.pill, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' },
  iconCompact: { width: 32, height: 32 },
  bar: { height: 12, flexDirection: 'row', gap: 3, borderRadius: AppRadii.pill, overflow: 'hidden' },
  barCompact: { height: 8 },
  segment: { height: '100%' },
  macros: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, borderRadius: AppRadii.control, backgroundColor: theme.cream, gap: 4 },
  macroCompact: { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  grams: { fontFamily: 'Degular', fontSize: 28, color: theme.ink },
  unit: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted },
  label: { flexShrink: 1, fontFamily: 'CronosProBold', fontSize: 13, color: theme.muted },
  share: { fontFamily: 'CronosProBold', fontSize: 12, color: theme.ink },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 2 },
});

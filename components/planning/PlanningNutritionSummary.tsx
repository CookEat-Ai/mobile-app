import { EntranceView } from '../motion/Entrance';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTheme as theme } from '../../constants/AppTheme';
import { useTranslation } from 'react-i18next';
import type { MealPlanMeal } from '../../services/api';
import { roundNutritionValue } from '../../services/weeklyPlanning';
import { planningStyles as styles } from './PlanningStyles';

export function PlanningNutritionSummary({ meals }: { meals: MealPlanMeal[] }) {
  const { t, i18n } = useTranslation();
  const totals = meals.reduce((sum, meal) => ({ calories: sum.calories + (meal.calories || 0), proteins: sum.proteins + (meal.proteins || 0), carbs: sum.carbs + (meal.carbs || 0), fats: sum.fats + (meal.fats || 0) }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
  return <EntranceView entranceIndex={0} style={cardStyles.card}>
    <View style={cardStyles.energy}>
      <Text style={cardStyles.calories}>{new Intl.NumberFormat(i18n.language).format(roundNutritionValue(totals.calories))}<Text style={cardStyles.unit}> kcal</Text></Text>
      <Text style={cardStyles.caption}>{t('planningNutrition.dayTotal')}</Text>
    </View>
    <View style={cardStyles.divider} />
    <NutritionMacros proteins={totals.proteins} carbs={totals.carbs} fats={totals.fats} separated />
  </EntranceView>;
}

export function NutritionMacros({ proteins, carbs, fats, separated = false }: { proteins: number; carbs: number; fats: number; separated?: boolean }) {
  const { t } = useTranslation();
  return <View style={separated ? cardStyles.macros : styles.macros}>
    <Macro separated={separated} value={`${roundNutritionValue(proteins)}g`} label={t('fitnessOnboarding.projection.protein')} color="#E96C5D" />
    <Macro separated={separated} value={`${roundNutritionValue(carbs)}g`} label={t('fitnessOnboarding.projection.carbs')} color="#75B878" />
    <Macro separated={separated} value={`${roundNutritionValue(fats)}g`} label={t('fitnessOnboarding.projection.fats')} color="#5DA9E9" />
  </View>;
}
function Macro({ value, label, color, separated }: { value: string; label: string; color: string; separated?: boolean }) {
  if (separated) return <View style={cardStyles.macro}><View style={cardStyles.macroHeading}><View style={[cardStyles.dot, { backgroundColor: color }]} /><Text style={cardStyles.macroLabel}>{label}</Text></View><Text style={cardStyles.macroValue}>{value.replace('g', ' g')}</Text></View>;
  return <View style={styles.macro}><View style={[styles.macroDot, { backgroundColor: color }]} /><View><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroLabel}>{label}</Text></View></View>;
}

const cardStyles = StyleSheet.create({
  card: { padding: 14, borderRadius: theme.radius, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  energy: { gap: 0 },
  calories: { fontFamily: 'Degular', fontSize: 30, lineHeight: 34, color: theme.ink, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted },
  caption: { fontFamily: 'CronosPro', fontSize: 13, lineHeight: 17, color: theme.muted },
  divider: { height: 1, backgroundColor: theme.line, marginVertical: 10 },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macro: { flexGrow: 1, flexBasis: 85, gap: 4, padding: 8, borderRadius: 12, backgroundColor: theme.background },
  macroHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  macroLabel: { flexShrink: 1, fontFamily: 'CronosPro', fontSize: 13, lineHeight: 17, color: theme.muted },
  macroValue: { fontFamily: 'CronosProBold', fontSize: 17, lineHeight: 20, color: theme.ink, fontVariant: ['tabular-nums'] },
});

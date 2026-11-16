import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { MealPlan, MealPlanMeal } from '../../services/api';
import { getOverviewColumns } from '../../constants/Layout';
import { MealCostEstimate } from './MealCostEstimate';
import { PlanningNutritionSummary } from './PlanningNutritionSummary';

/** Measure the actual content rail, including sheets and iPad Split View. */
export function PlanningOverview({ plan, meals, day }: { plan: MealPlan; meals: MealPlanMeal[]; day: number }) {
  const [contentWidth, setContentWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const hasBudget = !!plan.estimatedCost;
  const hasNutrition = meals.length > 0;
  const paired = hasBudget && hasNutrition && getOverviewColumns(contentWidth, fontScale) === 2;
  return <View onLayout={event => setContentWidth(event.nativeEvent.layout.width)} style={[styles.overview, paired && styles.paired]}>
    {hasBudget && <MealCostEstimate cost={plan.estimatedCost} total budget={Number(plan.preferences?.weeklyBudget) || undefined} panel={paired} style={[styles.card, paired && styles.column]} />}
    {hasNutrition && <PlanningNutritionSummary key={`nutrition:${plan._id}:${day}`} meals={meals} style={paired ? styles.column : undefined} />}
  </View>;
}
const styles = StyleSheet.create({
  overview: { marginVertical: 10, gap: 12 },
  paired: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  column: { flex: 1, minWidth: 0 },
  card: { marginVertical: 0 },
});

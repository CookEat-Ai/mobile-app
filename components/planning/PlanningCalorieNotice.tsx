import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MealPlan } from '../../services/api';
import { dailyPlannedCalorieTarget, withinCalorieBudget, BudgetMeal } from '../../services/planning-calorie-budget';

export function PlanningCalorieNotice({ plan, dayIndex }: { plan: MealPlan; dayIndex?: number }) {
  const { t, i18n } = useTranslation();
  const meals = plan.meals.filter((meal): meal is typeof meal & BudgetMeal => Number.isInteger(meal.dayIndex) && !!meal.mealType && Number(meal.calories) > 0);
  const days = [...new Set(meals.map(meal => meal.dayIndex))].filter(day => dayIndex === undefined || day === dayIndex);
  return <View>{days.map(day => {
    const selected = meals.filter(meal => meal.dayIndex === day);
    if (!selected.some(meal => meal.calorieFit === 'closest_available')) return null;
    const target = dailyPlannedCalorieTarget(day, meals, Number(plan.nutritionTargets?.dailyCalories), plan.preferences || {});
    const total = selected.reduce((sum, meal) => sum + meal.calories, 0);
    if (!Number.isFinite(target) || target <= 0 || withinCalorieBudget(total, target)) return null;
    const date = new Date(`${plan.weekStart}T12:00:00`); date.setDate(date.getDate() + day);
    const label = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(date);
    return <Text key={day} style={{ fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: '#746C56', marginVertical: 6 }}>
      {t('planningNutrition.closestAvailable', { day: label, actual: Math.round(total), target: Math.round(target), percent: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(Math.ceil(Math.abs(total / target - 1) * 1000) / 10) })}
    </Text>;
  })}</View>;
}

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppRadii, AppTheme as theme } from '../constants/AppTheme';
import type { GoalFit } from '../services/recipeGoalFit';

type Props = {
  fit: Extract<GoalFit, { status: 'adapted' }>;
  adapted: boolean;
  onToggle: (adapted: boolean) => void;
  /** Without premium, calories stay locked as elsewhere on the recipe. */
  nutritionLocked: boolean;
  onLockedPress: () => void;
};

/** Before/after of an imported recipe adapted to the user's goal. */
export function RecipeGoalFitCard({ fit, adapted, onToggle, nutritionLocked, onLockedPress }: Props) {
  const { t } = useTranslation();
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.icon}><Ionicons name="sparkles" size={16} color={theme.onPrimary} /></View>
      <Text style={styles.title}>{t('recipeDetail.goalFit.title')}</Text>
    </View>
    <TouchableOpacity accessibilityRole={nutritionLocked ? 'button' : undefined} disabled={!nutritionLocked} onPress={onLockedPress} style={styles.numbers}>
      {nutritionLocked ? <Text style={styles.locked}><Ionicons name="lock-closed" size={14} color={theme.muted} /> {t('recipeDetail.goalFit.locked')}</Text> : <>
        <Text style={styles.before}>{t('recipeDetail.goalFit.original', { calories: fit.before.calories, proteins: fit.before.proteins })}</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.ink} />
        <Text style={styles.after}>{t('recipeDetail.goalFit.yours', { calories: fit.after.calories, proteins: fit.after.proteins })}</Text>
      </>}
    </TouchableOpacity>
    <View style={styles.changes}>
      {fit.changes.slice(0, 5).map((change, index) => <Text key={index} style={styles.change}>
        {change.kind === 'swap'
          ? t('recipeDetail.goalFit.swap', { from: change.from.name, to: change.to.name })
          : t('recipeDetail.goalFit.quantity', { name: change.to.name, from: change.from.quantity, to: change.to.quantity })}
        {!nutritionLocked && change.caloriesPerServing !== 0 ? <Text style={styles.delta}>{`  ${change.caloriesPerServing > 0 ? '+' : '−'}${Math.abs(change.caloriesPerServing)} kcal`}</Text> : null}
      </Text>)}
    </View>
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {([true, false] as const).map(value => <TouchableOpacity key={String(value)} accessibilityRole="radio" accessibilityState={{ selected: adapted === value }}
        style={[styles.option, adapted === value && styles.selected]} onPress={() => onToggle(value)}>
        <Text style={[styles.optionText, adapted === value && styles.selectedText]}>{t(value ? 'recipeDetail.goalFit.showYours' : 'recipeDetail.goalFit.showOriginal')}</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, marginTop: 16, borderRadius: AppRadii.card, backgroundColor: theme.yellowSoft, borderWidth: 1, borderColor: theme.yellow },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 28, height: 28, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
  title: { flex: 1, fontFamily: 'Degular', fontSize: 20, color: theme.ink },
  numbers: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  before: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted, textDecorationLine: 'line-through' },
  after: { fontFamily: 'Degular', fontSize: 18, color: theme.ink },
  locked: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted },
  changes: { gap: 6 },
  change: { fontFamily: 'CronosPro', fontSize: 15, lineHeight: 20, color: theme.ink },
  delta: { color: theme.muted },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: AppRadii.pill, backgroundColor: theme.surface },
  option: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: AppRadii.pill },
  selected: { backgroundColor: theme.yellow },
  optionText: { fontFamily: 'Degular', fontSize: 15, color: theme.muted },
  selectedText: { color: theme.onPrimary },
});

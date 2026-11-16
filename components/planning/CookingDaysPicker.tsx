import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { usePlanningClock } from '../../hooks/usePlanningClock';
import { planningMealsByDay } from '../../services/planning-time';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { planDays } from '../../services/planningDisplay';
import { feedback } from '../../services/haptics';

/** Shared cooking-day selection in onboarding and planning configuration. */
export function CookingDaysPicker({ weekStart, value, onChange }: {
  weekStart: string; value: number[]; onChange: (days: number[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const window = usePlanningClock();
  const meals = Object.values(planningMealsByDay(weekStart, value, undefined, window.now)).reduce((count, types) => count + types.length, 0);
  return <View>
    <View style={styles.days}>{planDays(weekStart).map(day => {
      const selected = value.includes(day.dayIndex);
      const weekend = [0, 6].includes(day.date.getDay());
      return <TouchableOpacity key={day.key} style={[styles.day, selected && styles.selected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
        accessibilityLabel={new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric' }).format(day.date)}
        onPress={() => {
          if (selected && value.length === 1) return;
          void feedback.selection();
          onChange(selected ? value.filter(index => index !== day.dayIndex) : [...value, day.dayIndex].sort((a, b) => a - b));
        }}>
        <Text style={[styles.dayName, weekend && styles.weekendName]}>{new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(day.date)}</Text>
        <Text style={styles.dayNumber}>{day.date.getDate()}</Text>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? theme.yellow : theme.muted} />
      </TouchableOpacity>;
    })}</View>
    <Text style={styles.selection}>{t('planningFlow.meals', { days: value.length, meals })}</Text>
    {window.weekStart !== window.today ? <Text style={styles.help}>{t('planningFlow.startsTomorrow')}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  day: { width: '21%', minWidth: 60, minHeight: 100, borderWidth: 1, borderColor: theme.line, borderRadius: AppRadii.control, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dayName: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.muted, textTransform: 'capitalize' },
  dayNumber: { fontFamily: 'Degular', fontSize: 26, color: theme.ink },
  weekendName: { color: appStyles.error.color },
  selected: { backgroundColor: theme.yellowSoft, borderColor: theme.yellow },
  help: { fontFamily: 'CronosPro', fontSize: 16, color: theme.muted, marginTop: 8 },
  selection: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink, marginTop: 22 },
});

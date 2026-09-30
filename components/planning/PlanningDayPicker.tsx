import { feedback } from '../../services/haptics';
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { planningStyles as styles } from './PlanningStyles';

export type PlanningDay = { key: string; dayIndex: number; short: string; number: number; label?: string };

export function PlanningDayPicker({ days, selectedDay, onSelect }: {
  days: PlanningDay[]; selectedDay: number; onSelect: (day: number) => void;
}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
    {days.map(day => <TouchableOpacity key={day.key} onPress={() => { if (day.dayIndex !== selectedDay) feedback.selection(); onSelect(day.dayIndex); }} style={[styles.day, selectedDay === day.dayIndex && styles.dayActive]}
      accessibilityRole="button" accessibilityState={{ selected: selectedDay === day.dayIndex }} accessibilityLabel={`${day.label || day.short} ${day.number}`}>
      <Text style={[styles.dayShort, selectedDay === day.dayIndex && styles.dayTextActive]}>{day.short}</Text>
      <Text style={[styles.dayNumber, selectedDay === day.dayIndex && styles.dayTextActive]}>{day.number}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}

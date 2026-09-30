import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { calculateFitnessProjection, FitnessProfile } from '../services/fitnessProfile';

export function NutritionExplanation({ profile }: { profile: FitnessProfile }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const projection = calculateFitnessProjection(profile);
  return <View style={styles.container}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.button}>
      <Text style={styles.link}>{t('nutritionEstimate.how')}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.text} />
    </TouchableOpacity>
    {expanded && <View style={styles.details}>
      <Text style={styles.body}>{t('nutritionEstimate.method', { weight: profile.nutritionWeightKg ?? profile.currentWeightKg, calories: projection.estimatedMaintenanceCalories })}</Text>
      {profile.trainingDays > 0 && <Text style={styles.body}>{t('nutritionEstimate.trainingAssumption', { days: profile.trainingDays, minutes: profile.trainingDurationMinutes ?? 45 })}</Text>}
      {profile.sex === 'unspecified' && <Text style={styles.body}>{t('nutritionEstimate.unspecifiedSex')}</Text>}
      <Text style={styles.body}>{t('nutritionEstimate.adjustment')}</Text>
      <TouchableOpacity accessibilityRole="link" style={styles.button} onPress={() => { void Linking.openURL('https://www.niddk.nih.gov/bwp').catch(() => {}); }}>
        <Text style={styles.link}>{t('nutritionEstimate.source')}</Text>
        <Ionicons name="open-outline" size={16} color={Colors.light.text} />
      </TouchableOpacity>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { width: '100%', marginTop: 8 },
  button: { minHeight: 44, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  link: { flexShrink: 1, fontFamily: 'CronosProBold', fontSize: 14, color: Colors.light.text, textDecorationLine: 'underline' },
  details: { backgroundColor: '#FFFBEF', padding: 16, borderRadius: 16, gap: 10 },
  body: { fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: Colors.light.textSecondary },
});

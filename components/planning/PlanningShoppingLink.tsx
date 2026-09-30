import { feedback } from '../../services/haptics';
import { EntranceTouchable } from '../motion/Entrance';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { planningStyles as styles } from './PlanningStyles';

export function PlanningShoppingLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return <EntranceTouchable entranceIndex={0} style={styles.valueRow} activeOpacity={0.8} accessibilityRole="button" onPress={() => { feedback.light(); onPress(); }}>
    <View style={styles.valueIcon}><Ionicons name="cart" size={21} color="#3F7C55" /></View>
    <View style={styles.valueCopy}><Text style={styles.valueTitle}>{t('planning.shoppingTitle')}</Text><Text style={styles.valueText}>{t('weeklyOnboarding.preview.shoppingAccess')}</Text></View>
    <Ionicons name="chevron-forward" size={22} color="#3F7C55" />
  </EntranceTouchable>;
}

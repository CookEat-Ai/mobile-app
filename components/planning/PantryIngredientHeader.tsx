import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';

export function PantryIngredientHeader({ title, onAdd, disabled = false, trailing }: {
  title: string; onAdd?: () => void; disabled?: boolean; trailing?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return <View style={styles.row} accessibilityLiveRegion="polite">
    <Text style={[appStyles.section, { flex: 1 }]}>{title}</Text>
    {onAdd && <Pressable accessibilityRole="button" accessibilityLabel={t('recipeSummary.add')} disabled={disabled} onPress={onAdd} style={[styles.add, disabled && { opacity: 0.45 }]}>
      <Ionicons name="add" size={20} color={theme.ink} /><Text style={styles.text}>{t('recipeSummary.add')}</Text>
    </Pressable>}
    {trailing}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.yellowSoft },
  text: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink },
});

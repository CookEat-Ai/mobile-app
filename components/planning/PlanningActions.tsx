import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { SettingsRow } from '../SettingsRow';

/** The same action rows as Settings, grouped beneath the shopping card. */
export function PlanningActions({ onOrganize, onRegenerate, onDelete, disabled = false, deleting = false }: {
  onOrganize?: () => void; onRegenerate?: () => void; onDelete?: () => void;
  disabled?: boolean; deleting?: boolean;
}) {
  const { t } = useTranslation();
  const actions = [
    onOrganize && { key: 'organize', title: t('planningOrganize.action'), icon: 'pencil-outline' as const, onPress: onOrganize },
    onRegenerate && { key: 'regenerate', title: t('planningDetail.regenerate'), icon: 'refresh-outline' as const, onPress: onRegenerate },
    onDelete && { key: 'delete', title: t('planningFlow.deleteAction'), icon: 'trash-outline' as const, onPress: onDelete },
  ].filter(action => !!action);
  if (!actions.length) return null;
  return <View style={[appStyles.card, styles.card]}>{actions.map((action, index) => <View key={action.key} style={index ? styles.divider : undefined}>
    <SettingsRow title={action.title} icon={action.icon} onPress={action.onPress} destructive={action.key === 'delete'}
      disabled={disabled || deleting} loading={action.key === 'delete' && deleting} />
  </View>)}</View>;
}
const styles = StyleSheet.create({
  card: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 0 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
});

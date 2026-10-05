import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PantryIngredientHeader } from './PantryIngredientHeader';
import { PantryIngredientList } from './PantryIngredientList';

export function PantryIngredientsSection({ onAdd, ...listProps }: React.ComponentProps<typeof PantryIngredientList> & { onAdd: () => void }) {
  const { t } = useTranslation();
  return <View style={styles.section}>
    <PantryIngredientHeader title={t('pantryScan.ingredients')} onAdd={onAdd} disabled={listProps.disabled} />
    <PantryIngredientList {...listProps} />
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 14 } });

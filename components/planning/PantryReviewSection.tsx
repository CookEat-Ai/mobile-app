import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { getIngredientIcon } from '../../constants/IngredientIcons';
import { pantryIngredientKey } from '../../services/planningPantry';
import { ingredientCategories } from '../../services/ingredientCategories';
import { feedback } from '../../services/haptics';
import { PantryIngredientSearchModal } from './PantryIngredientSearchModal';

export function PantryReviewSection({ ingredients, onChange, recognized = false, disabled = false }: {
  ingredients: string[]; onChange: (names: string[]) => void; recognized?: boolean; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const icons = useMemo(() => new Map(ingredientCategories(t).flatMap(group => group.ingredients).map(item => [pantryIngredientKey(item.name), item.icon])), [t]);
  const [adding, setAdding] = useState(false);
  return <View style={styles.root}>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={appStyles.title}>{t(recognized ? 'pantryReview.foundTitle' : 'pantryScan.ingredients')}</Text>
      <Text accessibilityLiveRegion="polite" style={appStyles.subtitle}>{t('pantryReview.count', { count: ingredients.length })}</Text>
    </View>
    {!!ingredients.length && <View style={styles.list}>{ingredients.map((name, index) => <View key={pantryIngredientKey(name)} style={[styles.row, index > 0 && styles.separator]}>
      <Text accessible={false} style={styles.emoji}>{getIngredientIcon(name, icons.get(pantryIngredientKey(name)))}</Text><Text style={styles.name}>{name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('pantryReview.removeName', { name })} accessibilityState={{ disabled }} disabled={disabled} style={styles.remove} onPress={() => {
        onChange(ingredients.filter(item => pantryIngredientKey(item) !== pantryIngredientKey(name))); void feedback.selection();
      }}><Ionicons name="close" size={20} color={theme.ink} /></Pressable>
    </View>)}</View>}
    {!ingredients.length && <Text style={appStyles.subtitle}>{t(recognized ? 'pantryReview.emptyScan' : 'pantryReview.emptyManual')}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.add, disabled && styles.disabled]} onPress={() => setAdding(true)}>
      <Ionicons name="add" size={22} color={theme.ink} /><Text style={appStyles.textAction}>{t('recipeSummary.add')}</Text>
    </Pressable>
    <PantryIngredientSearchModal visible={adding} ingredients={ingredients} onChange={onChange} onClose={() => setAdding(false)} />
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 16 }, heading: { gap: 8 }, list: { paddingHorizontal: 14, borderWidth: 1, borderColor: theme.line, borderRadius: 20, backgroundColor: theme.surface },
  row: { minHeight: 62, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 12 }, separator: { borderTopWidth: 1, borderTopColor: theme.line },
  emoji: { fontSize: 28, width: 32, textAlign: 'center' }, name: { flex: 1, fontFamily: 'CronosProBold', fontSize: 18, color: theme.ink },
  remove: { minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  add: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.yellow, backgroundColor: theme.yellowSoft }, disabled: { opacity: 0.45 },
});

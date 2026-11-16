import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

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
      <Text style={appStyles.subtitle}>{t('pantryReview.help')}</Text>
    </View>
    {!!ingredients.length && <View style={styles.chips}>{ingredients.map(name => <View key={pantryIngredientKey(name)} style={styles.chip}>
      <View style={styles.emojiCircle}><Text accessible={false} style={styles.emoji}>{getIngredientIcon(name, icons.get(pantryIngredientKey(name)))}</Text></View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('pantryReview.removeName', { name })} accessibilityState={{ disabled }} disabled={disabled} hitSlop={8} style={styles.remove} onPress={() => {
        onChange(ingredients.filter(item => pantryIngredientKey(item) !== pantryIngredientKey(name))); void feedback.selection();
      }}><Ionicons name="close" size={16} color={theme.muted} /></Pressable>
    </View>)}</View>}
    {!ingredients.length && <View style={styles.empty}>
      <Text accessible={false} style={styles.emptyEmoji}>🧺</Text>
      <Text style={[appStyles.subtitle, styles.emptyText]}>{t(recognized ? 'pantryReview.emptyScan' : 'pantryReview.emptyManual')}</Text>
    </View>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.add, disabled && styles.disabled]} onPress={() => setAdding(true)}>
      <View style={styles.addIcon}><Ionicons name="add" size={22} color={theme.onPrimary} /></View>
      <Text style={[appStyles.textAction, styles.addText]}>{t('pantryReview.addTitle')}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{t('pantryReview.count', { count: ingredients.length })}</Text>
    </Pressable>
    <PantryIngredientSearchModal visible={adding} ingredients={ingredients} onChange={onChange} onClose={() => setAdding(false)} />
  </View>;
}
const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };
const styles = StyleSheet.create({
  root: { gap: 20 }, heading: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { maxWidth: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 7, paddingRight: 6, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...shadow },
  emojiCircle: { width: 38, height: 38, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellowSoft },
  emoji: { fontSize: 22 }, name: { flexShrink: 1, fontFamily: 'CronosProBold', fontSize: 17, color: theme.ink },
  remove: { width: 30, height: 30, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cream },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 20, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...shadow },
  emptyEmoji: { fontSize: 40 }, emptyText: { textAlign: 'center' },
  add: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...shadow },
  addIcon: { width: 34, height: 34, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
  addText: { flex: 1 }, count: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted }, disabled: { opacity: 0.45 },
});

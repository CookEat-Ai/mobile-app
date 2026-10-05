import { usePantryCategoryAssignments } from '../../services/pantryCategoryAssignments';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ingredientCategories } from '../../services/ingredientCategories';
import { groupPantryIngredients } from '../../services/pantryCategories';
import { AppTheme as theme } from '../../constants/AppTheme';

export function PantryIngredientList({ ingredients, removed = [], disabled = false, onAddCategory, onToggle }: {
  ingredients: string[]; removed?: string[]; disabled?: boolean; onToggle: (name: string) => void; onAddCategory?: (categoryId: string) => void;
}) {
  const { t } = useTranslation();
  const assignments = usePantryCategoryAssignments();
  const groups = groupPantryIngredients(ingredients, ingredientCategories(t), t('recipeSummary.other'), assignments);
  return <View style={styles.groups}>{groups.map(group => <View key={group.id} style={styles.group}>
    <View style={styles.header}><Text style={styles.title}>{group.icon} {group.title}</Text>{onAddCategory && <Pressable accessibilityRole="button" accessibilityLabel={`${t('recipeSummary.add')}: ${group.title}`} disabled={disabled} style={styles.addCategory} onPress={() => onAddCategory(group.id)}><Ionicons name="add" size={20} color={theme.ink} /></Pressable>}</View>
    <View style={styles.chips}>{group.names.map(name => {
      const checked = !removed.includes(name);
      return <Pressable key={name} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={name} onPress={() => onToggle(name)} style={[styles.chip, !checked && styles.removed]}>
        <Text style={styles.name}>{name}</Text><Ionicons name={checked ? 'close' : 'add'} size={18} color={theme.ink} />
      </Pressable>;
    })}</View>
  </View>)}</View>;
}
const styles = StyleSheet.create({
  groups: { gap: 16 }, group: { padding: 16, borderWidth: 1, borderColor: theme.line, borderRadius: 20, backgroundColor: theme.surface, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, addCategory: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.yellowSoft },
  title: { flex: 1, fontFamily: 'CronosProBold', fontSize: 18, color: theme.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, padding: 12, borderRadius: 14, backgroundColor: theme.yellowSoft, maxWidth: '100%' },
  name: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink, flexShrink: 1 },
  removed: { opacity: 0.5, backgroundColor: theme.soft },
});

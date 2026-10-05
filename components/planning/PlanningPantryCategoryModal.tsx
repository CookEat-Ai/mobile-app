import { rememberPantryCategory } from '../../services/pantryCategoryAssignments';
import { PantryIngredientsSection } from './PantryIngredientsSection';
import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ingredientCategories } from '../../services/ingredientCategories';
import { normalizePantryIngredients as normalize, pantryIngredientKey } from '../../services/planningPantry';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';

type Props = { visible: boolean; showPantry?: boolean; initialCategoryId?: string; ingredients: string[]; onChange: (names: string[]) => void; onClose: () => void; };
export function PlanningPantryCategoryModal(props: Props) {
  return <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}><SafeAreaProvider><PantryCategoryContent {...props} /></SafeAreaProvider></Modal>;
}
function PantryCategoryContent({ visible, showPantry = false, initialCategoryId, ingredients, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<string | null>(null);
  const [browsingCategories, setBrowsingCategories] = useState(!showPantry);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const categories = ingredientCategories(t);
  useEffect(() => { if (visible) { setCategory(initialCategoryId || null); setBrowsingCategories(!!initialCategoryId || !showPantry); setDraft(''); } }, [visible, showPantry, initialCategoryId]);
  const addManual = async () => {
    const name = draft.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      if (category) await rememberPantryCategory(name, category);
      onChange(normalize([...ingredients, name]));
      setDraft('');
      Keyboard.dismiss();
      if (showPantry) {
        setCategory(null);
        setBrowsingCategories(false);
      } else {
        onClose();
      }
    } catch { Alert.alert(t('camera.errorTitle'), t('planningPantry.saveError')); }
    finally { setAdding(false); }
  };
  return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.sheet, { paddingTop: insets.top + 12 }]}>
        <View style={styles.sheetHeader}>
          {browsingCategories ? <>
            {(category || showPantry) && <Pressable accessibilityRole="button" accessibilityLabel={t('planningPantry.categories')} style={appStyles.iconButton} onPress={() => { if (category) setCategory(null); else setBrowsingCategories(false); }}><Ionicons name="arrow-back" size={24} color={theme.ink} /></Pressable>}
            <Text style={[appStyles.section, { flex: 1 }]}>{category ? (categories.find(group => group.id === category)?.title || t('recipeSummary.other')) : t('planningPantry.categories')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('planningOrganize.done')} style={appStyles.iconButton} onPress={onClose}><Ionicons name="close" size={24} color={theme.ink} /></Pressable>
          </> : <>
            <Text style={[appStyles.section, { flex: 1 }]}>{t('pantry.title')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('planningOrganize.done')} style={appStyles.iconButton} onPress={onClose}><Ionicons name="close" size={24} color={theme.ink} /></Pressable>
          </>}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.browseContent}>
          {browsingCategories && <View style={styles.manualRow}><TextInput value={draft} onChangeText={setDraft} editable={!adding} placeholder={t('pantry.addIngredient')} accessibilityLabel={t('pantry.addIngredient')} style={styles.manualInput} returnKeyType="done" onSubmitEditing={() => void addManual()} /><Pressable accessibilityRole="button" accessibilityLabel={t('recipeSummary.add')} disabled={!draft.trim() || adding} style={[styles.manualAdd, (!draft.trim() || adding) && { opacity: 0.45 }]} onPress={() => void addManual()}><Ionicons name="add" size={24} color={theme.ink} /></Pressable></View>}
          {!browsingCategories ? <>
            {!ingredients.length && <Text style={styles.help}>{t('pantry.emptyTitle')}</Text>}
            <PantryIngredientsSection onAdd={() => setBrowsingCategories(true)} ingredients={ingredients} onAddCategory={id => { setCategory(id); setBrowsingCategories(true); }} onToggle={name => onChange(ingredients.filter(item => pantryIngredientKey(item) !== pantryIngredientKey(name)))} />
          </> : !category ? categories.map(group => <Pressable key={group.id} accessibilityRole="button" style={styles.categoryRow} onPress={() => setCategory(group.id)}>
            <Text style={styles.emoji}>{group.icon}</Text><Text style={[styles.text, { flex: 1 }]}>{group.title}</Text><Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </Pressable>) : categories.find(group => group.id === category)?.ingredients.map(item => {
            const selected = ingredients.some(name => pantryIngredientKey(name) === pantryIngredientKey(item.name));
            return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.categoryRow, selected && styles.selected]} onPress={() => onChange(selected ? ingredients.filter(name => pantryIngredientKey(name) !== pantryIngredientKey(item.name)) : normalize([...ingredients, item.name]))}>
              <Text style={styles.emoji}>{item.icon}</Text><Text style={[styles.text, { flex: 1 }]}>{item.name}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={theme.ink} />
            </Pressable>;
          })}
        </ScrollView>
        <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable accessibilityRole="button" style={appStyles.button} onPress={onClose}><Text style={appStyles.buttonText}>{t('planningOrganize.done')}</Text></Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  manualRow: { flexDirection: 'row', gap: 8 }, manualInput: { flex: 1, minHeight: 52, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.line, fontFamily: 'CronosPro', fontSize: 16, color: theme.ink, backgroundColor: theme.surface }, manualAdd: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.yellowSoft },
  browseContent: { paddingHorizontal: 12, paddingBottom: 24, gap: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 68, borderWidth: 1, borderColor: theme.line, borderRadius: 16, backgroundColor: theme.surface },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' },
  help: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, color: theme.muted },
  selected: { borderColor: theme.yellow, backgroundColor: theme.yellowSoft },
  sheet: { flex: 1, backgroundColor: theme.background },
  sheetFooter: { paddingTop: 16, paddingHorizontal: 12, gap: 12, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.line },
  sheetHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 14 },
  text: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink, flexShrink: 1 },
});

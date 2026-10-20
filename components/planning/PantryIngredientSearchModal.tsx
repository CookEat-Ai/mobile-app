import { FORM_CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppModal as Modal } from '../ui/AppModal';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ingredientCategories } from '../../services/ingredientCategories';
import { normalizePantryIngredients, pantryIngredientKey } from '../../services/planningPantry';
import { pantrySearchGroups, type PantrySearchGroup, type PantrySuggestion } from '../../services/pantryIngredientSearch';
import analytics from '../../services/analytics';
import { useResponsive } from '../../hooks/useResponsive';
import { feedback } from '../../services/haptics';
import { NavigationIconButton } from '../NavigationIconButton';

type Props = { visible: boolean; ingredients: string[]; onChange: (names: string[]) => void; onClose: () => void };
type SearchRow = { kind: 'category'; group: PantrySearchGroup; expanded: boolean } | { kind: 'ingredient'; item: PantrySuggestion; groupId: string };

export function PantryIngredientSearchModal(props: Props) {
  return <Modal visible={props.visible} presentationStyle="pageSheet" onRequestClose={props.onClose}>
    <SafeAreaProvider><PantrySearchContent {...props} /></SafeAreaProvider>
  </Modal>;
}

function PantrySearchContent({ visible, ingredients, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [collapsedSearchGroups, setCollapsedSearchGroups] = useState<string[]>([]);
  const current = useRef(ingredients); current.current = ingredients;
  const list = useRef<FlatList<SearchRow>>(null);
  const catalog = useMemo(() => ingredientCategories(t), [t]);
  const groups = useMemo(() => pantrySearchGroups(catalog, query), [catalog, query]);
  const searching = !!query.trim();
  const rows = useMemo(() => {
    const result: SearchRow[] = [];
    for (const group of groups) {
      const expanded = searching ? !collapsedSearchGroups.includes(group.id) : expandedGroups.includes(group.id);
      result.push({ kind: 'category', group, expanded });
      if (expanded) result.push(...group.ingredients.map(item => ({ kind: 'ingredient' as const, item, groupId: group.id })));
    }
    return result;
  }, [groups, searching, expandedGroups, collapsedSearchGroups]);
  const selectedCounts = useMemo(() => {
    const keys = new Set(ingredients.map(pantryIngredientKey));
    return new Map(catalog.map(group => [group.id, group.ingredients.filter(item => keys.has(pantryIngredientKey(item.name))).length]));
  }, [catalog, ingredients]);
  useEffect(() => { if (visible) { setQuery(''); setMessage(''); setExpandedGroups([]); setCollapsedSearchGroups([]); list.current?.scrollToOffset({ offset: 0, animated: false }); } }, [visible]);
  const changeQuery = (text: string) => { setQuery(text); setMessage(''); setCollapsedSearchGroups([]); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const toggle = (name: string, source: 'catalog' | 'manual' = 'catalog') => {
    const key = pantryIngredientKey(name);
    const selected = current.current.some(item => pantryIngredientKey(item) === key);
    if (!selected && current.current.length >= 100) { setMessage(t('pantryReview.limit')); return; }
    const next = selected ? current.current.filter(item => pantryIngredientKey(item) !== key) : normalizePantryIngredients([...current.current, name]);
    current.current = next; onChange(next);
    void analytics.track('planning_pantry_ingredient_changed', { action: selected ? 'removed' : 'added', source, ingredient_count: next.length }).catch(() => undefined);
    setMessage(t(selected ? 'pantryReview.removed' : 'pantryReview.added', { name }));
    void feedback.selection();
  };
  const addManual = () => {
    const name = query.trim();
    if (!name || groups.length) return;
    toggle(name, 'manual'); setQuery('');
  };
  const close = () => { Keyboard.dismiss(); onClose(); };
  return <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.header, { paddingTop: insets.top + 12, paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      <Text accessibilityRole="header" style={[appStyles.section, styles.flex]}>{t('pantryReview.addTitle')}</Text>
      <NavigationIconButton kind="close" onPress={close} />
    </View>
    <View style={[styles.search, { marginLeft: gutter + insets.left, marginRight: gutter + insets.right }]}>
      <Ionicons name="search" size={22} color={theme.muted} accessible={false} />
      <TextInput value={query} onChangeText={changeQuery} placeholder={t('pantryReview.search')} placeholderTextColor={theme.muted}
        accessibilityLabel={t('pantryReview.search')} style={styles.input} autoCorrect={false} maxLength={100} returnKeyType={groups.length ? 'search' : 'done'} onSubmitEditing={addManual} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel={t('pantryReview.clearSearch')} style={styles.clear} onPress={() => changeQuery('')}><Ionicons name="close-circle" size={22} color={theme.muted} /></Pressable>}
    </View>
    <Text style={[styles.label, { paddingLeft: gutter + insets.left }]}>{t(searching ? 'pantryReview.suggestions' : 'planningPantry.categories')}</Text>
    <FlatList ref={list} data={rows} extraData={ingredients} keyExtractor={row => row.kind === 'category' ? `category:${row.group.id}` : `ingredient:${row.groupId}:${row.item.id}`} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="never" style={styles.flex} contentContainerStyle={{ paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right, paddingBottom: 16 }}
      renderItem={({ item: row }) => {
        if (row.kind === 'category') {
          const { group, expanded } = row;
          const count = selectedCounts.get(group.id) || 0;
          return <Pressable accessibilityRole="button" accessibilityLabel={count ? `${group.title}, ${t('pantryReview.selectedCount', { count })}` : group.title} accessibilityState={{ expanded }}
            onPress={() => {
              if (searching) setCollapsedSearchGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]);
              else setExpandedGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]);
              void feedback.selection();
            }} style={[styles.category, expanded && styles.categoryExpanded]}>
            <Text accessible={false} style={styles.emoji}>{group.icon}</Text><Text style={[styles.categoryName, styles.flex]}>{group.title}</Text>
            {!!count && <View style={styles.countBadge}><Text style={styles.categoryCount}>{count}</Text></View>}
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.ink} />
          </Pressable>;
        }
        const { item } = row;
        const selected = ingredients.some(name => pantryIngredientKey(name) === pantryIngredientKey(item.name));
        const disabled = !selected && ingredients.length >= 100;
        return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => toggle(item.name)} style={[styles.row, styles.groupIngredient, disabled && styles.disabled]}>
          <Text accessible={false} style={styles.emoji}>{item.icon}</Text><Text style={[styles.name, styles.flex]}>{item.name}</Text>
          <View style={[styles.indicator, selected && styles.selected]}><Ionicons name={selected ? 'checkmark' : 'add'} size={22} color={theme.onPrimary} /></View>
        </Pressable>;
      }}
      ListEmptyComponent={<View style={styles.empty}>
        <Text style={appStyles.subtitle}>{t('pantryReview.noResults')}</Text>
        {!!query.trim() && <Pressable accessibilityRole="button" style={styles.manual} onPress={addManual}><Ionicons name="add" size={22} color={theme.ink} /><Text style={[appStyles.textAction, styles.flex]}>{t('pantryReview.addName', { name: query.trim() })}</Text></Pressable>}
      </View>} />
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      <Text style={styles.count}>{t('pantryReview.selectedCount', { count: ingredients.length })}</Text>
      <Pressable accessibilityRole="button" style={[appStyles.button, styles.button]} onPress={close}><Text style={appStyles.buttonText}>{t('pantryReview.done')}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18 },
  search: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderWidth: 1, borderColor: theme.line, borderRadius: AppRadii.control, backgroundColor: theme.surface },
  input: { flex: 1, fontFamily: 'CronosPro', fontSize: 18, color: theme.ink, paddingVertical: 14 }, clear: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.muted, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 12, marginBottom: 8, borderRadius: AppRadii.control, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  groupIngredient: { marginLeft: 12 },
  category: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 14, marginBottom: 8, borderRadius: AppRadii.control, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  categoryExpanded: { backgroundColor: theme.yellowSoft }, categoryName: { fontFamily: 'Degular', fontSize: 20, color: theme.ink },
  countBadge: { minWidth: 28, height: 28, borderRadius: AppRadii.control, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow }, categoryCount: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.onPrimary },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' }, name: { fontFamily: 'CronosProBold', fontSize: 18, color: theme.ink },
  indicator: { width: 36, height: 36, borderRadius: AppRadii.control, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: theme.yellow },
  empty: { gap: 16 }, manual: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, padding: 14, borderRadius: AppRadii.control, backgroundColor: theme.yellowSoft },
  button: { width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center' }, footer: { paddingTop: 12, gap: 10 }, count: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted }, message: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink }, disabled: { opacity: 0.45 },
});

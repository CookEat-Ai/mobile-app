import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { ingredientCategories } from '../../services/ingredientCategories';
import { normalizePantryIngredients, pantryIngredientKey } from '../../services/planningPantry';
import { pantrySearchSuggestions } from '../../services/pantryIngredientSearch';
import analytics from '../../services/analytics';
import { useResponsive } from '../../hooks/useResponsive';
import { feedback } from '../../services/haptics';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { NavigationIconButton } from '../NavigationIconButton';

type Props = { visible: boolean; ingredients: string[]; onChange: (names: string[]) => void; onClose: () => void };

export function PantryIngredientSearchModal(props: Props) {
  const motion = useMotionAllowed();
  return <Modal visible={props.visible} animationType={motion ? 'slide' : 'none'} presentationStyle="pageSheet" onRequestClose={props.onClose}>
    <SafeAreaProvider><PantrySearchContent {...props} /></SafeAreaProvider>
  </Modal>;
}

function PantrySearchContent({ visible, ingredients, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const current = useRef(ingredients); current.current = ingredients;
  const list = useRef<FlatList>(null);
  const catalog = useMemo(() => ingredientCategories(t).flatMap(group => group.ingredients), [t]);
  const suggestions = useMemo(() => pantrySearchSuggestions(catalog, query), [catalog, query]);
  useEffect(() => { if (visible) { setQuery(''); setMessage(''); list.current?.scrollToOffset({ offset: 0, animated: false }); } }, [visible]);
  const changeQuery = (text: string) => { setQuery(text); setMessage(''); list.current?.scrollToOffset({ offset: 0, animated: false }); };
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
    if (!name || suggestions.length) return;
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
        accessibilityLabel={t('pantryReview.search')} style={styles.input} autoCorrect={false} maxLength={100} returnKeyType={suggestions.length ? 'search' : 'done'} onSubmitEditing={addManual} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel={t('pantryReview.clearSearch')} style={styles.clear} onPress={() => changeQuery('')}><Ionicons name="close-circle" size={22} color={theme.muted} /></Pressable>}
    </View>
    <Text style={[styles.label, { paddingLeft: gutter + insets.left }]}>{t('pantryReview.suggestions')}</Text>
    <FlatList ref={list} data={suggestions} extraData={ingredients} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="never" style={styles.flex} contentContainerStyle={{ paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right, paddingBottom: 16 }}
      renderItem={({ item }) => {
        const selected = ingredients.some(name => pantryIngredientKey(name) === pantryIngredientKey(item.name));
        const disabled = !selected && ingredients.length >= 100;
        return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => toggle(item.name)} style={[styles.row, disabled && styles.disabled]}>
          <Text accessible={false} style={styles.emoji}>{item.icon}</Text><Text style={[styles.name, styles.flex]}>{item.name}</Text>
          <View style={[styles.indicator, selected && styles.selected]}><Ionicons name={selected ? 'checkmark' : 'add'} size={22} color={theme.ink} /></View>
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
  search: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderWidth: 1, borderColor: theme.line, borderRadius: 16, backgroundColor: theme.surface },
  input: { flex: 1, fontFamily: 'CronosPro', fontSize: 18, color: theme.ink, paddingVertical: 14 }, clear: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.muted, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 12, marginBottom: 8, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' }, name: { fontFamily: 'CronosProBold', fontSize: 18, color: theme.ink },
  indicator: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: theme.yellow },
  empty: { gap: 16 }, manual: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, padding: 14, borderRadius: 16, backgroundColor: theme.yellowSoft },
  button: { width: '100%', maxWidth: 520, alignSelf: 'center' }, footer: { paddingTop: 12, gap: 10 }, count: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted }, message: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink }, disabled: { opacity: 0.45 },
});

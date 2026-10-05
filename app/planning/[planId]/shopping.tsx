import { EntranceView } from '../../../components/motion/Entrance';
import { NavigationIconButton } from '../../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { feedback } from '../../../services/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/Colors';
import { AppTheme as theme, appStyles } from '../../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../../hooks/useResponsive';
import { apiService, MealPlan, ShoppingListItem } from '../../../services/api';

function quantity(item: ShoppingListItem) {
  return item.quantities.map((entry) => entry.display).join(' · ');
}

export default function ShoppingListScreen() {
  const { planId, source } = useLocalSearchParams<{ planId: string; source?: string }>();
  const isOnboardingPreview = source === 'onboarding_week_preview';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [requiresPremium, setRequiresPremium] = useState(false);
  const writes = useRef(Promise.resolve());
  const planRef = useRef(plan); planRef.current = plan;
  const confirmed = useRef(new Map<string, boolean>());
  const versions = useRef(new Map<string, number>());
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRequiresPremium(false);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId || !planId) throw new Error(t('planning.errors.user'));
        const response = await apiService.getMealPlanById(planId, userId);
        let next = response.data?.plan;
        if (!next) throw new Error(response.error || t('planning.errors.load'));
        if (!next.shoppingList.some(item => !item.manual)) {
          const generated = await apiService.generateShoppingList(planId, userId, isOnboardingPreview);
          next = generated.data?.plan;
          if (!next) {
            if (generated.status === 403) {
              setRequiresPremium(true);
              throw new Error(t('auditFixes.premiumRequired'));
            }
            throw new Error(generated.error || t('planning.errors.shopping'));
          }
        }
        setPlan(next);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : t('planning.errors.shopping')); }
      finally { setLoading(false); }
  }, [planId, isOnboardingPreview, t]);
  useEffect(() => { void load(); }, [load]);

  const items = useMemo(() => (plan?.shoppingList || []).filter((item) => !item.excluded), [plan?.shoppingList]);
  const done = items.filter((item) => item.checked).length;
  const listText = items.map((item) => `${item.checked ? '✓' : '☐'} ${item.name} — ${quantity(item)}`).join('\n');

  const toggle = (item: ShoppingListItem) => {
    const current = planRef.current; if (!current) return;
    const existing = current.shoppingList.find(entry => entry.id === item.id); if (!existing) return;
    if (!confirmed.current.has(item.id)) confirmed.current.set(item.id, existing.checked);
    const checked = !existing.checked;
    const version = (versions.current.get(item.id) || 0) + 1; versions.current.set(item.id, version);
    const next = { ...current, shoppingList: current.shoppingList.map(entry => entry.id === item.id ? { ...entry, checked } : entry) };
    planRef.current = next; setPlan(next); void feedback.selection();
    writes.current = writes.current.catch(() => undefined).then(async () => {
      try {
        const userId = await AsyncStorage.getItem('userId'); if (!userId) throw new Error(t('planning.errors.user'));
        const response = await apiService.updateShoppingItem(current._id, item.id, userId, { checked }, isOnboardingPreview);
        if (!response.data?.plan) throw new Error(response.error || t('planning.errors.update'));
        confirmed.current.set(item.id, checked);
      } catch (e) {
        if (versions.current.get(item.id) === version) {
          const latest = planRef.current;
          if (latest) { const reverted = { ...latest, shoppingList: latest.shoppingList.map(entry => entry.id === item.id ? { ...entry, checked: confirmed.current.get(item.id) ?? !checked } : entry) }; planRef.current = reverted; setPlan(reverted); }
        }
        setError(e instanceof Error ? e.message : t('planning.errors.update')); void feedback.error();
      }
    });
  };
  const addIngredient = async () => {
    if (!plan || !ingredientName.trim() || adding) return;
    setAdding(true); setError(null);
    try {
      await writes.current;
      const userId = await AsyncStorage.getItem('userId'); if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.addShoppingItem(plan._id, userId, ingredientName.trim(), ingredientQuantity.trim(), isOnboardingPreview);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.update'));
      // Preserve taps made while the addition was in flight.
      const current = new Map(planRef.current?.shoppingList.map(item => [item.id, item]));
      const next = { ...response.data.plan, shoppingList: response.data.plan.shoppingList.map(item => current.get(item.id) || item) };
      planRef.current = next; setPlan(next); setIngredientName(''); setIngredientQuantity('');
    } catch (e) { setError(e instanceof Error ? e.message : t('planning.errors.update')); }
    finally { setAdding(false); }
  };

  const copyList = async () => {
    await Clipboard.setStringAsync(listText);
    setCopied(true);
    await feedback.success();
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={appStyles.screen}>
      <View style={[appStyles.backHeader, styles.topBar, { paddingTop: insets.top + 8, paddingHorizontal: gutter }]}>
        <NavigationIconButton style={styles.iconButton} onPress={() => router.back()} accessibilityLabel={t('common.back')} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
          style={[appStyles.headerTitle, appStyles.backHeaderLeadingTitle, { fontSize: font(29) }]}>{t('shoppingList.title')}</Text>
        </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.button} /></View> : null}
      {!loading && error && !plan ? <View style={styles.center}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={[styles.actionButton, { flex: 0, padding: 18, marginTop: 16 }]} onPress={() => requiresPremium ? router.push({ pathname: '/paywall', params: { source: 'shopping_list' } }) : void load()}><Text style={styles.actionText}>{t(requiresPremium ? 'auditFixes.seePlans' : 'weeklyOnboarding.preview.retry')}</Text></TouchableOpacity></View> : null}
      {plan ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: 34 + insets.bottom }}>
          <EntranceView entranceIndex={0} style={styles.progressCard}>
            <Text style={styles.progress}>{t('shoppingList.progress', { done, total: items.length })}</Text>
            <View style={styles.track}><View style={[styles.fillTrack, { width: `${items.length ? (done / items.length) * 100 : 0}%` }]} /></View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => void copyList()}><Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={19} color={theme.ink} /><Text style={styles.actionText}>{t(copied ? 'shoppingList.copied' : 'shoppingList.copy')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => { feedback.light(); void Share.share({ title: t('shoppingList.title'), message: listText }).catch(() => { feedback.error(); }); }}><Ionicons name="share-outline" size={20} color={theme.ink} /><Text style={styles.actionText}>{t('shoppingList.share')}</Text></TouchableOpacity>
            </View>
          </EntranceView>
          <View style={styles.progressCard}>
            <Text style={styles.itemName}>{t('shoppingList.addIngredient')}</Text>
            <TextInput value={ingredientName} onChangeText={setIngredientName} placeholder={t('planningPantry.placeholder')} accessibilityLabel={t('shoppingList.addIngredient')} style={styles.field} />
            <TextInput value={ingredientQuantity} onChangeText={setIngredientQuantity} placeholder={t('shoppingList.quantityPlaceholder')} accessibilityLabel={t('shoppingList.quantityPlaceholder')} style={styles.field} />
            <TouchableOpacity style={styles.actionButton} disabled={adding || !ingredientName.trim()} onPress={() => void addIngredient()}>{adding ? <ActivityIndicator /> : <Text style={styles.actionText}>{t('planningPantry.add')}</Text>}</TouchableOpacity>
          </View>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          {items.some(item => item.pantryAvailable) && <Text style={appStyles.subtitle}>{t('planningPantry.shoppingHelp')}</Text>}
          <EntranceView entranceIndex={1} style={styles.list}>
            {items.slice().sort((a, b) => Number(a.pantryAvailable && a.checked) - Number(b.pantryAvailable && b.checked)).map((item) => (
              <TouchableOpacity key={item.id} style={[styles.item, item.checked && styles.itemDone]} onPress={() => void toggle(item)} accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} activeOpacity={0.8}>
                <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={item.checked ? Colors.light.button : '#B7B2A4'} />
                <Text style={styles.emoji}>{item.icon || '🛒'}</Text>
                <View style={styles.itemCopy}><Text style={[styles.itemName, item.checked && styles.struck]}>{item.name}</Text><Text style={styles.itemQuantity}>{quantity(item)}</Text></View>
              </TouchableOpacity>
            ))}
          </EntranceView>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12, marginVertical: 8, fontFamily: 'CronosPro', fontSize: 16 },
  fill: { flex: 1 },
  topBar: { paddingBottom: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontFamily: 'CronosPro', color: '#82342D', textAlign: 'center' },
  progressCard: { marginTop: 8, marginBottom: 16, borderRadius: 23, padding: 18, backgroundColor: 'white', borderWidth: 1, borderColor: theme.line },
  progress: { fontFamily: 'Degular', fontSize: 25, color: Colors.light.text },
  track: { height: 8, marginTop: 12, borderRadius: 4, backgroundColor: '#F1EBD8', overflow: 'hidden' },
  fillTrack: { height: '100%', borderRadius: 4, backgroundColor: Colors.light.button },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: '#FFF6D9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink },
  inlineError: { marginBottom: 10, fontFamily: 'CronosPro', color: '#82342D' },
  list: { borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: theme.line },
  item: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0EBDD' },
  itemDone: { backgroundColor: '#FFF9E8' },
  emoji: { width: 38, marginLeft: 9, fontSize: 23 },
  itemCopy: { flex: 1, paddingVertical: 10 },
  itemName: { fontFamily: 'CronosProBold', fontSize: 16, color: Colors.light.text },
  itemQuantity: { marginTop: 2, fontFamily: 'CronosPro', fontSize: 13, color: Colors.light.textSecondary },
  struck: { textDecorationLine: 'line-through', color: '#8A867C' },
});

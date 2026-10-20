import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { AppModal as Modal } from '../ui/AppModal';
import { useResponsive } from '../../hooks/useResponsive';
import { NavigationIconButton } from '../NavigationIconButton';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../services/api';
import { getAnonymousUserId } from '../../services/anonymousSession';
import { foodNutrition, mealNutrition, withFoodNutrition, loadFoodDefaults, saveFoodDefault, matchingFoodDefaults, type FoodNutrition, type MealPhotoAnalysis, type PhotoFood, type TrackedMeal } from '../../services/mealTracking';
import { FoodPhotoThumbnail } from './FoodPhotoThumbnail';
import { TrackingMealChat } from './TrackingMealChat';
import { MealNutritionSummary } from './MealNutritionSummary';
import { NutritionEditor } from './NutritionEditor';
type FoodOption = {
    foodKey: string;
    name: string;
    description: string;
    sourceId: string;
    estimated?: boolean;
    nutritionEdited?: boolean;
    per100g: NonNullable<PhotoFood['per100g']>;
};
export function PhotoMealReview({ photo, analysis, title, items, onTitle, onItems, onSave, onBack, saving, error, editing = false, embedded = false, pending = false, progressItems, currentFood, dropTargetRef, onDropLayout, onRetry, onRetake, manual = false, mealType, onMealType, dateLabel, nutritionOverride, onNutritionOverride, hero, onPhotoLayout, saveActionLabel }: {
    saveActionLabel?: string;
    autoSaved?: boolean;
    hero?: React.ReactNode;
    onPhotoLayout?: () => void;
    photo?: {
        uri: string;
        width: number;
        height: number;
    };
    analysis: MealPhotoAnalysis | null;
    title: string;
    items: PhotoFood[];
    onTitle: (value: string) => void;
    onItems: (items: PhotoFood[]) => void;
    onSave: () => void;
    onBack: () => void;
    saving: boolean;
    error: string;
    nutritionOverride?: FoodNutrition | null;
    onNutritionOverride?: (value: FoodNutrition | null) => void;
    manual?: boolean;
    mealType?: TrackedMeal['mealType'] | null;
    onMealType?: (value: TrackedMeal['mealType']) => void;
    dateLabel?: string;
    editing?: boolean;
    embedded?: boolean;
    pending?: boolean;
    progressItems?: PhotoFood[];
    currentFood?: PhotoFood | null;
    dropTargetRef?: React.Ref<View>;
    onDropLayout?: () => void;
    onRetry?: () => void;
    onRetake?: () => void;
}) {
    const { t } = useTranslation(), insets = useSafeAreaInsets();
    const { gutter } = useResponsive();
    const [searching, setSearching] = useState<string | null>(null), [query, setQuery] = useState('');
    const [foods, setFoods] = useState<FoodOption[]>([]), [loading, setLoading] = useState(false), [searchError, setSearchError] = useState(false), [searchRetry, setSearchRetry] = useState(0);
    const [editor, setEditor] = useState<{ kind: 'meal' } | { kind: 'food'; item: PhotoFood | null; name?: string } | null>(null);
    const attempt = useRef(0);
    const viewport = useRef<View>(null);
    const [keyboardInset, setKeyboardInset] = useState(0);
    const scroll = useRef<ScrollView>(null), scrollY = useRef(0), keyboardTop = useRef<number | null>(null);
    const inputs = useRef(new Map<string, TextInput>()), focused = useRef<string | null>(null);
    const revealFocusedInput = useCallback(() => {
        const input = focused.current ? inputs.current.get(focused.current) : null;
        const keyboardY = keyboardTop.current;
        if (!input || keyboardY === null) return;
        scroll.current?.getNativeScrollRef()?.measureInWindow((_x, y, _w, height) => input.measureInWindow((_ix, inputY, _iw, inputHeight) => {
            const bottom = Math.min(y + height, keyboardY) - 16;
            if (inputY + inputHeight > bottom) scroll.current?.scrollTo({ y: scrollY.current + inputY + inputHeight - bottom, animated: false });
            else if (inputY < y + 12) scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + inputY - y - 12), animated: false });
        }));
    }, []);
    const fitKeyboard = useCallback(() => {
        if (Platform.OS !== 'android') return;
        const top = keyboardTop.current;
        if (top === null) { setKeyboardInset(0); return; }
        // Android form sheets may pan without resizing their React content.
        // Measure the actual sheet instead of subtracting the keyboard twice.
        viewport.current?.measureInWindow((_x, y, _w, height) => setKeyboardInset(Math.max(0, y + height - top)));
    }, []);
    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', event => { keyboardTop.current = event.endCoordinates.screenY; fitKeyboard(); revealFocusedInput(); });
        const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null; setKeyboardInset(0); });
        return () => { show.remove(); hide.remove(); };
    }, [fitKeyboard, revealFocusedInput]);
    const [editingIngredients, setEditingIngredients] = useState(manual || editing || embedded || items.some(item => !item.per100g));
    const shownItems = pending ? progressItems || [] : items;
    const nutrition = mealNutrition(shownItems, pending ? null : nutritionOverride), identifiedNutrition = nutrition || foodNutrition(shownItems.filter(item => item.per100g)), valid = !pending && (manual ? !!mealType : !!(mealType || analysis?.mealType) && analysis?.kind !== 'not_food') && !!nutrition && items.every(i => (i.foodKey || i.nutritionEdited) && i.grams >= 1 && i.grams <= 2000 && Number.isInteger(i.grams)) && !!title.trim();
    useEffect(() => {
        if (searching === null)
            return;
        const version = ++attempt.current;
        setLoading(true);
        setSearchError(false);
        const timer = setTimeout(() => { void (async () => {
            const user = await getAnonymousUserId();
            const defaults = await loadFoodDefaults(user);
            const local = matchingFoodDefaults(defaults, query);
            if (version !== attempt.current) return;
            setFoods(local.map(food => ({...food, description: t('tracking.userNutrition')})));
            const result = await apiService.searchTrackingFoods(query).catch(() => ({data: undefined}));
            if (version !== attempt.current) return;
            if (!result.data && !local.length) throw new Error('food_search_failed');
            const remote = (result.data?.foods || []).filter(food => !local.some(saved => saved.foodKey === food.foodKey)).map(food => {const saved = defaults.find(value => value.foodKey === food.foodKey); return saved ? {...food, ...saved, description: t('tracking.userNutrition')} : food;});
            setFoods([...local.map(food => ({...food, description: t('tracking.userNutrition')})), ...remote]);
        })().catch(() => { if (version === attempt.current) setSearchError(true); }).finally(() => { if (version === attempt.current) setLoading(false); }); }, 250);
        return () => { clearTimeout(timer); attempt.current++; };
    }, [searching, query, searchRetry, t]);
    const choose = (food: FoodOption) => { const current = items.find(i => i.id === searching); const updated: PhotoFood = { id: current?.id || `manual-${Date.now()}`, name: food.name, foodKey: food.foodKey, grams: current?.grams || 100, confidence: current?.confidence || 0, visible: current?.visible || false, box: current?.box || null, icon: current?.icon || '🍽️', per100g: food.per100g, sourceId: food.sourceId, nutritionEstimated: !!food.estimated, nutritionEdited: !!food.nutritionEdited }; onItems(current ? items.map(i => i.id === current.id ? updated : i) : [...items, updated]); if (manual && !title.trim()) onTitle(food.name); setSearching(null); setQuery(''); };
    const closeModal = () => { setSearching(null); setEditor(null); };
    const applyNutrition = async (values: FoodNutrition, details?: { name: string; grams: number }) => {
        if (editor?.kind === 'meal') onNutritionOverride?.(values);
        else if (editor?.kind === 'food' && details) {
            const original = editor.item;
            const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const updated = withFoodNutrition({ ...(original || { id, foodKey: id, confidence: 0, visible: false, box: null, icon: '🍽️', per100g: null, sourceId: null }), ...details, foodKey: original?.foodKey || id }, values);
            const savedDefault = await saveFoodDefault(await getAnonymousUserId(), updated);
            updated.foodKey = savedDefault.foodKey;
            onItems(original ? items.map(item => item.id === original.id ? updated : item) : [...items, updated]);
            if (!title.trim()) onTitle(details.name);
        }
        closeModal();
    };
    const header = (editing || manual || !embedded) ? <View style={[styles.header, { paddingTop: embedded ? 16 : insets.top + 8, paddingHorizontal: pending || hero ? 0 : gutter }]}>{!embedded&&<NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={saving} onPress={onBack} style={appStyles.iconButton} />}{(editing || manual) && <Text accessibilityRole="header" style={[embedded?appStyles.section:appStyles.headerTitle, { flex: 1 }]}>{t(editing ? 'tracking.editMeal' : 'tracking.manualTitle')}</Text>}</View> : null;
    const recognition = pending&&<View style={[styles.recognition, {paddingHorizontal: 0}]}><View collapsable={false} ref={dropTargetRef} onLayout={onDropLayout} style={styles.dropTarget}><ActivityIndicator color={theme.yellow}/></View><View style={{flex:1,gap:3}}><Text accessibilityLiveRegion="polite" style={styles.foodName}>{currentFood?.name||t(error?'tracking.analysisPaused':analysis?'tracking.revealing':'tracking.analyzing')}</Text><Text style={styles.foodNote}>{analysis?t('tracking.recognitionCount',{count:shownItems.length,total:analysis.items.length}):t('tracking.recognitionWaiting')}</Text></View></View>;
    const footer = <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: pending || hero ? 0 : gutter }]}>{((error&&onRetry)||(!pending&&analysis&&!analysis.mealType&&onRetake))?<><TouchableOpacity accessibilityRole="button" onPress={onRetry||onRetake} style={appStyles.button}><Text style={appStyles.buttonText}>{t(onRetry?'common.retry':'tracking.backToCamera')}</Text></TouchableOpacity>{onRetake&&onRetry&&<TouchableOpacity accessibilityRole="button" onPress={onRetake} style={styles.retryCamera}><Text style={appStyles.textAction}>{t('tracking.backToCamera')}</Text></TouchableOpacity>}</>:<TouchableOpacity accessibilityRole="button" disabled={saving || !valid} onPress={onSave} style={[appStyles.button, pending&&{backgroundColor:theme.yellowSoft}, (!valid || saving)&&!pending && { opacity: .45 }]}>{saving||pending?<><ActivityIndicator color={theme.onPrimary}/>{pending&&<Text style={[appStyles.buttonText,{color:theme.ink}]}>{t('tracking.buildingSummary')}</Text>}</>:<><Text style={appStyles.buttonText}>{saveActionLabel || t(editing ? 'tracking.saveChanges' : 'tracking.addToDay')}</Text><Ionicons name="checkmark" size={22} color={theme.onPrimary}/></>}</TouchableOpacity>}</View>;
    return <View ref={viewport} collapsable={false} style={appStyles.screen} onLayout={fitKeyboard}><KeyboardAvoidingView style={[appStyles.screen, Platform.OS === 'android' && { paddingBottom: keyboardInset }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!pending && !hero && header}
    <ScrollView style={{flex:1}} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" ref={scroll} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; if (pending) { onPhotoLayout?.(); onDropLayout?.(); } }} scrollEventThrottle={16} onLayout={revealFocusedInput} keyboardShouldPersistTaps="handled" contentContainerStyle={hero ? {paddingBottom: 0} : {padding: gutter, paddingTop: pending ? 0 : 20, paddingBottom: 24, gap: pending?12:18}}>
      {hero}
      <View style={hero ? [styles.resultSheet, {gap: pending?12:18, paddingHorizontal: gutter}] : {gap: pending?12:18}}>
      {hero && <View accessible={false} style={styles.sheetHandle}/>}
      {(pending || hero) && header}
      {recognition}
      {photo && !hero && <Image source={{uri:photo.uri}} accessibilityLabel={t('tracking.mealPhoto')} style={{width:'100%',height:260,borderRadius:AppRadii.card}} contentFit="contain"/>}
      {analysis&&(analysis.kind !== 'meal' || !analysis.items.length) && <Text style={appStyles.subtitle}>{t(analysis.kind === 'not_food' ? 'tracking.notFood' : 'tracking.uncertain')}</Text>}
      {manual && <View style={{gap:12}}><Text style={appStyles.subtitle}>{t('tracking.manualBody')}</Text><Text style={appStyles.eyebrow}>{dateLabel}</Text></View>}
      {(!manual || items.length > 0 || nutritionOverride) && <MealNutritionSummary userEntered={!pending && (!!nutritionOverride || items.some(item => item.nutritionEdited))} nutrition={identifiedNutrition} partial={!nutrition||pending} compact={pending} recognizing={pending&&!error}/>}
      {!pending && onNutritionOverride && <View style={{gap: 8}}>
        <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => setEditor({kind: 'meal'})} style={appStyles.secondaryButton}><Ionicons name="create-outline" size={20} color={theme.ink}/><Text style={appStyles.textAction}>{t('tracking.editMealNutrition')}</Text></TouchableOpacity>
        {!!nutritionOverride && <><Text style={styles.foodNote}>{t('tracking.manualTotalNote')}</Text><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => onNutritionOverride(null)} style={appStyles.secondaryButton}><Text style={appStyles.textAction}>{t('tracking.resetMealNutrition')}</Text></TouchableOpacity></>}
      </View>}
      {!pending && (!manual || items.length > 0) && <TrackingMealChat title={title} items={items} disabled={saving || !items.length} onChange={(nextTitle,nextItems)=>{onTitle(nextTitle);onItems(nextItems);}}/>}
      <Text style={appStyles.section}>{t('tracking.mealRecap')}</Text>
      <View style={styles.recap}>{!photo && <View style={[styles.recapPhoto, {alignItems: 'center', justifyContent: 'center'}]}><Ionicons name="restaurant-outline" size={30} color={theme.ink}/></View>}<View style={{flex:1,gap:5}}><TextInput ref={node => { if (node) inputs.current.set('title', node); else inputs.current.delete('title'); }} onFocus={() => { focused.current = 'title'; revealFocusedInput(); }} onBlur={() => { focused.current = null; }} accessibilityLabel={t('tracking.mealTitle')} value={title} placeholder={t('tracking.untitledMeal')} onChangeText={onTitle} editable={!saving&&!pending} maxLength={160} multiline style={styles.recapTitle}/><Text style={styles.foodNote}>{t('tracking.recapCount',{count:shownItems.length,grams:shownItems.reduce((sum,item)=>sum+item.grams,0)})}</Text></View></View>
      {!manual && <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:editingIngredients}} disabled={saving||pending} onPress={()=>setEditingIngredients(value=>!value)} style={styles.editIngredients}><Ionicons name="create-outline" size={22} color={theme.ink}/><View style={{flex:1,gap:3}}><Text style={appStyles.textAction}>{t('tracking.checkIngredients')}</Text><Text style={styles.foodNote}>{t('tracking.correctNote')}</Text></View><Ionicons name={editingIngredients?'chevron-up':'chevron-down'} size={20} color={theme.ink}/></TouchableOpacity>}
      {!pending && onMealType && (manual || editingIngredients) && <View style={{ gap: 12 }}><Text style={appStyles.section}>{t('tracking.mealCategory')}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['breakfast', 'lunch', 'snack', 'dinner'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: mealType === value }} disabled={saving} onPress={() => onMealType?.(value)} style={[styles.category, mealType === value && { backgroundColor: theme.yellow, borderColor: theme.yellow }]}><Text style={[appStyles.textAction, mealType === value && { color: theme.onPrimary }]}>{t(`tracking.${value}`)}</Text></TouchableOpacity>)}</View></View>}
      {(editingIngredients||pending) && <>
      {shownItems.map(item => <View key={item.id} style={[appStyles.card, {padding: 10, gap: 10}]}><View style={styles.row}>
        <FoodPhotoThumbnail photo={photo} item={item} size={48}/>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.changeFood', { name: item.name })} disabled={saving||pending} style={{ flex: 1, minHeight: 48, justifyContent: 'center' }} onPress={() => { setQuery(item.name); setSearching(item.id); }}><Text style={styles.foodName}>{item.name}</Text><Text style={[styles.foodNote, !item.per100g && { color: theme.danger }]}>{t(item.nutritionEdited ? 'tracking.userNutrition' : !item.per100g ? 'tracking.chooseReference' : item.nutritionEstimated ? 'tracking.estimatedFood' : !item.visible && !manual ? 'tracking.hiddenEstimate' : 'tracking.changeReference')}</Text></TouchableOpacity>
        <View style={styles.grams}><TextInput ref={node => { if (node) inputs.current.set(item.id, node); else inputs.current.delete(item.id); }} onFocus={() => { focused.current = item.id; revealFocusedInput(); }} onBlur={() => { focused.current = null; }} accessibilityLabel={t('tracking.foodGrams', { name: item.name })} editable={!saving&&!pending} keyboardType="number-pad" selectTextOnFocus value={item.grams ? String(item.grams) : ''} onChangeText={raw => onItems(items.map(i => i.id === item.id ? { ...i, grams: Number(raw.replace(/[^0-9]/g, '')) } : i))} style={styles.gramsInput}/><Text style={appStyles.subtitle}>g</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.removeFood', { name: item.name })} disabled={saving||pending} style={styles.remove} onPress={() => onItems(items.filter(i => i.id !== item.id))}><Ionicons name="remove-circle-outline" size={22} color={theme.muted}/></TouchableOpacity>
      </View>{!pending && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.editFoodNutrition', {name: item.name})} disabled={saving} onPress={() => setEditor({kind: 'food', item})} style={appStyles.secondaryButton}><Ionicons name="create-outline" size={18} color={theme.ink}/><Text style={appStyles.textAction}>{t('tracking.editNutrition')} · {foodNutrition([item])?.calories ?? '—'} kcal</Text></TouchableOpacity>}</View>)}
      <TouchableOpacity accessibilityRole="button" disabled={saving || pending || items.length >= 20} onPress={() => { setQuery(''); setSearching('new'); }} style={appStyles.secondaryButton}><Ionicons name="add" size={20} color={theme.ink}/><Text style={appStyles.textAction}>{t('tracking.addFood')}</Text></TouchableOpacity>
      </>}
      {!!error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
      {(pending || hero) && footer}
      </View>
    </ScrollView>
    {!pending && !hero && footer}
    <Modal visible={searching !== null || editor !== null} presentationStyle="pageSheet" onRequestClose={closeModal}>
      <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={[styles.header, { paddingHorizontal: gutter, paddingTop: Platform.OS === 'android' ? insets.top + 16 : 20 }]}><Text style={[appStyles.headerTitle, { flex: 1 }]}>{t(editor ? editor.kind === 'meal' ? 'tracking.editMealNutrition' : 'tracking.editNutrition' : 'tracking.chooseFood')}</Text><NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('recipeChat.close')} onPress={closeModal} style={appStyles.iconButton} /></View>
        {editor ? <NutritionEditor key={editor.kind === 'meal' ? 'meal' : editor.item?.id || 'new'} initial={editor.kind === 'meal' ? nutrition : editor.item ? foodNutrition([editor.item]) : null} food={editor.kind === 'food' ? {name: editor.item?.name || editor.name || '', grams: editor.item?.grams || 100} : undefined} onApply={applyNutrition}/> : <>
        <TouchableOpacity accessibilityRole="button" onPress={() => { const item = items.find(value => value.id === searching) || null; setEditor({kind: 'food', item, name: query}); setSearching(null); }} style={[appStyles.secondaryButton, {marginHorizontal: gutter, marginTop: 8}]}><Ionicons name="add-circle-outline" size={20} color={theme.ink}/><Text style={appStyles.textAction}>{t('tracking.createFood')}</Text></TouchableOpacity>
        <TextInput accessibilityLabel={t('tracking.searchFood')} placeholder={t('tracking.searchFood')} value={query} onChangeText={setQuery} autoFocus style={[styles.search,{marginHorizontal:gutter}]}/>
        {loading && <ActivityIndicator color={theme.yellow}/>}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: gutter, paddingBottom: insets.bottom + 20 }}>{searchError ? <View><Text style={appStyles.error}>{t('tracking.searchError')}</Text><TouchableOpacity accessibilityRole="button" style={appStyles.button} onPress={() => setSearchRetry(value => value + 1)}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View> : foods.map(food => <TouchableOpacity key={food.foodKey} accessibilityRole="button" onPress={() => choose(food)} style={[appStyles.card, { marginBottom: 10, gap: 6 }]}><Text style={styles.foodName}>{food.name}</Text><Text style={styles.foodNote}>{food.description}</Text><Text style={appStyles.subtitle}>{Math.round(food.per100g.calories)} kcal / 100 g</Text></TouchableOpacity>)}{!loading && !searchError && !foods.length && <Text style={appStyles.subtitle}>{t('tracking.noReference')}</Text>}</ScrollView></>}
      </KeyboardAvoidingView>
    </Modal>
  </KeyboardAvoidingView></View>;
}
const styles = StyleSheet.create({
    resultSheet: {backgroundColor:theme.background,marginTop:-24,borderTopLeftRadius:AppRadii.sheet,borderTopRightRadius:AppRadii.sheet,borderTopWidth:1,borderColor:theme.line,paddingHorizontal:20,paddingTop:12,paddingBottom:8},
    sheetHandle: {width:40,height:4,borderRadius:2,backgroundColor:theme.line,alignSelf:'center'},
    category: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    recognition:{flexShrink:0,flexDirection:'row',gap:12,alignItems:'center',paddingHorizontal:20,paddingBottom:4,minHeight:52},dropTarget:{width:42,height:42,borderRadius:AppRadii.control,backgroundColor:theme.yellowSoft,alignItems:'center',justifyContent:'center'},retryCamera:{minHeight:44,alignItems:'center',justifyContent:'center'},
    recap: { ...appStyles.card, flexDirection: 'row', gap: 14, alignItems: 'center', padding: 12 },
    recapPhoto: { width: 68, height: 76, borderRadius: AppRadii.control, backgroundColor: theme.soft },
    recapTitle: { fontFamily: 'Degular', fontSize: 22, color: theme.ink, padding: 0, minHeight: 36 },
    editIngredients: { ...appStyles.card, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70 },
    header: { flexShrink:0, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    foodName: { fontFamily: 'Degular', fontSize: 19, color: theme.ink },
    foodNote: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted, marginTop: 4 },
    grams: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    gramsInput: { fontFamily: 'CronosProBold', fontSize: 18, minWidth: 45, maxWidth: 62, padding: 8, textAlign: 'right', borderBottomWidth: 1, borderColor: theme.line, color: theme.ink },
    remove: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
    footer: { flexShrink:0, padding: 20, borderTopWidth: 1, borderColor: theme.line, backgroundColor: theme.background },
    search: { margin: 20, minHeight: 54, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, borderRadius: AppRadii.control, padding: 16, fontFamily: 'CronosPro', fontSize: 18, color: theme.ink }
});

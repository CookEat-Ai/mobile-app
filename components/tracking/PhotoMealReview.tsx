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
import { FoodDetail } from './FoodDetail';
import { FoodSearch } from './FoodSearch';
type FoodOption = {
    foodKey: string;
    name: string;
    description: string;
    sourceId: string;
    estimated?: boolean;
    nutritionEdited?: boolean;
    per100g: NonNullable<PhotoFood['per100g']>;
};
export function PhotoMealReview({ photo, analysis, title, items, onTitle, onItems, onSave, onBack, saving, error, editing = false, embedded = false, pending = false, streaming = false, progressItems, currentFood, dropTargetRef, onDropLayout, onRetry, onRetake, manual = false, mealType, onMealType, dateLabel, nutritionOverride, onNutritionOverride, hero, onPhotoLayout, saveActionLabel }: {
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
    streaming?: boolean;
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
    const [detail, setDetail] = useState<string | null>(null);
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
    const [choosingCategory, setChoosingCategory] = useState(false);
    // A food joins the recap when its reveal lands. Raw recognition can be
    // ahead of spatial verification and must not fill the recap in advance.
    const shownItems = pending ? progressItems || [] : items;
    const nutrition = mealNutrition(shownItems, pending ? null : nutritionOverride), identifiedNutrition = nutrition || foodNutrition(shownItems.filter(item => item.per100g)), valid = !pending && (manual ? !!mealType : !!(mealType || analysis?.mealType) && analysis?.kind !== 'not_food') && !!nutrition && items.every(i => (i.foodKey || i.nutritionEdited) && i.grams >= 1 && i.grams <= 2000 && Number.isInteger(i.grams)) && (manual || !!title.trim());
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
    const choose = (food: FoodOption) => { const current = items.find(i => i.id === searching); const updated: PhotoFood = { id: current?.id || `manual-${Date.now()}`, name: food.name, foodKey: food.foodKey, grams: current?.grams || 100, confidence: current?.confidence || 0, visible: current?.visible || false, box: current?.box || null, icon: current?.icon || '🍽️', per100g: food.per100g, sourceId: food.sourceId, nutritionEstimated: !!food.estimated, nutritionEdited: !!food.nutritionEdited }; onItems(current ? items.map(i => i.id === current.id ? updated : i) : [...items, updated]); if (manual && !title.trim()) onTitle(food.name); setSearching(null); setQuery(''); setDetail(updated.id); };
    const closeModal = () => { setSearching(null); setEditor(null); setDetail(null); };
    const detailItem = detail === null ? undefined : items.find(item => item.id === detail);
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
    const recognition = pending&&<View style={[styles.recognition, {paddingHorizontal: 0}]}><View collapsable={false} ref={dropTargetRef} onLayout={onDropLayout} style={styles.dropTarget}><ActivityIndicator color={theme.yellow}/></View><View style={{flex:1,gap:3}}><Text accessibilityLiveRegion="polite" style={styles.foodName}>{currentFood?.name||t(error?'tracking.analysisPaused':analysis?'tracking.revealing':'tracking.analyzing')}</Text><Text style={styles.foodNote}>{streaming?t('tracking.recognitionSoFar',{count:shownItems.length}):analysis?t('tracking.recognitionCount',{count:shownItems.length,total:analysis.items.length}):t('tracking.recognitionWaiting')}</Text></View></View>;
    const footer = <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: pending || hero ? 0 : gutter }]}>{((error&&onRetry)||(!pending&&analysis&&!analysis.mealType&&onRetake))?<><TouchableOpacity accessibilityRole="button" onPress={onRetry||onRetake} style={appStyles.button}><Text style={appStyles.buttonText}>{t(onRetry?'common.retry':'tracking.backToCamera')}</Text></TouchableOpacity>{onRetake&&onRetry&&<TouchableOpacity accessibilityRole="button" onPress={onRetake} style={styles.retryCamera}><Text style={appStyles.textAction}>{t('tracking.backToCamera')}</Text></TouchableOpacity>}</>:<TouchableOpacity accessibilityRole="button" disabled={saving || !valid} onPress={onSave} style={[appStyles.button, pending&&{backgroundColor:theme.yellowSoft}, (!valid || saving)&&!pending && { opacity: .45 }]}>{saving||pending?<><ActivityIndicator color={theme.onPrimary}/>{pending&&<Text style={[appStyles.buttonText,{color:theme.ink}]}>{t('tracking.buildingSummary')}</Text>}</>:<><Text style={appStyles.buttonText}>{saveActionLabel || t(editing ? 'tracking.saveChanges' : 'tracking.addToDay')}</Text><Ionicons name="checkmark" size={22} color={theme.onPrimary}/></>}</TouchableOpacity>}</View>;
    return <View ref={viewport} collapsable={false} style={appStyles.screen} onLayout={fitKeyboard}><KeyboardAvoidingView style={[appStyles.screen, Platform.OS === 'android' && { paddingBottom: keyboardInset }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!pending && !hero && header}
    <ScrollView style={{flex:1}} stickyHeaderIndices={pending&&hero?[0]:undefined} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" ref={scroll} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; if (pending) { onPhotoLayout?.(); onDropLayout?.(); } }} scrollEventThrottle={16} onLayout={revealFocusedInput} keyboardShouldPersistTaps="handled" contentContainerStyle={hero ? {paddingBottom: 0} : {padding: gutter, paddingTop: pending ? 0 : 20, paddingBottom: 24, gap: pending?12:18}}>
      {hero}
      <View style={hero ? [styles.resultSheet, {gap: pending?12:18, paddingHorizontal: gutter}] : {gap: pending?12:18}}>
      {hero && <View accessible={false} style={styles.sheetHandle}/>}
      {(pending || hero) && header}
      {recognition}
      {photo && !hero && <Image source={{uri:photo.uri}} accessibilityLabel={t('tracking.mealPhoto')} style={{width:'100%',height:260,borderRadius:AppRadii.card}} contentFit="contain"/>}
      {analysis&&(analysis.kind !== 'meal' || !analysis.items.length) && <Text style={appStyles.subtitle}>{t(analysis.kind === 'not_food' ? 'tracking.notFood' : 'tracking.uncertain')}</Text>}
      {manual && <View style={{gap:12}}><Text style={appStyles.subtitle}>{t('tracking.manualBody')}</Text><Text style={appStyles.eyebrow}>{dateLabel}</Text></View>}
      {manual && !pending && <TrackingMealChat describe title={title} items={items} disabled={saving} onChange={(nextTitle,nextItems,nextMealType)=>{onTitle(nextTitle);onItems(nextItems);if(nextMealType)onMealType?.(nextMealType);}}/>}
      {(!manual || items.length > 0 || nutritionOverride) && <MealNutritionSummary userEntered={!pending && (!!nutritionOverride || items.some(item => item.nutritionEdited))} nutrition={identifiedNutrition} partial={!nutrition||pending} compact={pending} recognizing={pending&&!error}/>}
      {!pending && onNutritionOverride && (manual && !items.length && !nutritionOverride
        ? <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => setEditor({kind: 'meal'})} style={[styles.action, saving && {opacity: .45}]}><View style={styles.actionIcon}><Ionicons name="create-outline" size={19} color={theme.onPrimary}/></View><View style={{flex: 1, gap: 3}}><Text style={appStyles.textAction}>{t('tracking.enterMealNutrition')}</Text><Text style={styles.actionCaption}>{t('tracking.enterMealNutritionHint')}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.muted}/></TouchableOpacity>
        : <View style={styles.links}>
          <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => setEditor({kind: 'meal'})} style={styles.link}><Ionicons name="create-outline" size={17} color={theme.muted}/><Text style={styles.linkText}>{t('tracking.editMealNutrition')}</Text></TouchableOpacity>
          {!!nutritionOverride && <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => onNutritionOverride(null)} style={styles.link}><Ionicons name="refresh" size={17} color={theme.muted}/><Text style={styles.linkText}>{t('tracking.resetMealNutrition')}</Text></TouchableOpacity>}
        </View>)}
      {!pending && !!nutritionOverride && <Text style={[styles.foodNote, {marginTop: -12}]}>{t('tracking.manualTotalNote')}</Text>}
      <Text style={appStyles.section}>{t('tracking.mealRecap')}</Text>
      <View style={styles.recap}>
        {!photo && <View style={styles.recapPhoto}><Ionicons name="restaurant-outline" size={24} color={theme.onPrimary}/></View>}
        <View style={{flex:1,gap:6}}>
          <TextInput ref={node => { if (node) inputs.current.set('title', node); else inputs.current.delete('title'); }} onFocus={() => { focused.current = 'title'; revealFocusedInput(); }} onBlur={() => { focused.current = null; }} accessibilityLabel={t('tracking.mealTitle')} value={title} placeholder={t('tracking.untitledMeal')} onChangeText={onTitle} editable={!saving&&!pending} maxLength={160} multiline style={styles.recapTitle}/>
          <View style={styles.recapMeta}>
            {!pending && !manual && onMealType && mealType && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('tracking.mealCategory')}: ${t(`tracking.${mealType}`)}`} accessibilityState={{expanded: choosingCategory, disabled: saving}} disabled={saving} onPress={() => setChoosingCategory(value => !value)} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{t(`tracking.${mealType}`)}</Text><Ionicons name={choosingCategory ? 'chevron-up' : 'chevron-down'} size={15} color={theme.ink}/>
            </TouchableOpacity>}
            <Text style={[styles.foodNote, {marginTop: 0}]}>{manual && !shownItems.length ? t('tracking.emptyMealHint') : t('tracking.recapCount',{count:shownItems.length,grams:shownItems.reduce((sum,item)=>sum+item.grams,0)})}</Text>
          </View>
        </View>
      </View>
      {!pending && onMealType && (manual || choosingCategory) && <View style={{ gap: 12 }}>{manual && <Text style={appStyles.section}>{t('tracking.mealCategory')}</Text>}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['breakfast', 'lunch', 'snack', 'dinner'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: mealType === value }} disabled={saving} onPress={() => { onMealType(value); setChoosingCategory(false); }} style={[styles.category, mealType === value && styles.categorySelected]}>{mealType === value && <Ionicons name="checkmark" size={17} color={theme.onPrimary}/>}<Text style={[appStyles.textAction, mealType === value && { color: theme.onPrimary }]}>{t(`tracking.${value}`)}</Text></TouchableOpacity>)}</View></View>}
      {shownItems.length > 0 && <View style={styles.foods}>
        {shownItems.map((item, index) => {
          const note = item.nutritionEdited ? 'tracking.userNutrition' : !item.per100g ? 'tracking.chooseReference' : item.nutritionEstimated ? 'tracking.estimatedFood' : !item.visible && !manual ? 'tracking.hiddenEstimate' : null;
          const calories = foodNutrition([item])?.calories;
          return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={t('tracking.changeFood', { name: item.name })} disabled={saving||pending} onPress={() => setDetail(item.id)} style={[styles.foodRow, index > 0 && styles.foodDivider]}>
            <FoodPhotoThumbnail photo={photo} item={item} size={44}/>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.foodMeta}>{item.grams} g{calories === undefined ? '' : ` · ${Math.round(calories)} kcal`}</Text>
              {note && <Text style={[styles.foodHint, !item.per100g && { color: theme.danger }]} numberOfLines={1}>{t(note)}</Text>}
            </View>
            {!pending && <Ionicons name="chevron-forward" size={18} color={theme.muted}/>}
          </TouchableOpacity>;
        })}
      </View>}
      {!pending && <TouchableOpacity accessibilityRole="button" disabled={saving || items.length >= 20} onPress={() => { setQuery(''); setSearching('new'); }} style={[styles.action, (saving || items.length >= 20) && {opacity: .45}]}><View style={styles.actionIcon}><Ionicons name="add" size={22} color={theme.onPrimary}/></View><Text style={[appStyles.textAction, {flex: 1}]}>{t('tracking.addFood')}</Text><Ionicons name="chevron-forward" size={20} color={theme.muted}/></TouchableOpacity>}
      {!pending && !manual && <TrackingMealChat compact title={title} items={items} disabled={saving || !items.length} onChange={(nextTitle,nextItems)=>{onTitle(nextTitle);onItems(nextItems);}}/>}
      {!!error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
      {(pending || hero) && footer}
      </View>
    </ScrollView>
    {!pending && !hero && footer}
    <Modal visible={searching !== null || editor !== null || !!detailItem} presentationStyle="pageSheet" onRequestClose={closeModal}>
      <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={[styles.header, { paddingHorizontal: gutter, paddingTop: Platform.OS === 'android' ? insets.top + 16 : 20 }]}><Text style={[appStyles.headerTitle, { flex: 1 }]}>{editor ? t(editor.kind === 'meal' ? 'tracking.editMealNutrition' : 'tracking.editNutrition') : detailItem ? '' : t('tracking.chooseFood')}</Text><NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('recipeChat.close')} onPress={closeModal} style={appStyles.iconButton} /></View>
        {editor ? <NutritionEditor key={editor.kind === 'meal' ? 'meal' : editor.item?.id || 'new'} initial={editor.kind === 'meal' ? nutrition : editor.item ? foodNutrition([editor.item]) : null} food={editor.kind === 'food' ? {name: editor.item?.name || editor.name || '', grams: editor.item?.grams || 100} : undefined} onApply={applyNutrition}/> : detailItem ? <FoodDetail photo={photo} item={detailItem} saving={saving} gutter={gutter} bottomInset={insets.bottom}
          onGrams={grams => onItems(items.map(i => i.id === detailItem.id ? { ...i, grams } : i))}
          onChangeReference={() => { setQuery(detailItem.name); setDetail(null); setSearching(detailItem.id); }}
          onEditNutrition={() => { setDetail(null); setEditor({kind: 'food', item: detailItem}); }}
          onRemove={() => { setDetail(null); onItems(items.filter(i => i.id !== detailItem.id)); }}
          onDone={() => setDetail(null)}/> : <FoodSearch query={query} onQuery={setQuery} foods={foods} loading={loading} error={searchError} gutter={gutter} bottomInset={insets.bottom}
          onRetry={() => setSearchRetry(value => value + 1)}
          onChoose={food => choose(food as FoodOption)}
          onCreate={() => { const item = items.find(value => value.id === searching) || null; setEditor({kind: 'food', item, name: query}); setSearching(null); }}/>}
      </KeyboardAvoidingView>
    </Modal>
  </KeyboardAvoidingView></View>;
}
const cardShadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };
const styles = StyleSheet.create({
    resultSheet: {backgroundColor:theme.background,marginTop:-24,borderTopLeftRadius:AppRadii.sheet,borderTopRightRadius:AppRadii.sheet,borderTopWidth:1,borderColor:theme.line,paddingHorizontal:20,paddingTop:12,paddingBottom:8},
    sheetHandle: {width:40,height:4,borderRadius:2,backgroundColor:theme.line,alignSelf:'center'},
    category: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...cardShadow },
    categorySelected: { backgroundColor: theme.yellow, shadowColor: theme.yellow, shadowOpacity: 0.3 },
    action: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 16, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...cardShadow },
    actionIcon: { width: 40, height: 40, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
    actionCaption: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: theme.muted },
    recognition:{flexShrink:0,flexDirection:'row',gap:12,alignItems:'center',paddingHorizontal:20,paddingBottom:4,minHeight:52},dropTarget:{width:42,height:42,borderRadius:AppRadii.control,backgroundColor:theme.yellowSoft,alignItems:'center',justifyContent:'center'},retryCamera:{minHeight:44,alignItems:'center',justifyContent:'center'},
    recap: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...cardShadow },
    recapPhoto: { width: 52, height: 52, borderRadius: AppRadii.pill, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' },
    recapMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
    categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 12, borderRadius: AppRadii.pill, backgroundColor: theme.yellowSoft },
    categoryChipText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
    foods: { borderRadius: AppRadii.card, backgroundColor: theme.surface, ...cardShadow },
    foodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
    foodDivider: { borderTopWidth: 1, borderColor: theme.line },
    foodMeta: { fontFamily: 'CronosPro', fontSize: 15, color: theme.ink },
    foodHint: { fontFamily: 'CronosPro', fontSize: 13, color: theme.muted },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -8 },
    link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 2, alignSelf: 'flex-start' },
    linkText: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.muted },
    recapTitle: { fontFamily: 'Degular', fontSize: 22, color: theme.ink, padding: 0, minHeight: 36 },
    header: { flexShrink:0, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    foodName: { fontFamily: 'Degular', fontSize: 19, color: theme.ink },
    foodNote: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted, marginTop: 4 },
    footer: { flexShrink:0, padding: 20, borderTopWidth: 1, borderColor: theme.line, backgroundColor: theme.background },
});

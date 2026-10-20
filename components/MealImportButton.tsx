import { AppModal as Modal } from './ui/AppModal';
import { AppIconBadge } from './ui/AppIconBadge';
import { NavigationIconButton } from './NavigationIconButton';
import { AppRadii, AppTheme as theme, appStyles } from '../constants/AppTheme';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportLinkSheet } from './ImportLinkSheet';
import { feedback } from '../services/haptics';
export function MealImportButton() {
    const { t } = useTranslation(), insets = useSafeAreaInsets();
    const [chooser, setChooser] = useState(false), [link, setLink] = useState(false);
    const pending = useRef<null | 'link' | 'share' | 'history'>(null);
    const finishDismiss = () => { const action = pending.current; pending.current = null; if (action === 'link')
        setLink(true); if (action === 'share')
        router.push({ pathname: '/onboarding/videoImportTutorial', params: { isFromImport: 'true' } }); if (action === 'history')
        router.push('/(tabs)/imported'); };
    const choose = (action: 'link' | 'share' | 'history') => { pending.current = action; setChooser(false); };
    return <><NavigationIconButton icon="add" tone="primary" accessibilityLabel={t('mealImport.add')} onPress={() => { void feedback.light(); setChooser(true); }} />
 <Modal visible={chooser} onDismiss={finishDismiss} transparent onRequestClose={() => setChooser(false)}><Pressable accessible={false} accessibilityLabel={t('common.cancel')} style={styles.overlay} onPress={() => setChooser(false)}><Pressable accessible={false} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]} onPress={() => { }}>
 <View style={styles.heading}><Text accessibilityRole="header" style={[appStyles.section, { flex: 1 }]}>{t('mealImport.title')}</Text><NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('recipeChat.close')} style={appStyles.iconButton} onPress={() => setChooser(false)} /></View>
 <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => choose('link')}><AppIconBadge name="link-outline" /><View style={{ flex: 1, gap: 5 }}><Text style={appStyles.textAction}>{t('mealImport.link')}</Text><Text style={appStyles.subtitle}>{t('mealImport.linkNote')}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.ink}/></TouchableOpacity>
 <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => choose('share')}><AppIconBadge name="share-outline" /><View style={{ flex: 1, gap: 5 }}><Text style={appStyles.textAction}>{t('mealImport.share')}</Text><Text style={appStyles.subtitle}>{t('mealImport.shareNote')}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.ink}/></TouchableOpacity>
 <TouchableOpacity accessibilityRole="button" style={styles.history} onPress={() => choose('history')}><Text style={appStyles.textAction}>{t('mealImport.history')}</Text><Ionicons name="arrow-forward" size={19} color={theme.ink}/></TouchableOpacity>
 </Pressable></Pressable></Modal>
 <ImportLinkSheet visible={link} onClose={() => setLink(false)} source="meal_library"/>
 </>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }, sheet: { backgroundColor: theme.background, borderTopLeftRadius: AppRadii.sheet, borderTopRightRadius: AppRadii.sheet, padding: 20, gap: 14 }, heading: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 6 }, option: { ...appStyles.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 88 }, icon: { width: 46, height: 46, borderRadius: AppRadii.card, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }, history: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 } });

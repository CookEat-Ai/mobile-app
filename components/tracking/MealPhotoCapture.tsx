import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { NavigationIconButton } from '../NavigationIconButton';
import { CameraBrand } from '../CameraBrand';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export function MealPhotoCapture({ cameraRef, granted, cameraError, canAskAgain, active, ready, busy, error, onClose, onAllow, onReady, onCameraError, onTake, onPick, onManual, cameraPreview }: {
    /** Camera surface injection for deterministic native previews; normal capture uses CameraView. */
    cameraPreview?: React.ReactNode;
    cameraRef: React.Ref<CameraView>;
    granted: boolean;
    cameraError: boolean;
    canAskAgain: boolean;
    active: boolean;
    ready: boolean;
    busy: boolean;
    error: string;
    onClose: () => void;
    onAllow: () => void;
    onReady: () => void;
    onCameraError: () => void;
    onTake: () => void;
    onPick: () => void;
    onManual?: () => void;
}) {
    const { t } = useTranslation(), insets = useSafeAreaInsets();
    const live = granted && !cameraError;
    const foreground = live ? 'white' : theme.ink;
    const header = <View style={[styles.header, { paddingTop: 24, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
        <View style={styles.brandRow}>
            <NavigationIconButton kind="close" tone={live ? 'overlay' : 'surface'} onPress={onClose} />
            <CameraBrand color={foreground} />
            <NavigationIconButton icon="help" tone={live ? 'overlay' : 'surface'} accessibilityLabel={t('tracking.captureHelp')} onPress={() => Alert.alert(t('tracking.photoPromise'), t('tracking.captureHelpBody'), [{text:t('common.ok')}])} />
        </View>
    </View>;
    const controls = <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), paddingLeft: 20 + insets.left, paddingRight: 20 + insets.right }]}>
        {!!error && <Text accessibilityRole="alert" style={[appStyles.error, live && { color: theme.onPrimary }]}>{error}</Text>}
        <View style={styles.controls}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.gallery')} disabled={busy} onPress={onPick} style={[styles.gallery, live && styles.darkPlate]}><Ionicons name="images-outline" size={26} color={foreground} /><Text style={[styles.galleryLabel, { color: foreground }]}>{t('tracking.gallery')}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.takePhoto')} disabled={busy || !ready || !live} onPress={onTake} style={[styles.shutter, (!ready || busy || !live) && { opacity: .45 }]}>{busy ? <ActivityIndicator color={theme.onPrimary} /> : <Ionicons name="camera" size={32} color={theme.onPrimary} />}</TouchableOpacity>
            {onManual ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.addManually')} disabled={busy} onPress={onManual} style={[styles.gallery, live && styles.darkPlate]}><Ionicons name="create-outline" size={26} color={foreground}/><Text style={[styles.galleryLabel, {color:foreground, textAlign:'center'}]}>{t('tracking.withoutPhoto')}</Text></TouchableOpacity> : <View style={{ width: 88 }} />}
        </View>
    </View>;
    return <View style={[appStyles.screen, live && { backgroundColor: '#000000' }]}>
        {live ? <>
            {cameraPreview ?? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" active={active} onCameraReady={onReady} onMountError={onCameraError} />}
            <View pointerEvents="none" style={styles.guide}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} /></View>
            <LinearGradient pointerEvents="box-none" colors={['rgba(0,0,0,.72)', 'transparent']} style={styles.topOverlay}>{header}</LinearGradient>
            <LinearGradient pointerEvents="box-none" colors={['transparent', 'rgba(0,0,0,.88)']} locations={[0, .45]} style={styles.bottomOverlay}>{controls}</LinearGradient>
        </> : <>
            {header}
            <ScrollView contentContainerStyle={styles.permission}>
                <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={44} color={theme.onPrimary} /></View>
                <Text accessibilityRole="header" style={[appStyles.title, { textAlign: 'center' }]}>{t('tracking.photoPromise')}</Text>
                <Text style={[appStyles.subtitle, { textAlign: 'center' }]}>{t(cameraError ? 'tracking.cameraUnavailable' : 'tracking.cameraPermission')}</Text>
                <TouchableOpacity accessibilityRole="button" style={appStyles.button} onPress={onAllow}><Text style={appStyles.buttonText}>{t(canAskAgain ? 'tracking.allowCamera' : 'tracking.settings')}</Text></TouchableOpacity>
            </ScrollView>
            {controls}
        </>}
    </View>;
}
const styles = StyleSheet.create({
    header: { paddingBottom: 12, gap: 14 },
    brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', gap: 8, padding:6 }, brand:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4}, brandText:{fontFamily:'Degular',fontSize:22},mascot:{width:52,height:52,transform:[{rotate:'20deg'}]},closeButton:{width:50,height:50,borderRadius:AppRadii.card,alignItems:'center',justifyContent:'center',backgroundColor:theme.surface},darkPlate:{backgroundColor:'rgba(0,0,0,.8)'},
    overlayButton: { backgroundColor: 'rgba(0,0,0,.65)' },
    copy: { gap: 5, backgroundColor:theme.background,borderRadius:AppRadii.card,padding:14 },
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 45 },
    bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 40 },
    footer: { paddingTop: 12, gap: 18 },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 88 },
    shutter: { height: 78, width: 78, borderRadius: AppRadii.pill, borderWidth: 5, borderColor: 'rgba(255,255,255,.65)', backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' },
    gallery: { width: 88, minHeight: 72, borderRadius:AppRadii.card, alignItems: 'center', justifyContent: 'center', gap: 5 },
    galleryLabel: { fontFamily: 'CronosPro', fontSize: 14 },
    permission: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 22 },
    permissionIcon: { width: 82, height: 82, borderRadius: AppRadii.pill, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' },
    guide: { position: 'absolute', left: '8%', right: '8%', top: '30%', bottom: '30%' },
    corner: { position: 'absolute', width: 32, height: 32, borderColor: theme.yellow },
    tl: { left: 0, top: 0, borderTopWidth: 3, borderLeftWidth: 3 },
    tr: { right: 0, top: 0, borderTopWidth: 3, borderRightWidth: 3 },
    bl: { left: 0, bottom: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
    br: { right: 0, bottom: 0, borderBottomWidth: 3, borderRightWidth: 3 },
});

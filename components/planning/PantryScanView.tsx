import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../../constants/AppTheme';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { NavigationIconButton } from '../NavigationIconButton';
import { PantryIngredientReview } from './PantryIngredientReview';

type PantryScanProps = {
  photoUris: string[]; ingredients: string[] | null; saving: boolean;
  onConfirm: (names: string[]) => void; onRetake: () => void; onBack: () => void;
};

export function PantryScanView(props: PantryScanProps) {
  const motion = useMotionAllowed();
  // Only analysis covers the phone. Capture and results stay in the camera sheet.
  const content = <SafeAreaProvider><PantryScanContent {...props} /></SafeAreaProvider>;
  return props.ingredients === null
    ? <Modal visible presentationStyle="fullScreen" animationType={motion ? 'fade' : 'none'} statusBarTranslucent navigationBarTranslucent onRequestClose={props.onBack}>{content}</Modal>
    : content;
}

function PantryScanContent({ photoUris, ingredients, saving, onConfirm, onRetake, onBack }: PantryScanProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  const sweep = useRef(new Animated.Value(0)).current;
  const done = ingredients !== null;
  const photoUri = photoUris[0];
  const stackDepth = photoUris.length > 1 ? 24 : 0;
  useEffect(() => {
    if (!motion || done) { sweep.stopAnimation(); sweep.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(sweep, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [done, motion, sweep]);
  if (done) return <View style={styles.root}>
    <Stack.Screen options={{ statusBarStyle: 'dark', gestureEnabled: !saving }} />
    <PantryIngredientReview ingredients={ingredients} saving={saving} recognized={photoUris.length > 0} onConfirm={onConfirm} onBack={onBack} onRetake={onRetake} />
  </View>;
  // The grid is a scanning effect, never a claim about detected food locations.
  return <View style={[styles.root, {
    paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16),
    paddingLeft: 12 + insets.left, paddingRight: 12 + insets.right,
  }]}>
    <Stack.Screen options={{ statusBarStyle: 'dark', gestureEnabled: false }} />
      <View style={styles.photoStack}>
        {photoUris.slice(1).map((uri, index) => ({ uri, index, offset: stackDepth * (index + 1) / (photoUris.length - 1) })).reverse().map(({ uri, offset, index }) => (
          <View key={`${uri}-${offset}`} style={[styles.stackedPhoto, { left: offset, top: stackDepth - offset, right: stackDepth - offset, bottom: offset, transform: [{ rotate: `${(index + 1) * 5}deg` }] }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          </View>
        ))}
        <View style={[styles.photo, { top: stackDepth, right: stackDepth }]}>
        {photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <Ionicons name="scan-outline" size={100} color={theme.yellow} />}
        <View style={styles.grid} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{Array.from({ length: 64 }, (_, index) => <View key={index} style={styles.cell} />)}</View>
        <Animated.View style={[styles.scanLine, { top: sweep.interpolate({ inputRange: [0, 1], outputRange: ['2%', '96%'] }) }]} />
        <View style={styles.photoBadge} accessibilityRole="progressbar" accessibilityLabel={t('pantryScan.scanning')}><ActivityIndicator size="small" color={theme.ink} accessible={false} /><Text style={styles.badgeText}>{t('pantryScan.scanning')}</Text></View>
        <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
      </View>
      </View>
    <NavigationIconButton kind="close" onPress={onBack} style={[styles.analysisClose, { top: insets.top + 24, left: insets.left + 24 }]} />
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background }, analysisClose: { position: 'absolute' },
  photoStack: { width: '100%', flex: 1 },
  stackedPhoto: { position: 'absolute', borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: theme.background, backgroundColor: theme.soft },
  photo: { position: 'absolute', left: 0, bottom: 0, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.soft, alignItems: 'center', justifyContent: 'center' },
  grid: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '12.5%', height: '12.5%', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: theme.yellow, shadowColor: theme.yellow, shadowRadius: 16, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } },
  photoBadge: { position: 'absolute', bottom: 18, backgroundColor: theme.yellowSoft, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }, badgeText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: theme.yellow }, topLeft: { left: 12, top: 12, borderLeftWidth: 3, borderTopWidth: 3 }, topRight: { right: 12, top: 12, borderRightWidth: 3, borderTopWidth: 3 }, bottomLeft: { left: 12, bottom: 12, borderLeftWidth: 3, borderBottomWidth: 3 }, bottomRight: { right: 12, bottom: 12, borderRightWidth: 3, borderBottomWidth: 3 },
});

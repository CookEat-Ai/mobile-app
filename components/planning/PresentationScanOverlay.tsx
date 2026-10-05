import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../../constants/AppTheme';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { presentationScanPhotoIndex, usePresentationScanPhotos } from '../../services/presentationScan';

/** One continuous photo sequence covers both extraction and planning generation. */
export function PresentationScanOverlay() {
  const photos = usePresentationScanPhotos();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  const [index, setIndex] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);
  useEffect(() => {
    setIndex(presentationScanPhotoIndex(photos.length));
    if (!photos.length || !motion) return;
    const timer = setInterval(() => setIndex(presentationScanPhotoIndex(photos.length)), 100);
    return () => clearInterval(timer);
  }, [photos, motion]);
  useEffect(() => {
    sweep.setValue(0);
    if (!photos.length || !motion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [photos, motion, sweep]);
  if (!photos.length) return null;
  return <>
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.deck}>
        {photos.map((uri, position) => ({ uri, position, depth: (position - index + photos.length) % photos.length }))
          .sort((a, b) => b.depth - a.depth).map(({ uri, position, depth }) => <View key={`${uri}-${position}`} style={[styles.photo, {
            top: 12 + depth * 3, bottom: 12 + depth * 3,
            left: 12 + depth * 8, right: 12 + depth * 8,
            transform: [{ rotate: `${depth * 4}deg` }],
          }]} onLayout={depth === 0 ? event => setHeight(event.nativeEvent.layout.height) : undefined}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={motion ? 180 : 0} />
            {depth === 0 && motion && <Animated.View style={[styles.scan, { transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, height - 6)] }) }] }]} />}
            {depth === 0 && photos.length > 1 && <View style={styles.counter}><Text style={styles.counterText}>{index % photos.length + 1} / {photos.length}</Text></View>}
          </View>)}
      </View>
      <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.title}>{t('pantryScan.analyzing')}</Text>
      <View style={styles.dots}>{photos.map((uri, position) => <View key={`${uri}-${position}`} style={[styles.dot, position === index % photos.length && styles.activeDot]} />)}</View>
    </View>
  </>;
}
const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, backgroundColor: theme.background, paddingHorizontal: 8 },
  deck: { flex: 1, marginHorizontal: 4 },
  photo: { position: 'absolute', overflow: 'hidden', borderRadius: theme.radius, backgroundColor: theme.soft },
  scan: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: theme.yellow, shadowColor: theme.yellow, shadowOpacity: 1, shadowRadius: 16, elevation: 8 },
  counter: { position: 'absolute', right: 16, top: 16, backgroundColor: theme.surface, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  counterText: { color: theme.ink, fontFamily: 'CronosProBold', fontSize: 16 },
  title: { color: theme.ink, fontFamily: 'Degular', fontSize: 27, textAlign: 'center', marginTop: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 8, paddingBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.line },
  activeDot: { backgroundColor: theme.yellow },
});

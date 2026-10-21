import { AppTheme as designTheme, AppRadii } from '../../constants/AppTheme';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback } from '../../services/haptics';
import { Colors } from '../../constants/Colors';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics, { EntryFeature } from '../../services/analytics';
import { NavigationIconButton } from '../../components/NavigationIconButton';

const TUTORIAL_IMAGES_IOS = [
  require('../../assets/images/tuto/ios/tuto-import-tiktok-1.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-2.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-3.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-4.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-5.png'),
  require('../../assets/images/tuto/ios/tuto-import-tiktok-6.png'),
];

const TUTORIAL_IMAGES_ANDROID = [
  require('../../assets/images/tuto/android/tuto-import-tiktok-1.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-2.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-3.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-4.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-5.png'),
  require('../../assets/images/tuto/android/tuto-import-tiktok-6.png'),
];

export default function VideoImportTutorialScreen() {
  return <SafeAreaProvider><VideoImportTutorialContent /></SafeAreaProvider>;
}

function VideoImportTutorialContent() {
  const insets = useSafeAreaInsets();
  const { isFromImport } = useLocalSearchParams();
  const isExternalCall = isFromImport === 'true';

  const TUTORIAL_IMAGES = Platform.OS === 'ios' ? TUTORIAL_IMAGES_IOS : TUTORIAL_IMAGES_ANDROID;

  const [activeIndex, setActiveIndex] = useState(0);
  const [entryFeature, setEntryFeature] = useState<EntryFeature | null>(null);
  const { layoutWidth, gutter } = useResponsive();
  const [carouselWidth, setCarouselWidth] = useState(0);
  // Fit the phone into the available area while retaining space for pagination.
  const [carouselHeight, setCarouselHeight] = useState(0);
  const phoneWidth = carouselHeight > 0
    ? Math.min(layoutWidth * 0.65, Math.max(carouselHeight - 20, 0) * (538 / 1076))
    : layoutWidth * 0.65;
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    // Preload images for better responsiveness
    void Asset.loadAsync([...TUTORIAL_IMAGES, require('../../assets/images/iphone.png'), require('../../assets/images/android.png')]).catch(() => undefined);

    void (async () => {
      const branch = await analytics.getEntryFeature();
      if (!active) return;
      setEntryFeature(branch);

      analytics.track(isExternalCall ? 'import_tutorial_viewed' : 'onboarding_video_import_tutorial_viewed', {
        entry_feature: branch,
        demo_role: branch === 'generate' ? 'secondary' : 'primary',
      });
      if (!isExternalCall && branch === 'generate') {
        analytics.track('onboarding_cross_feature_demo_viewed', {
          primary_feature: 'generate',
          demo_feature: 'import',
          demo_role: 'secondary',
        });
      }
    })().catch(() => undefined);

    return () => { active = false; };
  }, [isExternalCall, TUTORIAL_IMAGES]);

  const handleClose = () => {
    if (isExternalCall) {
      analytics.track('import_tutorial_closed');
      router.back();
      return;
    }

    // Dismissal keeps the onboarding destination; analytics must not delay it.
    void (async () => {
      const variant = await analytics.getOnboardingVariant();
      analytics.track('onboarding_video_import_tutorial_continue', {
        variant, entry_feature: entryFeature, imported: false,
      });
      if (entryFeature === 'generate') {
        analytics.track('onboarding_cross_feature_demo_completed', {
          primary_feature: 'generate', demo_feature: 'import',
          demo_role: 'secondary', interaction: 'tutorial_viewed',
        });
      }
    })().catch(() => undefined);
    router.replace('/onboarding/weeklyPlanPreview');
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize <= 0) return;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.max(0, Math.min(TUTORIAL_IMAGES.length - 1, Math.round(index)));
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
      feedback.selection();
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <View style={[styles.carouselItem, { width: carouselWidth }]}>
      <View style={[styles.iphoneWrapper, { width: phoneWidth }]}>
        <Image 
          source={item} 
          style={styles.tutorialImage} 
          priority={index === 0 ? "high" : "normal"}
        />
        <Image
          source={Platform.OS === 'ios' ? require('../../assets/images/iphone.png') : require('../../assets/images/android.png')}
          style={styles.iphoneFrame}
          priority="high"
        />
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        // La zone sûre s'applique sur les deux plateformes : 28pt en dur sur iOS
        // laissait un vide sur iPhone SE et n'était pas assez sur Android gestuel.
        { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 12, paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right },
      ]}
    >
      <View style={styles.topSection}>
        <View style={styles.toolbar}>
          <NavigationIconButton kind="close" onPress={handleClose} />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t(entryFeature === 'generate'
              ? 'onboardingVideoImport.secondaryTitle'
              : 'onboardingVideoImport.title')}
          </Text>
          {entryFeature !== 'generate' && (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {t('onboardingVideoImport.subtitle')}
            </Text>
          )}
          <Text style={styles.howToText}>{t('onboardingVideoImport.secondaryHowTo')}</Text>
        </View>
        <View style={styles.carouselContainer}>
          <View style={styles.slideArea} onLayout={(e) => { setCarouselHeight(e.nativeEvent.layout.height); setCarouselWidth(e.nativeEvent.layout.width); }}>
            <FlatList
              data={TUTORIAL_IMAGES}
              renderItem={renderItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={styles.flatList}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews={false}
            />
          </View>

          <View style={styles.pagination}>
            <View style={styles.paginationProgress} accessible accessibilityRole="text"
              accessibilityLabel={t('onboardingVideoImport.step', { current: activeIndex + 1, total: TUTORIAL_IMAGES.length })}>
              <View style={styles.dots}>
                {TUTORIAL_IMAGES.map((_, index) => <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />)}
              </View>
              <Text accessible={false} style={styles.pageCount}>{activeIndex + 1} / {TUTORIAL_IMAGES.length}</Text>
            </View>
            <View style={styles.swipeHint}>
              <Ionicons accessible={false} name="swap-horizontal-outline" size={22} color={designTheme.ink} />
              <Text style={styles.swipeText}>{t('onboardingVideoImport.swipeHint')}</Text>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTheme.background,
  },
  topSection: {
    flex: 1,
    minHeight: 0,
    ...contentColumn(),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  toolbar: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Degular'
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: designTheme.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 10,
    includeFontPadding: Platform.OS === 'ios' ? false : true,
    textAlignVertical: 'center',
  },
  howToText: {
    fontSize: 16,
    fontFamily: 'CronosProBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 24,
    includeFontPadding: Platform.OS === 'ios' ? false : true,
    textAlignVertical: 'center',
  },
  carouselContainer: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...contentColumn(),
    paddingVertical: 10,
  },
  flatList: {
    width: '100%',
    flexGrow: 0,
  },
  slideArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iphoneWrapper: {
    // width fourni à l'usage : borné par la hauteur réellement disponible.
    aspectRatio: 538 / 1076,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iphoneFrame: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    zIndex: 2,
  },
  tutorialImage: {
    position: 'absolute',
    width: '89.5%',
    height: '98%',
    top: '2%',
    left: '5.25%',
    borderRadius: AppRadii.sheet,
    zIndex: 1,
  },
  pagination: {
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 16,
    gap: 12,
    width: '100%',
  },
  paginationProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: AppRadii.pill,
    backgroundColor: designTheme.muted,
  },
  activeDot: {
    backgroundColor: designTheme.yellow,
    width: 32,
  },
  pageCount: {
    fontFamily: 'CronosProBold',
    fontSize: 18,
    lineHeight: 24,
    color: designTheme.ink,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  swipeText: {
    fontFamily: 'CronosProBold',
    fontSize: 16,
    lineHeight: 22,
    color: designTheme.ink,
    textAlign: 'center',
    flexShrink: 1,
  },
});

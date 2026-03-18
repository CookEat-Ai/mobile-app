import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';

const { width } = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();
  const { isFromImport } = useLocalSearchParams();
  const isExternalCall = isFromImport === 'true';

  const TUTORIAL_IMAGES = Platform.OS === 'ios' ? TUTORIAL_IMAGES_IOS : TUTORIAL_IMAGES_ANDROID;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    // Preload images for better responsiveness
    Asset.loadAsync([...TUTORIAL_IMAGES, require('../../assets/images/iphone.png'), require('../../assets/images/android.png')]);

    if (!isExternalCall) {
      analytics.track('onboarding_video_import_tutorial_viewed');
    } else {
      analytics.track('import_tutorial_viewed');
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isExternalCall) {
      analytics.track('import_tutorial_closed');
      router.back();
      return;
    }

    const variant = await analytics.getOnboardingVariant();

    analytics.track('onboarding_video_import_tutorial_continue', { variant });

    if (variant === 'E' || variant === 'F') {
      router.replace('/onboarding/reviewRequest');
    } else {
      router.replace('/onboarding/promoCode');
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
      Haptics.selectionAsync();
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <View style={styles.carouselItem}>
      <View style={styles.iphoneWrapper}>
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
        { paddingTop: insets.top + 12, paddingBottom: Platform.OS === 'ios' ? 28 : insets.bottom + 18 },
      ]}
    >
      <View style={styles.topSection}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{t('onboardingVideoImport.title')}</Text>
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {t('onboardingVideoImport.subtitle')}
          </Text>
          <Text style={styles.howToText}>{t('onboardingVideoImport.howTo')}</Text>
        </Animated.View>

        <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
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

          <View style={styles.pagination}>
            {TUTORIAL_IMAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index && styles.activeDot
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.continueButton}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>{t('onboardingVideoImport.button')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    width: '100%',
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
    color: '#666',
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  flatList: {
    flexGrow: 0,
  },
  carouselItem: {
    width: width - 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iphoneWrapper: {
    width: width * 0.65,
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
    borderRadius: 28,
    zIndex: 1,
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeDot: {
    backgroundColor: Colors.light.button,
    width: 16,
  },
  continueButton: {
    backgroundColor: Colors.light.button,
    width: '100%',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontFamily: 'Degular',
  },
});

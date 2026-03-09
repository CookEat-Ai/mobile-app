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
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import analytics from '../../services/analytics';

const { width, height } = Dimensions.get('window');

const TUTORIAL_IMAGES = [
  require('../../assets/images/tuto/tuto-import-tiktok-1.png'),
  require('../../assets/images/tuto/tuto-import-tiktok-2.png'),
  require('../../assets/images/tuto/tuto-import-tiktok-3.png'),
  require('../../assets/images/tuto/tuto-import-tiktok-4.png'),
  require('../../assets/images/tuto/tuto-import-tiktok-5.png'),
  require('../../assets/images/tuto/tuto-import-tiktok-6.png'),
];

export default function VideoImportTutorialScreen() {
  const insets = useSafeAreaInsets();
  const { isFromImport } = useLocalSearchParams();
  const isExternalCall = isFromImport === 'true';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
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

    if (variant === 'C' || variant === 'D') {
      router.replace('/onboarding/videoDemo');
    } else {
      router.replace('/onboarding/ahaMoment');
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.carouselItem}>
      <View style={styles.iphoneWrapper}>
        <Image source={item} style={styles.tutorialImage} />
        <Image source={require('../../assets/images/iphone.png')} style={styles.iphoneFrame} />
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: Platform.OS === 'ios' ? 28 : insets.bottom + 20 },
      ]}
    >
      <View style={styles.topSection}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{I18n.t('onboardingVideoImport.title')}</Text>
          <Text style={styles.subtitle}>{I18n.t('onboardingVideoImport.subtitle')}</Text>
          <Text style={styles.howToText}>{I18n.t('onboardingVideoImport.howTo')}</Text>
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
        <Text style={styles.buttonText}>{I18n.t('onboardingVideoImport.button')}</Text>
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
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  howToText: {
    fontSize: 16,
    fontFamily: 'Cronos Pro Bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 4,
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

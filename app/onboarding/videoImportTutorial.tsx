import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics, { EntryFeature } from '../../services/analytics';
import { ImportLinkSheet } from '../../components/ImportLinkSheet';
import { clipboardMayHoldLink } from '../../services/videoLink';

/**
 * Après l'aha moment d'import, on reprend le questionnaire à ses questions
 * propres : la branche import n'a fait que les questions communes avant de
 * sortir vivre son import. Elles sont posées ici et pas avant parce que
 * l'utilisateur vient de voir une vidéo devenir une recette — parler de ses
 * recettes éparpillées est alors concret. Suivent la fin de tunnel commune
 * (attribution, engagement, projection et preuve sociale). Le consentement aux
 * notifications est réservé plus tard au vrai rappel d’essai.
 */
const ONBOARDING_NEXT_AFTER_IMPORT = '/onboarding/formQuestion?initialStep=intro_import';


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
  const [entryFeature, setEntryFeature] = useState<EntryFeature | null>(null);
  // La branche est lue en asynchrone : sans ce drapeau, le CTA passif s'affiche
  // une fraction de seconde avant de basculer sur le CTA d'import.
  const [branchResolved, setBranchResolved] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  // Un lien détecté permet de préciser le CTA, mais la saisie manuelle reste
  // toujours possible : l'import est présenté comme fonctionnalité secondaire
  // à la branche génération, pas comme une option cachée.
  const [clipboardHasLink, setClipboardHasLink] = useState(false);
  const { layoutWidth } = useResponsive();
  // La maquette fait 2x sa largeur en hauteur. Bornée seulement par la largeur,
  // elle mesurait 488pt de haut sur iPhone SE et passait sous le bouton.
  // On réserve la pagination (~26pt) et un peu d'air (~20pt).
  const [carouselHeight, setCarouselHeight] = useState(0);
  const phoneWidth = carouselHeight > 0
    ? Math.min(layoutWidth * 0.65, Math.max(carouselHeight - 46, 0) * (538 / 1076))
    : layoutWidth * 0.65;
  const { t } = useTranslation();

  useEffect(() => {
    // Preload images for better responsiveness
    Asset.loadAsync([...TUTORIAL_IMAGES, require('../../assets/images/iphone.png'), require('../../assets/images/android.png')]);

    (async () => {
      const branch = await analytics.getEntryFeature();
      setEntryFeature(branch);

      // Appelé depuis l'onglet Importées ou par un utilisateur venu pour
      // l'import : le CTA est de toute façon affiché, inutile de sonder.
      if (!isExternalCall && branch !== 'import') {
        setClipboardHasLink(await clipboardMayHoldLink());
      }

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
      setBranchResolved(true);
    })();

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

  const isImportFirst = isExternalCall || entryFeature === 'import';
  // Le rappel « ou colle un lien » ne doit apparaître que si le bouton
  // correspondant est réellement là (branche génération sans lien détecté : non).
  const canPasteLink = isImportFirst || entryFeature === 'generate' || clipboardHasLink;

  const handleOpenImportSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.track('import_tutorial_paste_cta_pressed', {
      entry_feature: entryFeature,
      is_primary_cta: isImportFirst || entryFeature === 'generate',
      from_clipboard_hint: clipboardHasLink,
    });
    if (!isExternalCall && entryFeature === 'generate') {
      analytics.track('onboarding_cross_feature_demo_started', {
        primary_feature: 'generate',
        demo_feature: 'import',
        demo_role: 'secondary',
      });
    }
    setShowImportSheet(true);
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isExternalCall) {
      analytics.track('import_tutorial_closed');
      router.back();
      return;
    }

    const variant = await analytics.getOnboardingVariant();

    analytics.track('onboarding_video_import_tutorial_continue', {
      variant,
      entry_feature: entryFeature,
      imported: false,
    });

    if (entryFeature === 'generate') {
      analytics.track('onboarding_cross_feature_demo_completed', {
        primary_feature: 'generate',
        demo_feature: 'import',
        demo_role: 'secondary',
        interaction: 'tutorial_viewed',
      });
    }

    // Branche import : qu'il ait importé ou passé l'étape, la suite du tunnel
    // est la même (preuve sociale → promo → paywall).
    if (entryFeature === 'import') {
      router.replace(ONBOARDING_NEXT_AFTER_IMPORT as any);
      return;
    }

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
        { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 12 },
      ]}
    >
      <View style={styles.topSection}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {branchResolved && entryFeature === 'generate' && (
            <View style={styles.secondaryBadge}>
              <Ionicons name="add-circle" size={15} color={Colors.light.button} />
              <Text style={styles.secondaryBadgeText}>{t('onboardingVideoImport.secondaryBadge')}</Text>
            </View>
          )}
          <Text style={styles.title}>
            {t(entryFeature === 'generate'
              ? 'onboardingVideoImport.secondaryTitle'
              : 'onboardingVideoImport.title')}
          </Text>
          {branchResolved && entryFeature !== 'generate' && (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {t('onboardingVideoImport.subtitle')}
            </Text>
          )}
          <Text style={styles.howToText}>
            {t(entryFeature === 'generate'
              ? 'onboardingVideoImport.secondaryHowTo'
              : 'onboardingVideoImport.howTo')}
          </Text>
        </Animated.View>

        <Animated.View
          style={[styles.carouselContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          onLayout={(e) => setCarouselHeight(e.nativeEvent.layout.height)}
        >
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

        {/* Sépare les deux méthodes d'import : au-dessus le partage depuis
            TikTok (illustré par le carrousel), en dessous le collage de lien
            (le bouton). Sans ce séparateur, l'écran semblait se contredire. */}
        {canPasteLink && (
          <Animated.View style={[styles.orSeparator, { opacity: fadeAnim }]}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>{t('common.or')}</Text>
            <View style={styles.orLine} />
          </Animated.View>
        )}
      </View>

      {/* L'import est l'action principale pour qui est venu pour ça (et depuis
          l'onglet Importées). Sinon il reste secondaire et conditionnel. */}
      {!branchResolved ? (
        // Réserve la hauteur des deux boutons pour éviter un saut de mise en page.
        <View style={[styles.actions, styles.actionsPlaceholder]} />
      ) : isImportFirst ? (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.continueButton}
            onPress={handleOpenImportSheet}
          >
            <Text style={styles.buttonText}>{t('onboardingVideoImport.pasteLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.6} style={styles.skipButton} onPress={handleContinue}>
            <Text style={styles.skipButtonText}>
              {isExternalCall ? t('onboardingVideoImport.button') : t('onboardingVideoImport.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.continueButton}
            onPress={handleOpenImportSheet}
          >
            <Text style={styles.buttonText}>
              {t(clipboardHasLink
                ? 'onboardingVideoImport.clipboardCta'
                : 'onboardingVideoImport.tryImport')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.6} style={styles.skipButton} onPress={handleContinue}>
            <Text style={styles.skipButtonText}>{t('onboardingVideoImport.skip')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ImportLinkSheet
        visible={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        source={isExternalCall ? 'import_tutorial' : 'onboarding'}
        isOnboarding={!isExternalCall}
        onboardingNext={isExternalCall
          ? undefined
          : entryFeature === 'import'
            ? ONBOARDING_NEXT_AFTER_IMPORT
            : '/onboarding/promoCode'}
      />
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
    minHeight: 0,
    ...contentColumn(),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  secondaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF2D1',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 9,
  },
  secondaryBadgeText: {
    color: Colors.light.button,
    fontFamily: 'CronosProBold',
    fontSize: 12,
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
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...contentColumn(),
    paddingVertical: 10,
  },
  flatList: {
    flexGrow: 0,
  },
  carouselItem: {
    width: rw(1) - 40,
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
  orSeparator: {
    ...contentColumn(),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4DFC4',
  },
  orText: {
    fontSize: 18,
    fontFamily: 'Degular',
    color: '#8C8C8C',
    letterSpacing: 1,
  },
  actions: {
    ...contentColumn(),
    gap: 8,
  },
  actionsPlaceholder: {
    // Hauteur du bouton principal (16pt de padding vertical) + le lien secondaire.
    height: 96,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8C8C8C',
    fontSize: rw(0.041),
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
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
    fontSize: rw(0.05),
    fontFamily: 'Degular',
  },
});

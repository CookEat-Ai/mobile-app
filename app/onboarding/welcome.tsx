import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { font, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics, { EntryFeature } from '../../services/analytics';
import apiService from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';

/**
 * Écran d'accueil et de segmentation.
 *
 * Le trafic est organique : quelqu'un voit une vidéo, puis cherche l'app sur le
 * store. Aucune attribution ne nous dira ce qu'il venait chercher — cet écran
 * est donc la seule occasion de le savoir, et il doit le demander avant d'avoir
 * pris parti pour un usage.
 *
 * La version précédente ouvrait sur « Photographie tes ingrédients » et une
 * démo du scan de frigo : une promesse entièrement tournée vers la génération,
 * servie à des gens dont la moitié vient pour importer une recette vue en
 * vidéo. La démo a été retirée plutôt que rendue neutre — la seule séquence
 * exploitable de `demo.mp4` dure moins de deux secondes. Elle reste utilisée par
 * `videoDemo`, où le contexte est le bon.
 *
 * Le choix n'est pas présenté comme une question mais comme deux façons de
 * démarrer : même donnée collectée, aucun effet « formulaire dès l'ouverture ».
 */
export default function WelcomeVideoScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { width, height, layoutWidth, isShortScreen } = useResponsive();

  // La mascotte est bornée par la hauteur autant que par la largeur : à 100 % de
  // la largeur elle faisait 1024pt de haut sur iPad et débordait sur iPhone SE.
  const mascotSize = Math.min(layoutWidth * 0.8, height * (isShortScreen ? 0.24 : 0.32));

  // Grand cercle crème qui déborde des deux côtés, repris de la maquette
  // d'accueil : les proportions sont dérivées de la largeur réelle.
  const curveWidth = width * 2.5;
  const curveHeight = curveWidth * 1.026;
  const curveLeft = -(curveWidth - width) / 2;
  // Le sommet du cercle doit rester *au-dessus* du haut du titre, sinon celui-ci
  // se retrouve à cheval sur la frontière jaune/crème. La section basse commence
  // à 1/(1+1.35) ≈ 42,5 % de la hauteur et le titre démarre `paddingTop` plus
  // bas : placer le sommet à 42 % laisse une petite marge tout en évitant la
  // grande zone crème vide qu'on avait au-dessus de l'accroche.
  const curveBottom = height * 0.58 - curveHeight;

  const [isStarting, setIsStarting] = useState(false);

  const mascotTranslateY = useRef(new Animated.Value(height * 0.25)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  /**
   * Ordre fixe, import en premier.
   *
   * L'ordre était auparavant tiré au sort : la première position capte
   * naturellement plus de clics, et cette réponse est notre seul substitut
   * d'attribution. En le figeant, la répartition import/generate mesurée
   * intègre désormais un biais de position qu'on ne peut plus isoler — à garder
   * en tête avant d'en tirer des conclusions sur ce qui amène les gens ici.
   */
  const options = React.useMemo(
    () =>
      [
        { value: 'import', label: t('onboarding.entryFeature.import'), emoji: '📱' },
        { value: 'generate', label: t('onboarding.entryFeature.generate'), emoji: '🥘' },
      ] as { value: EntryFeature; label: string; emoji: string }[],
    [t]
  );

  useEffect(() => {
    analytics.track('onboarding_started');
    analytics.track('onboarding_welcome_viewed', {
      card_order: options.map((option) => option.value).join(','),
    });

    // AppsFlyer attend au maximum 10 secondes la réponse ATT. La demander sur
    // le véritable premier écran garde l'IDFA disponible pour l'attribution de
    // l'installation au lieu d'attendre la fin de l'onboarding.
    const trackingTimer = setTimeout(() => {
      analytics.requestTrackingPermission();
    }, 800);

    return () => clearTimeout(trackingTimer);
    // `options` change d'identité à chaque rendu déclenché par i18n ; on ne veut
    // qu'un seul événement de vue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(mascotTranslateY, {
        toValue: 0,
        stiffness: 110,
        damping: 13,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]);

    const content = Animated.stagger(320, [
      Animated.delay(320),
      Animated.timing(titleOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(socialOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(cardsOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotScale, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mascotScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    entrance.start(() => pulse.start());
    content.start();

    return () => pulse.stop();
  }, [cardsOpacity, mascotOpacity, mascotScale, mascotTranslateY, socialOpacity, titleOpacity]);

  const handleMascotPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pressRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(pressScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence(
        [1, -1, 1, -1, 0].map((toValue) =>
          Animated.timing(pressRotate, { toValue, duration: 60, useNativeDriver: true })
        )
      ),
    ]).start();
  };

  const handleSelect = async (value: EntryFeature) => {
    if (isStarting) return;
    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // La branche est enregistrée avant toute navigation : `formQuestion` la relit
    // au montage pour savoir quelles questions afficher.
    await analytics.setEntryFeature(value, {
      card_order: options.map((option) => option.value).join(','),
      chosen_from: 'welcome',
    });

    // Création de l'utilisateur anonyme en tâche de fond : on ne bloque pas
    // l'entrée dans le tunnel sur un aller-retour réseau.
    (async () => {
      try {
        const mobileId = await getUniqueDeviceId();
        const timezone = Localization.getCalendars()[0].timeZone || undefined;
        const response = await apiService.initUser(mobileId, timezone);
        if (response.data?.userId) {
          await AsyncStorage.setItem('userId', response.data.userId);
          analytics.identify(response.data.userId);
        }
      } catch { }
    })();

    const variant = await analytics.getOnboardingVariant();
    if (variant === 'E' || variant === 'F') {
      router.replace('/onboarding/fastOnboarding');
    } else {
      router.replace('/onboarding/formQuestion');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.topSection}>
        <Text style={styles.brand}>CookEat Ai</Text>
        <View style={styles.illustrationWrapper}>
          <Animated.View
            style={{
              opacity: mascotOpacity,
              transform: [
                { translateY: mascotTranslateY },
                { scale: Animated.multiply(mascotScale, pressScale) },
                {
                  rotate: pressRotate.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require('../../assets/images/mascot.png')}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
              style={{ width: mascotSize, height: mascotSize, transform: [{ rotate: '20deg' }] }}
            />
          </Animated.View>
          <Pressable
            onPress={handleMascotPress}
            accessibilityRole="button"
            style={[styles.mascotHitArea, { width: mascotSize * 0.6, height: mascotSize * 0.6 }]}
          />
        </View>
      </View>

      <View
        pointerEvents="none"
        style={{
          zIndex: 1,
          position: 'absolute',
          left: curveLeft,
          bottom: curveBottom,
          backgroundColor: '#FDF9E2',
          width: curveWidth,
          height: curveHeight,
          borderRadius: curveHeight,
        }}
      />

      <View style={styles.bottomSection}>
        <ScrollView
          style={styles.bottomScroll}
          contentContainerStyle={styles.bottomScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Accroche volontairement générique. Une phrase qui décrit les deux
              usages laisse voir la mécanique de segmentation ; ici on accueille,
              puis on demande, et ce sont les cartes qui portent le sens. */}
          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
          </Animated.View>

          <Animated.View style={{ opacity: socialOpacity }}>
            <View style={styles.socialProof}>
              <Ionicons
                name="leaf"
                size={22}
                color="#C9903A"
                style={{ transform: [{ scaleX: -1 }, { rotate: '-25deg' }] }}
              />
              {/* Formulation courte propre à cet écran : la chaîne partagée
                  `socialProof.title` passe sur deux lignes ici, ce qui repousse
                  les lauriers aux deux bords de l'écran. */}
              <Text style={styles.socialProofText}>
                {/* `total` et non `count` : i18next réserve `count` à la
                    pluralisation et n'en accepte qu'un nombre, ce qui casse le
                    typage dès qu'on passe une chaîne déjà formatée. */}
                {t('onboarding.welcomeSocialProof', {
                  total: i18n.language.startsWith('fr') ? '10 000' : '10,000',
                })}
              </Text>
              <Ionicons
                name="leaf"
                size={22}
                color="#C9903A"
                style={{ transform: [{ rotate: '25deg' }] }}
              />
            </View>
          </Animated.View>

          {/* La question est collée aux cartes : elle appelle une réponse, une
              ligne de preuve sociale entre les deux casserait l'enchaînement. */}
          <Animated.View style={{ opacity: cardsOpacity, width: '100%', gap: 14 }}>
            <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.card}
                activeOpacity={0.85}
                disabled={isStarting}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.cardEmoji}>{option.emoji}</Text>
                {/* Deux lignes autorisées : sur une seule, « Importer des
                    recettes depuis TikTok/Insta » se réduisait à ~0,73 de sa
                    taille et devenait visiblement plus petit que l'autre carte.
                    Sur deux lignes les deux libellés gardent la même taille. */}
                <Text
                  style={styles.cardLabel}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {option.label}
                </Text>
                <FontAwesome6 name="chevron-right" size={16} color={Colors.light.button} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0B84F',
  },
  topSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  brand: {
    fontSize: font(26),
    fontFamily: 'Degular',
    color: Colors.light.text,
    alignSelf: 'flex-end',
  },
  illustrationWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotHitArea: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bottomSection: {
    zIndex: 10,
    // Deux cartes prennent plus de place que l'ancien bouton unique : la moitié
    // basse est un peu plus haute que la moitié haute.
    flex: 1.35,
    ...contentColumn(),
    // Surtout pas de `paddingHorizontal` ici : la `ScrollView` serait décalée de
    // 24pt et les cartes, larges de 100 %, colleraient à ses bords — une
    // ScrollView rogne son contenu, donc ombres et coins arrondis se
    // retrouvaient tranchés. Le retrait est porté par le contenu défilant.
    elevation: 10,
  },
  bottomScroll: {
    flex: 1,
  },
  bottomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    // Marge minimale sous le sommet de la courbe : elle borne l'écart quand le
    // contenu remplit la section, et sert de garde-fou anti-chevauchement.
    paddingTop: 14,
    paddingBottom: 24,
    // Respiration entre les trois blocs : accroche, preuve sociale, question.
    // La question garde en revanche son écart serré avec les cartes (le `gap`
    // du bloc qui les regroupe), pour qu'elle reste lue comme leur intitulé.
    gap: 30,
  },
  title: {
    textAlign: 'center',
    fontSize: rw(0.09),
    lineHeight: rw(0.1),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: rw(0.055),
    lineHeight: rw(0.07),
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialProofText: {
    fontFamily: 'Degular',
    fontSize: rw(0.042),
    color: Colors.light.text,
    flexShrink: 1,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    // Les deux libellés n'occupent pas le même nombre de lignes ; sans hauteur
    // plancher, les cartes seraient de tailles différentes.
    minHeight: rw(0.2),
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardLabel: {
    flex: 1,
    // Une taille de moins qu'auparavant : « Importer depuis TikTok/Insta »
    // passait sur deux lignes et se coupait après le slash (« TikTok/ » puis
    // « Insta »), ce qui se lisait comme un bug de mise en page.
    fontSize: rw(0.042),
    lineHeight: Platform.OS === 'android' ? rw(0.053) : undefined,
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
});

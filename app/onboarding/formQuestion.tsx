import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import { Image } from 'expo-image';
import * as StoreReview from 'expo-store-review';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import analytics, { EntryFeature } from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { ContextualProof } from '../../components/onboarding/ContextualProof';
import { CommitmentTitle } from '../../components/onboarding/CommitmentTitle';
import { ProjectionStep } from '../../components/onboarding/ProjectionStep';
import {
  loadOnboardingProfile,
  OnboardingProfile,
  ProofKey,
} from '../../services/onboardingProfile';

const QUESTIONS_ANSWERED_KEY = 'questions_answered';

/**
 * Question de segmentation : elle oriente la fin du tunnel selon ce que
 * l'utilisateur est venu chercher. Le trafic étant organique, c'est la seule
 * source de vérité disponible sur son intention (cf. `EntryFeature`).
 */
const ENTRY_FEATURE_FIELD = 'entryFeature';

/**
 * Étape de bascule vers l'aha moment d'import, à la position qu'occupait la
 * question de segmentation. Elle ne demande rien : la branche est déjà connue
 * depuis l'accueil, cet écran annonce simplement le premier import.
 */
const IMPORT_HANDOFF_FIELD = 'intro_import_handoff';

type Question = {
  question: string;
  key?: string;
  fieldName?: string;
  options: Option[];
  multi?: boolean;
  optional?: boolean;
  interstitial?: boolean;
  hideProgress?: boolean;
  specialType?: 'socialProof' | 'onboardingReady' | 'projection';
  /**
   * Restreint la question à une branche. Les questions de personnalisation ne
   * servent qu'à la génération : les poser à quelqu'un venu importer une vidéo
   * n'a aucun effet sur son résultat et allonge le tunnel pour rien.
   */
  branch?: EntryFeature;
  /**
   * Transforme un interstitiel en écran de preuve contextuelle : son contenu
   * est choisi d'après les réponses déjà données plutôt qu'écrit en dur.
   * Volontairement porté par `interstitial` et non par `specialType` : la
   * logique de sauvegarde du tunnel se déclenche sur le premier `specialType`
   * rencontré, un écran de preuve au milieu du questionnaire la ferait partir
   * trop tôt.
   */
  proofKey?: ProofKey;
  /** Rend le titre via un composant dédié au lieu du texte statique. */
  dynamicTitle?: 'commitment';
  /**
   * Autorise deux lignes par option. Réservé aux questions dont les libellés
   * sont des phrases : sur une seule ligne, `adjustsFontSizeToFit` les réduirait
   * jusqu'à l'illisible.
   */
  multilineOptions?: boolean;
}

type Option = {
  label: string;
  value: string;
  emoji?: string;
  iconName?: string;
  iconColor?: string;
}

const SocialProofContent = ({ onRate }: { onRate?: () => void }) => {
  const { t, i18n } = useTranslation();
  const count = i18n.language.startsWith('fr') ? '10 000' : '10,000';
  const fullText = t('onboarding.socialProof.title', { total: count });
  const parts = fullText.split(new RegExp(`(${count})`));

  const reviews = [
    { id: 1, name: 'Marie L.', rating: 5, text: t('onboarding.socialProof.review1') },
    { id: 2, name: 'Thomas D.', rating: 5, text: t('onboarding.socialProof.review2') },
  ];

  return (
    <View style={styles.specialStepContainer}>
      <View style={styles.topBadge}>
        <Text style={styles.topBadgeText}>{t('onboarding.socialProof.topBadge')}</Text>
      </View>

      <Text style={styles.title}>
        {parts.map((part, index) => (
          <Text key={index} style={part === count ? styles.highlight : null}>
            {part}
          </Text>
        ))}
        <Text> 🎉</Text>
      </Text>

      <View style={styles.ratingSection}>
        <Text
          style={styles.ratingPrompt}
          numberOfLines={2}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
        >
          {t('onboarding.socialProof.subtitle')}
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <View key={star}>
              <Ionicons
                name="star"
                size={32}
                color="#FEB50A"
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.reviewsContainer}>
        {reviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewName}>{review.name}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name="star" size={14} color="#FEB50A" />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const OnboardingReadyContent = () => {
  const { t } = useTranslation();
  const { height } = useResponsive();
  return (
    <View style={[styles.specialStepContainer, { paddingTop: height * 0.3 }]}>
      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={20} color="#E67E22" />
        <Text style={styles.badgeText}>{t('onboardingReady.badge')}</Text>
      </View>

      <Text style={styles.title}>{t('onboardingReady.title')}</Text>
    </View>
  );
};

const RatingBadge = ({ style }: { style?: any }) => {
  return (
    <Animated.View style={[styles.ratingBadgeContainer, style]}>
      <View style={styles.ratingBadgeContent}>
        <View style={styles.laurelContainer}>
          <Ionicons name="leaf" size={32} color="#F3D0B0" style={{ transform: [{ scaleX: -1 }, { rotate: '-30deg' }] }} />
        </View>
        <View style={styles.ratingBadgeCenter}>
          <Text style={styles.ratingBadgeScore}>5.0</Text>
          <View style={styles.ratingBadgeStars}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons key={s} name="star" size={16} color="#FEB50A" />
            ))}
          </View>
        </View>
        <View style={styles.laurelContainer}>
          <Ionicons name="leaf" size={32} color="#F3D0B0" style={{ transform: [{ rotate: '30deg' }] }} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function FormQuestionScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // `windowWidth/Height` = dimensions réelles (pour les animations qui sortent de
  // l'écran) ; `layoutWidth` = largeur plafonnée servant à la mise en page.
  const { width: windowWidth, height: windowHeight, layoutWidth } = useResponsive();

  // Permet de reprendre le questionnaire à une étape précise. La branche import
  // en sort après la question de segmentation (pour l'aha moment d'import) puis
  // y revient à `socialProof`. On cible par nom d'étape et non par index, qui
  // dépend de la branche.
  const routeParams = useLocalSearchParams<{ initialStep?: string }>();

  // Branche choisie sur l'écran d'accueil, relue au montage. `null` seulement le
  // temps de la lecture asynchrone : toutes les questions sont alors considérées
  // comme visibles, ce qui n'affiche rien de faux, juste une barre de
  // progression momentanément trop longue.
  const [entryFeature, setEntryFeature] = useState<EntryFeature | null>(null);

  const questions: Question[] = useMemo(() => [
    {
      fieldName: 'sex',
      question: t('onboarding.sex'),
      options: [
        { label: t('onboarding.formQuestions.man'), value: 'man', emoji: '👨' },
        { label: t('onboarding.formQuestions.woman'), value: 'woman', emoji: '👩' },
        { label: t('onboarding.formQuestions.other'), value: 'other', iconName: 'ellipsis', iconColor: '#94A3B8' }
      ]
    },
    {
      fieldName: 'age',
      question: t('onboarding.age'),
      options: [
        { label: t('onboarding.formQuestions.less_than_20'), value: 'less_than_20', emoji: '🎓' },
        { label: t('onboarding.formQuestions.20_30'), value: '20_30', emoji: '🚀' },
        { label: t('onboarding.formQuestions.30_45'), value: '30_45', emoji: '💼' },
        { label: t('onboarding.formQuestions.more_than_45'), value: 'more_than_45', emoji: '🏡' }
      ]
    },
    // Objectif : remontée de la fin du tunnel vers le début, et sortie de la
    // branche `generate`. C'est la seule réponse dont dépendent l'engagement, la
    // projection et la preuve contextuelle — la poser tard revenait à
    // personnaliser un tunnel déjà terminé. Elle sert aussi à découvrir *pourquoi*
    // les gens installent l'app, ce qu'aucune autre question ne dit.
    {
      fieldName: 'useCase',
      question: t('onboarding.useCase'),
      multilineOptions: true,
      options: [
        { label: t('onboarding.formQuestions.usecase_ideas'), value: 'usecase_ideas', emoji: '💡' },
        { label: t('onboarding.formQuestions.usecase_leftovers'), value: 'usecase_leftovers', emoji: '🥬' },
        { label: t('onboarding.formQuestions.usecase_money'), value: 'usecase_money', emoji: '💸' },
        { label: t('onboarding.formQuestions.usecase_organize'), value: 'usecase_organize', emoji: '📚' },
        { label: t('onboarding.formQuestions.usecase_time'), value: 'usecase_time', emoji: '⏱️' },
        { label: t('onboarding.formQuestions.usecase_healthy'), value: 'usecase_healthy', emoji: '🥗' },
      ]
    },
    {
      fieldName: 'proof_goal',
      question: 'proof:goal',
      options: [],
      interstitial: true,
      hideProgress: true,
      proofKey: 'goal',
    },
    {
      fieldName: 'intro_habits',
      question: t('onboarding.habitsIntroInterstitial'),
      options: [],
      interstitial: true,
      hideProgress: true,
    },
    {
      fieldName: 'cookingLevel',
      question: t('onboarding.cookingLevel'),
      options: [
        { label: t('onboarding.formQuestions.beginner'), value: 'beginner', emoji: '🌱' },
        { label: t('onboarding.formQuestions.medium'), value: 'medium', emoji: '🔥' },
        { label: t('onboarding.formQuestions.advanced'), value: 'advanced', emoji: '👨‍🍳' }
      ]
    },
    {
      fieldName: 'cookingFrequency',
      question: t('onboarding.cookingFrequency'),
      options: [
        { label: t('onboarding.formQuestions.rarely'), value: 'rarely', emoji: '🕐' },
        { label: t('onboarding.formQuestions.occasionally'), value: 'occasionally', emoji: '📅' },
        { label: t('onboarding.formQuestions.frequently'), value: 'frequently', emoji: '⚡️' }
      ]
    },
    {
      fieldName: 'eatOutFrequency',
      question: t('onboarding.eatOutFrequency'),
      options: [
        { label: t('onboarding.formQuestions.almost_never'), value: 'almost_never', emoji: '🥗' },
        { label: t('onboarding.formQuestions.1_2_times'), value: '1_2_times', emoji: '🍕' },
        { label: t('onboarding.formQuestions.3_4_times'), value: '3_4_times', emoji: '🥡' },
        { label: t('onboarding.formQuestions.more_than_4_times'), value: 'more_than_4_times', emoji: '🍔' }
      ]
    },
    {
      fieldName: 'proof_habits',
      question: 'proof:habits',
      options: [],
      interstitial: true,
      hideProgress: true,
      proofKey: 'habits',
    },
    {
      key: 'cookingForWho',
      fieldName: 'cookingForWho',
      question: t('onboarding.cookingForWho'),
      options: [
        { label: t('onboarding.formQuestions.myself'), value: 'myself', emoji: '🙋‍♂️' },
        { label: t('onboarding.formQuestions.myself_and_another_person'), value: 'myself_and_another_person', emoji: '👫' },
        { label: t('onboarding.formQuestions.my_family'), value: 'my_family', emoji: '👨‍👩‍👧‍👦' }
      ]
    },
    {
      fieldName: 'cookingTime',
      question: t('onboarding.cookingTime'),
      options: [
        { label: t('onboarding.formQuestions.less_than_30_minutes'), value: 'less_than_30_minutes', emoji: '⏱️' },
        { label: t('onboarding.formQuestions.between_30_minutes_and_1_hour'), value: 'between_30_minutes_and_1_hour', emoji: '⏲️' },
        { label: t('onboarding.formQuestions.more_than_1_hour'), value: 'more_than_1_hour', emoji: '⌛️' }
      ]
    },
    // La question de segmentation vivait ici. Elle est désormais posée sur
    // l'écran d'accueil : le trafic étant organique, l'app n'a aucun moyen de
    // savoir ce que l'utilisateur venait chercher, et ouvrir sur une promesse
    // « scanne ton frigo » faisait fuir la moitié venue pour l'import. Il ne
    // reste ici que la bascule vers l'aha moment d'import, à la même position.
    {
      fieldName: IMPORT_HANDOFF_FIELD,
      question: t('onboarding.importHandoff'),
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'import',
    },
    {
      fieldName: 'intro_preferences',
      question: t('onboarding.preferencesIntro'),
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'generate',
    },
    {
      fieldName: 'equipments',
      question: t('onboarding.equipmentQuestion'),
      multi: true,
      optional: true,
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.equipment_oven'), value: 'equipment_oven', emoji: '🔥' },
        { label: t('onboarding.formQuestions.equipment_airfryer'), value: 'equipment_airfryer', emoji: '🍟' },
        { label: t('onboarding.formQuestions.equipment_microwave'), value: 'equipment_microwave', emoji: '📡' },
        { label: t('onboarding.formQuestions.equipment_blender'), value: 'equipment_blender', emoji: '🥤' },
        { label: t('onboarding.formQuestions.equipment_robot'), value: 'equipment_robot', emoji: '🤖' },
      ]
    },
    {
      key: 'mealBudget',
      fieldName: 'mealBudget',
      question: t('onboarding.mealBudget'),
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.budget_small'), value: 'budget_small', emoji: '💡' },
        { label: t('onboarding.formQuestions.budget_medium'), value: 'budget_medium', emoji: '💰' },
        { label: t('onboarding.formQuestions.budget_large'), value: 'budget_large', emoji: '💎' },
      ]
    },
    {
      fieldName: 'proof_budget',
      question: 'proof:budget',
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'generate',
      proofKey: 'budget',
    },
    {
      fieldName: 'favoriteDishType',
      question: t('onboarding.favoriteDishType'),
      optional: true,
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.dish_soup'), value: 'dish_soup', emoji: '🥣' },
        { label: t('onboarding.formQuestions.dish_gratin'), value: 'dish_gratin', emoji: '🧀' },
        { label: t('onboarding.formQuestions.dish_salad'), value: 'dish_salad', emoji: '🥗' },
        { label: t('onboarding.formQuestions.dish_oven'), value: 'dish_oven', emoji: '🔥' },
        { label: t('onboarding.formQuestions.dish_street'), value: 'dish_street', emoji: '🌯' },
      ]
    },
    {
      fieldName: 'favoriteCuisineStyle',
      question: t('onboarding.favoriteCuisineStyle'),
      multi: true,
      optional: true,
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.cuisine_mediterranean'), value: 'cuisine_mediterranean', emoji: '🫒' },
        { label: t('onboarding.formQuestions.cuisine_french'), value: 'cuisine_french', emoji: '🥖' },
        { label: t('onboarding.formQuestions.cuisine_italian'), value: 'cuisine_italian', emoji: '🍝' },
        { label: t('onboarding.formQuestions.cuisine_middle_eastern'), value: 'cuisine_middle_eastern', emoji: '🧆' },
        { label: t('onboarding.formQuestions.cuisine_indian'), value: 'cuisine_indian', emoji: '🍛' },
        { label: t('onboarding.formQuestions.cuisine_asian'), value: 'cuisine_asian', emoji: '🥢' },
        { label: t('onboarding.formQuestions.cuisine_american'), value: 'cuisine_american', emoji: '🍔' },
        { label: t('onboarding.formQuestions.cuisine_spicy'), value: 'cuisine_spicy', emoji: '🌶️' },
      ]
    },
    {
      fieldName: 'intro_waste',
      question: t('onboarding.habitsIntro'),
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'generate',
    },
    {
      fieldName: 'diet',
      question: t('onboarding.diet'),
      optional: true,
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.halal'), value: 'halal', emoji: '🥙' },
        { label: t('onboarding.formQuestions.vegetarian'), value: 'vegetarian', emoji: '🥦' },
        { label: t('onboarding.formQuestions.vegan'), value: 'vegan', emoji: '🌿' }
      ]
    },
    {
      fieldName: 'avoidIngredients',
      question: t('onboarding.avoidIngredients'),
      multi: true,
      optional: true,
      branch: 'generate',
      options: [
        { label: t('onboarding.formQuestions.avoid_pork'), value: 'avoid_pork', emoji: '🐷' },
        { label: t('onboarding.formQuestions.avoid_alcohol'), value: 'avoid_alcohol', emoji: '🍷' },
        { label: t('onboarding.formQuestions.avoid_beef'), value: 'avoid_beef', emoji: '🥩' },
        { label: t('onboarding.formQuestions.avoid_fish'), value: 'avoid_fish', emoji: '🐟' },
        { label: t('onboarding.formQuestions.avoid_dairy'), value: 'avoid_dairy', emoji: '🥛' },
        { label: t('onboarding.formQuestions.avoid_gluten'), value: 'avoid_gluten', emoji: '🌾' },
      ]
    },
    // --- Branche import -----------------------------------------------------
    // Posées *après* l'aha moment d'import (cf. `ONBOARDING_NEXT_AFTER_IMPORT`
    // dans `videoImportTutorial`) : l'utilisateur vient de voir une vidéo se
    // transformer en recette, c'est le moment où parler de ses recettes
    // éparpillées est concret plutôt qu'abstrait.
    {
      fieldName: 'intro_import',
      question: t('onboarding.importIntro'),
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'import',
    },
    {
      fieldName: 'importSources',
      question: t('onboarding.importSources'),
      multi: true,
      branch: 'import',
      options: [
        { label: t('onboarding.formQuestions.source_tiktok'), value: 'source_tiktok', iconName: 'tiktok', iconColor: '#000000' },
        { label: t('onboarding.formQuestions.source_instagram'), value: 'source_instagram', iconName: 'instagram', iconColor: '#E4405F' },
        { label: t('onboarding.formQuestions.source_youtube'), value: 'source_youtube', iconName: 'youtube', iconColor: '#FF0000' },
        { label: t('onboarding.formQuestions.source_web'), value: 'source_web', emoji: '🌐' },
        { label: t('onboarding.formQuestions.source_screenshots'), value: 'source_screenshots', emoji: '📸' },
        { label: t('onboarding.formQuestions.source_family'), value: 'source_family', emoji: '👵' },
      ]
    },
    {
      fieldName: 'importVolume',
      question: t('onboarding.importVolume'),
      branch: 'import',
      multilineOptions: true,
      options: [
        { label: t('onboarding.formQuestions.import_volume_few'), value: 'import_volume_few', emoji: '🤏' },
        { label: t('onboarding.formQuestions.import_volume_some'), value: 'import_volume_some', emoji: '📌' },
        { label: t('onboarding.formQuestions.import_volume_many'), value: 'import_volume_many', emoji: '📚' },
        { label: t('onboarding.formQuestions.import_volume_chaos'), value: 'import_volume_chaos', emoji: '🌪️' },
      ]
    },
    {
      fieldName: 'proof_import',
      question: 'proof:import',
      options: [],
      interstitial: true,
      hideProgress: true,
      branch: 'import',
      proofKey: 'import',
    },
    {
      fieldName: 'importPain',
      question: t('onboarding.importPain'),
      branch: 'import',
      multilineOptions: true,
      options: [
        { label: t('onboarding.formQuestions.pain_find'), value: 'pain_find', emoji: '🔍' },
        { label: t('onboarding.formQuestions.pain_pause'), value: 'pain_pause', emoji: '⏸️' },
        { label: t('onboarding.formQuestions.pain_quantities'), value: 'pain_quantities', emoji: '⚖️' },
        { label: t('onboarding.formQuestions.pain_never_cook'), value: 'pain_never_cook', emoji: '😅' },
      ]
    },
    // --- Fin de tunnel commune aux deux branches ----------------------------
    // L'attribution descend ici : elle ne sert qu'à nous, elle ne donne aucune
    // raison de continuer, et en tête de tunnel elle payait le plein tarif du
    // drop-off. À cet endroit l'utilisateur est engagé et répond quand même.
    {
      fieldName: 'howDidHeKnowCookEatAI',
      question: t('onboarding.howDidHeKnowCookEatAI'),
      options: [
        {
          label: Platform.OS === 'ios' ? t('onboarding.formQuestions.app_store') : t('onboarding.formQuestions.google_play'),
          value: 'store',
          iconName: Platform.OS === 'ios' ? 'apple' : 'google-play',
          iconColor: Platform.OS === 'ios' ? '#000000' : '#3DDC84'
        },
        { label: t('onboarding.formQuestions.tiktok'), value: 'tiktok', iconName: 'tiktok', iconColor: '#000000' },
        { label: t('onboarding.formQuestions.instagram'), value: 'instagram', iconName: 'instagram', iconColor: '#E4405F' },
        { label: t('onboarding.formQuestions.facebook'), value: 'facebook', iconName: 'facebook', iconColor: '#1877F2' },
        { label: t('onboarding.formQuestions.youtube'), value: 'youtube', iconName: 'youtube', iconColor: '#FF0000' },
        { label: t('onboarding.formQuestions.google'), value: 'google', iconName: 'google', iconColor: '#4285F4' },
        { label: t('onboarding.formQuestions.friend'), value: 'friend', iconName: 'user', iconColor: '#6366F1' },
        { label: t('onboarding.formQuestions.other'), value: 'other', iconName: 'ellipsis', iconColor: '#94A3B8' },
      ]
    },
    // Engagement daté : dernière question du tunnel, donc la dernière chose que
    // l'utilisateur s'entend dire avant la projection et le paywall.
    {
      fieldName: 'commitmentLevel',
      question: 'commitment',
      dynamicTitle: 'commitment',
      multilineOptions: true,
      options: [
        { label: t('onboarding.formQuestions.commit_all_in'), value: 'commit_all_in', emoji: '🔥' },
        { label: t('onboarding.formQuestions.commit_serious'), value: 'commit_serious', emoji: '💪' },
        { label: t('onboarding.formQuestions.commit_try'), value: 'commit_try', emoji: '🙂' },
        { label: t('onboarding.formQuestions.commit_unsure'), value: 'commit_unsure', emoji: '🤔' },
      ]
    },
    {
      question: 'Projection',
      options: [],
      specialType: 'projection',
    },
    {
      question: 'Social Proof',
      options: [],
      specialType: 'socialProof',
    },
    {
      question: 'Ready',
      options: [],
      specialType: 'onboardingReady',
      // « Place à tes recettes sur-mesure ! » annonce la personnalisation, qui
      // n'existe pas pour une recette importée : l'écran n'a rien à promettre à
      // cette branche.
      branch: 'generate',
    }
    // `t` est volontairement hors des dépendances : la locale ne change pas en
    // cours de tunnel, et recalculer ce tableau invaliderait la restauration des
    // réponses qui en dépend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  /**
   * Une question est visible si elle n'est pas réservée à l'autre branche.
   * Tant que la branche est inconnue, tout est visible.
   */
  const isQuestionVisible = useCallback(
    (question: Question, branch: EntryFeature | null) =>
      !question.branch || !branch || question.branch === branch,
    []
  );

  /**
   * Index de la prochaine question visible, ou -1 s'il n'y en a plus.
   * `branch` est passé explicitement : au moment où l'utilisateur répond à la
   * question de segmentation, l'état React n'est pas encore à jour.
   */
  const findNextVisibleIndex = useCallback(
    (from: number, branch: EntryFeature | null) => {
      for (let i = from + 1; i < questions.length; i++) {
        if (isQuestionVisible(questions[i], branch)) return i;
      }
      return -1;
    },
    [questions, isQuestionVisible]
  );

  const findPreviousVisibleIndex = useCallback(
    (from: number, branch: EntryFeature | null) => {
      for (let i = from - 1; i >= 0; i--) {
        if (isQuestionVisible(questions[i], branch)) return i;
      }
      return -1;
    },
    [questions, isQuestionVisible]
  );

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isReviewDelayActive, setIsReviewDelayActive] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  // Profil dérivé des réponses, relu depuis le stockage à l'entrée de chaque
  // écran personnalisé. Volontairement hors du tableau `questions` : le rendre
  // dépendant des réponses ferait changer l'identité du `useMemo` à chaque
  // sélection, ce qui relancerait la restauration des réponses en boucle.
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;

  const isTransitioningRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const backButtonAnim = useRef(new Animated.Value(0)).current;
  const socialProofTransition = useRef(new Animated.Value(0)).current;
  const mascotX = useRef(new Animated.Value(0)).current;
  const readyTransition = useRef(new Animated.Value(0)).current;
  const isLeavingSocialProofForward = useRef(false);
  const prevIndexRef = useRef(0);
  const autoSkipRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const runAutoSkip = useCallback(
    (savedAnswers: string[], branch: EntryFeature | null) => {
      if (autoSkipRef.current) return;

      const targetIndex = questions.findIndex((item, idx) => {
        if (item.specialType) return false; // Ne jamais sauter les specialTypes
        // Une question d'une autre branche n'est jamais une cible : sinon la
        // reprise s'arrêterait sur une question que cet utilisateur ne voit pas.
        if (!isQuestionVisible(item, branch)) return false;
        if (item.interstitial) {
          if (savedAnswers[idx]) return false;
          const hasLaterAnswers = savedAnswers.some((answer, laterIdx) => laterIdx > idx && !questions[laterIdx].specialType && Boolean(answer));
          return !hasLaterAnswers;
        }
        return !savedAnswers[idx];
      });

      if (targetIndex <= index || targetIndex === -1) {
        autoSkipRef.current = true;
        return;
      }

      autoSkipRef.current = true;
      isTransitioningRef.current = true;
      let currentIndex = index;

      const step = () => {
        if (currentIndex >= targetIndex) {
          isTransitioningRef.current = false;
          return;
        }

        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: Platform.OS === 'android' ? 100 : 140,
          useNativeDriver: true,
        }).start(() => {
          // On avance de question *visible* en question visible : sinon la
          // reprise ferait défiler les questions de l'autre branche à l'écran.
          const next = findNextVisibleIndex(currentIndex, branch);
          currentIndex = next === -1 ? targetIndex : next;
          setIndex(currentIndex);
          contentOpacity.setValue(0);

          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: Platform.OS === 'android' ? 200 : 450,
            useNativeDriver: true,
          }).start(step);
        });
      };

      step();
    },
    [contentOpacity, index, questions, isQuestionVisible, findNextVisibleIndex]
  );

  const loadPreviousAnswers = useCallback(async () => {
    try {
      const savedAnswers: string[] = [];
      for (let i = 0; i < questions.length; i++) {
        const questionKey = questions[i].fieldName || `question_${i}`;
        const savedAnswer = await AsyncStorage.getItem(questionKey);
        if (savedAnswer) {
          savedAnswers[i] = savedAnswer;
        }
      }
      setAnswers(savedAnswers);

      // La branche doit être connue avant la reprise, sinon on s'arrêterait sur
      // une question de personnalisation que l'utilisateur import ne voit pas.
      const storedBranch = await analytics.getEntryFeature();
      if (storedBranch) setEntryFeature(storedBranch);

      // Une étape imposée par l'appelant fait autorité : la reprise automatique
      // recalculerait une position d'après les réponses et nous ferait reculer.
      if (!__DEV__ && !routeParams.initialStep) {
        runAutoSkip(savedAnswers, storedBranch);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des réponses:', error);
    }
  }, [questions, runAutoSkip, routeParams.initialStep]);

  React.useEffect(() => {
    if (!routeParams.initialStep) return;

    const target = questions.findIndex(
      (question) =>
        question.specialType === routeParams.initialStep ||
        question.fieldName === routeParams.initialStep
    );
    if (target === -1) return;

    autoSkipRef.current = true;
    setIndex(target);
  }, [routeParams.initialStep, questions]);

  const loadAnswerForCurrentQuestion = useCallback(async () => {
    try {
      if (questions[index].interstitial) {
        setSelectedOption(null);
        setSelectedOptions([]);
        return;
      }
      const isMulti = Boolean(questions[index].multi);
      const questionKey = questions[index].fieldName || `question_${index}`;
      const savedAnswer = await AsyncStorage.getItem(questionKey);
      if (savedAnswer) {
        if (isMulti) {
          try {
            const parsed = JSON.parse(savedAnswer);
            setSelectedOptions(Array.isArray(parsed) ? parsed : [savedAnswer]);
          } catch {
            setSelectedOptions([savedAnswer]);
          }
          setSelectedOption(null);
        } else {
          setSelectedOption(savedAnswer);
          setSelectedOptions([]);
        }
      } else {
        setSelectedOption(null);
        setSelectedOptions([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la réponse:', error);
    }
  }, [index, questions]);

  // La branche est lue à part, avant la boucle de restauration des réponses :
  // elle conditionne quelles questions sont visibles, donc la progression et le
  // routage de fin. Une seule lecture, pour réduire au minimum la fenêtre où
  // l'écran se croit encore sur le tunnel complet.
  React.useEffect(() => {
    analytics.getEntryFeature().then((branch) => {
      if (branch) setEntryFeature(branch);
    });
  }, []);

  // Charger les réponses précédentes au montage du composant
  React.useEffect(() => {
    loadPreviousAnswers();
  }, [loadPreviousAnswers]);

  React.useEffect(() => {
    mascotOpacity.setValue(0);
    Animated.timing(mascotOpacity, {
      delay: 200,
      toValue: 1,
      duration: Platform.OS === 'android' ? 600 : 1200,
      useNativeDriver: true,
    }).start();
  }, [mascotOpacity]);

  React.useEffect(() => {
    // La progression se compte sur les questions réellement posées à cet
    // utilisateur : la branche import en saute une partie, et une barre calculée
    // sur le tableau complet resterait bloquée au tiers jusqu'à la fin.
    const visible = questions.filter((question) => isQuestionVisible(question, entryFeature));
    const visiblePosition = questions
      .slice(0, index + 1)
      .filter((question) => isQuestionVisible(question, entryFeature)).length;

    Animated.timing(progressAnim, {
      toValue: visible.length > 0 ? visiblePosition / visible.length : 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [index, progressAnim, questions, entryFeature, isQuestionVisible]);

  React.useEffect(() => {
    if (!questions[index].interstitial) return;
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [index, questions]);

  // Les écrans personnalisés relisent le profil au moment de s'afficher plutôt
  // qu'une fois pour toutes : la réponse qui les alimente vient parfois d'être
  // écrite par l'écran précédent, et l'utilisateur peut revenir en arrière la
  // changer.
  React.useEffect(() => {
    const current = questions[index];
    const needsProfile =
      Boolean(current.proofKey) ||
      Boolean(current.dynamicTitle) ||
      current.specialType === 'projection';
    if (!needsProfile) return;

    let cancelled = false;
    loadOnboardingProfile().then((loaded) => {
      if (!cancelled) setProfile(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [index, questions]);

  // Charger les réponses précédentes quand l'index change
  React.useEffect(() => {
    loadAnswerForCurrentQuestion();

    // Animer le bouton retour
    Animated.timing(backButtonAnim, {
      toValue: index > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // On anime la largeur/marge donc false
    }).start();

    // Gestion des animations pour les écrans spéciaux
    if (questions[index].specialType === 'socialProof') {
      analytics.track('onboarding_social_proof_viewed');

      const isNavigatingForward = index > prevIndexRef.current;

      // Animation du badge (Lauriers)
      Animated.spring(socialProofTransition, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Animation de la mascotte
      if (isNavigatingForward) {
        // Vient d'une question normale : part vers la gauche
        Animated.spring(mascotX, {
          toValue: -windowWidth,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      } else {
        // Revient de l'étape suivante : part vers la droite
        Animated.spring(mascotX, {
          toValue: windowWidth,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }

      setIsReviewDelayActive(true);
      setTimeout(async () => {
        try {
          if (AppState.currentState !== 'active') return;
          if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
          }
        } catch (e) {
          console.warn('Store review request skipped:', e);
        }
      }, 2000);

      setTimeout(() => {
        setIsReviewDelayActive(false);
      }, 3000);
    } else if (questions[index].specialType === 'onboardingReady') {
      analytics.track('onboarding_ready_step_viewed');

      // La mascotte revient au centre horizontalement
      Animated.spring(mascotX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      Animated.timing(readyTransition, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    } else {
      // Pour les questions normales (Go back)
      const isNavigatingBackward = index < prevIndexRef.current;

      if (isNavigatingBackward) {
        // Si on revient de socialProof, la mascotte revient de la gauche
        if (prevIndexRef.current === questions.findIndex(q => q.specialType === 'socialProof')) {
          mascotX.setValue(-windowWidth);
        }
        Animated.spring(mascotX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      } else {
        mascotX.setValue(0);
      }

      // Reset du badge et des autres transitions
      Animated.spring(socialProofTransition, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      Animated.timing(readyTransition, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    if (questions[index].specialType === 'projection') {
      analytics.track('onboarding_projection_viewed');
    } else if (questions[index].proofKey) {
      analytics.track('onboarding_contextual_proof_viewed', {
        proof_key: questions[index].proofKey,
      });
    }

    if (!questions[index].specialType) {
      analytics.track('onboarding_question_view', {
        question_index: index,
        question_text: questions[index].question,
        question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
        is_interstitial: !!questions[index].interstitial
      });
    }
    prevIndexRef.current = index;
  }, [index, loadAnswerForCurrentQuestion, questions, backButtonAnim]);

  const renderQuestionText = (text: string) => {
    if (!text) return null;

    // Regex pour capturer les nombres avec unités (30kg, 150€, $250, 1h)
    const regex = /(\d+kg|\d+€|\$\d+|\d+h)/g;
    const parts = text.split(regex);

    return (
      <Text style={styles.title}>
        {parts.map((part, i) => {
          if (part.match(regex)) {
            return (
              <Text key={i} style={styles.highlight}>
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  const handleOptionSelect = (value: string) => {
    if (isTransitioningRef.current) return;
    const isMulti = Boolean(questions[index].multi);

    Haptics.selectionAsync();

    if (isMulti) {
      const next = selectedOptions.includes(value)
        ? selectedOptions.filter((item) => item !== value)
        : [...selectedOptions, value];
      setSelectedOptions(next);
      setSelectedOption(null);
      setAnswers([...answers, JSON.stringify(next)]);

      analytics.track('onboarding_option_selected', {
        question_index: index,
        question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
        is_multi: true,
        selected_count: next.length,
      });
    } else {
      setSelectedOption(value);
      setSelectedOptions([]);
      setAnswers([...answers, value]);

      analytics.track('onboarding_option_selected', {
        question_index: index,
        question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
        is_multi: false,
      });

      transitionToNextQuestion(value);
    }
  };

  const handleBackPress = () => {
    if (isTransitioningRef.current || index === 0) return;

    analytics.track('onboarding_back_pressed', {
      from_index: index,
      from_field: questions[index].fieldName || questions[index].key || `question_${index}`
    });

    Haptics.selectionAsync();
    // Retour sur la précédente question *visible* : un utilisateur import ne doit
    // pas atterrir sur une question de personnalisation qu'il n'a jamais vue.
    const previous = findPreviousVisibleIndex(index, entryFeature);
    if (previous !== -1) setIndex(previous);
  };

  /**
   * Branche de l'utilisateur. Elle est choisie sur l'écran d'accueil, donc déjà
   * connue en arrivant ici ; l'état peut simplement ne pas encore être hydraté
   * au tout premier rendu, auquel cas les appelants retombent sur la valeur
   * persistée par `analytics`.
   */
  const resolveBranch = (): EntryFeature | null => entryFeature;

  const isLeavingForImportAhaMoment = () =>
    questions[index].fieldName === IMPORT_HANDOFF_FIELD;

  const transitionToNextQuestion = (value: string | string[]) => {
    isTransitioningRef.current = true;

    // Si on est sur socialProof, on anime le départ du badge vers la gauche
    // et l'entrée de la mascotte depuis la droite
    if (questions[index].specialType === 'socialProof') {
      isLeavingSocialProofForward.current = true;
      Animated.spring(socialProofTransition, {
        toValue: 2,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start(() => {
        isLeavingSocialProofForward.current = false;
      });
    }

    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: Platform.OS === 'android' ? 150 : 220,
      useNativeDriver: true,
    }).start(async () => {
      const branch = resolveBranch();
      // « Dernière » au sens « on quitte cet écran » : soit il n'y a plus de
      // question visible, soit la branche import part vivre son aha moment.
      const isLastQuestion =
        findNextVisibleIndex(index, branch) === -1 || isLeavingForImportAhaMoment();

      if (isLastQuestion) {
        // Pour la dernière question, on ne réaffiche pas le contenu
        // On laisse handleContinue gérer la navigation vers l'écran de chargement
        await handleContinue(value);
        return;
      }

      await handleContinue(value);
      contentOpacity.setValue(0);

      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: Platform.OS === 'android' ? 250 : 1000,
        useNativeDriver: true,
      }).start(() => {
        isTransitioningRef.current = false;
      });
    });
  };


  /**
   * Pousse toutes les réponses connues vers l'API. Appelé à l'entrée de la
   * section finale et au départ vers l'aha moment d'import : dans les deux cas
   * l'utilisateur peut ne jamais revenir, et on ne veut pas perdre ce qu'il a
   * déjà donné. L'endpoint est un upsert par `mobileId`, l'appeler deux fois est
   * sans effet de bord.
   */
  const persistAllAnswers = async (currentKey?: string, currentValue?: string) => {
    await AsyncStorage.setItem(QUESTIONS_ANSWERED_KEY, 'true');

    // Pas de `await` : une connexion lente ne doit pas figer la transition.
    (async () => {
      try {
        const allAnswers: Record<string, string> = {};

        const actualQuestions = questions.filter((q) => !q.specialType);
        const results = await Promise.all(
          actualQuestions.map(async (q, i) => {
            const questionKey = q.fieldName || q.key || `question_${i}`;
            return { key: questionKey, value: await AsyncStorage.getItem(questionKey) };
          })
        );
        results.forEach((result) => {
          if (result.value) allAnswers[result.key] = result.value;
        });

        // La branche n'est plus une question du tunnel : elle est choisie sur
        // l'accueil. Sans cette ligne elle ne serait jamais envoyée à l'API.
        const branch = await analytics.getEntryFeature();
        if (branch) allAnswers[ENTRY_FEATURE_FIELD] = branch;

        if (currentKey && currentValue !== undefined) {
          allAnswers[currentKey] = currentValue;
        }

        const mobileId = await getUniqueDeviceId();
        const timezone = Localization.getCalendars()[0].timeZone || undefined;

        const response = await api.saveOnboardingAnswers(allAnswers, mobileId, timezone);
        if (response.error) {
          console.error('❌ Erreur lors de la sauvegarde des réponses:', response.error);
        } else if (response.data?.userId) {
          await AsyncStorage.setItem('userId', response.data.userId);
          analytics.identify(response.data.userId);
          // Les réponses détaillées servent à personnaliser les recettes côté
          // CookEat. Elles ne doivent pas devenir des propriétés de profil
          // PostHog, notamment le régime et les ingrédients évités.
          analytics.setUserProperties({
            onboarding_profile_completed: true,
            onboarding_answered_count: Object.keys(allAnswers).length,
          });
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des réponses:', error);
      }
    })();
  };

  const handleContinue = async (overrideValue?: string | string[]) => {
    if (questions[index].interstitial) {
      analytics.track('onboarding_interstitial_continue', {
        question_index: index,
        question_text: questions[index].question
      });
      const questionKey = questions[index].fieldName || `question_${index}`;
      await AsyncStorage.setItem(questionKey, 'seen');

      // Bascule vers l'aha moment d'import. Le tutoriel renvoie ensuite dans le
      // tunnel via `initialStep`, sur les questions propres à cette branche.
      if (isLeavingForImportAhaMoment()) {
        await persistAllAnswers();
        router.replace('/onboarding/videoImportTutorial');
        return;
      }

      const nextInterstitialIndex = findNextVisibleIndex(index, entryFeature);
      if (nextInterstitialIndex !== -1) setIndex(nextInterstitialIndex);
      return;
    }
    const isMulti = Boolean(questions[index].multi);
    const fallbackValue = isMulti ? selectedOptions : selectedOption;
    const rawAnswer = overrideValue ?? fallbackValue;
    const answer = Array.isArray(rawAnswer) ? JSON.stringify(rawAnswer) : (rawAnswer || '');

    // Pour les specialType ou questions optionnelles, on autorise une réponse vide
    if (!questions[index].specialType && !answer && !questions[index].optional) return;

    try {
      // Sauvegarder la réponse de la question actuelle si elle existe (ou si elle est optionnelle)
      if (answer || questions[index].optional) {
        const questionKey = questions[index].fieldName || `question_${index}`;
        const finalAnswer = answer || (isMulti ? '[]' : 'none');
        await AsyncStorage.setItem(questionKey, finalAnswer);

        // Mettre à jour le tableau des réponses
        const newAnswers = [...answers];
        newAnswers[index] = finalAnswer;
        setAnswers(newAnswers);
      }

      // Au retour depuis l'aha moment d'import, l'état peut ne pas encore être
      // hydraté : on retombe sur la valeur persistée plutôt que de router comme
      // si la branche était inconnue (ce qui réafficherait l'écran « prêt »).
      const effectiveBranch = resolveBranch() ?? (await analytics.getEntryFeature());
      const nextIndex = findNextVisibleIndex(index, effectiveBranch);
      // Bascule vers la section finale (projection / social proof / prêt).
      // Repéré ainsi plutôt que par un décalage fixe depuis la fin du
      // tableau, car la branche import n'a pas le même nombre de questions avant
      // cette section.
      const isEnteringFinalSection =
        !questions[index].specialType &&
        nextIndex !== -1 &&
        Boolean(questions[nextIndex].specialType);

      if (isEnteringFinalSection) {
        const currentQuestionKey =
          questions[index].fieldName || questions[index].key || `question_${index}`;
        await persistAllAnswers(currentQuestionKey, answer);
      }

      if (nextIndex === -1) {
        if (effectiveBranch === 'import') {
          // L'import a déjà démontré sa valeur, mais l'onboarding doit aussi
          // faire vivre une vraie génération avant toute offre commerciale.
          router.replace('/onboarding/generationDemo');
        } else {
          // C'est l'étape OnboardingReady, on va vers loading
          router.replace('/onboarding/loading');
        }
      } else {
        // Passer à l'étape suivante (en sautant les questions de l'autre branche)
        setIndex(nextIndex);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la réponse:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        scrollEnabled={!questions[index].interstitial}
        contentContainerStyle={[
          styles.scrollContent,
          (questions[index].multi || questions[index].optional || questions[index].interstitial || (questions[index].specialType && questions[index].specialType !== 'socialProof')) && styles.scrollContentWithButton,
          questions[index].specialType === 'socialProof' && { paddingBottom: 110 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!questions[index].hideProgress && (
          <View style={styles.progressHeader}>
            {/* Colonne Gauche : Retour */}
            <Animated.View style={{
              width: backButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 50],
              }),
              opacity: backButtonAnim,
              overflow: 'hidden',
              justifyContent: 'center',
            }}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="arrow-left" size={18} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </Animated.View>

            {/* Colonne Centre : Barre de progression */}
            <View style={styles.progressTrackContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {(!questions[index].hideProgress || questions[index].specialType === 'onboardingReady' || questions[index].specialType === 'socialProof') && (
          <View style={{ height: layoutWidth * 0.25, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <Animated.View
              style={[
                {
                  opacity: mascotOpacity,
                  transform: [
                    { rotate: '20deg' },
                    {
                      scale: readyTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.5]
                      })
                    },
                    {
                      translateY: readyTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, windowHeight * 0.095]
                      })
                    },
                    {
                      translateX: Animated.add(
                        mascotX,
                        readyTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, windowHeight * 0.035]
                        })
                      )
                    },
                  ],
                  alignSelf: 'center',
                }
              ]}
            >
              <Image
                source={require('../../assets/images/mascot.png')}
                contentFit="contain"
                transition={0}
                cachePolicy="memory-disk"
                style={styles.progressMascot}
              />
            </Animated.View>
            <RatingBadge
              style={{
                position: 'absolute',
                transform: [
                  {
                    translateX: socialProofTransition.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [windowWidth, 0, -windowWidth],
                    })
                  }
                ]
              }}
            />
          </View>
        )}

        <View style={styles.content}>
          {/* Section principale */}
          <View style={styles.mainSection}>
            <Animated.View
              style={{ opacity: contentOpacity, flex: 1 }}
              needsOffscreenAlphaCompositing={true}
              renderToHardwareTextureAndroid={Platform.OS === 'android'}
            >
              {questions[index].specialType === 'socialProof' ? (
                <SocialProofContent onRate={() => {
                  analytics.track('onboarding_social_proof_rated');
                }} />
              ) : questions[index].specialType === 'onboardingReady' ? (
                <OnboardingReadyContent />
              ) : questions[index].specialType === 'projection' ? (
                <ProjectionStep profile={profile} />
              ) : questions[index].interstitial ? (
                <View style={[styles.interstitialContainer, { minHeight: windowHeight - 220 }]}>
                  {questions[index].proofKey ? (
                    <ContextualProof
                      proofKey={questions[index].proofKey!}
                      profile={profile}
                    />
                  ) : (
                    renderQuestionText(questions[index].question)
                  )}
                </View>
              ) : (
                <>
                  <View style={{ marginBottom: 40 }}>
                    {questions[index].dynamicTitle === 'commitment' ? (
                      <CommitmentTitle profile={profile} />
                    ) : (
                      renderQuestionText(questions[index].question)
                    )}
                  </View>

                  <View style={styles.cardsContainer}>
                    {questions[index].options.map((item) => {
                      const isSelected = questions[index].multi
                        ? selectedOptions.includes(item.value)
                        : selectedOption === item.value;

                      return (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.card,
                            isSelected && styles.cardSelected
                          ]}
                          onPress={() => handleOptionSelect(item.value)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardContent}>
                            {(item.iconName || item.emoji) && (
                              <View style={styles.emojiContainer}>
                                {item.iconName ? (
                                  <FontAwesome6
                                    name={item.iconName as any}
                                    size={24}
                                    color={item.iconColor || '#000'}
                                    style={{ width: 30, textAlign: 'center' }}
                                  />
                                ) : (
                                  <Text style={styles.emoji}>{item.emoji}</Text>
                                )}
                              </View>
                            )}
                            <View style={styles.cardTextContainer}>
                              <Text
                                style={[
                                  styles.cardTitle,
                                  isSelected && styles.cardTitleSelected
                                ]}
                                numberOfLines={questions[index].multilineOptions ? 2 : 1}
                                adjustsFontSizeToFit={true}
                                minimumFontScale={0.7}
                              >
                                {item.label}
                              </Text>
                            </View>
                            <View style={styles.radioContainer}>
                              {questions[index].multi ? (
                                <View style={[
                                  styles.checkboxBox,
                                  isSelected && styles.checkboxChecked
                                ]}>
                                  {isSelected && <View style={styles.checkboxTick} />}
                                </View>
                              ) : (
                                <View style={[
                                  styles.radioButton,
                                  isSelected && styles.radioButtonSelected
                                ]}>
                                  {isSelected && (
                                    <View style={styles.radioButtonInner} />
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </Animated.View>

          </View>
        </View>
      </ScrollView>

      {(questions[index].multi || questions[index].optional || questions[index].interstitial || questions[index].specialType === 'socialProof' || questions[index].specialType === 'onboardingReady' || questions[index].specialType === 'projection') && (
        <TouchableOpacity
          style={[
            styles.continueButton,
            styles.continueButtonFloating,
            (((questions[index].multi && !questions[index].optional) && selectedOptions.length === 0) || (questions[index].specialType === 'socialProof' && isReviewDelayActive)) && styles.continueButtonDisabled
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (questions[index].multi) {
              analytics.track('onboarding_multi_continue', {
                question_index: index,
                question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
                selected_count: selectedOptions.length,
              });
              transitionToNextQuestion(selectedOptions);
            } else {
              transitionToNextQuestion('');
            }
          }}
          disabled={questions[index].multi
            ? (!questions[index].optional && selectedOptions.length === 0)
            : (questions[index].specialType === 'socialProof' ? isReviewDelayActive : false)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {questions[index].specialType === 'socialProof'
              ? t('onboarding.socialProof.button')
              : questions[index].specialType === 'onboardingReady'
                ? t('onboardingReady.button')
                : questions[index].specialType === 'projection'
                  ? t('onboarding.projection.button')
                  : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF9E2",
  },
  content: {
    flex: 1,
    ...contentColumn(),
    paddingHorizontal: 24,
    // justifyContent: 'space-between',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // Bouton retour + progression : ancrés aux bords de l'écran.
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 5,
    height: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrackContainer: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 0,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#F1EACB',
    overflow: 'hidden',
  },
  progressMascot: {
    width: rw(0.25),
    height: rw(0.25),
    resizeMode: 'contain',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.light.button,
  },
  mainSection: {
    flex: 1,
    // justifyContent: 'space-between',
    // alignItems: 'center',
    paddingBottom: 40,
  },
  interstitialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    ...contentColumn(),
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContentWithButton: {
    paddingBottom: 200,
  },
  title: {
    textAlign: 'center',
    fontSize: rw(0.08),
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: rw(0.1),
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
    paddingHorizontal: Platform.OS === 'android' ? 4 : 0, // Espace pour l'élévation sur Android
    paddingBottom: Platform.OS === 'android' ? 12 : 0, // Évite que l'ombre de la dernière option soit coupée
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 200,
    padding: 20,
    borderWidth: 2, // Fix Android shadow clipping bug
    borderColor: 'transparent',
    marginHorizontal: Platform.OS === 'android' ? 2 : 0, // Évite que l'ombre soit coupée
    marginVertical: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#FEB50A',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioContainer: {
    marginLeft: 16,
  },
  radioButtonSelected: {
    borderColor: '#FEB50A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FEB50A',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#FEB50A',
    backgroundColor: '#FEB50A',
  },
  checkboxTick: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rw(0.05),
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: Platform.OS === 'android' ? rw(0.06) : undefined, // Fix truncation on Android
  },
  cardTitleSelected: {
    color: '#FEB50A',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  cardDescriptionSelected: {
    color: '#FEB50A',
  },
  continueButtonFloating: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: Platform.OS === 'ios' ? 50 : 75,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 200,
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: rw(0.05),
    fontFamily: 'Degular',
  },
  highlight: {
    color: Colors.light.button,
  },
  specialStepContainer: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: font(18),
    fontFamily: 'CronosPro',
    color: '#8C8C8C',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  reviewsContainer: {
    width: '100%',
    marginTop: 30,
    gap: 12,
    paddingHorizontal: Platform.OS === 'android' ? 4 : 0,
    paddingBottom: Platform.OS === 'android' ? 8 : 0,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: Platform.OS === 'android' ? 2 : 0,
    marginVertical: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  mockDialogContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 0, // Espace pour l'élévation sur Android
  },
  mockDialog: {
    width: Platform.OS === 'android' ? '98%' : '100%', // Un peu moins large pour éviter le clipping
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  mockDialogTitle: {
    fontSize: 17,
    textAlign: 'center',
    padding: 20,
    paddingTop: 25,
    color: '#000',
    lineHeight: 22,
  },
  mockButtons: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
  },
  mockButtonLeft: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#D1D1D6',
  },
  mockButtonRight: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.light.button,
  },
  mockButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  pointingEmoji: {
    fontSize: 40,
    marginTop: 10,
  },
  mascotCircle: {
    width: rw(0.6),
    height: rw(0.6),
    borderRadius: rw(0.6) / 2,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  mascotReady: {
    width: '70%',
    height: '70%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginBottom: 20,
    gap: 8,
  },
  badgeText: {
    color: '#E67E22',
    fontSize: 16,
    fontFamily: 'Degular'
  },
  topBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FEB50A',
    marginBottom: 20,
  },
  topBadgeText: {
    color: '#FEB50A',
    fontSize: 14,
    fontFamily: 'Degular'
  },
  ratingSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    width: Platform.OS === 'android' ? '98%' : '100%', // Un peu moins large sur Android pour l'ombre
    alignItems: 'center',
    marginVertical: 24,
    marginHorizontal: Platform.OS === 'android' ? 4 : 0, // Espace pour l'ombre sur Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  ratingPrompt: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingBadgeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadgeCenter: {
    alignItems: 'center',
  },
  ratingBadgeScore: {
    fontSize: 32,
    color: '#333',
    lineHeight: 36,
    fontFamily: 'Degular'
  },
  ratingBadgeStars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -4,
  },
  laurelContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

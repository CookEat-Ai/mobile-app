import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { Colors } from '../../constants/Colors';
import I18n from "../../i18n";
import api from '../../services/api';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const QUESTIONS_ANSWERED_KEY = 'questions_answered';

type Question = {
  question: string;
  key?: string;
  fieldName?: string;
  options: Option[];
  multi?: boolean;
  optional?: boolean;
  interstitial?: boolean;
  hideProgress?: boolean;
  specialType?: 'socialProof' | 'notifications' | 'onboardingReady';
}

type Option = {
  label: string;
  value: string;
  emoji?: string;
  iconName?: string;
  iconColor?: string;
}

const SocialProofContent = ({ onRate }: { onRate?: () => void }) => {
  const count = I18n.locale.startsWith('fr') ? '10 000' : '10,000';
  const fullText = I18n.t('onboarding.socialProof.title', { count });
  const parts = fullText.split(new RegExp(`(${count})`));

  const reviews = [
    { id: 1, name: 'Marie L.', rating: 5, text: I18n.t('onboarding.socialProof.review1') },
    { id: 2, name: 'Thomas D.', rating: 5, text: I18n.t('onboarding.socialProof.review2') },
  ];

  return (
    <View style={styles.specialStepContainer}>
      <View style={styles.topBadge}>
        <Text style={styles.topBadgeText}>{I18n.t('onboarding.socialProof.topBadge')}</Text>
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
          {I18n.t('onboarding.socialProof.subtitle')}
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

const NotificationsContent = ({ onNext }: { onNext?: () => void }) => {
  const fingerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fingerAnim, {
          toValue: -20,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fingerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fingerAnim]);

  return (
    <View style={styles.specialStepContainer}>
      <View style={{ position: 'absolute', top: 40, width: '100%' }}>
        <Text style={styles.title}>{I18n.t('notifications.title')}</Text>
      </View>

      <View style={[styles.mockDialogContainer, { marginTop: 180 }]}>
        <View style={styles.mockDialog}>
          <Text style={styles.mockDialogTitle}>
            {I18n.t('notifications.permissionTitle')}
          </Text>

          <View style={styles.mockButtons}>
            <View style={styles.mockButtonLeft}>
              <Text style={[styles.mockButtonText, { color: '#8E8E93' }]}>
                {I18n.t('notifications.dontAllow')}
              </Text>
            </View>

            <View style={styles.mockButtonRight}>
              <Text style={[styles.mockButtonText, { fontWeight: 'bold', color: '#FFF' }]}>
                {I18n.t('notifications.allow')}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ width: width * 0.8, flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ translateY: fingerAnim }] }}>
              <Text style={styles.pointingEmoji}>👆</Text>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const OnboardingReadyContent = () => {
  return (
    <View style={[styles.specialStepContainer, { paddingTop: height * 0.3 }]}>
      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={20} color="#E67E22" />
        <Text style={styles.badgeText}>{I18n.t('onboardingReady.badge')}</Text>
      </View>

      <Text style={styles.title}>{I18n.t('onboardingReady.title')}</Text>
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

  const questions: Question[] = useMemo(() => [
    {
      fieldName: 'sex',
      question: I18n.t('onboarding.sex'),
      options: [
        { label: I18n.t('onboarding.formQuestions.man'), value: 'man', emoji: '👨' },
        { label: I18n.t('onboarding.formQuestions.woman'), value: 'woman', emoji: '👩' },
        { label: I18n.t('onboarding.formQuestions.other'), value: 'other', iconName: 'ellipsis', iconColor: '#94A3B8' }
      ]
    },
    {
      fieldName: 'age',
      question: I18n.t('onboarding.age'),
      options: [
        { label: I18n.t('onboarding.formQuestions.less_than_20'), value: 'less_than_20', emoji: '🎓' },
        { label: I18n.t('onboarding.formQuestions.20_30'), value: '20_30', emoji: '🚀' },
        { label: I18n.t('onboarding.formQuestions.30_45'), value: '30_45', emoji: '💼' },
        { label: I18n.t('onboarding.formQuestions.more_than_45'), value: 'more_than_45', emoji: '🏡' }
      ]
    },
    {
      fieldName: 'howDidHeKnowCookEatAI',
      question: I18n.t('onboarding.howDidHeKnowCookEatAI'),
      options: [
        {
          label: Platform.OS === 'ios' ? I18n.t('onboarding.formQuestions.app_store') : I18n.t('onboarding.formQuestions.google_play'),
          value: 'store',
          iconName: Platform.OS === 'ios' ? 'apple' : 'google-play',
          iconColor: Platform.OS === 'ios' ? '#000000' : '#3DDC84'
        },
        { label: I18n.t('onboarding.formQuestions.tiktok'), value: 'tiktok', iconName: 'tiktok', iconColor: '#000000' },
        { label: I18n.t('onboarding.formQuestions.instagram'), value: 'instagram', iconName: 'instagram', iconColor: '#E4405F' },
        { label: I18n.t('onboarding.formQuestions.facebook'), value: 'facebook', iconName: 'facebook', iconColor: '#1877F2' },
        { label: I18n.t('onboarding.formQuestions.youtube'), value: 'youtube', iconName: 'youtube', iconColor: '#FF0000' },
        { label: I18n.t('onboarding.formQuestions.google'), value: 'google', iconName: 'google', iconColor: '#4285F4' },
        { label: I18n.t('onboarding.formQuestions.friend'), value: 'friend', iconName: 'user', iconColor: '#6366F1' },
        { label: I18n.t('onboarding.formQuestions.other'), value: 'other', iconName: 'ellipsis', iconColor: '#94A3B8' },
      ]
    },
    {
      question: I18n.t('onboarding.habitsIntroInterstitial'),
      options: [],
      interstitial: true,
      hideProgress: true,
    },
    {
      fieldName: 'cookingLevel',
      question: I18n.t('onboarding.cookingLevel'),
      options: [
        { label: I18n.t('onboarding.formQuestions.beginner'), value: 'beginner', emoji: '🌱' },
        { label: I18n.t('onboarding.formQuestions.medium'), value: 'medium', emoji: '🔥' },
        { label: I18n.t('onboarding.formQuestions.advanced'), value: 'advanced', emoji: '👨‍🍳' }
      ]
    },
    {
      fieldName: 'cookingFrequency',
      question: I18n.t('onboarding.cookingFrequency'),
      options: [
        { label: I18n.t('onboarding.formQuestions.rarely'), value: 'rarely', emoji: '🕐' },
        { label: I18n.t('onboarding.formQuestions.occasionally'), value: 'occasionally', emoji: '📅' },
        { label: I18n.t('onboarding.formQuestions.frequently'), value: 'frequently', emoji: '⚡️' }
      ]
    },
    {
      fieldName: 'eatOutFrequency',
      question: I18n.t('onboarding.eatOutFrequency'),
      options: [
        { label: I18n.t('onboarding.formQuestions.almost_never'), value: 'almost_never', emoji: '🥗' },
        { label: I18n.t('onboarding.formQuestions.1_2_times'), value: '1_2_times', emoji: '🍕' },
        { label: I18n.t('onboarding.formQuestions.3_4_times'), value: '3_4_times', emoji: '🥡' },
        { label: I18n.t('onboarding.formQuestions.more_than_4_times'), value: 'more_than_4_times', emoji: '🍔' }
      ]
    },
    {
      key: 'cookingForWho',
      fieldName: 'cookingForWho',
      question: I18n.t('onboarding.cookingForWho'),
      options: [
        { label: I18n.t('onboarding.formQuestions.myself'), value: 'myself', emoji: '🙋‍♂️' },
        { label: I18n.t('onboarding.formQuestions.myself_and_another_person'), value: 'myself_and_another_person', emoji: '👫' },
        { label: I18n.t('onboarding.formQuestions.my_family'), value: 'my_family', emoji: '👨‍👩‍👧‍👦' }
      ]
    },
    {
      fieldName: 'cookingTime',
      question: I18n.t('onboarding.cookingTime'),
      options: [
        { label: I18n.t('onboarding.formQuestions.less_than_30_minutes'), value: 'less_than_30_minutes', emoji: '⏱️' },
        { label: I18n.t('onboarding.formQuestions.between_30_minutes_and_1_hour'), value: 'between_30_minutes_and_1_hour', emoji: '⏲️' },
        { label: I18n.t('onboarding.formQuestions.more_than_1_hour'), value: 'more_than_1_hour', emoji: '⌛️' }
      ]
    },
    {
      question: I18n.t('onboarding.preferencesIntro'),
      options: [],
      interstitial: true,
      hideProgress: true,
    },
    {
      fieldName: 'equipments',
      question: I18n.t('onboarding.equipmentQuestion'),
      multi: true,
      optional: true,
      options: [
        { label: I18n.t('onboarding.formQuestions.equipment_oven'), value: 'equipment_oven', emoji: '🔥' },
        { label: I18n.t('onboarding.formQuestions.equipment_airfryer'), value: 'equipment_airfryer', emoji: '🍟' },
        { label: I18n.t('onboarding.formQuestions.equipment_microwave'), value: 'equipment_microwave', emoji: '📡' },
        { label: I18n.t('onboarding.formQuestions.equipment_blender'), value: 'equipment_blender', emoji: '🥤' },
        { label: I18n.t('onboarding.formQuestions.equipment_robot'), value: 'equipment_robot', emoji: '🤖' },
      ]
    },
    {
      key: 'mealBudget',
      fieldName: 'mealBudget',
      question: I18n.t('onboarding.mealBudget'),
      options: [
        { label: I18n.t('onboarding.formQuestions.budget_small'), value: 'budget_small', emoji: '💡' },
        { label: I18n.t('onboarding.formQuestions.budget_medium'), value: 'budget_medium', emoji: '💰' },
        { label: I18n.t('onboarding.formQuestions.budget_large'), value: 'budget_large', emoji: '💎' },
      ]
    },
    {
      fieldName: 'favoriteDishType',
      question: I18n.t('onboarding.favoriteDishType'),
      optional: true,
      options: [
        { label: I18n.t('onboarding.formQuestions.dish_soup'), value: 'dish_soup', emoji: '🥣' },
        { label: I18n.t('onboarding.formQuestions.dish_gratin'), value: 'dish_gratin', emoji: '🧀' },
        { label: I18n.t('onboarding.formQuestions.dish_salad'), value: 'dish_salad', emoji: '🥗' },
        { label: I18n.t('onboarding.formQuestions.dish_oven'), value: 'dish_oven', emoji: '🔥' },
        { label: I18n.t('onboarding.formQuestions.dish_street'), value: 'dish_street', emoji: '🌯' },
      ]
    },
    {
      fieldName: 'favoriteCuisineStyle',
      question: I18n.t('onboarding.favoriteCuisineStyle'),
      multi: true,
      optional: true,
      options: [
        { label: I18n.t('onboarding.formQuestions.cuisine_mediterranean'), value: 'cuisine_mediterranean', emoji: '🫒' },
        { label: I18n.t('onboarding.formQuestions.cuisine_french'), value: 'cuisine_french', emoji: '🥖' },
        { label: I18n.t('onboarding.formQuestions.cuisine_italian'), value: 'cuisine_italian', emoji: '🍝' },
        { label: I18n.t('onboarding.formQuestions.cuisine_middle_eastern'), value: 'cuisine_middle_eastern', emoji: '🧆' },
        { label: I18n.t('onboarding.formQuestions.cuisine_indian'), value: 'cuisine_indian', emoji: '🍛' },
        { label: I18n.t('onboarding.formQuestions.cuisine_asian'), value: 'cuisine_asian', emoji: '🥢' },
        { label: I18n.t('onboarding.formQuestions.cuisine_american'), value: 'cuisine_american', emoji: '🍔' },
        { label: I18n.t('onboarding.formQuestions.cuisine_spicy'), value: 'cuisine_spicy', emoji: '🌶️' },
      ]
    },
    {
      question: I18n.t('onboarding.habitsIntro'),
      options: [],
      interstitial: true,
      hideProgress: true,
    },
    {
      fieldName: 'diet',
      question: I18n.t('onboarding.diet'),
      optional: true,
      options: [
        { label: I18n.t('onboarding.formQuestions.halal'), value: 'halal', emoji: '🥙' },
        { label: I18n.t('onboarding.formQuestions.vegetarian'), value: 'vegetarian', emoji: '🥦' },
        { label: I18n.t('onboarding.formQuestions.vegan'), value: 'vegan', emoji: '🌿' }
      ]
    },
    {
      fieldName: 'avoidIngredients',
      question: I18n.t('onboarding.avoidIngredients'),
      multi: true,
      optional: true,
      options: [
        { label: I18n.t('onboarding.formQuestions.avoid_pork'), value: 'avoid_pork', emoji: '🐷' },
        { label: I18n.t('onboarding.formQuestions.avoid_alcohol'), value: 'avoid_alcohol', emoji: '🍷' },
        { label: I18n.t('onboarding.formQuestions.avoid_beef'), value: 'avoid_beef', emoji: '🥩' },
        { label: I18n.t('onboarding.formQuestions.avoid_fish'), value: 'avoid_fish', emoji: '🐟' },
        { label: I18n.t('onboarding.formQuestions.avoid_dairy'), value: 'avoid_dairy', emoji: '🥛' },
        { label: I18n.t('onboarding.formQuestions.avoid_gluten'), value: 'avoid_gluten', emoji: '🌾' },
      ]
    },
    {
      fieldName: 'useCase',
      question: I18n.t('onboarding.useCase'),
      options: [
        { label: I18n.t('onboarding.formQuestions.usecase_ideas'), value: 'usecase_ideas', emoji: '💡' },
        { label: I18n.t('onboarding.formQuestions.usecase_leftovers'), value: 'usecase_leftovers', emoji: '🧊' },
        { label: I18n.t('onboarding.formQuestions.usecase_healthy'), value: 'usecase_healthy', emoji: '🥗' },
        { label: I18n.t('onboarding.formQuestions.usecase_time'), value: 'usecase_time', emoji: '⏱️' },
      ]
    },
    {
      question: 'Social Proof',
      options: [],
      specialType: 'socialProof',
    },
    {
      question: 'Notifications',
      options: [],
      specialType: 'notifications',
    },
    {
      question: 'Ready',
      options: [],
      specialType: 'onboardingReady',
    }
  ], []);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isReviewDelayActive, setIsReviewDelayActive] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
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
    (savedAnswers: string[]) => {
      if (autoSkipRef.current) return;

      const targetIndex = questions.findIndex((item, idx) => {
        if (item.specialType) return false; // Ne jamais sauter les specialTypes
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
          currentIndex += 1;
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
    [contentOpacity, index, questions]
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
      if (!__DEV__) {
        runAutoSkip(savedAnswers);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des réponses:', error);
    }
  }, [questions, runAutoSkip]);

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
    const progress = (index + 1) / questions.length;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [index, progressAnim, questions.length]);

  React.useEffect(() => {
    if (!questions[index].interstitial) return;
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
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
          toValue: -width,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      } else {
        // Revient des notifications : part vers la droite
        Animated.spring(mascotX, {
          toValue: width,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }

      setIsReviewDelayActive(true);
      setTimeout(async () => {
        try {
          if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
          }
        } catch (e) {
          console.error('Error requesting review:', e);
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
    } else if (questions[index].specialType === 'notifications') {
      analytics.track('onboarding_notifications_viewed');

      const isNavigatingForward = index > prevIndexRef.current;

      // Animation inverse pour readyTransition si on revient de onboardingReady
      Animated.timing(readyTransition, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      if (isNavigatingForward) {
        // En avançant, la mascotte entre par la droite
        mascotX.setValue(width);
        Animated.spring(mascotX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();

        setIsReviewDelayActive(true);
        setTimeout(async () => {
          try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              analytics.track('onboarding_notifications_choice', { allowed: status === 'granted' });
            }
          } catch (e) {
            console.error('Error requesting notifications:', e);
          }
        }, 2000);

        // Réactivation du bouton après 3s (comme socialProof)
        setTimeout(() => {
          setIsReviewDelayActive(false);
        }, 3000);
      } else {
        // En reculant, elle est déjà au centre
        Animated.spring(mascotX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
        // Désactiver le bouton au début même en arrière, puis le réactiver
        setIsReviewDelayActive(true);
        setTimeout(() => setIsReviewDelayActive(false), 2000);
      }
    } else {
      // Pour les questions normales (Go back)
      const isNavigatingBackward = index < prevIndexRef.current;

      if (isNavigatingBackward) {
        // Si on revient de socialProof, la mascotte revient de la gauche
        if (prevIndexRef.current === questions.findIndex(q => q.specialType === 'socialProof')) {
          mascotX.setValue(-width);
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

    if (questions[index].specialType !== 'onboardingReady' && questions[index].specialType !== 'socialProof' && questions[index].specialType !== 'notifications') {
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
        selected_value: value,
        is_multi: true,
        all_selected_values: next
      });
    } else {
      setSelectedOption(value);
      setSelectedOptions([]);
      setAnswers([...answers, value]);

      analytics.track('onboarding_option_selected', {
        question_index: index,
        question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
        selected_value: value,
        is_multi: false
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
    setIndex(index - 1);
  };

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
      const isLastQuestion = index === questions.length - 1;

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


  const handleContinue = async (overrideValue?: string | string[]) => {
    if (questions[index].interstitial) {
      analytics.track('onboarding_interstitial_continue', {
        question_index: index,
        question_text: questions[index].question
      });
      const questionKey = questions[index].fieldName || `question_${index}`;
      await AsyncStorage.setItem(questionKey, 'seen');
      setIndex(index + 1);
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

      if (index === questions.length - 4) { // Juste avant les specialTypes
        // Sauvegarder toutes les réponses et marquer les questions comme répondues
        await AsyncStorage.setItem(QUESTIONS_ANSWERED_KEY, 'true');

        // Sauvegarder les réponses dans la base de données pour un utilisateur anonyme
        try {
          const allAnswers: Record<string, string> = {};

          // Récupérer toutes les réponses en parallèle pour être plus rapide
          const actualQuestions = questions.filter(q => !q.specialType);
          const answerPromises = actualQuestions.map(async (q, i) => {
            const questionKey = q.fieldName || q.key || `question_${i}`;
            const savedAnswer = await AsyncStorage.getItem(questionKey);
            return { key: questionKey, value: savedAnswer };
          });

          const results = await Promise.all(answerPromises);
          results.forEach(result => {
            if (result.value) {
              allAnswers[result.key] = result.value;
            }
          });

          // Ajouter la réponse actuelle si elle n'est pas déjà dans allAnswers
          const currentQuestionKey = questions[index].fieldName || questions[index].key || `question_${index}`;
          allAnswers[currentQuestionKey] = answer;

          // Récupérer le mobileId unique de l'appareil
          const mobileId = await getUniqueDeviceId();
          const timezone = Localization.getCalendars()[0].timeZone || undefined;

          // Envoyer les réponses à l'API
          const response = await api.saveOnboardingAnswers(allAnswers, mobileId, timezone);
          if (response.error) {
            console.error('❌ Erreur lors de la sauvegarde des réponses:', response.error);
          } else {
            await AsyncStorage.setItem('userId', response.data?.userId as string);
            analytics.identify(response.data?.userId as string);
            analytics.setUserProperties({
              ...allAnswers
            });
            console.log('✅ Réponses d\'onboarding sauvegardées avec succès');
          }
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des réponses:', error);
        }
      }

      if (index === questions.length - 1) {
        // C'est l'étape OnboardingReady, on va vers loading
        router.replace('/onboarding/loading');
      } else {
        // Passer à l'étape suivante
        setIndex(index + 1);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la réponse:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
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

        {(!questions[index].hideProgress || questions[index].specialType === 'onboardingReady' || questions[index].specialType === 'socialProof' || questions[index].specialType === 'notifications') && (
          <View style={{ height: width * 0.25, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
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
                        outputRange: [0, height * 0.095]
                      })
                    },
                    {
                      translateX: Animated.add(
                        mascotX,
                        readyTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, height * 0.035]
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
                      outputRange: [width, 0, -width],
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
              ) : questions[index].specialType === 'notifications' ? (
                <NotificationsContent
                  onNext={() => {
                    handleContinue();
                  }}
                />
              ) : questions[index].specialType === 'onboardingReady' ? (
                <OnboardingReadyContent />
              ) : questions[index].interstitial ? (
                <View style={[styles.interstitialContainer, { minHeight: height - 220 }]}>
                  {renderQuestionText(questions[index].question)}
                </View>
              ) : (
                <>
                  <View style={{ marginBottom: 40 }}>
                    {renderQuestionText(questions[index].question)}
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
                                numberOfLines={1}
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

      {(questions[index].multi || questions[index].optional || questions[index].interstitial || questions[index].specialType === 'socialProof' || questions[index].specialType === 'notifications' || questions[index].specialType === 'onboardingReady') && (
        <TouchableOpacity
          style={[
            styles.continueButton,
            styles.continueButtonFloating,
            (((questions[index].multi && !questions[index].optional) && selectedOptions.length === 0) || ((questions[index].specialType === 'socialProof' || questions[index].specialType === 'notifications') && isReviewDelayActive)) && styles.continueButtonDisabled
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (questions[index].multi) {
              analytics.track('onboarding_multi_continue', {
                question_index: index,
                question_field: questions[index].fieldName || questions[index].key || `question_${index}`,
                selected_values: selectedOptions
              });
              transitionToNextQuestion(selectedOptions);
            } else {
              transitionToNextQuestion('');
            }
          }}
          disabled={questions[index].multi
            ? (!questions[index].optional && selectedOptions.length === 0)
            : ((questions[index].specialType === 'socialProof' || questions[index].specialType === 'notifications') ? isReviewDelayActive : false)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {questions[index].specialType === 'socialProof' || questions[index].specialType === 'notifications'
              ? I18n.t('onboarding.socialProof.button')
              : questions[index].specialType === 'onboardingReady'
                ? I18n.t('onboardingReady.button')
                : I18n.t('onboarding.next')}
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
    paddingHorizontal: 24,
    // justifyContent: 'space-between',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: width * 0.25,
    height: width * 0.25,
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
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContentWithButton: {
    paddingBottom: 200,
  },
  title: {
    textAlign: 'center',
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: width * 0.1,
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
    fontSize: width * 0.05,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: Platform.OS === 'android' ? width * 0.06 : undefined, // Fix truncation on Android
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
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.05,
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
    fontSize: 18,
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
    fontFamily: 'CronosProBold',
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
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
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
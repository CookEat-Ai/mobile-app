import { router } from 'expo-router';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function PersonalizedRecipesScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAnswers = async () => {
      try {
        const keys = ['cookingTime', 'question_13', 'diet', 'question_17'];
        const results = await Promise.all(keys.map(k => AsyncStorage.getItem(k)));
        const answers: Record<string, string> = {};
        keys.forEach((key, i) => {
          if (results[i]) answers[key] = results[i]!;
        });
        setUserAnswers(answers);
      } catch (error) {
        console.error('Error loading answers:', error);
      }
    };
    loadAnswers();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categories = useMemo(() => {
    const parseValue = (val: string | undefined) => {
      if (!val || val === 'skipped' || val === 'none') return null;
      if (val.startsWith('[')) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch (e) {
          return [val];
        }
      }
      return [val];
    };

    // Temps (cookingTime)
    const timeValues = parseValue(userAnswers['cookingTime']);
    const timeLabel = timeValues ? I18n.t(`onboarding.formQuestions.${timeValues[0]}`) : null;

    // Style de cuisine (Index 13 - Multi)
    const cuisineValues = parseValue(userAnswers['question_13']);
    const cuisineLabel = cuisineValues ? I18n.t(`onboarding.formQuestions.${cuisineValues[0]}`) : null;

    // Régime (diet)
    const dietValues = parseValue(userAnswers['diet']);
    const dietLabel = dietValues ? I18n.t(`onboarding.formQuestions.${dietValues[0]}`) : null;

    // Ingrédients à éviter (Index 17 - Multi)
    const avoidValues = parseValue(userAnswers['question_17']);
    const avoidLabels = avoidValues
      ? avoidValues
        .filter(v => v !== 'avoid_none')
        .map(v => I18n.t(`onboarding.formQuestions.${v}`).toLowerCase())
      : [];
    const avoidText = avoidLabels.length > 0 ? avoidLabels.join(', ') : null;

    return [
      {
        id: '1',
        emoji: '🕒',
        title: I18n.t('onboarding.personalizedCategories.quick.title'),
        description: timeLabel
          ? I18n.t('onboarding.personalizedCategories.quick.descPersonalized', { time: timeLabel.toLowerCase() })
          : I18n.t('onboarding.personalizedCategories.quick.description'),
        rotation: '-2deg',
      },
      {
        id: '2',
        emoji: '🌍',
        title: cuisineLabel ? cuisineLabel : I18n.t('onboarding.personalizedCategories.chef.title'),
        description: cuisineLabel
          ? I18n.t('onboarding.personalizedCategories.chef.descPersonalized', { style: cuisineLabel.toLowerCase() })
          : I18n.t('onboarding.personalizedCategories.chef.description'),
        rotation: '1.5deg',
      },
      {
        id: '3',
        emoji: dietLabel || avoidText ? '🥦' : '🥗',
        title: dietLabel ? dietLabel : I18n.t('onboarding.personalizedCategories.balanced.title'),
        description: (dietLabel || avoidText)
          ? `${dietLabel ? I18n.t('onboarding.personalizedCategories.balanced.descPersonalized', { diet: dietLabel.toLowerCase() }) : ''}${dietLabel && avoidText ? ' ' : ''}${avoidText ? I18n.t('onboarding.personalizedCategories.balanced.without', { ingredients: avoidText }) : ''}`
          : I18n.t('onboarding.personalizedCategories.balanced.description'),
        rotation: '-1deg',
      },
      {
        id: '4',
        emoji: '🔥',
        title: I18n.t('onboarding.personalizedCategories.gourmet.title'),
        description: I18n.t('onboarding.personalizedCategories.gourmet.description'),
        rotation: '2deg',
      },
    ];
  }, [userAnswers, I18n.locale]);

  const handleContinue = () => {
    router.replace('/onboarding/reminder');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Animated.View style={[styles.cardsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {categories.map((item) => (
              <View key={item.id} style={[styles.card, { transform: [{ rotate: item.rotation }] }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.emojiContainer}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>

                <View style={{}}>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.mainTitle}>{I18n.t('onboarding.personalizedTitle')}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{I18n.t('onboarding.go')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingTop: 20,
  },
  cardsContainer: {
    gap: -10, // Pour les rapprocher et créer un léger chevauchement visuel si nécessaire
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Cronos Pro Bold',
    color: '#8C8C8C',
    lineHeight: 16,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: width * 0.1,
  },
  continueButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular',
  },
});

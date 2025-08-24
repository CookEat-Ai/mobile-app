import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import I18n from "../../i18n";
import apiService from '../../services/api';

const { width, height } = Dimensions.get('window');

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

type Question = {
  question: string; // Question
  options: Option[];
}

type Option = {
  label: string;
  value: string;
}

export default function FormQuestionScreen() {
  const questions: Question[] = useMemo(() => [
    {
      question: I18n.t('onboarding.sex'),
      options: [
        { label: I18n.t('onboarding.formQuestions.man'), value: 'man' },
        { label: I18n.t('onboarding.formQuestions.woman'), value: 'woman' }
      ]
    },
    {
      question: I18n.t('onboarding.age'),
      options: [
        { label: I18n.t('onboarding.formQuestions.less_than_25_years'), value: 'less_than_25_years' },
        { label: I18n.t('onboarding.formQuestions.between_25_and_40_years'), value: 'between_25_and_40_years' },
        { label: I18n.t('onboarding.formQuestions.more_than_40_years'), value: 'more_than_40_years' }
      ]
    },
    {
      question: I18n.t('onboarding.cookingLevel'),
      options: [
        { label: I18n.t('onboarding.formQuestions.beginner'), value: 'beginner' },
        { label: I18n.t('onboarding.formQuestions.medium'), value: 'medium' },
        { label: I18n.t('onboarding.formQuestions.advanced'), value: 'advanced' }
      ]
    },
    {
      question: I18n.t('onboarding.cookingFrequency'),
      options: [
        { label: I18n.t('onboarding.formQuestions.rarely'), value: 'rarely' },
        { label: I18n.t('onboarding.formQuestions.occasionally'), value: 'occasionally' },
        { label: I18n.t('onboarding.formQuestions.frequently'), value: 'frequently' }
      ]
    },
    {
      question: I18n.t('onboarding.cookingForWho'),
      options: [
        { label: I18n.t('onboarding.formQuestions.myself'), value: 'myself' },
        { label: I18n.t('onboarding.formQuestions.myself_and_another_person'), value: 'myself_and_another_person' },
        { label: I18n.t('onboarding.formQuestions.my_family'), value: 'my_family' }
      ]
    },
    {
      question: I18n.t('onboarding.cookingTime'),
      options: [
        { label: I18n.t('onboarding.formQuestions.less_than_30_minutes'), value: 'less_than_30_minutes' },
        { label: I18n.t('onboarding.formQuestions.between_30_minutes_and_1_hour'), value: 'between_30_minutes_and_1_hour' },
        { label: I18n.t('onboarding.formQuestions.more_than_1_hour'), value: 'more_than_1_hour' }
      ]
    },
    {
      question: I18n.t('onboarding.diet'),
      options: [
        { label: I18n.t('onboarding.formQuestions.none'), value: 'none' },
        { label: I18n.t('onboarding.formQuestions.halal'), value: 'halal' },
        { label: I18n.t('onboarding.formQuestions.vegetarian'), value: 'vegetarian' },
        { label: I18n.t('onboarding.formQuestions.vegan'), value: 'vegan' }
      ]
    },
    {
      question: I18n.t('onboarding.howDidHeKnowCookEatAI'),
      options: [
        { label: I18n.t('onboarding.formQuestions.social_media'), value: 'social_media' },
        { label: I18n.t('onboarding.formQuestions.friend'), value: 'friend' },
        { label: Platform.OS === 'ios' ? I18n.t('onboarding.formQuestions.app_store') : I18n.t('onboarding.formQuestions.google_play'), value: 'store' },
        { label: I18n.t('onboarding.formQuestions.other'), value: 'other' },
      ]
    }
  ], []);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  // Charger les réponses précédentes au montage du composant
  React.useEffect(() => {
    loadPreviousAnswers();
  }, []);

  // Charger les réponses précédentes quand l'index change
  React.useEffect(() => {
    loadAnswerForCurrentQuestion();
  }, [index]);

  const loadPreviousAnswers = async () => {
    try {
      const savedAnswers: string[] = [];
      for (let i = 0; i < questions.length; i++) {
        const questionKey = `question_${i}`;
        const savedAnswer = await AsyncStorage.getItem(questionKey);
        if (savedAnswer) {
          savedAnswers[i] = savedAnswer;
        }
      }
      setAnswers(savedAnswers);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des réponses:', error);
    }
  };

  const loadAnswerForCurrentQuestion = async () => {
    try {
      const questionKey = `question_${index}`;
      const savedAnswer = await AsyncStorage.getItem(questionKey);
      if (savedAnswer) {
        setSelectedOption(savedAnswer);
      } else {
        setSelectedOption(null);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la réponse:', error);
    }
  };

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
    setAnswers([...answers, value]);
  };

  const handleContinue = async () => {
    if (!selectedOption) return;

    try {
      // Sauvegarder la réponse de la question actuelle
      const questionKey = `question_${index}`;
      await AsyncStorage.setItem(questionKey, selectedOption);

      // Mettre à jour le tableau des réponses
      const newAnswers = [...answers];
      newAnswers[index] = selectedOption;
      setAnswers(newAnswers);

      if (index === questions.length - 1) {
        // Sauvegarder toutes les réponses et marquer l'onboarding comme terminé
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

        // Sauvegarder les réponses dans la base de données pour un utilisateur anonyme
        try {
          const allAnswers: Record<string, string> = {};
          for (let i = 0; i < questions.length; i++) {
            const questionKey = `question_${i}`;
            const answer = await AsyncStorage.getItem(questionKey);
            if (answer) {
              allAnswers[questionKey] = answer;
            }
          }

          // Ajouter la réponse actuelle
          allAnswers[`question_${index}`] = selectedOption;

          // Récupérer le mobileId unique de l'appareil
          const mobileId = await DeviceInfo.getUniqueId();

          // Envoyer les réponses à l'API
          const response = await apiService.saveOnboardingAnswers(allAnswers, mobileId);
          if (response.error) {
            console.error('❌ Erreur lors de la sauvegarde des réponses:', response.error);
          } else {
            await AsyncStorage.setItem('userId', response.data?.userId as string);
            console.log('✅ Réponses d\'onboarding sauvegardées avec succès');
          }
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des réponses:', error);
        }

        router.replace('/(tabs)');
      } else {
        // Passer à la question suivante
        setIndex(index + 1);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la réponse:', error);
    }
  };

  const handleBackPress = () => {
    if (index > 0) {
      setIndex(index - 1);
      // La réponse précédente sera automatiquement chargée par useEffect
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, paddingLeft: 20 }}>
        {index > 0 && <TouchableOpacity
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: '#F1F2F5',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>}

        <Text style={{
          fontSize: 30,
          fontFamily: 'Degular',
          color: Colors.light.text,
          textAlign: 'right',
          marginRight: 20
        }}
        >
          CookEat AI
        </Text>
      </View>

      <View style={styles.content}>
        {/* Section principale */}
        <View style={styles.mainSection}>
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 40 }}>
              <Text style={styles.title}>{questions[index].question}</Text>
            </View>

            <View style={styles.cardsContainer}>
              {questions[index].options.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.card,
                    selectedOption === item.value && styles.cardSelected
                  ]}
                  onPress={() => handleOptionSelect(item.value)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radioButton,
                        selectedOption === item.value && styles.radioButtonSelected
                      ]}>
                        {selectedOption === item.value && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={[
                        styles.cardTitle,
                        selectedOption === item.value && styles.cardTitleSelected
                      ]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedOption && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={!selectedOption}
            >
              <Text style={styles.buttonText}>{I18n.t('onboarding.continue')}</Text>
              <IconSymbol
                style={{ position: 'absolute', right: 20 }}
                name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
                size={width * 0.06}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    // justifyContent: 'space-between',
  },
  mainSection: {
    flex: 1,
    // justifyContent: 'space-between',
    // alignItems: 'center',
    paddingTop: height * 0.05,
    paddingBottom: 40,
  },
  title: {
    textAlign: 'left',
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: width * 0.1,
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.border,
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
    borderColor: '#FEB50A',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioContainer: {
    marginRight: 16,
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
  radioButtonSelected: {
    borderColor: '#FEB50A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FEB50A',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: width * 0.046,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardTitleSelected: {
    color: '#FEB50A',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
  },
  cardDescriptionSelected: {
    color: '#FEB50A',
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 20,
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
}); 
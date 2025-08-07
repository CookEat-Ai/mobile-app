import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import apiService from '../../services/api';
import DeviceInfo from 'react-native-device-info';

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

const questions: Question[] = [
  {
    question: t('onboarding.sex'),
    options: [
      { label: 'Homme', value: 'man' },
      { label: 'Femme', value: 'woman' }
    ]
  },
  {
    question: t('onboarding.age'),
    options: [
      { label: 'Moins de 25 ans', value: 'less_than_25_years' },
      { label: 'Entre 25 et 40 ans', value: 'between_25_and_40_years' },
      { label: 'Plus de 40 ans', value: 'more_than_40_years' }
    ]
  },
  {
    question: t('onboarding.cookingLevel'),
    options: [
      { label: 'Débutant', value: 'beginner' },
      { label: 'Moyen', value: 'medium' },
      { label: 'Avancé', value: 'advanced' }
    ]
  },
  {
    question: t('onboarding.cookingFrequency'),
    options: [
      { label: 'Rarement', value: 'rarely' },
      { label: 'Occasionnellement', value: 'occasionally' },
      { label: 'Fréquemment', value: 'frequently' }
    ]
  },
  {
    question: t('onboarding.cookingForWho'),
    options: [
      { label: 'Moi-même', value: 'myself' },
      { label: 'Moi et une autre personne', value: 'myself_and_another_person' },
      { label: 'Ma famille', value: 'my_family' }
    ]
  },
  {
    question: t('onboarding.cookingTime'),
    options: [
      { label: 'Moins de 30 minutes', value: 'less_than_30_minutes' },
      { label: 'Entre 30 minutes et 1 heure', value: 'between_30_minutes_and_1_hour' },
      { label: 'Plus de 1 heure', value: 'more_than_1_hour' }
    ]
  },
  {
    question: t('onboarding.diet'),
    options: [
      { label: 'Aucun', value: 'none' },
      { label: 'Halal', value: 'halal' },
      { label: 'Végétarien', value: 'vegetarian' },
      { label: 'Végétalien', value: 'vegan' }
    ]
  },
  {
    question: t('onboarding.howDidHeKnowCookEatAI'),
    options: [
      { label: 'Réseaux social', value: 'social_media' },
      { label: 'Ami', value: 'friend' },
      { label: Platform.OS === 'ios' ? 'App Store' : 'Google Play', value: 'store' },
      { label: 'Autre', value: 'other' },
    ]
  }
]

export default function FormQuestionScreen() {
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
                      <Text style={[
                        styles.cardDescription,
                        selectedOption === item.value && styles.cardDescriptionSelected
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
              <Text style={styles.buttonText}>Continuer</Text>
              <IconSymbol
                style={{ position: 'absolute', right: 20 }}
                name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
                size={24}
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
    lineHeight: 36,
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
    fontSize: 18,
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
    fontSize: 20,
    fontFamily: 'Degular',
  },
}); 
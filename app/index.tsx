import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import 'react-native-reanimated';
import I18n from '../i18n';
import { resetVoiceCompletely } from '../hooks/useVoice';
import analytics from '../services/analytics';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const QUESTIONS_ANSWERED_KEY = 'questions_answered';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(false);
  const [resumeOnboardingWithVideo, setResumeOnboardingWithVideo] = useState(false);

  useEffect(() => {
    // loadLanguageFromStorage();
    checkAppState();
    resetVoiceCompletely();
  }, []);

  const checkAppState = async () => {
    try {
      // Vérifier l'onboarding et les questions répondues
      let completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

      // if (__DEV__) {
      //   completed = 'false';
      //   await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'false');
      //   await AsyncStorage.setItem(QUESTIONS_ANSWERED_KEY, 'false');
      // }

      const isCompleted = completed === 'true';

      let questionsAnswered = await AsyncStorage.getItem(QUESTIONS_ANSWERED_KEY);

      if (questionsAnswered === null) {
        await AsyncStorage.setItem(QUESTIONS_ANSWERED_KEY, 'false');
        questionsAnswered = 'false';
      }

      if (questionsAnswered === 'true') {
        const variant = await analytics.getOnboardingVariant();
        setResumeOnboardingWithVideo(variant === 'C' || variant === 'D');
      } else {
        setResumeOnboardingWithVideo(false);
      }

      setQuestionsAnswered(questionsAnswered === 'true');

      if (completed === null) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'false');
        completed = 'false';
      }

      setOnboardingCompleted(isCompleted);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      setIsLoading(false);
    }
  };

  if (isLoading)
    return <Text>{I18n.t('common.loading')}</Text>

  if (!onboardingCompleted) {
    if (questionsAnswered)
      return resumeOnboardingWithVideo
        ? <Redirect href="/onboarding/videoDemo" />
        : <Redirect href="/onboarding/ingredientSelection" />
    else
      return <Redirect href="/onboarding/welcome" />
  }

  return (
    <Redirect href="/(tabs)" />
  );
}
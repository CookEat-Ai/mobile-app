import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from '../../hooks/useSubscription';
import revenueCatService from '../../config/revenuecat';

const { width } = Dimensions.get('window');
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function ReminderScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const { loadSubscriptionStatus } = useSubscription();

  useEffect(() => {
    analytics.track('Onboarding - Reminder Screen View');
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

  useFocusEffect(
    useCallback(() => {
      if (hasShownPaywall) {
        setHasShownPaywall(false);
        handlePaywallReturn();
      }
    }, [hasShownPaywall])
  );

  const handlePaywallReturn = async () => {
    // Recharger le statut pour vérifier si l'utilisateur s'est abonné
    await loadSubscriptionStatus();

    // Vérifier directement via le service pour être sûr d'avoir la donnée fraîche
    const status = await revenueCatService.getSubscriptionStatus();

    if (status.isSubscribed) {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      router.replace('/(tabs)');
    }
  };

  // TODO : move this code to the part after payment
  const handleActivateNotifications = async () => {
    try {
      // Demander les permissions de notification
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Si les permissions ne sont pas accordées, les demander
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Vérifier si les permissions ont été accordées
      if (finalStatus !== 'granted') {
        Alert.alert(
          I18n.t('onboarding.notifications.permissionDeniedTitle'),
          I18n.t('onboarding.notifications.permissionDeniedMessage'),
          [{ text: 'OK' }]
        );
        return;
      }

      // Configurer les notifications
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Programmer une notification de rappel (1 jour avant la fin de l'essai)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: I18n.t('onboarding.reminder.title'),
          body: I18n.t('onboarding.reminder.body'),
          data: { type: 'trial_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1 * 24 * 60 * 60, // 1 jour
        },
      });
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      Alert.alert(
        I18n.t('onboarding.notifications.errorTitle'),
        I18n.t('onboarding.notifications.errorMessage'),
        [{ text: 'OK' }]
      );
    } finally {
      Alert.alert(
        I18n.t('onboarding.notifications.successTitle'),
        I18n.t('onboarding.notifications.successMessage'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleContinue = () => {
    setHasShownPaywall(true);
    router.push({ pathname: '/paywall', params: { source: 'onboarding_reminder' } });
  };

  const renderTitle = () => {
    const fullText = I18n.t('onboarding.reminder.title', { days: '1' });
    const parts = fullText.split(/(1 jour|1 day)/);

    return (
      <Text style={styles.title}>
        {parts.map((part, index) => (
          <Text key={index} style={part.match(/1 jour|1 day/) ? styles.highlight : null}>
            {part}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom + 30 }]}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
            <Text style={styles.title}>🔔</Text>
            {renderTitle()}
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
          <View style={styles.checkContainer}>
            <Ionicons name="checkmark" size={20} color={Colors.light.text} />
            <Text style={styles.checkText}>{I18n.t('onboarding.offerTrial.noPayment')}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{I18n.t('onboarding.reminder.button')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
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
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascot: {
    width: width * 0.6,
    height: width * 0.6,
    transform: [{ rotate: '20deg' }],
  },
  title: {
    fontSize: width * 0.08,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.1,
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
  highlight: {
    color: Colors.light.button, // Utilisation de la couleur du bouton pour la mise en évidence
  },
  bottomSection: {
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.7,
  },
  checkText: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
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
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
});

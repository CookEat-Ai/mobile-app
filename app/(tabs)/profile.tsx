import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useSubscription } from '../../hooks/useSubscription';
import * as WebBrowser from "expo-web-browser";
import I18n from '../../i18n';

// Données utilisateur (à remplacer par un vrai système d'auth)
const userData = {
  isLoggedIn: false, // Changer à true pour tester l'état connecté
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg',
  preferences: {
    halal: false,
    vegetarian: false,
    vegan: false,
  },
  plan: 'basic', // 'free', 'premium', 'pro'
};

export default function ProfileScreen() {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { subscriptionStatus, isLoading: subscriptionLoading, loadSubscriptionStatus, cancelSubscription } = useSubscription();
  const [dietaryPreference, setDietaryPreference] = useState<'none' | 'halal' | 'vegetarian' | 'vegan'>('none');
  const [currentLanguage, setCurrentLanguage] = useState<'fr' | 'en'>('fr');

  useFocusEffect(useCallback(() => {
    const checkSubscriptionStatus = async () => {
      loadSubscriptionStatus();
      loadDietaryPreference();
    };
    checkSubscriptionStatus();
  }, []));

  const loadDietaryPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('dietary_preference');
      if (savedPreference) {
        setDietaryPreference(savedPreference as 'none' | 'halal' | 'vegetarian' | 'vegan');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du régime:', error);
    }
  };

  const handleUpgradeToPremium = () => {
    // Naviguer vers le paywall
    router.push('/paywall');
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      I18n.t('profile.cancelSubscriptionTitle'),
      I18n.t('profile.cancelSubscriptionMessage'),
      [
        {
          text: I18n.t('profile.cancel'),
          style: 'cancel',
        },
        {
          text: I18n.t('profile.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await cancelSubscription();
              if (success) {
                // const successMessage = Platform.OS === 'ios'
                //   ? t('profile.cancellationSuccessMessageIOS')
                //   : t('profile.cancellationSuccessMessageAndroid');

                // Alert.alert(
                //   t('profile.cancellationSuccessTitle'),
                //   successMessage,
                //   [{ text: 'OK' }]
                // );
              } else {
                Alert.alert(
                  I18n.t('profile.cancellationErrorTitle'),
                  I18n.t('profile.cancellationErrorMessage'),
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Erreur lors de la cancellation:', error);
              Alert.alert(
                I18n.t('profile.cancellationErrorTitle'),
                I18n.t('profile.cancellationErrorMessage'),
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicyPress = async () => {
    try {
      // URL de la politique de confidentialité (à adapter selon votre politique)
      WebBrowser.openBrowserAsync(
        I18n.locale === 'fr'
          ? 'https://drive.google.com/file/d/1Uwa45KaIrYlDzpS00YFunhBVB-a4zkSi/view?usp=sharing'
          : 'https://drive.google.com/file/d/15eNZBgSnTP4cUFJ7tLi9F0kZCsyQZPUW/view?usp=sharing'
      );
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la politique de confidentialité:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir la politique de confidentialité.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTermsOfServicePress = async () => {
    try {
      WebBrowser.openBrowserAsync(
        'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
      )
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des conditions d\'utilisation:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir les conditions d\'utilisation.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleFeedbackPress = async () => {
    try {
      const subject = encodeURIComponent('Feedback CookEat App');
      const body = encodeURIComponent(
        `Bonjour,\n\nJe souhaite vous faire part de mon feedback concernant l'application CookEat :\n\n` +
        `[Votre message ici]\n\n` +
        `Cordialement,\n[Votre nom]`
      );

      const mailtoUrl = `mailto:no-reply@cookeat.info?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback : copier l'email dans le presse-papiers
        Alert.alert(
          'Email non disponible',
          'L\'adresse no-reply@cookeat.info a été copiée dans votre presse-papiers.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'email:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir l\'application email.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDietaryPreferencePress = async () => {
    // Vérifier si l'utilisateur a un abonnement
    if (!subscriptionStatus.isSubscribed) {
      // Rediriger vers le paywall si pas d'abonnement
      router.push('/paywall');
      return;
    }

    const preferences: ('none' | 'halal' | 'vegetarian' | 'vegan')[] = ['none', 'halal', 'vegetarian', 'vegan'];
    const currentIndex = preferences.indexOf(dietaryPreference);
    const nextIndex = (currentIndex + 1) % preferences.length;
    const newPreference = preferences[nextIndex];
    setDietaryPreference(newPreference);

    // Sauvegarder le régime dans AsyncStorage
    try {
      await AsyncStorage.setItem('dietary_preference', newPreference);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du régime:', error);
    }
  };

  const getDietaryPreferenceText = () => {
    switch (dietaryPreference) {
      case 'none':
        return I18n.t('profile.dietaryPreference.none');
      case 'halal':
        return I18n.t('profile.dietaryPreference.halal');
      case 'vegetarian':
        return I18n.t('profile.dietaryPreference.vegetarian');
      case 'vegan':
        return I18n.t('profile.dietaryPreference.vegan');
      default:
        return I18n.t('profile.dietaryPreference.none');
    }
  };

  const handleLanguagePress = async () => {
    const newLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
    setCurrentLanguage(newLanguage);
    I18n.locale = newLanguage;

    // Sauvegarder le choix dans AsyncStorage
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la langue:', error);
    }
  };

  const getLanguageText = () => {
    switch (currentLanguage) {
      case 'fr':
        return I18n.t('profile.languages.french');
      case 'en':
        return I18n.t('profile.languages.english');
      default:
        return I18n.t('profile.languages.french');
    }
  };

  const handleNotificationsPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Sur iOS, ouvrir les paramètres de l'app
        await Linking.openURL('app-settings:');
      } else {
        // Sur Android, ouvrir les paramètres de notifications
        await Linking.openURL('android-app://com.android.settings/.notification.NotificationAccessSettings');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des paramètres:', error);
      // Fallback : ouvrir les paramètres généraux
      try {
        await Linking.openSettings();
      } catch (fallbackError) {
        console.error('Erreur lors de l\'ouverture des paramètres généraux:', fallbackError);
      }
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontFamily: 'Degular', fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginBottom: 20, marginRight: 20 }}>CookEat AI</Text>

      {/* Section Avatar et Nom */}
      {/* <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: userData.avatar }}
            style={styles.avatar}
          />
        </View>
      </View> */}

      {/* Section Préférences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {I18n.t('profile.preferences')}
        </Text>

        <TouchableOpacity style={styles.preferenceItem} onPress={handleDietaryPreferencePress}>
          <View style={styles.preferenceInfo}>
            <Text style={[styles.preferenceLabel, { color: colors.text }]}>
              {I18n.t('profile.dietaryPreference.title')}
            </Text>
            <Text style={[styles.preferenceDescription, { color: colors.textSecondary }]}>
              {getDietaryPreferenceText()}
            </Text>
          </View>
          <View style={styles.preferenceActions}>
            {!subscriptionStatus.isSubscribed && (
              <IconSymbol name="crown" size={20} color={colors.button} style={{ marginRight: 8 }} />
            )}
            <IconSymbol name="chevron.right" size={20} color={colors.button} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Section Plan */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {I18n.t('profile.plan')}
        </Text>

        <View style={styles.planContainer}>
          {subscriptionLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.button} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {I18n.t('profile.loadingSubscription')}
              </Text>
            </View>
          ) : subscriptionStatus.isSubscribed ? (
            // Utilisateur avec abonnement
            <View style={styles.subscriptionInfo}>
              <View style={styles.currentPlanInfo}>
                <View style={styles.planBadge}>
                  <IconSymbol name="crown" size={16} color={colors.button} />
                  <Text style={[styles.planBadgeText, { color: colors.button }]}>
                    {I18n.t('profile.premium')}
                  </Text>
                </View>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {I18n.t('profile.premiumPlan')}
                </Text>
                {subscriptionStatus.expirationDate && (
                  <Text style={[styles.planExpiration, { color: colors.textSecondary }]}>
                    {I18n.t('profile.expiresOn')} {subscriptionStatus.expirationDate.toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancelSubscription}
              >
                <IconSymbol name="xmark.circle" size={16} color="#FF3B30" />
                <Text style={[styles.cancelButtonText, { color: '#FF3B30' }]}>
                  {I18n.t('profile.cancelSubscription')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Utilisateur sans abonnement
            <View style={styles.freePlanContainer}>
              <View style={styles.freePlanInfo}>
                <View style={styles.planBadge}>
                  <IconSymbol name="person" size={20} color={colors.textSecondary} />
                  <Text style={[styles.planBadgeText, { color: colors.textSecondary }]}>
                    {I18n.t('profile.free')}
                  </Text>
                </View>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {I18n.t('profile.freePlan')}
                </Text>
                <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                  {I18n.t('profile.freePlanDescription')}
                </Text>
                {/* {subscriptionStatus.dailyQuotaRemaining > 0 && (
                  <Text style={[styles.quotaInfo, { color: colors.textSecondary }]}>
                    {t('profile.quotaRemaining', { count: subscriptionStatus.dailyQuotaRemaining })}
                  </Text>
                )} */}
              </View>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: colors.button }]}
                onPress={handleUpgradeToPremium}
              >
                <IconSymbol name="crown" size={16} color={colors.background} />
                <Text style={[styles.upgradeButtonText, { color: colors.background }]}>
                  {I18n.t('profile.upgradeToPremium')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Section Paramètres */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {I18n.t('profile.settings')}
        </Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleNotificationsPress}>
          <IconSymbol name={Platform.OS === 'ios' ? "bell" : "notifications"} size={20} color={colors.button} />
          <Text style={[styles.settingText, { color: colors.text }]}>
            {I18n.t('profile.notifications')}
          </Text>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleFeedbackPress}>
          <IconSymbol name="envelope" size={20} color={colors.button} />
          <View style={styles.settingInfo}>
            <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
              {I18n.t('profile.feedback')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {I18n.t('profile.feedbackDescription')}
            </Text>
          </View>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleLanguagePress}>
          <IconSymbol name="globe" size={20} color={colors.button} />
          <View style={styles.settingInfo}>
            <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
              {I18n.t('profile.language')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {getLanguageText()}
            </Text>
          </View>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>
      </View>

      {/* Section Mentions légales */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {I18n.t('profile.legal')}
        </Text>

        <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicyPress}>
          <IconSymbol name="doc.text" size={20} color={colors.button} />
          <Text style={[styles.settingText, { color: colors.text }]}>
            {I18n.t('profile.privacyPolicy')}
          </Text>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleTermsOfServicePress}>
          <IconSymbol name="doc.text" size={20} color={colors.button} />
          <Text style={[styles.settingText, { color: colors.text }]}>
            {I18n.t('profile.termsOfService')}
          </Text>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>
      </View>

      {/* Espace en bas pour la barre de navigation */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Degular',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
  },
  planContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlan: {
    flex: 1,
  },
  planName: {
    fontFamily: 'Degular',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
  },
  changePlanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  changePlanText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '600',
  },
  planOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  planOptionText: {
    fontFamily: 'Degular',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  planOptionPrice: {
    fontFamily: 'Cronos Pro',
    fontSize: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    flex: 1,
    marginLeft: 12,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    marginTop: 2,
  },
  preferenceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 120,
  },
  // Styles pour la gestion d'abonnement
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    marginTop: 8,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  currentPlanInfo: {
    flex: 1,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planBadgeText: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  planExpiration: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  freePlanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  freePlanInfo: {
    flex: 1,
    marginRight: 16,
  },
  planDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    marginBottom: 4,
  },
  quotaInfo: {
    fontFamily: 'Cronos Pro',
    fontSize: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 